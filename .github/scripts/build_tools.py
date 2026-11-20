"""손안의도구 도구 명부(assets/tools.json)로 여러 곳을 한 번에 맞추는 스크립트 (표준 라이브러리만 사용)

만드는 것
  1. 홈(index.html)    분류 버튼, 많이 쓰는 도구 줄, 분류별 도구 카드, 분류 색
  2. 모든 도구(/tools/) 분류별로 모든 도구 이름을 한눈에 보는 페이지
  3. assets/favorites.js  즐겨찾기 별이 동작하는 도구 목록과 이름
  4. 도구 페이지의 경로(전체 도구 / 분류 / 도구) 가운데 분류 링크

새 도구를 만들면
  assets/tools.json 의 tools 에 한 줄 추가 → python3 .github/scripts/build_tools.py
쓰는 법
  python3 .github/scripts/build_tools.py          # 파일을 고쳐요
  python3 .github/scripts/build_tools.py --check  # 어긋난 게 있으면 목록을 보여 주고 1로 끝나요 (자동 점검용)
"""
import datetime, html as H, json, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SITE = "https://sonandogu.com"
GO = '<span class="go" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 14 14"><path d="M4 10L10 4M5 4h5v5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>'


def rd(p):
    return open(os.path.join(ROOT, p), encoding="utf-8").read()


def load():
    d = json.loads(rd("assets/tools.json"))
    cats = {c["id"]: c for c in d["categories"]}
    for t in d["tools"]:
        assert t["cat"] in cats, f"분류가 없어요: {t['path']} → {t['cat']}"
        assert os.path.exists(os.path.join(ROOT, t["path"].strip("/"), "index.html")), f"페이지가 없어요: {t['path']}"
    return d, cats


def esc(s):
    return H.escape(s, quote=True)


def ic(t):
    st = f' style="{esc(t["iconStyle"])}"' if t.get("iconStyle") else ""
    return f'<span class="ic" aria-hidden="true"{st}>{t["icon"]}</span>'


def card(t):
    new = f' data-new="{t["added"]}"' if t.get("added") else ""
    return (f'<a class="t" href="{t["path"]}"{new} data-kw="{esc(t["kw"])}">{ic(t)}'
            f'<span class="tx"><strong>{esc(t["name"])}</strong><span class="d">{esc(t["desc"])}</span></span>{GO}</a>')


def block(name, body, s):
    a, b = f"<!-- {name}:start -->", f"<!-- {name}:end -->"
    if a not in s:
        raise SystemExit(f"index.html 에 {a} 표시가 없어요")
    return re.sub(re.escape(a) + r".*?" + re.escape(b), lambda m: a + "\n" + body + "\n" + b, s, flags=re.S)


def build_home(d, cats):
    s = rd("index.html")
    per = d.get("home_per_cat", 6)
    tools = d["tools"]
    # 분류 색
    css = "<style>\n" + "\n".join(
        f'#{c["id"]}{{--c1:{c["c1"]}; --c2:{c["c2"]}; --tint:{c["c1"]}1a}} .quick a[data-c="{c["id"]}"] .qi{{background:linear-gradient(145deg,{c["c1"]},{c["c2"]})}}'
        for c in d["categories"]) + "\n</style>"
    s = block("tools:css", css, s)
    # 분류 버튼
    tabs = ('      <div class="tabs2" role="tablist" aria-label="분류"><button role="tab" data-t="all" aria-selected="true">전체</button>'
            + "".join(f'<button role="tab" data-t="{c["id"]}" aria-selected="false"><i style="background:{c["c2"]}"></i>{esc(c["name"])}</button>'
                      for c in d["categories"] if any(t["cat"] == c["id"] for t in tools)) + "</div>")
    s = block("tools:tabs", tabs, s)
    # 많이 쓰는 도구
    by = {t["path"]: t for t in tools}
    qs = [by[p] for p in d.get("quickOrder", []) if p in by and by[p].get("quick")]
    quick = ('  <div class="qh">많이 쓰는 도구</div>\n  <nav class="quick" aria-label="많이 쓰는 도구">'
             + "".join(f'<a href="{t["path"]}" data-c="{t["cat"]}">{ic(t).replace(chr(34)+"ic"+chr(34), chr(34)+"ic qi"+chr(34), 1)}<span>{esc(t["quick"])}</span></a>' for t in qs)
             + "</nav>")
    s = block("tools:quick", quick, s)
    # 분류별 카드
    secs = []
    for c in d["categories"]:
        ts = [t for t in tools if t["cat"] == c["id"]]
        if not ts:
            continue
        hub = f'<span class="sl"><a href="{c["hub"]}">{esc(c["hubName"])}</a></span>' if c.get("hub") else ""
        more = f'<button type="button" class="more" data-cat="{c["id"]}" hidden>{esc(c["name"])} 전체 보기 <b>{len(ts)}</b></button>'  # 몇 개 넘으면 보일지는 홈 화면이 정해요
        secs.append(f'  <section class="cat" id="{c["id"]}">\n    <div class="ch"><h2>{esc(c["name"])}</h2><span class="cs">{esc(c["sub"])}</span>{hub}</div>\n'
                    f'    <div class="grid">\n' + "\n".join("      " + card(t) for t in ts) + f'\n    </div>{more}\n  </section>')
    s = block("tools:sections", "\n".join(secs), s)
    s = re.sub(r'(<body[^>]*?)(?: data-per="\d+")?>', lambda m: m.group(1) + f' data-per="{per}">', s, count=1)
    return s


