// 使い方: node carousel/render.cjs <deck.json> [出力フォルダ]
// deck.json の文章・数値を書き換えるだけで、1080x1350 のカルーセル画像を一括生成します。
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const [deckPath, outArg] = process.argv.slice(2);
if (!deckPath) { console.error('usage: node render.cjs <deck.json> [outDir]'); process.exit(1); }
const deck = JSON.parse(fs.readFileSync(deckPath, 'utf-8'));
const outDir = outArg || path.join(path.dirname(deckPath), path.basename(deckPath, '.json') + '-out');
fs.mkdirSync(outDir, { recursive: true });

const T = Object.assign({ bg: '#0f172a', fg: '#f8fafc', muted: '#94a3b8', accent: '#fbbf24', line: '#38bdf8', font: "'IPAPGothic','IPAGothic','Noto Sans JP',sans-serif" }, deck.theme);
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// **強調** を色付き太字に
const rich = s => esc(s).replace(/\*\*(.+?)\*\*/g, `<b style="color:${T.accent}">$1</b>`).replace(/\n/g, '<br>');

// Catmull-Rom → ベジェで滑らかな曲線
function smooth(pts) {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6}, ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

// 図(荷物の積み上げ / 曲線)。P は配色。どのスタイルからも使えます
const P0 = () => ({ ink: T.fg, axis: T.muted, boxes: [T.accent, T.line, '#f87171', '#4ade80'], boxText: '#0f172a', limit: '#f87171', series: [T.line, T.accent, '#f87171'], mark: T.accent, weight: 9, fs: 30 });
function figCurve(s, P, W = 940) {
  const H = 560, pad = 40;
  const sx = x => pad + (x / 100) * (W - pad * 2), sy = y => H - pad - (y / 100) * (H - pad * 2);
  const series = (s.series || [{ points: s.points }]).map((se, i) => {
    const col = se.color || P.series[i % P.series.length];
    const pts = se.points.map(([x, y]) => [sx(x), sy(y)]);
    return `<path d="${smooth(pts)}" fill="none" stroke="${col}" stroke-width="${P.weight}" stroke-linecap="round"/>` +
      (se.label ? (lp => `<text x="${lp[0] - 10}" y="${lp[1] - 24}" text-anchor="end" font-size="${P.fs}" fill="${col}">${esc(se.label)}</text>`)(pts[se.labelAt ?? pts.length - 1]) : '');
  }).join('');
  const marks = (s.marks || []).map(m => `<circle cx="${sx(m.x)}" cy="${sy(m.y)}" r="12" fill="${P.mark}"/><text x="${sx(m.x)}" y="${sy(m.y) - 28}" text-anchor="middle" font-size="${P.fs}" fill="${P.mark}">${esc(m.label)}</text>`).join('');
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <line x1="${pad}" y1="${H - pad}" x2="${W - pad}" y2="${H - pad}" stroke="${P.axis}" stroke-width="2"/>
    <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${H - pad}" stroke="${P.axis}" stroke-width="2"/>
    ${series}${marks}
    <text x="${W - pad}" y="${H - 4}" text-anchor="end" font-size="${P.fs - 2}" fill="${P.axis}">${esc(s.xLabel)}</text>
    <text x="${pad + 12}" y="${pad + 6}" font-size="${P.fs - 2}" fill="${P.axis}">${esc(s.yLabel)}</text></svg>`;
}
function figLoad(s, P, W = 940) {
  const H = 520, base = H - 40, unit = (H - 120) / (s.limit * 1.15), cx = W / 2;
  let y = base; const boxes = s.items.map((it, i) => {
    const h = it.weight * unit; y -= h;
    const last = P.accentLast && i === s.items.length - 1;
    return `<rect x="${cx - 190}" y="${y}" width="380" height="${h - 4}" rx="${P.round ?? 8}" fill="${last ? P.limit : P.boxes[i % P.boxes.length]}"/><text x="${cx}" y="${y + h / 2 + 8}" text-anchor="middle" font-size="${P.fs - 1}" fill="${last ? '#fff' : P.boxText}">${esc(it.label)}</text>`;
  }).join('');
  const ly = base - s.limit * unit;
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <line x1="${cx - 320}" y1="${ly}" x2="${cx + 240}" y2="${ly}" stroke="${P.limit}" stroke-width="3" stroke-dasharray="12 9"/>
    <line x1="${cx - 270}" y1="${base}" x2="${cx + 270}" y2="${base}" stroke="${P.ink}" stroke-width="${P.baseW ?? 10}" stroke-linecap="round"/>${boxes}
    <text x="${cx + 250}" y="${ly + 10}" font-size="${P.fs}" fill="${P.limit}">${esc(s.limitLabel || '上限')}</text></svg>`;
}

