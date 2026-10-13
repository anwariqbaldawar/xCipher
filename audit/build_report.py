#!/usr/bin/env python3
"""Build report.html — self-contained, no external dependencies.
Inputs: findings.json + report.md  →  report.html"""
import json, re, html, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
data = json.loads((ROOT / "findings.json").read_text())
md = (ROOT / "report.md").read_text()

# ── markdown → html ──────────────────────────────────────────────────────────
import markdown  # pip install markdown
md_ext = ["tables", "toc", "fenced_code", "sane_lists"]

# Split report.md at Section 5 (replaced by interactive cards) and Section 6
m5 = re.search(r"\n## 5\. Detailed Findings.*?(?=\n## 6\. )", md, re.S)
sec5_md = m5.group(0) if m5 else ""
md_wo5 = md.replace(sec5_md, "\n<!--FINDINGS-->\n") if m5 else md
md_wo5 = md_wo5.replace("## 5. Detailed Findings (category-wise, FINDING FORMAT)",
                        "<!--FINDINGS_HEAD-->")

# fix the replacement: keep heading
md_wo5 = md_wo5.replace("<!--FINDINGS-->",
    "## 5. Detailed Findings (category-wise, FINDING FORMAT)\n\n<!--FINDINGS-->")

# Section 7 needs the CMS matrix (lives inside removed Section 5.11 in report.md) — extract it.
m_matrix = re.search(r"(### 5\.11 Editor / CMS Audit.*?)(?=\n### 5\.12 )", sec5_md, re.S)
cms_matrix_md = m_matrix.group(1) if m_matrix else ""
# strip the subsection heading (section 7 has its own heading) but keep intro + table
cms_matrix_md = re.sub(r"^### 5\.11[^\n]*\n", "", cms_matrix_md)
md_wo5 = md_wo5.replace(
    "Section 5.11 ka full matrix (A–K, 90+ items) — wahi authoritative list hai.",
    "Neeche complete matrix hai (A–K, 90+ items — report.md Section 5.11 wali):")
if cms_matrix_md:
    md_wo5 = md_wo5.replace("## 7. Editor/CMS Checklist Matrix",
                            "## 7. Editor/CMS Checklist Matrix\n\n" + cms_matrix_md, 1)

body = markdown.markdown(md_wo5, extensions=md_ext)

# ── TOC from headings ────────────────────────────────────────────────────────
toc = []
for h in re.finditer(r'<h([23]) id="([^"]*)">(.*?)</h\1>', body):
    lvl, hid, text = h.group(1), h.group(2), re.sub(r"<[^>]+>", "", h.group(3))
    toc.append((int(lvl), hid, html.unescape(text)))
toc_html = "\n".join(
    f'<a class="toc-l{l}" href="#{hid}">{html.escape(t)}</a>' for l, hid, t in toc)

# ── score gauges + bar chart (inline SVG) ────────────────────────────────────
SC = {"Critical": "#e5484d", "High": "#e5484d", "Medium": "#f5a623",
      "Low": "#30a46c", "Info": "#6e7a90"}

def gauge(score, size=118, stroke=11, label="", status="scored", big=False):
    r = (size - stroke) / 2
    c = 2 * 3.14159 * r
    dash = c * score / 100
    color = "#30a46c" if score >= 75 else ("#f5a623" if score >= 55 else "#e5484d")
    fs = 26 if big else 15
    star = "⚠ " if status == "partial" else ""
    return f'''<svg viewBox="0 0 {size} {size}" width="{size}" height="{size}" role="img" aria-label="{label} {score} of 100">
  <circle cx="{size/2}" cy="{size/2}" r="{r}" fill="none" stroke="var(--track)" stroke-width="{stroke}"/>
  <circle cx="{size/2}" cy="{size/2}" r="{r}" fill="none" stroke="{color}" stroke-width="{stroke}"
    stroke-dasharray="{dash:.1f} {c-dash:.1f}" stroke-linecap="round"
    transform="rotate(-90 {size/2} {size/2})"/>
  <text x="50%" y="49%" text-anchor="middle" dominant-baseline="middle"
    font-size="{fs}" font-weight="800" fill="var(--ink)">{score}</text>
  <text x="50%" y="66%" text-anchor="middle" font-size="10.5" fill="var(--muted)">{star}of 100</text>
</svg>'''

