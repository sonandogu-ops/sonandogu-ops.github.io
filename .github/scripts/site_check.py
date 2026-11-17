#!/usr/bin/env python3
"""손안의도구 사이트 점검 스크립트.

저장소 파일만 보고 검사하고, --live 를 주면 실제 사이트 응답도 확인한다.
문제가 있으면 마크다운 보고서를 출력하고 종료 코드 1로 끝난다.
표준 라이브러리만 쓴다.
"""
import argparse, json, os, re, sys, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

SITE = "https://sonandogu.com"
PUB = "ca-pub-1007904420767851"
# 검색 노출 대상이 아닌 파일
SKIP = re.compile(r"^(google[0-9a-f]+|naver[0-9a-f]+)\.html$")
NOINDEX_OK = {"404.html", "admin/index.html"}


def html_files(root):
    out = []
    for d, dirs, files in os.walk(root):
        dirs[:] = [x for x in dirs if not x.startswith(".") and x != "node_modules"]
        for f in files:
            if f.endswith(".html"):
                rel = os.path.relpath(os.path.join(d, f), root).replace(os.sep, "/")
                if not SKIP.match(rel):
                    out.append(rel)
    return sorted(out)


def page_url(rel):
    return SITE + "/" + (rel[: -len("index.html")] if rel.endswith("index.html") else rel)


def exists(root, path):
    p = path.split("#")[0].split("?")[0].lstrip("/")
    if p == "" or p.endswith("/"):
        p += "index.html"
    full = os.path.join(root, p)
    return os.path.isfile(full) or os.path.isfile(os.path.join(full, "index.html"))


def check_files(root):
    problems = []  # (분류, 페이지, 내용)
    pages = html_files(root)

    # 사이트맵
    try:
        sm = open(os.path.join(root, "sitemap.xml"), encoding="utf-8").read()
        locs = re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", sm)
    except FileNotFoundError:
        locs = []
        problems.append(("사이트맵", "sitemap.xml", "파일이 없어요"))
    indexable = [p for p in pages if p not in NOINDEX_OK]
    want = {page_url(p) for p in indexable}
    for u in sorted(want - set(locs)):
        problems.append(("사이트맵", u, "사이트맵에 빠져 있어요"))
    for u in sorted(set(locs) - want):
        problems.append(("사이트맵", u, "사이트맵에는 있는데 파일이 없어요"))
    dup = {u for u in locs if locs.count(u) > 1}
    for u in sorted(dup):
        problems.append(("사이트맵", u, "사이트맵에 두 번 이상 들어 있어요"))

    # CNAME: GitHub Pages가 sonandogu.com 주소를 쓰게 하는 파일. 지워지면 사이트 주소가 끊김
    cname_path=os.path.join(root, "CNAME")
    if not os.path.isfile(cname_path):
        problems.append(("기본 파일", "CNAME", "파일이 없어요. 지워지면 sonandogu.com 주소가 끊겨요"))
    elif open(cname_path, encoding="utf-8").read().strip() != SITE.split("//")[1]:
        problems.append(("기본 파일", "CNAME", "내용이 sonandogu.com이 아니에요"))

    # robots, ads.txt
    robots = open(os.path.join(root, "robots.txt"), encoding="utf-8").read() if os.path.isfile(os.path.join(root, "robots.txt")) else ""
    if SITE + "/sitemap.xml" not in robots:
        problems.append(("기본 파일", "robots.txt", "사이트맵 주소가 없어요"))
    ads = open(os.path.join(root, "ads.txt"), encoding="utf-8").read() if os.path.isfile(os.path.join(root, "ads.txt")) else ""
    if PUB.replace("ca-", "") not in ads:
        problems.append(("기본 파일", "ads.txt", "애드센스 게시자 ID가 없어요"))

    for rel in pages:
        h = open(os.path.join(root, rel), encoding="utf-8").read()
        noindex = re.search(r'<meta[^>]+name="robots"[^>]+noindex', h) is not None

        # 링크와 파일
        for attr, link in re.findall(r'\b(href|src)="(/[^"]*)"', h):
            if link.startswith("//"):
                continue
            if not exists(root, link):
                problems.append(("깨진 링크", rel, f"{link} 가 없어요"))

        # 구조화 데이터
        for i, block in enumerate(re.findall(r'<script type="application/ld\+json">(.*?)</script>', h, re.S)):
            try:
                json.loads(block)
            except ValueError as e:
                problems.append(("구조화 데이터", rel, f"{i+1}번째 JSON-LD 오류: {e}"))

        if rel in NOINDEX_OK:
            continue
        if noindex:
            problems.append(("태그", rel, "noindex 가 붙어 있어서 검색에 안 나와요"))
        need = [
            ("제목", r"<title>[^<]{5,}</title>"),
            ("설명(description)", r'<meta name="description" content="[^"]{20,}"'),
            ("viewport", r'<meta name="viewport"'),
            ("언어(lang)", r'<html[^>]*lang="ko"'),
            ("대표 이미지(og:image)", r'<meta property="og:image" content="'),
            ("애드센스 코드", re.escape("adsbygoogle.js?client=" + PUB)),
        ]
        for name, rx in need:
            if not re.search(rx, h):
                problems.append(("태그", rel, f"{name} 항목이 없어요"))
        m = re.search(r'<link rel="canonical" href="([^"]+)"', h)
        if not m:
            problems.append(("태그", rel, "canonical 이 없어요"))
        elif m.group(1) != page_url(rel):
            problems.append(("태그", rel, f"canonical 주소가 달라요: {m.group(1)}"))
        og = re.search(r'<meta property="og:image" content="https://sonandogu\.com(/[^"?]+)', h)
        if og and not exists(root, og.group(1)):
            problems.append(("깨진 링크", rel, f"대표 이미지 {og.group(1)} 가 없어요"))
        t = re.search(r"<title>([^<]*)</title>", h)
        if t and len(t.group(1)) > 70:
            problems.append(("참고", rel, f"제목이 {len(t.group(1))}자라 검색 결과에서 잘릴 수 있어요"))
    return problems, indexable