def build_all(d, cats):
    s = rd("about/index.html")
    url = SITE + "/tools/"
    n = len(d["tools"])
    title = f"모든 도구 - 손안의도구 무료 계산기·생활 도구·놀이 {n}개 한눈에"
    desc = f"손안의도구의 모든 도구를 분류별로 한눈에 모았어요. 급여·근로, 세금, 날짜, 생활 계산, 글·문서, 모임·뽑기, 게임까지 {n}개 도구를 가입 없이 무료로 바로 쓸 수 있어요."
    s = re.sub(r"<title>[^<]*</title>", f"<title>{esc(title)} | 손안의도구</title>", s, count=1)
    for prop, val in [("og:title", "모든 도구 - 손안의도구"), ("og:description", f"계산기와 생활 도구, 놀이 {n}개를 분류별로 한눈에."), ("og:url", url)]:
        s = re.sub(r'<meta property="%s" content="[^"]*">' % prop, f'<meta property="{prop}" content="{esc(val)}">', s, count=1)
    s = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{esc(desc)}">', s, count=1)
    s = re.sub(r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{url}">', s, count=1)
    s = re.sub(r'<script type="application/ld\+json">.*?</script>\n?', "", s, flags=re.S)
    bc = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "손안의도구", "item": SITE + "/"},
        {"@type": "ListItem", "position": 2, "name": "모든 도구", "item": url}]}
    il = {"@context": "https://schema.org", "@type": "ItemList", "name": "손안의도구 모든 도구", "numberOfItems": n,
          "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": SITE + t["path"], "name": t["name"]} for i, t in enumerate(d["tools"])]}
    ld = "".join('<script type="application/ld+json">' + json.dumps(x, ensure_ascii=False) + "</script>\n" for x in (bc, il))
    s = s.replace("</head>", ld + "</head>", 1)
    css = """<style>
.alltools{padding:8px 0 0}
.alltools .crumb{font-size:14px; font-weight:600; color:var(--muted); margin:22px 0 0}
.alltools .crumb a{color:var(--muted); text-decoration:none}
.alltools .crumb a:hover{color:var(--ink)}
.alltools h1{font-size:clamp(30px,6vw,44px); font-weight:800; letter-spacing:-.05em; margin:28px 0 6px}
.alltools .lead{color:var(--muted); margin:0 0 26px}
.acols{columns:4 220px; column-gap:28px}
.acat{break-inside:avoid; margin:0 0 26px}
.acat h2{display:flex; align-items:center; gap:8px; font-size:16px; font-weight:800; letter-spacing:-.03em; margin:0 0 8px}
.acat h2 i{width:9px; height:9px; border-radius:50%}
.acat h2 small{font-size:13px; font-weight:800; color:var(--faint)}
.acat ul{list-style:none; margin:0; padding:0}
.acat li a{display:inline-block; padding:5px 0; font-size:15px; font-weight:600; color:var(--ink); text-decoration:none; line-height:1.5}
.acat li a:hover{color:var(--orange)}
.acat .nb{display:inline-block; margin-left:6px; padding:0 6px 1px; font-size:10.5px; font-weight:900; color:#fff; background:var(--orange); border-radius:999px; vertical-align:2px}
@media (pointer:coarse){ .acat li a{padding:9px 0} }
</style>"""
    s = s.replace("</head>", css + "\n</head>", 1)
    today = datetime.date.today()
    cols = []
    for c in d["categories"]:
        ts = [t for t in d["tools"] if t["cat"] == c["id"]]
        if not ts:
            continue
        lis = "".join(f'<li><a href="{t["path"]}">{esc(t["name"])}</a>'
                      + (f'<span class="nb" data-new="{t["added"]}">NEW</span>' if t.get("added") else "") + "</li>" for t in ts)
        cols.append(f'    <section class="acat" id="{c["id"]}"><h2><i style="background:{c["c2"]}"></i>{esc(c["name"])} <small>{len(ts)}</small></h2><ul>{lis}</ul></section>')
    body = (f'<div class="container"><main class="alltools">\n  <div class="crumb"><a href="/">전체 도구</a> / 모든 도구</div>\n'
            f'  <h1>모든 도구</h1>\n  <p class="lead">분류 {len(cols)}개, 도구 {n}개. 이름을 누르면 바로 열려요.</p>\n'
            f'  <div class="acols">\n' + "\n".join(cols) + "\n  </div>\n</main></div>")
    i = s.index('<div class="container"><main class="doc">'); j = s.index("</main></div>", i) + len("</main></div>")
    s = s[:i] + body + s[j:]
    # NEW는 30일 지나면 숨김
    s = s.replace("</body>", '<script>(function(){var n=Date.now();[].slice.call(document.querySelectorAll(".nb[data-new]")).forEach(function(b){var d=Date.parse(b.dataset.new);if(!(n-d<30*864e5))b.remove();});})();</script>\n</body>', 1)
    return s


