/* =============================================================
   charts.js - dependency-free SVG charts for full visual control.
   Premium institutional styling: gradients, soft grids, clear labels.
   ============================================================= */
const CHART_COL={teal:'#0d9488',navy:'#13315c',red:'#dc2626',amber:'#d97706',green:'#059669',blue:'#2563eb',slate:'#64748b'};
const CHART_FONT="'Plus Jakarta Sans',system-ui,sans-serif";
const CHART_MONO="'IBM Plex Mono',monospace";
let _chartUid=0;
const chartId=p=>`${p}${++_chartUid}`;
const tipAttr=t=>`data-tip="${String(t).replace(/"/g,'&quot;')}"`;

function svgWrap(w,h,inner,extra){
  return `<div class="chart-box"><svg role="img" aria-label="Grafik i të dhënave - vlerat shfaqen me kalim/klik mbi pikat" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" width="100%" height="${h}" style="display:block;max-width:100%;${extra||''}">${inner}</svg></div>`;
}

/* Multi-series line chart with axis labels, soft gridlines & gradient area */
function lineChart(opts){
  const w=opts.w||640,h=opts.h||220,pad={l:40,r:16,t:16,b:28};
  const labels=opts.labels||[];
  const series=opts.series||[];
  const all=series.flatMap(s=>s.data);
  let max=opts.max!=null?opts.max:Math.max(1,...all), min=opts.min!=null?opts.min:0;
  max=max*1.14;
  const iw=w-pad.l-pad.r, ih=h-pad.t-pad.b;
  const X=i=>pad.l+(labels.length<=1?iw/2:iw*i/(labels.length-1));
  const Y=v=>pad.t+ih-(v-min)/(max-min||1)*ih;

  let defs='',g='';
  const ticks=4;
  for(let t=0;t<=ticks;t++){ const v=min+(max-min)*t/ticks, y=Y(v);
    g+=`<line x1="${pad.l}" y1="${y.toFixed(1)}" x2="${w-pad.r}" y2="${y.toFixed(1)}" stroke="#eef2f7" stroke-width="1" ${t===0?'':'stroke-dasharray="2 4"'}/>`;
    g+=`<text x="${pad.l-8}" y="${(y+3.5).toFixed(1)}" text-anchor="end" font-size="9.5" fill="#94a3b8" font-family="${CHART_MONO}">${Math.round(v)}</text>`;
  }
  labels.forEach((lb,i)=>{ g+=`<text x="${X(i).toFixed(1)}" y="${h-9}" text-anchor="middle" font-size="10" font-weight="600" fill="#64748b" font-family="${CHART_FONT}">${lb}</text>`; });

  series.forEach(s=>{
    const pts=s.data.map((v,i)=>`${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
    if(opts.area!==false){
      const gid=chartId('lg');
      defs+=`<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${s.color}" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="${s.color}" stop-opacity="0"/></linearGradient>`;
      const ar=`${X(0).toFixed(1)},${Y(min).toFixed(1)} ${pts} ${X(s.data.length-1).toFixed(1)},${Y(min).toFixed(1)}`;
      g+=`<polygon points="${ar}" fill="url(#${gid})"/>`;
    }
    g+=`<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`;
    s.data.forEach((v,i)=>{
      const last=i===s.data.length-1;
      const tip=`${s.name?s.name+' · ':''}${labels[i]!=null?labels[i]+': ':''}${v}`;
      g+=`<circle class="ch-pt" cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="${last?4:3}" fill="#fff" stroke="${s.color}" stroke-width="${last?2.6:2}"/>`;
      g+=`<circle class="ch-hit" ${tipAttr(tip)} cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="12" fill="transparent"/>`;
    });
  });
  return svgWrap(w,h,`<defs>${defs}</defs>${g}`);
}

/* Vertical bars with gradient fill & rounded tops */
function barChart(opts){
  const w=opts.w||640,h=opts.h||200,pad={l:36,r:12,t:16,b:28};
  const data=opts.data||[],labels=opts.labels||[];
  const max=Math.max(1,...data)*1.16;
  const iw=w-pad.l-pad.r, ih=h-pad.t-pad.b;
  const bw=iw/data.length*0.6, gap=iw/data.length;
  let defs='',g='';
  for(let t=0;t<=4;t++){ const v=max*t/4,y=pad.t+ih-v/max*ih;
    g+=`<line x1="${pad.l}" y1="${y.toFixed(1)}" x2="${w-pad.r}" y2="${y.toFixed(1)}" stroke="#eef2f7" ${t===0?'':'stroke-dasharray="2 4"'}/>`;
    g+=`<text x="${pad.l-6}" y="${(y+3.5).toFixed(1)}" text-anchor="end" font-size="9.5" fill="#94a3b8" font-family="${CHART_MONO}">${Math.round(v)}</text>`;
  }
  const baseCol=opts.color||CHART_COL.navy;
  data.forEach((v,i)=>{
    const x=pad.l+gap*i+(gap-bw)/2, bh=v/max*ih, y=pad.t+ih-bh;
    const col=opts.colorFn?opts.colorFn(v,i):baseCol;
    const gid=chartId('bg');
    defs+=`<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${col}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${col}" stop-opacity="0.62"/></linearGradient>`;
    const tip=`${labels[i]!=null?labels[i]+': ':''}${v}`;
    g+=`<rect class="ch-bar" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0,bh).toFixed(1)}" rx="4" fill="url(#${gid})"/>`;
    g+=`<rect class="ch-hit" ${tipAttr(tip)} x="${(pad.l+gap*i).toFixed(1)}" y="${pad.t}" width="${gap.toFixed(1)}" height="${ih.toFixed(1)}" fill="transparent"/>`;
    if(opts.showValues) g+=`<text x="${(x+bw/2).toFixed(1)}" y="${(y-5).toFixed(1)}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#475569" font-family="${CHART_MONO}">${v}</text>`;
    if(labels[i]!=null) g+=`<text x="${(x+bw/2).toFixed(1)}" y="${h-9}" text-anchor="middle" font-size="9.5" font-weight="600" fill="#64748b" font-family="${CHART_FONT}">${labels[i]}</text>`;
  });
  return svgWrap(w,h,`<defs>${defs}</defs>${g}`);
}

