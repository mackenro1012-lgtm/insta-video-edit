const { chromium } = require('playwright');
const fs = require('fs');
const BG='#0f172a', FG='#f8fafc', MUT='#94a3b8', ACC='#fbbf24', BLU='#38bdf8', RED='#f87171', GRN='#4ade80';
const wrap = (inner, n) => `<!doctype html><meta charset=utf-8><style>
body{margin:0;width:1080px;height:1350px;background:${BG};color:${FG};font-family:'IPAPGothic','IPAGothic',sans-serif;position:relative;overflow:hidden}
h1{font-size:76px;margin:0;line-height:1.25}
.s{position:absolute;left:70px;right:70px}
.tag{color:${ACC};font-size:34px;letter-spacing:2px}
.p{font-size:40px;line-height:1.6;color:${FG}}
.m{color:${MUT};font-size:30px}
.pg{position:absolute;bottom:50px;right:70px;color:${MUT};font-size:30px}
.sw{position:absolute;bottom:50px;left:70px;color:${MUT};font-size:30px}
</style>${inner}<div class=pg>${n} / 5</div>${n<5?'<div class=sw>スワイプ →</div>':''}`;
// beam helpers (svg 940 wide)
const beamBase = (load) => `
<line x1="60" y1="200" x2="880" y2="200" stroke="${FG}" stroke-width="14" stroke-linecap="round"/>
<polygon points="60,214 30,260 90,260" fill="${MUT}"/><polygon points="880,214 850,260 910,260" fill="${MUT}"/>
<circle cx="880" cy="270" r="10" fill="${MUT}"/>`;
const box = `<rect x="395" y="110" width="150" height="82" rx="6" fill="${ACC}"/><line x1="395" y1="140" x2="545" y2="140" stroke="#b45309" stroke-width="4"/><line x1="470" y1="110" x2="470" y2="140" stroke="#b45309" stroke-width="4"/>
<text x="470" y="175" text-anchor="middle" font-size="30" fill="#0f172a">荷物 P</text>`;
const arrow=(x,y1,y2,c,t)=>`<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${c}" stroke-width="7"/><polygon points="${x-14},${y2-4} ${x+14},${y2-4} ${x},${y2+22}" fill="${c}" transform="${y2<y1?`rotate(180 ${x} ${y2+9})`:''}"/>${t?`<text x="${x+22}" y="${(y1+y2)/2+10}" font-size="30" fill="${c}">${t}</text>`:''}`;
// slide 2: load diagram
const s2 = wrap(`
<div class=s style="top:90px"><div class=tag>① 荷重図</div><h1>まず「何が、どこに<br>かかるか」を描く</h1></div>
<svg class=s style="top:420px" width="940" height="450" viewBox="0 0 940 450">
${beamBase()}${box}
${arrow(470,10,100,ACC,'')}
<line x1="60" y1="340" x2="60" y2="296" stroke="${GRN}" stroke-width="7"/><polygon points="46,302 74,302 60,272" fill="${GRN}"/><text x="60" y="372" text-anchor="middle" font-size="30" fill="${GRN}">P/2</text>
<line x1="880" y1="340" x2="880" y2="296" stroke="${GRN}" stroke-width="7"/><polygon points="866,302 894,302 880,272" fill="${GRN}"/><text x="880" y="372" text-anchor="middle" font-size="30" fill="${GRN}">P/2</text>
<line x1="60" y1="395" x2="880" y2="395" stroke="${MUT}" stroke-width="3"/><text x="470" y="430" text-anchor="middle" font-size="30" fill="${MUT}">長さ L</text>
</svg>
<div class="s p" style="top:900px">棚の中央に荷物(重さ P)。<br>両端の支えが <span style="color:${GRN}">P/2 ずつ</span>分担して受けます。</div>`,2);
// slide 3: moment + deflection (center load)
const mom = (pts)=>pts;
const s3 = wrap(`
<div class=s style="top:90px"><div class=tag>② 曲線で見る</div><h1>荷物が真ん中だと<br>ここが一番ツラい</h1></div>
<svg class=s style="top:360px" width="940" height="760" viewBox="0 0 940 760">
<text x="0" y="30" font-size="32" fill="${BLU}">曲げモーメント図(三角形)</text>
<line x1="60" y1="70" x2="880" y2="70" stroke="${MUT}" stroke-width="3"/>
<polygon points="60,70 470,290 880,70" fill="${BLU}" opacity=".25" stroke="${BLU}" stroke-width="5"/>
<text x="470" y="330" text-anchor="middle" font-size="30" fill="${BLU}">最大 = PL/4(中央)</text>
<text x="0" y="440" font-size="32" fill="${RED}">たわみ曲線</text>
<line x1="60" y1="490" x2="880" y2="490" stroke="${MUT}" stroke-width="3" stroke-dasharray="10 8"/>
<path id="d" d="${(()=>{let p='';for(let i=0;i<=40;i++){const x=i/40;const u=x<=.5?x:1-x;const y=(3*x-4*x**3)*(x<=.5?1:0)+(x>.5?(3*(1-x)-4*(1-x)**3):0);p+=(i?'L':'M')+(60+820*x).toFixed(1)+' '+(490+y*3.0*200/1*0.5*0+y*220/1*1).toFixed(1)+' ';}return p})()}" fill="none" stroke="${RED}" stroke-width="8"/>
<text x="470" y="740" text-anchor="middle" font-size="30" fill="${RED}">最大たわみ = PL³ / (48EI)(中央)</text>
</svg>`,3);
// slide 4: distributed
const dsym=(()=>{let p='';for(let i=0;i<=40;i++){const x=i/40;const y=16*x*(1-x)*(1+x-x*x); p+=(i?'L':'M')+(60+820*x).toFixed(1)+' '+(490+y*220/1.0*0.625*0.0+ (x*(1-2*x*x+x**3))*16/5*220*0.625*(5/16)).toFixed(1)+' ';}return p})();
const s4 = wrap(`
<div class=s style="top:90px"><div class=tag>③ 置き方を変える</div><h1>同じ重さでも<br>広げて置くと…</h1></div>
<svg class=s style="top:360px" width="940" height="560" viewBox="0 0 940 560">
<line x1="60" y1="150" x2="880" y2="150" stroke="${FG}" stroke-width="14" stroke-linecap="round"/>
<polygon points="60,164 30,210 90,210" fill="${MUT}"/><polygon points="880,164 850,210 910,210" fill="${MUT}"/>
${[0,1,2,3,4].map(i=>`<rect x="${100+i*150}" y="80" width="110" height="62" rx="5" fill="${ACC}"/>`).join('')}
<text x="470" y="50" text-anchor="middle" font-size="30" fill="${ACC}">同じ総重量 W を等しく分散</text>
<text x="0" y="300" font-size="32" fill="${BLU}">曲げモーメント図(放物線) 最大 WL/8</text>
<line x1="60" y1="340" x2="880" y2="340" stroke="${MUT}" stroke-width="3"/>
<path d="${(()=>{let p='M60 340 ';for(let i=1;i<=40;i++){const x=i/40;p+='L'+(60+820*x).toFixed(1)+' '+(340+4*x*(1-x)*120).toFixed(1)+' ';}return p+'Z'})()}" fill="${BLU}" opacity=".25" stroke="${BLU}" stroke-width="5"/>
<text x="0" y="530" font-size="32" fill="${RED}">たわみ 5WL³/(384EI) ≒ 中央集中の 0.625倍</text>
</svg>
<div class="s p" style="top:1000px">中央に1か所へ置いた時と比べ、最大たわみは<span style="color:${GRN}">約37.5%小さく</span>なります。<br><span class=m>(単純支持の梁・理論式での比較)</span></div>`,4);
const s1 = wrap(`
<div class=s style="top:150px"><div class=tag>図解でわかる</div><h1 style="font-size:96px">荷物を載せると<br>棚は<span style="color:${ACC}">どうなる?</span></h1></div>
<svg class=s style="top:700px" width="940" height="420" viewBox="0 0 940 420">
<path d="M60 100 Q470 330 880 100" fill="none" stroke="${RED}" stroke-width="14" stroke-linecap="round" transform="translate(0,0)"/>
<rect x="395" y="195" width="150" height="82" rx="6" fill="${ACC}"/><text x="470" y="248" text-anchor="middle" font-size="30" fill="#0f172a">荷物</text>
<polygon points="60,114 30,160 90,160" fill="${MUT}"/><polygon points="880,114 850,160 910,160" fill="${MUT}"/>
</svg>
<div class="s m" style="top:1180px">荷重図・曲げモーメント・たわみ曲線を5枚で</div>`,1);
const s5 = wrap(`
<div class=s style="top:90px"><div class=tag>まとめ</div><h1>棚を守る3つのコツ</h1></div>
<div class="s p" style="top:330px">
<p><span style="color:${ACC}">①</span> 重い物は<b>支えの近く</b>へ<br><span class=m>中央ほど曲げモーメントが大きい</span></p>
<p><span style="color:${ACC}">②</span> 荷物は<b>分散</b>して置く<br><span class=m>同じ重さでたわみ約0.625倍(理論値)</span></p>
<p><span style="color:${ACC}">③</span> 長い棚は<b>途中にも支え</b>を<br><span class=m>たわみは長さの3乗に比例(2倍長いと8倍)</span></p>
</div>
<div class="s m" style="top:1130px">※単純支持の梁(自重無視)での理論式です。実際の棚は材質・固定方法で変わります。</div>`,5);
(async()=>{
 const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:1080,height:1350}});
 for(const [i,h] of [s1,s2,s3,s4,s5].entries()){ fs.writeFileSync(`slide${i+1}.html`,h); await pg.setContent(h); await pg.screenshot({path:`slide${i+1}.png`}); }
 await b.close();
})();