def build_fav(d):
    s = rd("assets/favorites.js")
    paths = [t["path"] for t in d["tools"]]
    s = re.sub(r"var TOOLS=\[[^\]]*\];", "var TOOLS=[" + ",".join(f"'{p}'" for p in paths) + "];", s, count=1)
    s = re.sub(r"var NAMES=\{[^}]*\};", "var NAMES={" + ",".join(f"'{t['path']}':'{t['name']}'" for t in d["tools"]) + "};", s, count=1)
    return s


def build_crumbs(d, cats):
    out = {}
    for t in d["tools"]:
        p = t["path"].strip("/") + "/index.html"
        s = rd(p)
        c = cats[t["cat"]]
        n = re.sub(r'(<div class="crumb"><a href="/">전체 도구</a> / )<a href="/#[a-z]+">[^<]*</a>',
                   lambda m: m.group(1) + f'<a href="/#{c["id"]}">{c["name"]}</a>', s, count=1)
        if n != s:
            out[p] = n
    return out


def main():
    check = "--check" in sys.argv
    d, cats = load()
    writes = {}
    for path, new in [("index.html", build_home(d, cats)), ("tools/index.html", build_all(d, cats)), ("assets/favorites.js", build_fav(d))]:
        old = rd(path) if os.path.exists(os.path.join(ROOT, path)) else ""
        if old != new:
            writes[path] = new
    writes.update(build_crumbs(d, cats))
    if check:
        if writes:
            print("\n".join(f"- 도구 명부와 어긋나요: {w} (build_tools.py 를 실행해 주세요)" for w in writes)); sys.exit(1)
        print("도구 명부와 모두 맞아요"); sys.exit(0)
    for path, s in writes.items():
        os.makedirs(os.path.dirname(os.path.join(ROOT, path)), exist_ok=True)
        open(os.path.join(ROOT, path), "w", encoding="utf-8").write(s)
    print(f"도구 {len(d['tools'])}개 · 분류 {len(d['categories'])}개 · 고친 파일 {len(writes)}개")
    for w in sorted(writes):
        print("  " + w)


if __name__ == "__main__":
    main()
