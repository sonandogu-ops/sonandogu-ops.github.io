"""손안의도구 SEO 정리 스크립트 (표준 라이브러리만 사용)

하는 일
  1. blog/rss.xml       블로그 목록(blog/index.html)으로 RSS 피드를 만들어요. 네이버 서치어드바이저에 제출하는 주소예요.
  2. 이 주제의 다른 글   글마다 같은 분류의 최신 글 3편을 본문 끝에 이어 줘요(사이트 안 연결 링크).
  3. 경로(Breadcrumb)    글마다 '손안의도구 › 블로그 › 글 제목' 구조화 데이터를 넣어요.
  4. 사이트맵 lastmod    파일이 마지막으로 바뀐 날(git 기록)로 맞춰요.

쓰는 법
  python3 .github/scripts/update_seo.py          # 파일을 고쳐요 (새 글을 쓰거나 페이지를 고친 뒤)
  python3 .github/scripts/update_seo.py --check  # 고칠 게 있으면 목록을 보여 주고 1로 끝나요 (자동 점검용)
"""
import json, os, re, subprocess, sys, datetime, html as H

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SITE = "https://sonandogu.com"
GROUP = {"생활 계산": "calc", "생활 도구": "calc", "세금 상식": "work", "알바 상식": "work", "모임 놀이": "play", "전통 놀이": "play"}
MARK_A, MARK_B = "<!-- more:start -->", "<!-- more:end -->"
LASTMOD_SLACK_DAYS = 2  # 합치는 날이 하루이틀 늦어져도 문제로 보지 않음


def rd(p):
    return open(os.path.join(ROOT, p), encoding="utf-8").read()


def posts():
    """블로그 목록 순서(최신이 위) 그대로 글 정보를 읽어요."""
    out = []
    for m in re.finditer(r'<a class="item" href="(/blog/[^"]+/)">\s*<span class="tag">([^<]+)</span>\s*<h2>(.*?)</h2>\s*<p>(.*?)</p>\s*<small>(\d{4})년 (\d{1,2})월 (\d{1,2})일</small>', rd("blog/index.html"), re.S):
        href, tag, title, desc, y, mo, d = m.groups()
        out.append(dict(href=href, tag=tag.strip(), title=re.sub(r"\s+", " ", H.unescape(re.sub(r"<[^>]+>", "", title))).strip(),
                        desc=re.sub(r"\s+", " ", H.unescape(re.sub(r"<[^>]+>", "", desc))).strip(), date=datetime.date(int(y), int(mo), int(d))))
    return out


def build_rss(ps):
    def rfc(d):
        return datetime.datetime(d.year, d.month, d.day, 9, 0).strftime("%a, %d %b %Y 09:00:00 +0900")
    items = "".join(
        f"""
  <item>
    <title>{H.escape(p['title'])}</title>
    <link>{SITE}{p['href']}</link>
    <guid isPermaLink="true">{SITE}{p['href']}</guid>
    <category>{H.escape(p['tag'])}</category>
    <description>{H.escape(p['desc'])}</description>
    <pubDate>{rfc(p['date'])}</pubDate>
  </item>""" for p in ps)
    last = rfc(max(p["date"] for p in ps))
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>손안의도구 블로그</title>
  <link>{SITE}/blog/</link>
  <atom:link href="{SITE}/blog/rss.xml" rel="self" type="application/rss+xml"/>
  <description>계산이 헷갈리는 순간에 꺼내 보는 짧고 쓸모 있는 글</description>
  <language>ko</language>
  <lastBuildDate>{last}</lastBuildDate>{items}