const types = {
  cover: s => `<div class=box style="top:200px"><div class=tag>${esc(s.tag)}</div><h1 style="font-size:96px">${rich(s.title)}</h1></div>
    ${s.subtitle ? `<div class="box m" style="top:1100px">${rich(s.subtitle)}</div>` : ''}`,
  text: s => `${head(s)}<div class="box p" style="top:400px">${rich(s.body)}</div>`,
  bullets: s => `${head(s)}<div class="box" style="top:380px">${s.items.map((it, i) =>
    `<div style="margin-bottom:56px"><div class=p><span style="color:${T.accent}">${i + 1}</span>　${rich(it.text)}</div>${it.note ? `<div class=m>${rich(it.note)}</div>` : ''}</div>`).join('')}</div>`,
  // curve: points は [[x,y],...] を 0〜100 の範囲で指定(y は大きいほど上)
  curve: s => `${head(s)}<div class=box style="top:400px">${figCurve(s, P0())}</div>
    ${s.caption ? `<div class="box p" style="top:1020px;font-size:36px">${rich(s.caption)}</div>` : ''}`,
  // load: 荷物(箱)を並べて「合計の重さ」と上限ラインを見せる図。items は {label, weight}、limit が上限
  load: s => `${head(s)}<div class=box style="top:400px">${figLoad(s, P0())}</div>
    ${s.caption ? `<div class="box p" style="top:1000px;font-size:36px">${rich(s.caption)}</div>` : ''}`,
};
const head = s => `<div class=box style="top:90px">${s.tag ? `<div class=tag>${esc(s.tag)}</div>` : ''}<h1>${rich(s.title)}</h1></div>`;

const page = (inner, n, total) => `<!doctype html><meta charset=utf-8><style>
body{margin:0;width:1080px;height:1350px;background:${T.bg};color:${T.fg};font-family:${T.font};position:relative;overflow:hidden}
h1{font-size:70px;margin:0;line-height:1.3}.box{position:absolute;left:70px;right:70px}
.tag{color:${T.accent};font-size:34px;letter-spacing:2px;margin-bottom:8px}.p{font-size:42px;line-height:1.6}.m{color:${T.muted};font-size:30px;line-height:1.5}
.ft{position:absolute;bottom:50px;left:70px;right:70px;display:flex;justify-content:space-between;color:${T.muted};font-size:28px}
.note{position:absolute;bottom:110px;left:70px;right:70px;color:${T.muted};font-size:26px;line-height:1.5}
</style>${inner}${deck.note && n === total ? `<div class=note>${esc(deck.note)}</div>` : ''}
<div class=ft><span>${esc(deck.brand || '')}</span><span>${n} / ${total}</span></div>`;