scores = data["scores"]
overall = data["overallScore"]
gauge_overall = gauge(overall, 170, 14, "Overall", big=True)
gauges = "\n".join(
    f'<div class="gauge-cell"><div class="gauge">{gauge(s["score"], 104, 10, s["category"], s["status"])}</div>'
    f'<div class="gauge-label">{html.escape(s["category"])}'
    f'<span>{"⚠ Partial" if s["status"]=="partial" else "Scored"} · weight {s["weight"]}%</span></div></div>'
    for s in scores)

# horizontal bar chart
bars = "\n".join(
    f'''<div class="bar-row"><span class="bar-name">{html.escape(s["category"])}</span>
    <span class="bar-track"><span class="bar-fill" style="width:{s["score"]}%;background:{"#30a46c" if s["score"]>=75 else ("#f5a623" if s["score"]>=55 else "#e5484d")}"></span></span>
    <span class="bar-val">{s["score"]}</span></div>''' for s in scores)

# ── findings cards ───────────────────────────────────────────────────────────
CAT_ORDER = ["Technical SEO & Indexing", "Content & E-E-A-T", "Structured Data", "AEO", "GEO",
             "Performance & Core Web Vitals", "Security", "Backend & Code Quality",
             "Accessibility, UX & Trust", "Editor / CMS", "Analytics, Monitoring & Operations"]
SEV_ORDER = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3, "Info": 4}
findings = sorted(data["findings"],
                  key=lambda f: (SEV_ORDER.get(f["severity"], 9), f["id"]))

counts = {}
for f in findings:
    counts[f["severity"]] = counts.get(f["severity"], 0) + 1

def esc(x): return html.escape(str(x))

def card(f):
    sev = f["severity"]
    open_by_default = sev in ("Critical", "High")
    fields = [
        ("Affected", f.get("affected", "")),
        ("Evidence", f.get("evidence", "")),
        ("Impact", f.get("impact", "")),
        ("Root cause", f.get("rootCause", "")),
        ("Fix", f.get("fix", "")),
        ("Implementation", f.get("implementation", "")),
        ("Verification", f.get("verification", "")),
        ("References", f.get("references", "")),
    ]
    rows = "\n".join(
        f'<div class="kv"><div class="k">{k}</div><div class="v">{esc(v)}</div></div>'
        for k, v in fields if v)
    return f'''
<details class="fcard sev-{sev.lower()}" data-sev="{sev}" data-cat="{esc(f["category"])}" data-id="{f["id"]}" {'open' if open_by_default else ''}>
  <summary>
    <span class="fid">{f["id"]}</span>
    <span class="ftitle">{esc(f["title"])}</span>
    <span class="badges">
      <span class="sev sev-{sev.lower()}">{sev}</span>
      <span class="conf">{esc(f["confidence"])}</span>
      <span class="effort">Effort: {esc(f.get("effort",""))}</span>
    </span>
  </summary>
  <div class="fbody">
    {rows}
    <div class="kv"><div class="k">Status</div><div class="v">{esc(f.get("status","open"))} · source: {esc(f.get("source","code"))}</div></div>
  </div>
</details>'''

cat_groups = []
for cat in CAT_ORDER:
    group = [f for f in findings if f["category"] == cat]
    if not group:
        continue
    cards = "\n".join(card(f) for f in group)
    cat_groups.append(f'''
<section class="fgroup">
  <h3>{html.escape(cat)} <span class="cat-count">{len(group)}</span></h3>
  {cards}
</section>''')
cards_html = "\n".join(cat_groups)

