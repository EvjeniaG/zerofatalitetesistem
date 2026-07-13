/* =============================================================
   util.js - seeded RNG, formatting, small helpers, SVG icons
   Classic script: everything attaches to window scope.
   ============================================================= */

/* ---- Seeded PRNG (mulberry32) for stable, reproducible data ---- */
function makeRNG(seed){
  let s = seed >>> 0;
  return function(){
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const RNG = makeRNG(20402040);
function rnd(){ return RNG(); }
function rint(a,b){ return Math.floor(a + RNG()*(b-a+1)); }
function rfloat(a,b){ return a + RNG()*(b-a); }
function pick(arr){ return arr[Math.floor(RNG()*arr.length)]; }
function weighted(map){
  // map: [[value, weight], ...]
  let tot = map.reduce((s,m)=>s+m[1],0), r = RNG()*tot;
  for(const [v,w] of map){ if((r-=w) <= 0) return v; }
  return map[map.length-1][0];
}
function gauss(mean, sd){
  let u=0,v=0; while(u===0)u=RNG(); while(v===0)v=RNG();
  return mean + sd*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
}

/* ---- formatting ---- */
const fmt = {
  n(x){ return (Math.round(x)).toLocaleString('en-US'); },
  n1(x){ return (Math.round(x*10)/10).toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1}); },
  pct(x){ return (Math.round(x*10)/10)+'%'; },
  money(x){ if(x>=1e6) return '€'+(x/1e6).toFixed(1)+'M'; if(x>=1e3) return '€'+Math.round(x/1e3)+'K'; return '€'+Math.round(x); },
  km(x){ return x>=1 ? x.toFixed(1)+' km' : Math.round(x*1000)+' m'; },
  date(d){ const m=['Jan','Shk','Mar','Pri','Maj','Qer','Korr','Gush','Sht','Tet','Nën','Dhj']; return d.getDate()+' '+m[d.getMonth()]+' '+d.getFullYear(); },
  dateShort(d){ const p=n=>(n<10?'0':'')+n; return p(d.getDate())+'.'+p(d.getMonth()+1)+'.'+d.getFullYear(); },
};
function clamp(x,a,b){ return Math.max(a,Math.min(b,x)); }
function round1(x){ return Math.round(x*10)/10; }
function round2(x){ return Math.round(x*100)/100; }
function round3(x){ return Math.round(x*1000)/1000; }
function round5(x){ return Math.round(x*100000)/100000; }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function slug(s){ return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-'); }
function haversine(a,b,c,d){
  const R=6371,dLat=(c-a)*Math.PI/180,dLng=(d-b)*Math.PI/180;
  const x=Math.sin(dLat/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}

/* ---- risk classification ---- */
function riskTier(score){
  if(score>=80) return {key:'crit',  label:'Kritik',       color:'#dc2626'};
  if(score>=60) return {key:'high',  label:'I lartë',      color:'#ea580c'};
  if(score>=40) return {key:'med',   label:'Mesatar',      color:'#d97706'};
  if(score>=20) return {key:'low',   label:'I moderuar',   color:'#0d9488'};
  return            {key:'low',   label:'I ulët',       color:'#059669'};
}
function riskColor(score){ return riskTier(score).color; }
function trendInfo(t){
  if(t>2.5)  return {key:'det',label:'Në përkeqësim',cls:'det'};
  if(t<-2.5) return {key:'imp',label:'Në përmirësim',cls:'imp'};
  return        {key:'sta',label:'Stabël',cls:'sta'};
}

/* ---- inline SVG icon set (feather-style, stroke) ---- */
const ICO = {
  grid:'<path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>',
  map:'<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/>',
  alert:'<path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  layers:'<path d="m12 2 10 5-10 5L2 7l10-5z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
  trend:'<path d="m23 6-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/>',
  cpu:'<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>',
  tool:'<path d="M14.7 6.3a4 4 0 0 0-5.6 5.6L3 18l3 3 6.1-6.1a4 4 0 0 0 5.6-5.6l-2.9 2.9-2.7-2.7 2.6-3.2z"/>',
  file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6"/>',
  book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  check:'<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 2.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 7 2.6h.1A1.6 1.6 0 0 0 9 1.1V1a2 2 0 1 1 4 0v.1A1.6 1.6 0 0 0 17 2.6a1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V7a1.6 1.6 0 0 0 1.4 1H23a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
  skull:'<path d="M12 2a8 8 0 0 0-8 8c0 2.6 1.2 4.3 2.5 5.3.4.3.5.6.5 1V18a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1.7c0-.4.1-.7.5-1C18.8 14.3 20 12.6 20 10a8 8 0 0 0-8-8z"/><circle cx="9" cy="11" r="1.4"/><circle cx="15" cy="11" r="1.4"/>',
  pin:'<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  car:'<path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11M5 11h14a2 2 0 0 1 2 2v4h-2M5 11a2 2 0 0 0-2 2v4h2m0 0h14m-14 0v2m14-2v2"/><circle cx="7.5" cy="14.5" r="1"/><circle cx="16.5" cy="14.5" r="1"/>',
  road:'<path d="M4 22 8 2h8l4 20M12 6v3M12 12v3M12 18v2"/>',
  zap:'<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  walk:'<circle cx="13" cy="4" r="2"/><path d="M11 21l1-7-2-2 1-4 3 1 2 3M9 21l1.5-5"/>',
  speed:'<path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M12 14 16 9"/><path d="M3.5 18a10 10 0 1 1 17 0"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  drop:'<path d="M12 2.7S5 10 5 14a7 7 0 0 0 14 0c0-4-7-11.3-7-11.3z"/>',
  euro:'<circle cx="12" cy="12" r="9"/><path d="M15 8a4 4 0 0 0-6 3.5A4 4 0 0 0 15 16M7 11h6M7 13h5"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  print:'<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/>',
  up:'<path d="M12 19V5M5 12l7-7 7 7"/>',
  down:'<path d="M12 5v14M5 12l7 7 7-7"/>',
  flat:'<path d="M5 12h14"/>',
  menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',
  eye:'<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  layers2:'<path d="M3 12h4l3 8 4-16 3 8h4"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  db:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
};
function icon(name,cls){
  return `<svg class="${cls||''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICO[name]||''}</svg>`;
}