/* Stacked horizontal bar (single, proportions) */
function stackBar(parts){ // [{val,color,label}]
  const tot=parts.reduce((s,p)=>s+p.val,0)||1; let x=0;
  let g=parts.map(p=>{ const wpc=p.val/tot*100; const r=`<rect x="${x}%" y="0" width="${wpc}%" height="14" fill="${p.color}"/>`; x+=wpc; return r; }).join('');
  return `<svg viewBox="0 0 100 14" width="100%" height="14" preserveAspectRatio="none" style="border-radius:7px;overflow:hidden;display:block">${g}</svg>`;
}

/* Donut chart with rounded segments & subtle gap */
function donut(parts,opts){ // [{val,color,label}]
  opts=opts||{}; const size=opts.size||150, sw=opts.thick||16, r=size/2-sw/2-3, cx=size/2, cy=size/2;
  const tot=parts.reduce((s,p)=>s+p.val,0)||1; let off=0;
  const C=2*Math.PI*r;
  const gapPx=parts.length>1?2.5:0;
  let g=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#eef2f7" stroke-width="${sw}"/>`;
  parts.forEach(p=>{ const frac=p.val/tot, len=Math.max(0,frac*C-gapPx);
    const tip=`${p.label?p.label+': ':''}${p.val} (${Math.round(frac*100)}%)`;
    g+=`<circle class="ch-seg" ${tipAttr(tip)} cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${p.color}" stroke-width="${sw}" stroke-dasharray="${len} ${C-len}" stroke-dashoffset="${-off}" transform="rotate(-90 ${cx} ${cy})" stroke-linecap="round"/>`;
    off+=frac*C;
  });
  if(opts.center!=null) g+=`<text x="${cx}" y="${cy-1}" text-anchor="middle" font-size="${opts.centerSize||23}" font-weight="800" fill="#0f172a" font-family="${CHART_FONT}" letter-spacing="-0.5">${opts.center}</text>`;
  if(opts.sub!=null) g+=`<text x="${cx}" y="${cy+15}" text-anchor="middle" font-size="9" font-weight="600" fill="#94a3b8" font-family="${CHART_FONT}" letter-spacing="0.5">${String(opts.sub).toUpperCase()}</text>`;
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="display:block">${g}</svg>`;
}

/* Sparkline with gradient area */
function sparkline(data,opts){
  opts=opts||{}; const w=opts.w||90,h=opts.h||26,col=opts.color||CHART_COL.navy;
  const max=Math.max(...data),min=Math.min(...data),rng=max-min||1;
  const pts=data.map((v,i)=>`${(i/(data.length-1)*w).toFixed(1)},${(h-2-(v-min)/rng*(h-4)).toFixed(1)}`).join(' ');
  const gid=chartId('sp');
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="none" style="display:block">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${col}" stop-opacity="0.25"/><stop offset="100%" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>
    <polygon points="0,${h} ${pts} ${w},${h}" fill="url(#${gid})"/>
    <polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

/* Semi-circular gauge for risk 0..100 with gradient arc */
function gauge(score,opts){
  opts=opts||{}; const size=opts.size||180,cx=size/2,cy=size/2,r=size/2-14,sw=15;
  const col=riskColor(score);
  const start=Math.PI, end=0; const ang=start+(end-start)*(score/100);
  const arc=(a0,a1)=>{ const x0=cx+r*Math.cos(a0),y0=cy+r*Math.sin(a0),x1=cx+r*Math.cos(a1),y1=cy+r*Math.sin(a1); const large=Math.abs(a1-a0)>Math.PI?1:0; return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`; };
  const gid=chartId('ga');
  let defs=`<linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="${col}" stop-opacity="0.7"/><stop offset="100%" stop-color="${col}"/></linearGradient>`;
  let g=`<path d="${arc(start,end)}" fill="none" stroke="#eef2f7" stroke-width="${sw}" stroke-linecap="round"/>`;
  g+=`<path d="${arc(start,ang)}" fill="none" stroke="url(#${gid})" stroke-width="${sw}" stroke-linecap="round"/>`;
  g+=`<text x="${cx}" y="${cy-2}" text-anchor="middle" font-size="34" font-weight="800" fill="#0f172a" font-family="${CHART_FONT}" letter-spacing="-1">${score}</text>`;
  g+=`<text x="${cx}" y="${cy+16}" text-anchor="middle" font-size="10" font-weight="600" fill="#64748b" font-family="${CHART_FONT}">${riskTier(score).label}</text>`;
  return `<svg viewBox="0 0 ${size} ${size*0.62}" width="${size}" height="${size*0.62}" style="display:block">${defs}${g}</svg>`;
}
