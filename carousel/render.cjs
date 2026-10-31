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

const types = {
  cover: s => `<div class=box style="top:200px"><div class=tag>${esc(s.tag)}</div><h1 style="font-size:96px">${rich(s.title)}</h1></div>
    ${s.subtitle ? `<div class="box m" style="top:1100px">${rich(s.subtitle)}</div>` : ''}`,
  text: s => `${head(s)}<div class="box p" style="top:400px">${rich(s.body)}</div>`,
  bullets: s => `${head(s)}<div class="box" style="top:380px">${s.items.map((it, i) =>
    `<div style="margin-bottom:56px"><div class=p><span style="color:${T.accent}">${i + 1}</span>　${rich(it.text)}</div>${it.note ? `<div class=m>${rich(it.note)}</div>` : ''}</div>`).join('')}</div>`,
  // curve: points は [[x,y],...] を 0〜100 の範囲で指定(y は大きいほど上)
  curve: s => {
    const W = 940, H = 560, pad = 40;
    const sx = x => pad + (x / 100) * (W - pad * 2), sy = y => H - pad - (y / 100) * (H - pad * 2);
    const series = (s.series || [{ points: s.points }]).map((se, i) => {
      const col = se.color || [T.line, T.accent, '#f87171'][i % 3];
      const pts = se.points.map(([x, y]) => [sx(x), sy(y)]);
      return `<path d="${smooth(pts)}" fill="none" stroke="${col}" stroke-width="9" stroke-linecap="round"/>` +
        (se.label ? `<text x="${pts[pts.length - 1][0] - 10}" y="${pts[pts.length - 1][1] - 22}" text-anchor="end" font-size="30" fill="${col}">${esc(se.label)}</text>` : '');
    }).join('');
    const marks = (s.marks || []).map(m => `<circle cx="${sx(m.x)}" cy="${sy(m.y)}" r="12" fill="${T.accent}"/><text x="${sx(m.x)}" y="${sy(m.y) - 28}" text-anchor="middle" font-size="30" fill="${T.accent}">${esc(m.label)}</text>`).join('');
    return `${head(s)}<svg class=box style="top:400px" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <line x1="${pad}" y1="${H - pad}" x2="${W - pad}" y2="${H - pad}" stroke="${T.muted}" stroke-width="3"/>
      <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${H - pad}" stroke="${T.muted}" stroke-width="3"/>
      ${series}${marks}
      <text x="${W - pad}" y="${H - 4}" text-anchor="end" font-size="28" fill="${T.muted}">${esc(s.xLabel)}</text>
      <text x="${pad + 12}" y="${pad + 6}" font-size="28" fill="${T.muted}">${esc(s.yLabel)}</text></svg>
      ${s.caption ? `<div class="box p" style="top:1020px;font-size:36px">${rich(s.caption)}</div>` : ''}`;
  },
  // load: 荷物(箱)を並べて「合計の重さ」と上限ラインを見せる図。items は {label, weight}、limit が上限
  load: s => {
    const W = 940, H = 520, base = H - 40, unit = (H - 120) / (s.limit * 1.15);
    let y = base; const boxes = s.items.map((it, i) => {
      const h = it.weight * unit; y -= h;
      const cols = [T.accent, T.line, '#f87171', '#4ade80'];
      return `<rect x="280" y="${y}" width="380" height="${h - 4}" rx="8" fill="${cols[i % 4]}"/><text x="470" y="${y + h / 2 + 8}" text-anchor="middle" font-size="32" fill="#0f172a">${esc(it.label)}</text>`;
    }).join('');
    const ly = base - s.limit * unit;
    return `${head(s)}<svg class=box style="top:400px" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <line x1="200" y1="${base}" x2="740" y2="${base}" stroke="${T.fg}" stroke-width="10" stroke-linecap="round"/>${boxes}
      <line x1="150" y1="${ly}" x2="790" y2="${ly}" stroke="#f87171" stroke-width="4" stroke-dasharray="14 10"/>
      <text x="800" y="${ly + 10}" font-size="30" fill="#f87171">${esc(s.limitLabel || '上限')}</text></svg>
      ${s.caption ? `<div class="box p" style="top:1000px;font-size:36px">${rich(s.caption)}</div>` : ''}`;
  },
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

(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  for (const [i, s] of deck.slides.entries()) {
    if (!types[s.type]) throw new Error(`slide ${i + 1}: 不明な type "${s.type}" (使えるのは ${Object.keys(types).join(', ')})`);
    await pg.setContent(page(types[s.type](s), i + 1, deck.slides.length));
    await pg.screenshot({ path: path.join(outDir, `slide${i + 1}.png`) });
  }
  await b.close(); console.log(`${deck.slides.length}枚を ${outDir} に出力しました`);
})();