sev_chips = "".join(
    f'<button class="chip chip-{s.lower()}" data-sevfilter="{s}" aria-pressed="true">{s} ({counts.get(s,0)})</button>'
    for s in ["Critical", "High", "Medium", "Low", "Info"])
cat_opts = "".join(
    f'<option value="{html.escape(c)}">{html.escape(c)}</option>'
    for c in CAT_ORDER if any(f["category"] == c for f in findings))

findings_block = f'''
<div class="findings-ui">
  <div class="filterbar">
    <input type="search" id="fSearch" placeholder="Search ID, title, impact…" aria-label="Search findings">
    <select id="fCat" aria-label="Filter by category"><option value="">All categories</option>{cat_opts}</select>
    <div class="chips">{sev_chips}</div>
    <button id="expandAll" class="chip chip-plain">Expand all</button>
    <button id="collapseAll" class="chip chip-plain">Collapse all</button>
  </div>
  <p class="filter-hint" id="filterCount">{len(findings)} findings shown</p>
  {cards_html}
</div>'''

body = body.replace("<!--FINDINGS-->", findings_block)

# severity summary strip in exec area
sev_strip = "".join(
    f'<div class="sev-tile sev-{s.lower()}"><b>{counts.get(s,0)}</b><span>{s}</span></div>'
    for s in ["Critical", "High", "Medium", "Low", "Info"])