</channel>
</rss>
"""


def more_block(p, ps, skip):
    g = GROUP.get(p["tag"])
    # 같은 분류 글을 목록 순서대로 둥글게 늘어놓고 바로 뒤 두 편과 바로 앞 한 편을 골라요.
    # 최신 글만 고르면 오래된 글로 가는 링크가 사라져서, 모든 글이 고르게 이어지게 했어요.
    ring = [q for q in ps if GROUP.get(q["tag"]) == g]
    i = ring.index(p); n = len(ring)
    order = [ring[(i + k) % n] for k in (1, 2, -1, 3, -2, 4)] if n > 1 else []
    same, seen = [], set()
    for q in order:
        if q["href"] != p["href"] and q["href"] not in skip and q["href"] not in seen:
            same.append(q); seen.add(q["href"])
        if len(same) == 3:
            break
    if not same:
        return ""
    links = "".join(f'<a href="{q["href"]}"><span>{H.escape(q["tag"])}</span>{H.escape(q["title"])}</a>' for q in same)
    return f'{MARK_A}\n  <nav class="more" aria-label="이 주제의 다른 글"><b>이 주제의 다른 글</b>{links}</nav>\n  {MARK_B}\n'


def fix_post(p, ps):
    path = p["href"].strip("/") + "/index.html"
    s = rd(path)
    orig = s
    # 이 주제의 다른 글 (이미 '관련 글과 도구'에 있는 글은 빼요)
    a = s.index('<article class="post">'); e = s.index("</article>", a)
    nxt = s.find('<nav class="next"', a, e)
    skip = set(re.findall(r'href="(/blog/[^"]+/)"', s[nxt:e])) if nxt > 0 else set()
    blk = more_block(p, ps, skip)
    s = re.sub(re.escape(MARK_A) + r".*?" + re.escape(MARK_B) + r"\n?\s*", "", s, flags=re.S)
    if blk:
        a = s.index('<article class="post">'); e = s.index("</article>", a)
        at = s.find('<nav class="next"', a, e)
        if at < 0:
            at = s.find("<div data-comments", a, e)
        if at < 0:
            at = e
        s = s[:at] + blk + "  " + s[at:].lstrip(" ")
    # RSS 알림 링크 (경로 정보보다 먼저 넣어야 실행할 때마다 순서가 같아요)
    s = add_feed_link(s)
    # 경로(Breadcrumb) 구조화 데이터
    h1 = re.search(r"<h1>(.*?)</h1>", s, re.S).group(1)
    name = re.sub(r"\s+", " ", H.unescape(re.sub(r"<br\s*/?>", " ", h1))).strip()
    name = re.sub(r"<[^>]+>", "", name)
    bc = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "손안의도구", "item": SITE + "/"},
        {"@type": "ListItem", "position": 2, "name": "블로그", "item": SITE + "/blog/"},
        {"@type": "ListItem", "position": 3, "name": name, "item": SITE + p["href"]}]}
    tag = '<script type="application/ld+json">' + json.dumps(bc, ensure_ascii=False) + "</script>"
    s = re.sub(r'<script type="application/ld\+json">\{"@context": "https://schema.org", "@type": "BreadcrumbList".*?</script>\n?', "", s, flags=re.S)
    i = s.index("</head>")
    s = s[:i] + tag + "\n" + s[i:]
    return path, orig, s


def add_feed_link(s):
    link = '<link rel="alternate" type="application/rss+xml" title="손안의도구 블로그" href="/blog/rss.xml">'
    if link in s:
        return s
    i = s.index("</head>")
    return s[:i] + link + "\n" + s[i:]


def fix_blog_index(s):
    s = add_feed_link(s)
    bc = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "손안의도구", "item": SITE + "/"},
        {"@type": "ListItem", "position": 2, "name": "블로그", "item": SITE + "/blog/"}]}
    tag = '<script type="application/ld+json">' + json.dumps(bc, ensure_ascii=False) + "</script>"
    if tag not in s:
        s = re.sub(r'<script type="application/ld\+json">\{"@context": "https://schema.org", "@type": "BreadcrumbList".*?</script>\n?', "", s, flags=re.S)
        i = s.index("</head>")
        s = s[:i] + tag + "\n" + s[i:]
    return s


def git_date(path, changed):
    if path in changed:
        return datetime.date.today()
    try:
        out = subprocess.check_output(["git", "log", "-1", "--format=%cs", "--", path], cwd=ROOT, stderr=subprocess.DEVNULL).decode().strip()
        return datetime.date.fromisoformat(out) if out else None
    except Exception:
        return None


def fix_sitemap(sm, changed, check):
    issues = []
    def repl(m):
        loc, lm = m.group(1), m.group(2)
        rel = loc[len(SITE) + 1:]
        path = (rel + "index.html") if (rel == "" or rel.endswith("/")) else rel
        gd = git_date(path, changed)
        cur = datetime.date.fromisoformat(lm)
        if gd and gd > cur:
            if check:
                if (gd - cur).days > LASTMOD_SLACK_DAYS:
                    issues.append(f"사이트맵 날짜가 오래됐어요: {loc} (사이트맵 {lm}, 실제 {gd})")
                return m.group(0)
            return f"<loc>{loc}</loc><lastmod>{gd.isoformat()}</lastmod>"
        return m.group(0)
    new = re.sub(r"<loc>([^<]+)</loc><lastmod>(\d{4}-\d{2}-\d{2})</lastmod>", repl, sm)
    return new, issues


def main():
    check = "--check" in sys.argv
    ps = posts()
    if not ps:
        print("블로그 목록에서 글을 못 찾았어요"); sys.exit(1)
    writes, issues = {}, []
    # 글
    for p in ps:
        path, o, n = fix_post(p, ps)
        if o != n:
            writes[path] = n
    bi = rd("blog/index.html"); nb = fix_blog_index(bi)
    if nb != bi:
        writes["blog/index.html"] = nb
    rss = build_rss(ps)
    old = rd("blog/rss.xml") if os.path.exists(os.path.join(ROOT, "blog/rss.xml")) else ""
    if old != rss:
        writes["blog/rss.xml"] = rss
    if check:
        for w in writes:
            issues.append(f"정리가 필요해요: {w} (update_seo.py 를 실행해 주세요)")
        _, si = fix_sitemap(rd("sitemap.xml"), set(), True)
        issues += si
        if issues:
            print("\n".join("- " + x for x in issues)); sys.exit(1)
        print("SEO 정리 상태 좋아요"); sys.exit(0)
    # 고치기: 바뀐 파일은 오늘 날짜로
    try:
        dirty = set(subprocess.check_output(["git", "diff", "--name-only", "HEAD"], cwd=ROOT).decode().split())
    except Exception:
        dirty = set()
    for path, s in writes.items():
        open(os.path.join(ROOT, path), "w", encoding="utf-8").write(s)
    changed = dirty | set(writes)
    sm = rd("sitemap.xml"); ns, _ = fix_sitemap(sm, changed, False)
    if ns != sm:
        open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8").write(ns)
        writes["sitemap.xml"] = 1
    print(f"글 {len(ps)}편 · 고친 파일 {len(writes)}개")
    for w in sorted(writes):
        print("  " + w)


if __name__ == "__main__":
    main()