def check_live(urls):
    def get(u):
        try:
            req = urllib.request.Request(u, headers={"User-Agent": "sonandogu-site-check"})
            with urllib.request.urlopen(req, timeout=20) as r:
                return u, r.status
        except urllib.error.HTTPError as e:
            return u, e.code
        except Exception as e:  # 네트워크 오류
            return u, str(e)[:80]
    with ThreadPoolExecutor(8) as ex:
        res = list(ex.map(get, urls))
    return [("실제 사이트", u, f"응답이 이상해요: {s}") for u, s in res if s != 200]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("root", nargs="?", default=".")
    ap.add_argument("--live", action="store_true", help="실제 사이트 응답도 확인")
    ap.add_argument("--out", help="보고서를 저장할 파일")
    a = ap.parse_args()

    problems, indexable = check_files(a.root)
    if a.live:
        problems += check_live([page_url(p) for p in indexable] + [SITE + "/ads.txt", SITE + "/sitemap.xml"])

    problems = list(dict.fromkeys(problems))  # 같은 문제는 한 번만
    serious = [p for p in problems if p[0] != "참고"]
    lines = [f"# 사이트 점검 결과", "", f"검사한 페이지: {len(indexable)}개" + (" (실제 사이트 응답 포함)" if a.live else ""), ""]
    if not problems:
        lines.append("문제 없어요.")
    else:
        cur = None
        for cat, where, msg in sorted(problems, key=lambda x: (x[0] == "참고", x[0], x[1])):
            if cat != cur:
                lines += ["", f"## {cat}"]
                cur = cat
            lines.append(f"- `{where}`: {msg}")
    report = "\n".join(lines) + "\n"
    print(report)
    if a.out:
        open(a.out, "w", encoding="utf-8").write(report)
    sys.exit(1 if serious else 0)


if __name__ == "__main__":
    main()