# ── template ─────────────────────────────────────────────────────────────────
CSS = """
:root{
  --bg:#f7f8fa; --panel:#ffffff; --ink:#16181d; --muted:#5c6470; --line:#e3e6ea;
  --accent:#f04552; --track:#e7eaee; --sidebar:0; --shadow:0 1px 3px rgba(16,18,23,.07);
  --crit:#e5484d; --high:#e5484d; --medium:#f5a623; --low:#30a46c; --info:#6e7a90;
}
[data-theme=dark]{
  --bg:#0e0f13; --panel:#16181d; --ink:#eef0f3; --muted:#9aa3b0; --line:#262a31;
  --track:#262a31; --shadow:0 1px 3px rgba(0,0,0,.4);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);
  font:15.5px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;}
a{color:var(--accent)}
.layout{display:flex;min-height:100vh}
/* sidebar */
.sidebar{position:sticky;top:0;height:100vh;width:280px;flex:0 0 280px;overflow-y:auto;
  background:var(--panel);border-right:1px solid var(--line);padding:22px 14px 40px;z-index:5}
.brand{font-weight:800;font-size:17px;letter-spacing:-.3px;margin:0 6px 4px}
.brand span{color:var(--accent)}
.brand-sub{font-size:11.5px;color:var(--muted);margin:0 6px 14px}
.toc-l2,.toc-l3{display:block;padding:5px 8px;border-radius:7px;color:var(--muted);
  text-decoration:none;font-size:13px;border-left:2px solid transparent}
.toc-l3{padding-left:20px;font-size:12.5px}
.toc-l2:hover,.toc-l3:hover{background:var(--bg);color:var(--ink)}
.toc-l2.active{color:var(--ink);font-weight:700;border-left-color:var(--accent);background:var(--bg)}
/* main */
.main{flex:1;min-width:0;padding:0 4vw 90px}
.topbar{position:sticky;top:0;display:flex;justify-content:flex-end;gap:8px;
  padding:12px 0;background:linear-gradient(var(--bg) 70%,transparent);z-index:4}
.btn{border:1px solid var(--line);background:var(--panel);color:var(--ink);
  border-radius:999px;padding:7px 14px;font-size:13px;cursor:pointer;box-shadow:var(--shadow)}
.btn:hover{border-color:var(--accent)}
.content{max-width:980px;margin:0 auto}
/* cover */
.cover{background:var(--panel);border:1px solid var(--line);border-radius:18px;
  padding:34px 36px;box-shadow:var(--shadow);margin:6px 0 30px;
  display:grid;grid-template-columns:1fr auto;gap:26px;align-items:center}
.cover h1{margin:0 0 6px;font-size:30px;letter-spacing:-.6px}
.cover .sub{color:var(--muted);font-size:14.5px;margin:0 0 16px}
.meta-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px 18px;font-size:13.5px}
.meta-grid b{display:block;color:var(--muted);font-weight:600;font-size:11.5px;text-transform:uppercase;letter-spacing:.6px}
.score-badge{text-align:center}
.score-badge .cap{font-size:12px;color:var(--muted);margin-top:6px}
/* headings */
h2{font-size:23px;letter-spacing:-.4px;margin:46px 0 14px;padding-top:14px;border-top:2px solid var(--line)}
h3{font-size:17.5px;margin:30px 0 10px}
h4{font-size:15px;margin:20px 0 8px}
p,li{color:var(--ink)}
/* tables */
table{border-collapse:collapse;width:100%;margin:14px 0;font-size:13.8px;background:var(--panel)}
th,td{border:1px solid var(--line);padding:8px 10px;text-align:left;vertical-align:top}
th{background:var(--bg);font-size:12.5px;text-transform:uppercase;letter-spacing:.4px;color:var(--muted)}
tr:nth-child(even) td{background:color-mix(in srgb,var(--bg) 55%,transparent)}
/* code */
code{background:var(--bg);border:1px solid var(--line);padding:1px 5px;border-radius:5px;
  font:12.5px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
pre{background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:14px 16px;
  overflow:auto;font:12.5px/1.6 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
pre code{border:0;background:none;padding:0}
blockquote{border-left:3px solid var(--accent);margin:14px 0;padding:4px 16px;color:var(--muted)}
/* sev strip + gauges */
.sev-strip{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0 6px}
.sev-tile{flex:1;min-width:100px;background:var(--panel);border:1px solid var(--line);
  border-radius:13px;padding:12px 14px;text-align:center;box-shadow:var(--shadow)}
.sev-tile b{font-size:24px;display:block}
.sev-tile span{font-size:11.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.7px}
.sev-tile.sev-critical,.sev-tile.sev-high{border-top:3px solid var(--crit)}
.sev-tile.sev-medium{border-top:3px solid var(--medium)}
.sev-tile.sev-low{border-top:3px solid var(--low)}
.sev-tile.sev-info{border-top:3px solid var(--info)}
.gauge-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:14px;margin:16px 0}
.gauge-cell{background:var(--panel);border:1px solid var(--line);border-radius:14px;
  padding:16px 10px 14px;text-align:center;box-shadow:var(--shadow)}
.gauge-label{font-size:12.8px;font-weight:700;margin-top:6px}
.gauge-label span{display:block;font-weight:500;color:var(--muted);font-size:11px;margin-top:2px}
.bar-row{display:grid;grid-template-columns:230px 1fr 34px;gap:10px;align-items:center;margin:7px 0;font-size:13.2px}
.bar-track{background:var(--track);border-radius:99px;height:14px;overflow:hidden}
.bar-fill{display:block;height:100%;border-radius:99px}
.bar-val{font-weight:800;text-align:right}
/* findings */
.findings-ui{margin-top:8px}
.filterbar{position:sticky;top:52px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;
  background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:10px 12px;
  box-shadow:var(--shadow);z-index:3;margin-bottom:6px}
.filterbar input[type=search]{flex:1;min-width:190px;border:1px solid var(--line);border-radius:9px;
  background:var(--bg);color:var(--ink);padding:8px 12px;font-size:13.5px}
.filterbar select{border:1px solid var(--line);border-radius:9px;background:var(--bg);
  color:var(--ink);padding:8px 10px;font-size:13.5px}
.chips{display:flex;gap:6px;flex-wrap:wrap}
.chip{border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:999px;
  padding:6px 12px;font-size:12.5px;cursor:pointer;opacity:.55}
.chip[aria-pressed=true]{opacity:1;font-weight:700;border-color:currentColor}
.chip-critical[aria-pressed=true],.chip-high[aria-pressed=true]{background:var(--crit);color:#fff;border-color:var(--crit)}
.chip-medium[aria-pressed=true]{background:var(--medium);color:#1a1200;border-color:var(--medium)}
.chip-low[aria-pressed=true]{background:var(--low);color:#fff;border-color:var(--low)}
.chip-info[aria-pressed=true]{background:var(--info);color:#fff;border-color:var(--info)}
.chip-plain{opacity:.8}
.filter-hint{font-size:12.5px;color:var(--muted);margin:4px 2px 12px}
.fgroup h3{display:flex;align-items:center;gap:10px;margin:34px 0 10px}
.cat-count{background:var(--track);color:var(--muted);border-radius:99px;font-size:11.5px;padding:2px 9px;font-weight:700}
.fcard{background:var(--panel);border:1px solid var(--line);border-radius:13px;margin:9px 0;
  box-shadow:var(--shadow);overflow:hidden;border-left:5px solid var(--info)}
.fcard.sev-critical,.fcard.sev-high{border-left-color:var(--crit)}
.fcard.sev-medium{border-left-color:var(--medium)}
.fcard.sev-low{border-left-color:var(--low)}
.fcard[hidden]{display:none}
.fcard summary{cursor:pointer;list-style:none;display:flex;gap:10px;align-items:center;
  padding:12px 15px;flex-wrap:wrap}
.fcard summary::-webkit-details-marker{display:none}
.fcard summary::before{content:"▸";color:var(--muted);font-size:12px;transition:.15s}
.fcard[open] summary::before{transform:rotate(90deg)}
.fid{font:800 12.5px ui-monospace,Menlo,monospace;color:var(--muted);background:var(--bg);
  border:1px solid var(--line);padding:2px 7px;border-radius:6px}
.ftitle{font-weight:700;font-size:14.5px;flex:1;min-width:220px}
.badges{display:flex;gap:6px;flex-wrap:wrap}
.sev,.conf,.effort{font-size:11px;font-weight:800;padding:3px 9px;border-radius:99px;letter-spacing:.3px}
.sev-critical,.sev-high{background:var(--crit);color:#fff}
.sev-medium{background:var(--medium);color:#1a1200}
.sev-low{background:var(--low);color:#fff}
.sev-info{background:var(--info);color:#fff}
.conf{background:var(--bg);border:1px solid var(--line);color:var(--muted);font-weight:700}
.effort{background:transparent;border:1px dashed var(--line);color:var(--muted);font-weight:700}
.fbody{padding:2px 16px 15px;border-top:1px solid var(--line)}
.kv{display:grid;grid-template-columns:130px 1fr;gap:4px 14px;padding:7px 0;border-bottom:1px dashed var(--line);font-size:13.7px}
.kv:last-child{border-bottom:0}
.k{color:var(--muted);font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.5px;padding-top:2px}
.v{white-space:pre-wrap;word-break:break-word}
/* misc */
details.toc-mobile{display:none}
hr{border:0;border-top:1px solid var(--line);margin:30px 0}
.footer{color:var(--muted);font-size:12.5px;text-align:center;margin-top:60px}
.callout{background:var(--panel);border:1px solid var(--line);border-left:4px solid var(--accent);
  border-radius:10px;padding:12px 16px;margin:14px 0;font-size:14px}
/* responsive */
@media(max-width:980px){
  .sidebar{display:none}
  .main{padding:0 16px 80px}
  .cover{grid-template-columns:1fr;text-align:left}
  .bar-row{grid-template-columns:1fr;gap:3px}
  .bar-name{font-size:12.5px;color:var(--muted)}
  .kv{grid-template-columns:1fr}
  details.toc-mobile{display:block;background:var(--panel);border:1px solid var(--line);
    border-radius:12px;padding:10px 14px;margin:10px 0}
  details.toc-mobile summary{font-weight:700;cursor:pointer}
}
@media print{
  .sidebar,.topbar,.filterbar,.filter-hint{display:none!important}
  .main{padding:0}
  body{background:#fff;font-size:11.5px}
  .fcard,.cover,.sev-tile,.gauge-cell{box-shadow:none}
  .fcard{break-inside:avoid}
  h2{break-after:avoid}
  a{text-decoration:none;color:inherit}
}
"""