// ───────── editorial スタイル(細い明朝体・罫線・淡い背景のミニマルな見た目) ─────────
const E = Object.assign({ coverBg: '#5f7468', bg: '#eef1ec', ink: '#2f3a34', mid: '#5b655f', dim: '#aab3ac', accent: '#9c6b2f', rule: '#c9cfca', boxes: ['#cfd9d1', '#b4c4b9', '#9bb0a2'] }, deck.palette);
const here = __dirname;
function serifCss() {
  const dir = path.join(here, 'node_modules', '@fontsource', 'noto-serif-jp');
  if (!fs.existsSync(dir)) { console.warn('明朝体が見つかりません。carousel で `npm install` を実行してください(代わりにゴシック体で出力します)'); return ''; }
  return [300, 400].map(w => fs.readFileSync(path.join(dir, `${w}.css`), 'utf-8')
    .replace(/, url\(\.\/files\/[^)]*\.woff\) format\('woff'\)/g, '')
    .replace(/url\(\.\/files\//g, `url(file://${dir}/files/`)).join('\n');
}
const FONT = `'Noto Serif JP','IPAMincho','IPAPMincho',${T.font}`;
const eRich = (s, col) => esc(s).replace(/\*\*(.+?)\*\*/g, `<b style="font-weight:400;color:${col}">$1</b>`);
// 行の先頭記号: # 大見出し / ^ 導入 / ~ 薄い文字 / ! 強調色 / 記号なし 通常 / 空文字 余白
function eLines(lines, cover) {
  return lines.map(l => {
    if (l === '') return '<div style="height:44px"></div>';
    const k = l[0], t = '#^~!'.includes(k) ? l.slice(1) : l, c = cover ? 'cv' : '';
    const cls = { '#': 'et', '^': 'el', '~': 'ed', '!': 'ea' }[k] || 'en';
    return `<div class="${cls} ${c}">${eRich(t, cover ? '#fff' : E.accent).replace(/\n/g, '<br>')}</div>`;
  }).join('');
}
function ePage(s, n, total) {
  const cover = s.variant === 'cover', end = s.variant === 'end' || n === total && s.variant !== 'cover';
  const bg = cover ? E.coverBg : E.bg, line = cover ? 'rgba(255,255,255,.55)' : E.rule, fg = cover ? '#fff' : E.ink;
  const P = { ink: E.ink, axis: E.dim, boxes: E.boxes, boxText: E.ink, limit: E.accent, series: [E.coverBg, E.accent], mark: E.accent, weight: 5, fs: 28, round: 3, baseW: 4, accentLast: true };
  const fig = s.figure ? `<div style="margin-top:36px">${s.figure.kind === 'curve' ? figCurve(s.figure, P, 904) : figLoad(s.figure, P, 904)}</div>` : '';
  const arrow = `<svg style="position:absolute;left:940px;top:1228px" width="72" height="24"><line x1="0" y1="12" x2="70" y2="12" stroke="${fg}" stroke-width="1.5"/><polyline points="58,2 70,12 58,22" fill="none" stroke="${fg}" stroke-width="1.5"/></svg>`;
  const deco = cover ? `<svg style="position:absolute;left:0;top:0" width="1080" height="1350"><circle cx="960" cy="1090" r="340" fill="none" stroke="${line}" stroke-width="1.5"/><circle cx="960" cy="1090" r="230" fill="none" stroke="${line}" stroke-width="1.5"/></svg>`
    : end ? `<svg style="position:absolute;left:0;top:0" width="1080" height="1350"><circle cx="540" cy="1230" r="400" fill="none" stroke="${line}"/><circle cx="540" cy="1230" r="260" fill="none" stroke="${line}"/></svg>`
    : `<svg style="position:absolute;left:0;top:0" width="1080" height="1350"><circle cx="1040" cy="1310" r="420" fill="none" stroke="${line}"/></svg>`;
  const foot = end ? `<div style="position:absolute;left:88px;right:87px;top:1200px;border-top:1px solid ${E.rule}"></div>
    <div class=ef style="left:88px">${esc(deck.brand || '')}</div><div class=ef style="right:87px">${esc(deck.location || '')}</div>`
    : `${!cover && (s.note || deck.note) ? `<div class=ef style="left:88px;color:${E.dim};font-size:24px;letter-spacing:.04em">${esc(s.note || deck.note)}</div>` : ''}${arrow}`;
  return `<!doctype html><meta charset=utf-8><style>${serifCss()}
body{margin:0;width:1080px;height:1350px;background:${bg};color:${fg};font-family:${FONT};font-weight:300;position:relative;overflow:hidden}
.hd{position:absolute;left:88px;top:94px;display:flex;align-items:center;gap:18px;font-size:27px;letter-spacing:.42em;color:${cover ? 'rgba(255,255,255,.85)' : E.mid}}
.hd i{display:block;width:6px;height:30px;background:${cover ? '#fff' : E.mid}}
.rl{position:absolute;left:88px;right:87px;top:150px;border-top:1px solid ${line}}
.bd{position:absolute;left:88px;right:88px;top:${cover ? 380 : 230}px;line-height:1.75}
.et{font-size:${cover ? 62 : 54}px;line-height:1.55;font-weight:400;letter-spacing:.06em;margin:18px 0 10px}.el{font-size:40px;letter-spacing:.06em}
.en{font-size:32px;letter-spacing:.05em;color:${E.mid}}.ed{font-size:32px;letter-spacing:.05em;color:${E.dim}}.ea{font-size:36px;letter-spacing:.05em;color:${E.accent}}
.cv.en,.cv.el{color:#fff}.cv.ed{color:rgba(255,255,255,.6)}.cv.ea{color:#fff}
.ef{position:absolute;top:${end ? 1226 : 1256}px;font-size:28px;color:${E.mid};letter-spacing:.06em}
</style>${deco}
<div class=hd><i></i><span>${esc(s.label || '')}</span></div><div class=rl></div>
<div class=bd>${eLines(s.lines || [], cover)}${fig}${s.after ? `<div style="margin-top:20px">${eLines(s.after, cover)}</div>` : ''}</div>${foot}`;
}

(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'carousel-'));
  for (const [i, s] of deck.slides.entries()) {
    let html;
    if (deck.style === 'editorial') html = ePage(s, i + 1, deck.slides.length);
    else {
      if (!types[s.type]) throw new Error(`slide ${i + 1}: 不明な type "${s.type}" (使えるのは ${Object.keys(types).join(', ')})`);
      html = page(types[s.type](s), i + 1, deck.slides.length);
    }
    const f = path.join(tmp, 'slide.html'); fs.writeFileSync(f, html);
    await pg.goto('file://' + f); await pg.evaluate(() => document.fonts.ready);
    await pg.screenshot({ path: path.join(outDir, `slide${i + 1}.png`) });
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  await b.close(); console.log(`${deck.slides.length}枚を ${outDir} に出力しました`);
})();