JS = """
const $=(s,el=document)=>el.querySelector(s), $$=(s,el=document)=>[...el.querySelectorAll(s)];
// theme
const themeBtn=$('#themeBtn');
function setTheme(t){document.documentElement.dataset.theme=t;
  themeBtn.textContent=t==='dark'?'☀ Light':'🌙 Dark';
  localStorage.setItem('audit-theme',t);}
setTheme(localStorage.getItem('audit-theme') ||
  (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
themeBtn.onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
// filters
const cards=$$('.fcard'), sevBtns=$$('.chip[data-sevfilter]');
const state={q:'',cat:'',sev:new Set(['Critical','High','Medium','Low','Info'])};
function applyFilter(){
  let shown=0;
  for(const c of cards){
    const okSev=state.sev.has(c.dataset.sev);
    const okCat=!state.cat||c.dataset.cat===state.cat;
    const okQ=!state.q||c.textContent.toLowerCase().includes(state.q);
    const ok=okSev&&okCat&&okQ;
    c.hidden=!ok; if(ok)shown++;
  }
  $$('.fgroup').forEach(g=>{
    g.hidden=!$$('.fcard',g).some(c=>!c.hidden);
  });
  $('#filterCount').textContent=shown+' findings shown'+((state.q||state.cat||state.sev.size<5)?' (filtered)':'');
}
$('#fSearch').addEventListener('input',e=>{state.q=e.target.value.trim().toLowerCase();applyFilter();});
$('#fCat').addEventListener('change',e=>{state.cat=e.target.value;applyFilter();});
sevBtns.forEach(b=>b.addEventListener('click',()=>{
  const s=b.dataset.sevfilter, on=b.getAttribute('aria-pressed')==='true';
  if(on)state.sev.delete(s); else state.sev.add(s);
  b.setAttribute('aria-pressed',String(!on)); applyFilter();
}));
$('#expandAll').onclick=()=>{$$('.fcard:not([hidden])').forEach(c=>c.open=true);};
$('#collapseAll').onclick=()=>{$$('.fcard').forEach(c=>c.open=false);};
// toc scroll spy
const tocLinks=$$('.sidebar a[href^="#"]');
const heads=tocLinks.map(a=>document.getElementById(a.hash.slice(1))).filter(Boolean);
function spy(){
  let cur=heads[0];
  for(const h of heads){ if(h.getBoundingClientRect().top<130)cur=h; }
  tocLinks.forEach(a=>a.classList.toggle('active',a.hash==='#'+(cur&&cur.id)));
}
addEventListener('scroll',spy,{passive:true}); spy();
// print: expand everything
addEventListener('beforeprint',()=>$$('.fcard').forEach(c=>c.open=true));
"""

sev_strip_block = f'<div class="sev-strip">{sev_strip}</div>'

findings_head = f'''
<div class="callout"><b>Interactive finding browser:</b> search/filter (severity × category) — 
{len(findings)} findings total, Critical/High khule hue baqi collapsible hain. 
Same data machine-readable: <code>findings.json</code>.</div>
{sev_strip_block}
'''

# inject findings block with heading + strip
body = body.replace('<div class="findings-ui">', findings_head + '<div class="findings-ui">')

# gauges into scorecard section: append after first "## 3. Scorecard" heading
gauges_block = f'''
<div class="gauge-grid">
  <div class="gauge-cell" style="border:2px solid var(--accent)">
    <div class="gauge">{gauge_overall}</div>
    <div class="gauge-label">OVERALL<span>Weighted · 2 categories Partial</span></div>
  </div>
  {gauges}
</div>
<h3>Score bars</h3>
{bars}
'''
body = body.replace("<h2 id=\"3-scorecard\">", gauges_block + '<h2 id="3-scorecard">', 1) \
    if '<h2 id="3-scorecard">' in body else body.replace("## 3. Scorecard", gauges_block + "## 3. Scorecard", 1)
# (markdown toc ext assigns ids; handle either)
if gauges_block not in body:
    body = re.sub(r'(<h2[^>]*>3\. Scorecard</h2>)', gauges_block + r'\1', body, count=1)

cover = f'''
<header class="cover" id="cover">
  <div>
    <h1>xSypher <span style="color:var(--accent)">·</span> Production Audit</h1>
    <p class="sub">Evidence-based, read-only audit — Technical SEO · AEO · GEO · Performance · Security · Code · CMS</p>
    <div class="meta-grid">
      <div><b>Site</b>https://xsypher.com</div>
      <div><b>Audit date</b>13 October 2026</div>
      <div><b>Stack</b>Next.js 16 · Docker/VPS · Cloudflare</div>
      <div><b>Monetization</b>AdSense</div>
      <div><b>Repo</b>github.com/anwariqbaldawar/xCipher</div>
      <div><b>Findings</b>{len(findings)} ({counts.get("Critical",0)} Critical · {counts.get("High",0)} High)</div>
    </div>
  </div>
  <div class="score-badge">
    <svg viewBox="0 0 170 170" width="170" height="170" aria-label="Overall score {overall} of 100">
      <circle cx="85" cy="85" r="71" fill="none" stroke="var(--track)" stroke-width="15"/>
      <circle cx="85" cy="85" r="71" fill="none" stroke="#f5a623" stroke-width="15"
        stroke-dasharray="{2*3.14159*71*overall/100:.1f} {2*3.14159*71*(100-overall)/100:.1f}"
        stroke-linecap="round" transform="rotate(-90 85 85)"/>
      <text x="85" y="83" text-anchor="middle" font-size="46" font-weight="900" fill="var(--ink)">{overall}</text>
      <text x="85" y="106" text-anchor="middle" font-size="12" fill="var(--muted)">/ 100</text>
    </svg>
    <div class="cap">Overall weighted health</div>
  </div>
</header>
'''

toc_mobile = f'<details class="toc-mobile"><summary>📑 Contents</summary>{toc_html}</details>'

html_doc = f'''<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>xSypher Audit Report — 13 Oct 2026</title>
<style>{CSS}</style>
</head>
<body>
<div class="layout">
<nav class="sidebar" aria-label="Table of contents">
  <p class="brand">x<span>Sypher</span> Audit</p>
  <p class="brand-sub">Report · 13 Oct 2026 · 62/100</p>
  <a class="toc-l2" href="#cover">Cover</a>
  {toc_html}
</nav>
<div class="main">
  <div class="topbar">
    <button class="btn" id="themeBtn">🌙 Dark</button>
    <button class="btn" onclick="window.print()">🖨 Print / PDF</button>
  </div>
  <div class="content">
    {cover}
    {toc_mobile}
    {body}
    <p class="footer">xSypher Production Audit · generated 2026-10-13 · evidence-first, read-only · companion files: report.md, findings.json, fixes/</p>
  </div>
</div>
<script>{JS}</script>
</body>
</html>
'''

out = ROOT / "report.html"
out.write_text(html_doc, encoding="utf-8")
print(f"wrote {out} ({out.stat().st_size:,} bytes)")
