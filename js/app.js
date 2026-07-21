/* =============================================================
   app.js - SPA shell: navigation, hash router, module views.
   ============================================================= */

const APP_BUILD='20260629-ui55';

function modelYearStats(y){
  const rows=ACCIDENTS.filter(a=>a.year===y);
  return {n:rows.length,fat:rows.reduce((s,a)=>s+a.fatalities,0),inj:rows.reduce((s,a)=>s+a.injured,0)};
}

function periodNotes(items){
  if(!items||!items.length) return '';
  return `<div class="period-notes">${items.map(it=>{
    const p=DATA_PERIODS[it.kind];
    if(!p) return '';
    return `<span class="period-chip" title="${escapeHtml(p.desc)}"><span class="pc-k">${it.tag}</span> ${p.label}</span>`;
  }).join('')}</div>`;
}
function periodLine(kind){
  const p=DATA_PERIODS[kind];
  return p ? `Periudha ${p.label}` : '';
}
function periodOf(kind){
  if(kind==null||kind==='') return '';
  if(typeof kind==='number') return String(kind);
  if(kind==='official') return OFFICIAL.period;
  if(kind==='official-latest') return String(offLatest().year);
  return DATA_PERIODS[kind]?.label || String(kind);
}
function cardHead(title,right,period){
  const p=period?periodOf(period):'';
  return `<div class="card-head"><div class="card-head-titles"><h3 class="card-title">${title}</h3>${p?`<span class="card-period">${p}</span>`:''}</div>${right?`<div class="card-actions">${right}</div>`:''}</div>`;
}
function thPeriod(label,period='model'){
  return `<span class="th-stat">${label}<span class="th-period">${periodOf(period)}</span></span>`;
}
function phStat(val,label,period='model',hint=''){
  const fatal=label.includes('Fatalitet');
  return `<div class="ph-stat${fatal?' ph-stat--fatal':''}"><span class="ps-val">${val}</span><span class="ps-label">${label}</span>${hint?`<span class="ps-hint">${hint}</span>`:''}<span class="ps-period">${periodOf(period)}</span></div>`;
}
function chartFootnote(text){
  return `<p class="chart-footnote">${text}</p>`;
}

function pageZone(title, inner, cls=''){
  return `<section class="page-zone${cls?' '+cls:''}">
    <header class="zone-head"><h3 class="zone-title">${title}</h3></header>
    <div class="zone-content">${inner}</div>
  </section>`;
}

function riskLegendBar(){
  return `<div class="risk-legend-bar" role="note">
    <span><b>Niveli 1-5</b> - rezultati përfundimtar</span>
    <span><b>Rruga</b> - gjendja e infrastrukturës</span>
    <span><b>Historiku</b> - aksidentet (${DATA_PERIODS.nwa.label})</span>
  </div>`;
}

/* -- Copy & navigim institucional (uniforme) -- */
const PAGES={
  dashboard:{nav:'Panorama',title:'Panorama Kombëtare',crumb:'Panorama Kombëtare'},
  'risk-map':{nav:'Harta e Riskut',title:'Harta e Riskut',crumb:'Harta e Riskut'},
  segments:{nav:'Segmentet',title:'Regjistri i Segmenteve',crumb:'Regjistri i Segmenteve'},
  accidents:{nav:'Regjistri i Aksidenteve',title:'Regjistri i Aksidenteve',crumb:'Regjistri i Aksidenteve'},
  interventions:{nav:'Ndërhyrjet',title:'Plan i Ndërhyrjeve',crumb:'Plan i Ndërhyrjeve'},
  reports:{nav:'Raporte',title:'Gjenerimi i Raporteve',crumb:'Raporte'},
  methodology:{nav:'Metodologjia',title:'Metodologjia NWA',crumb:'Metodologjia NWA'},
  quality:{nav:'Të Dhënat',title:'Burimet e të Dhënave',crumb:'Burimet e të Dhënave'},
  settings:{nav:'Parametrat',title:'Parametrat e Sistemit',crumb:'Parametrat'},
  segment:{title:'Profili i Segmentit',crumb:'Profili i Segmentit'},
};
const NAV=[
  {group:'Panorama',items:[{id:'dashboard',label:PAGES.dashboard.nav,ico:'grid'}]},
  {group:'Territori',items:[
    {id:'risk-map',label:PAGES['risk-map'].nav,ico:'map'},
    {id:'segments',label:PAGES.segments.nav,ico:'layers',badge:()=>NAT.blackSpots+NAT.emerging+NAT.monitor,warn:true},
    {id:'accidents',label:PAGES.accidents.nav,ico:'car',badge:()=>fmt.n(modelYearStats(2025).n)},
  ]},
  {group:'Veprim',items:[
    {id:'interventions',label:PAGES.interventions.nav,ico:'tool'},
    {id:'reports',label:PAGES.reports.nav,ico:'file'},
  ]},
  {group:'Referencë',items:[
    {id:'methodology',label:PAGES.methodology.nav,ico:'book'},
    {id:'quality',label:PAGES.quality.nav,ico:'check'},
    {id:'settings',label:PAGES.settings.nav,ico:'gear'},
  ]},
];
function pageHead(key,lead,periods){
  const p=PAGES[key]||{title:key};
  return `<header class="page-head">
    <h2 class="page-title">${p.title}</h2>
    ${lead?`<p class="page-lead page-lead--mini">${lead}</p>`:''}
    ${periods?periodNotes(periods):''}
  </header>`;
}
function pageBlock(cls,inner){ return `<section class="page-block${cls?' '+cls:''}">${inner}</section>`; }
function cardHeadCount(title,countId,right){
  return `<div class="card-head"><h3 class="card-title">${title}</h3><div class="card-head-meta"><span class="card-hint" id="${countId}"></span>${right?`<div class="card-actions">${right}</div>`:''}</div></div>`;
}

let _map=null;
const view=()=>document.getElementById('view');

/* ---------- shared UI helpers ---------- */
function kpi(o){
  let deltaHtml='';
  if(o.delta!=null){
    const up=o.delta>0, down=o.delta<0;
    let cls='delta-flat';
    if(o.invert){ cls=up?'delta-good':down?'delta-bad':'delta-flat'; }
    else if(o.deltaBad!==false){ cls=up?'delta-bad':down?'delta-good':'delta-flat'; }
    else { cls=up?'delta-up':down?'delta-down':'delta-flat'; }
    deltaHtml=`<span class="delta ${cls}">${up?'+':''}${o.delta}${o.deltaUnit||'%'}</span>`;
  }
  const tone=o.tone?` kpi--${o.tone}`:'';
  const periodHtml=o.period!=null?`<div class="kpi-period">${periodOf(o.period)}</div>`:'';
  return `<div class="kpi${tone}">
    <div class="kpi-label">${o.label}</div>
    ${periodHtml}
    <div class="kpi-val tnum">${o.val}${o.unit?`<span class="u">${o.unit}</span>`:''}</div>
    <div class="kpi-sub">${deltaHtml}</div>
  </div>`;
}
function toneFatal(n,fallback='-'){
  if(n==null||n===0||n==='0') return fallback;
  return `<span class="tone-fatal">${n}</span>`;
}
function toneGood(n){ return `<span class="tone-good">${n}</span>`; }
function trendChip(tr){
  return `<span class="trend-chip ${tr.cls}">${tr.label}</span>`;
}
function riskCell(score){
  const t=riskTier(score);
  return `<span class="score-pill"><span class="riskbar" style="flex:1"><i style="width:${score}%;background:${t.color}"></i></span><span class="score-num" style="color:${t.color}">${score}</span></span>`;
}
function nwaCell(nwa){ return nwaRiskBreakdown(nwa, { compact: true }); }
function riskViz(nwa, opts){ return nwaRiskBreakdown(nwa, opts || {}); }
function nwaBadge(nwa){ return nwaClassBadge(nwa); }
function nwaColor(nwa){ return (nwa.meta||NWA_CLASS_META[nwa.integrated]).color; }
function tierBadge(score){ const t=riskTier(score); return `<span class="badge ${t.key} dot">${t.label}</span>`; }
function secHead(title,pill){ return `<div class="sec-head"><h4>${title}</h4>${pill?`<span class="pill">${pill}</span>`:''}<span class="line"></span></div>`; }
function yoyCell(v, badUp){
  if(v==null||v===undefined) return '<span class="yoy-flat">-</span>';
  const up=v>0, down=v<0;
  let cls='yoy-flat';
  if(badUp!==false){ cls=up?'yoy-bad':down?'yoy-good':'yoy-flat'; }
  else { cls=up?'yoy-up':down?'yoy-down':'yoy-flat'; }
  return `<span class="${cls}">${up?'+':''}${v}%</span>`;
}
function sectionDivider(title,sub,tag){
  return `<div class="section-divider"><h4>${title}</h4>${tag||''}<span class="line"></span>${sub?`<span>${sub}</span>`:''}</div>`;
}
function chartLegend(items){
  return `<div class="chart-legend">${items.map(it=>`<span class="chart-legend-item"><span class="lg-dot" style="background:${it.color}"></span>${it.label}</span>`).join('')}</div>`;
}
function segFlags(s){
  if(s.isBlackSpot) return ' · <span class="status-flag bs">Pikë e Zezë</span>';
  if(s.isEmerging) return ' · <span class="status-flag emerging">Në zhvillim</span>';
  return '';
}

/* ================================================================
   NAVIGATION + ROUTER
   ================================================================ */
function buildNav(){
  const nav=document.getElementById('nav');
  nav.innerHTML=NAV.map(g=>`
    <div class="nav-group">
      <div class="nav-group-title">${g.group}</div>
      ${g.items.map(it=>`<a class="nav-item" data-route="${it.id}" href="#/${it.id}" title="${it.label}">
        <span class="nav-ico">${icon(it.ico)}</span>
        <span class="nav-label">${it.label}</span>
        ${it.badge?`<span class="nav-badge">${it.badge()}</span>`:''}
      </a>`).join('')}
    </div>`).join('');
}
function setActiveNav(route){
  document.querySelectorAll('.nav-item').forEach(a=>{
    const on=a.dataset.route===route;
    a.classList.toggle('active',on);
    if(on) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
  });
}
/* make clickable rows/cards keyboard-operable + announced as buttons */
function enhanceA11y(){
  view().querySelectorAll('.clickable').forEach(el=>{
    if(el.dataset.a11y) return;
    el.dataset.a11y='1';
    el.setAttribute('tabindex','0');
    el.setAttribute('role','button');
  });
}

/* ---------- CSV export ---------- */
function csvCell(text){
  const s=String(text==null?'':text).replace(/\s+/g,' ').trim();
  return /[",\n;]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
}
function cellText(td){
  const c=td.cloneNode(true);
  c.querySelectorAll('br').forEach(b=>b.replaceWith(' - '));
  return c.textContent;
}
function tableToCSV(table){
  const rows=[];
  table.querySelectorAll('thead tr').forEach(tr=>{
    rows.push([...tr.children].map(th=>csvCell(cellText(th))).join(','));
  });
  table.querySelectorAll('tbody tr').forEach(tr=>{
    rows.push([...tr.children].map(td=>csvCell(cellText(td))).join(','));
  });
  return '\ufeff'+rows.join('\r\n');
}
function downloadCSV(filename,csv){
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=filename;
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); },0);
}
function slugify(s){
  return (s||'tabela').toLowerCase()
    .replace(/[ëé]/g,'e').replace(/[çc]/g,'c').replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'').slice(0,48)||'tabela';
}
/* add a small CSV button to every card that holds a data table */
function enhanceExports(){
  view().querySelectorAll('.card').forEach(card=>{
    const table=card.querySelector('table.tbl');
    const head=card.querySelector('.card-head');
    if(!table||!head||head.querySelector('[data-export-btn]')) return;
    const title=(head.querySelector('h3,h5')?.textContent||'tabela').trim();
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='btn sm ghost export-btn';
    btn.dataset.exportBtn='1';
    btn.title='Eksporto CSV';
    btn.setAttribute('aria-label','Eksporto: '+title);
    btn.textContent='Export';
    btn.addEventListener('click',()=>downloadCSV(slugify(title)+'.csv',tableToCSV(table)));
    let right=head.querySelector('.right');
    if(!right){ right=document.createElement('div'); right.className='right'; head.appendChild(right); }
    right.appendChild(btn);
  });
}
function navigate(){
  const hash=location.hash.replace(/^#\//,'')||'dashboard';
  const [route,arg]=hash.split('/');
  if(route==='blackspots'){ segFilter.status='blackspot'; location.hash='#/segments'; return; }
  if(route==='prediction'){ segFilter.status='emerging'; location.hash='#/segments'; return; }
  if(_map){ try{_map.remove();}catch(e){} _map=null; }
  setActiveNav(route);
  const pt=PAGES[route]||PAGES.segment;
  document.getElementById('pageTitle').textContent=route==='segment'?`${PAGES.segment.crumb} · ${arg}`:(pt.crumb||pt.title||'-');
  const v=view(); v.scrollTop=0;
  const R={dashboard:renderDashboard,'risk-map':renderRiskMap,segments:renderSegments,accidents:renderAccidents,interventions:renderInterventions,reports:renderReports,methodology:renderMethodology,quality:renderQuality,settings:renderSettings,segment:()=>renderSegmentProfile(arg)};
  (R[route]||renderDashboard)();
  enhanceA11y();
  enhanceExports();
  closeSidebar();
}
window.addEventListener('hashchange',navigate);
/* Enter / Space activates any keyboard-focused clickable element */
document.addEventListener('keydown',e=>{
  if(e.key!=='Enter'&&e.key!==' ') return;
  const el=e.target.closest('.clickable'); if(!el) return;
  e.preventDefault(); el.click();
});

/* ================================================================
   1. DASHBOARD
   ================================================================ */
function renderDashboard(){
  const latest=offLatest();
  const y2025=OFFICIAL.yoy.find(y=>y.year===2025);
  const topSeg=[...SEGS].sort((a,b)=>b.nwa.integrated-a.nwa.integrated||b.priority-a.priority).slice(0,8);
  const years=offYears();
  const causeCols=['#0b1f3a','#13315c','#1e3a5f','#2563eb','#3b82f6','#64748b','#475569','#334155','#1e293b','#64748b','#94a3b8'];
  const q25=Object.entries(OFFICIAL.accidentsByQark[2025]).sort((a,b)=>b[1]-a[1]);

  view().innerHTML=`<div class="view-pad page-shell fade-in page-dashboard">
    ${pageHead('dashboard',`${latest.year} · ${NAT.segments} segmente`)}

    ${pageZone('Prioritetet',`<div class="network-strip">
      <a class="ns-item ns-item--fatal" href="#/segments" data-dash-filter="blackspot"><span class="ns-label">Pikat e Zeza</span><span class="ns-val tnum">${NAT.blackSpots}</span></a>
      <a class="ns-item ns-item--warn" href="#/segments" data-dash-filter="emerging"><span class="ns-label">Në Zhvillim</span><span class="ns-val tnum">${NAT.emerging}</span></a>
      <a class="ns-item ns-item--risk" href="#/segments" data-dash-filter="high"><span class="ns-label">Risk i Lartë</span><span class="ns-val tnum">${NAT.highRisk}</span></a>
      <a class="ns-item ns-item--neutral" href="#/segments" data-dash-filter="all"><span class="ns-label">Risk Mesatar</span><span class="ns-val tnum">${NAT.avgClass}</span></a>
    </div>`,'zone-priority')}

    ${pageZone('Treguesit zyrtarë',`<div class="grid g4 dash-official">
      ${kpi({label:'Fatalitete',val:latest.fatalities,delta:y2025.fatalities,tone:'fatal',deltaBad:true,period:'official-latest'})}
      ${kpi({label:'Aksidente',val:fmt.n(latest.accidents),delta:y2025.accidents,tone:'acc',deltaBad:true,period:'official-latest'})}
      ${kpi({label:'Të Aksidentuar',val:fmt.n(latest.injured),delta:y2025.injured,tone:'injured',deltaBad:true,period:'official-latest'})}
      ${kpi({label:'Shkalla e Fatalitetit',val:latest.fatalityRate,unit:'%',tone:'fatal',period:'official-latest'})}
    </div>`,'zone-kpi')}

    ${pageZone('Analiza e rrjetit',`<div class="dash-focus-layout">
      <div class="card card-table">
        ${cardHead('Segmentet me Risk më të Lartë',`<a class="btn sm ghost" href="#/segments">Regjistri</a>`)}
        ${riskLegendBar()}
        <div class="tbl-wrap"><table class="tbl tbl-pro"><thead><tr>
          <th>#</th><th>Segment</th><th class="num">${thPeriod('Aks.')}</th><th class="num">${thPeriod('Fat.')}</th><th class="col-risk-viz">Niveli i riskut</th>
        </tr></thead><tbody>
          ${topSeg.map((s,i)=>`<tr class="clickable" onclick="location.hash='#/segment/${s.id}'">
            <td><span class="rank">${i+1}</span></td>
            <td><span class="strong">${escapeHtml(shortRoad(s))}</span><span class="cell-sub">${s.municipality} · ${s.id}</span></td>
            <td class="num"><b>${s.m.n}</b></td>
            <td class="num">${toneFatal(s.m.fatalities)}</td>
            <td class="col-risk-viz">${nwaCell(s.nwa)}</td></tr>`).join('')}
        </tbody></table></div>
      </div>
      <div class="card card-map dash-map-stretch">
        ${cardHead('Harta e Riskut',`<a class="btn sm ghost" href="#/risk-map">Hap</a>`)}
        <div class="map-shell dash-map-shell"><div id="mapMain"></div></div>
      </div>
    </div>
    <div class="dash-nwa-strip">${nwaModelCard()}</div>`,'zone-analysis')}

    ${pageZone('Statistika',`<div class="card-grid-stats">
        <div class="card">
          ${cardHead('Evolucioni Kombëtar')}
          <div class="card-pad">${lineChart({h:200,labels:years,series:[
            {name:'Aksidente',color:'#0b1f3a',data:offSeries('accidents')},
            {name:'Fatalitete',color:'#b42318',data:offSeries('fatalities')},
          ]})}
          <div class="flex-c gap-16 mt-10">${chartLegend([{color:'#0b1f3a',label:'Aksidente'},{color:'#b42318',label:'Fatalitete'}])}</div></div>
        </div>
        <div class="card">
          ${cardHead('Shkaku i Aksidentit')}
          <div class="card-pad donut-wrap">
            ${donut(OFFICIAL.causes.map((c,i)=>({val:c.pct,color:causeCols[i],label:c.label})),{center:'100',sub:'%',size:140})}
            <div class="donut-side">${OFFICIAL.causes.slice(0,5).map((c,i)=>`<div class="scorebar-row">
              <span class="sb-name">${c.label}</span><span class="sb-track"><i style="width:${c.pct}%;background:#13315c"></i></span><span class="sb-num">${c.pct}%</span>
            </div>`).join('')}</div>
          </div>
        </div>
      </div>
      <div class="card-grid-stats-row">
        <div class="card">
          ${cardHead('Ndryshimi Vjetor')}
          <div class="tbl-wrap"><table class="tbl tbl-pro"><thead><tr><th>Viti</th><th class="num">Fatalitete</th><th class="num">Aksidente</th></tr></thead><tbody>
            ${OFFICIAL.yoy.filter(y=>y.year>=2021).map(y=>`<tr><td>${y.year}</td><td class="num">${yoyCell(y.fatalities)}</td><td class="num">${yoyCell(y.accidents)}</td></tr>`).join('')}
          </tbody></table></div>
        </div>
        <div class="card">
          ${cardHead('Aksidente sipas Qarkut')}
          <div class="card-pad">${barChart({h:180,labels:q25.slice(0,8).map(q=>q[0]),data:q25.slice(0,8).map(q=>q[1]),color:'#13315c'})}</div>
        </div>
      </div>
      <div class="card-grid-stats-row mt-16">
        <div class="card">
          ${cardHead('Model Territorial')}
          <div class="card-pad"><div class="kv-list kv-list--compact">
            <div class="kv-row"><span class="k">Aksidente</span><span class="v">${fmt.n(NAT.totAcc)}</span></div>
            <div class="kv-row"><span class="k">Të lënduar</span><span class="v">${fmt.n(NAT.totInjured)}</span></div>
            <div class="kv-row"><span class="k">Alkool</span><span class="v">${NAT.alcoholPct}%</span></div>
            <div class="kv-row"><span class="k">Për NWA</span><span class="v">${fmt.n(NAT.nwaWindow)} <span class="kv-period">(${periodOf('nwa')})</span></span></div>
            <div class="kv-row"><span class="k">Kohë mes. reagimi</span><span class="v">${NAT.avgResp} min</span></div>
            <div class="kv-row"><span class="k">Rrjeti demo</span><span class="v">${NAT.segments} seg · ${fmt.n(NAT.networkKm)} km</span></div>
          </div></div>
        </div>
        <div class="card">
          ${cardHead('Lloji i Viktimës')}
          <div class="card-pad">${barChart({h:180,labels:Object.keys(NAT.victimMix).slice(0,6),data:Object.entries(NAT.victimMix).sort((a,b)=>b[1]-a[1]).slice(0,6).map(x=>x[1]),color:'#475569'})}</div>
        </div>
        <div class="card">
          ${cardHead('Aksidente sipas Ditës')}
          <div class="card-pad">${barChart({h:180,labels:['E hën','E mart','E mër','E enj','E pre','E sht','E die'],data:['E hën','E mart','E mërkur','E enjte','E premte','E shtun','E diel'].map(d=>NAT.weekdayMix[d]||0),color:'#64748b'})}</div>
        </div>
      </div>`,'zone-stats')}
  </div>`;
  bindDashStrip();
  setTimeout(()=>initRiskSummaryMap(),80);
}
function bindDashStrip(){
  view().querySelectorAll('[data-dash-filter]').forEach(el=>{
    el.addEventListener('click',e=>{
      e.preventDefault();
      const f=el.dataset.dashFilter;
      segFilter.q=''; segFilter.qark='all'; segFilter.roadType='all'; segFilter.sort='priority';
      if(f==='blackspot'){ segFilter.status='blackspot'; segFilter.tier='all'; }
      else if(f==='emerging'){ segFilter.status='emerging'; segFilter.tier='all'; }
      else if(f==='high'){ segFilter.status='all'; segFilter.tier='4'; segFilter.sort='nwa'; }
      else { segFilter.status='all'; segFilter.tier='all'; }
      location.hash='#/segments';
    });
  });
}
function initRiskSummaryMap(){
  _map=baseMap('mapMain',[41.0,19.9],7);
  SEGS.forEach(s=>riskSegmentMarker(s).addTo(_map));
  fitAlbania();
  setTimeout(()=>{ if(_map&&_map.invalidateSize) _map.invalidateSize(); },150);
}

function riskSegmentMarker(seg,opts={}){
  const c=nwaColor(seg.nwa);
  const r=4+seg.nwa.integrated*1.8;
  return L.circleMarker([seg.lat,seg.lng],{
    radius:r,color:'#fff',weight:2,fillColor:c,fillOpacity:.78,className:'risk-marker',
    ...opts
  }).on('click',()=>location.hash='#/segment/'+seg.id)
    .bindTooltip(`<b>${shortRoad(seg)}</b><br>${seg.nwa.meta.label}`,{className:'map-tip'});
}

function renderRiskMap(){
  view().innerHTML=`<div class="view-pad page-shell fade-in map-view page-map">
    ${pageHead('risk-map',`${NAT.segments} segmente`)}
    ${pageZone('Harta interaktive',`<div class="map-shell map-full"><div id="mapMain"></div>
      <div class="map-panel map-title">Shqipëria<span>Niveli i riskut 1-5</span></div>
      <div class="map-panel map-layers">
        <h6>Shtresat</h6>
        <label class="layer-row"><input type="checkbox" id="lyHeat" checked> Dendësia</label>
        <label class="layer-row"><input type="checkbox" id="lyAcc"> Aksidente <span class="layer-period">${periodOf('model')}</span> <span class="cnt">${fmt.n(NAT.totAcc)}</span></label>
        <label class="layer-row"><input type="checkbox" id="lyFat"> Fatalitete <span class="layer-period">${periodOf('model')}</span> <span class="cnt">${ACCIDENTS.filter(a=>a.fatalities>0).length}</span></label>
        <label class="layer-row"><input type="checkbox" id="lyRisk" checked> Niveli i riskut <span class="cnt">${NAT.segments}</span></label>
        <label class="layer-row"><input type="checkbox" id="lyBs" checked> Pikat e Zeza <span class="cnt">${NAT.blackSpots}</span></label>
        <label class="layer-row"><input type="checkbox" id="lyEm"> Në zhvillim <span class="cnt">${NAT.emerging}</span></label>
      </div>
      <div class="map-panel map-legend map-risk-legend"><h6>Niveli i riskut</h6>
        <div class="risk-gradient-bar"></div>
        ${riskLegendHTML()}
      </div>
    </div>`,'zone-map')}
  </div>`;
  setTimeout(initFullMap,80);
}
function initFullMap(){
  const el=document.getElementById('mapMain');
  if(!el) return;
  _map=baseMap('mapMain',[41.0,19.9],7);
  const layers={};
  const heatPts=ACCIDENTS.map(a=>[a.lat,a.lng,a.fatalities>0?1.2:0.45]);
  layers.heat=L.heatLayer(heatPts,{radius:26,blur:20,maxZoom:12,gradient:{0.15:'#0d9488',0.35:'#65a30d',0.55:'#ca8a04',0.75:'#ea580c',1:'#dc2626'}});
  layers.acc=L.layerGroup(ACCIDENTS.map(a=>L.circleMarker([a.lat,a.lng],{radius:3,color:'#fff',weight:1,fillColor:sevColor(a.severity),fillOpacity:.75}).bindTooltip(`${a.id} · ${a.severityLabel}`)));
  layers.fat=L.layerGroup(ACCIDENTS.filter(a=>a.fatalities>0).map(a=>L.circleMarker([a.lat,a.lng],{radius:6,color:'#fff',weight:2,fillColor:'#dc2626',fillOpacity:.9}).bindTooltip(`${a.fatalities} fatalitet`)));
  layers.risk=L.layerGroup(SEGS.map(s=>riskSegmentMarker(s)));
  layers.bs=L.layerGroup(BLACKSPOTS.flatMap(b=>[
    L.circle([b.lat,b.lng],{radius:b.radius,color:'#dc2626',weight:2,fillColor:'#dc2626',fillOpacity:.1,dashArray:'6 8',className:'bs-zone'}),
    L.circleMarker([b.lat,b.lng],{radius:8,color:'#fff',weight:2.5,fillColor:nwaColor(b.seg.nwa),fillOpacity:1,className:'bs-pin'})
      .on('click',()=>location.hash='#/segment/'+b.seg.id)
      .bindTooltip(`<b>${b.name}</b><br>${b.seg.nwa.meta.label}`,{className:'map-tip'})
  ]));
  layers.em=L.layerGroup(EMERGING.map(e=>L.circleMarker([e.seg.lat,e.seg.lng],{radius:8,color:'#d97706',weight:2.5,fillColor:'#fbbf24',fillOpacity:.85})
    .on('click',()=>location.hash='#/segment/'+e.seg.id)
    .bindTooltip(`Në zhvillim · ${e.seg.nwa.meta.label}`,{className:'map-tip'})));

  layers.heat.addTo(_map); layers.risk.addTo(_map); layers.bs.addTo(_map);
  const bind=(id,layer)=>{const el=document.getElementById(id);if(!el)return;el.addEventListener('change',()=>{el.checked?layer.addTo(_map):_map.removeLayer(layer);});};
  bind('lyHeat',layers.heat);bind('lyAcc',layers.acc);bind('lyFat',layers.fat);bind('lyRisk',layers.risk);bind('lyBs',layers.bs);bind('lyEm',layers.em);
  fitAlbania();
  setTimeout(()=>{ if(_map&&_map.invalidateSize) _map.invalidateSize(); },150);
}

/* ================================================================
   3. SEGMENTS (unified list: black spots, watch list, full network)
   ================================================================ */
let segFilter={q:'',qark:'all',tier:'all',roadType:'all',sort:'priority',status:'all'};
function segStatusTier(s){
  if(s.isBlackSpot) return 'bs';
  if(s.isEmerging) return 'em';
  if(s.isMonitor) return 'mon';
  return 'norm';
}
function segStatusBadge(s){
  const st=nwaSegmentStatus(s);
  const tier=segStatusTier(s);
  return `<span class="seg-status ${tier==='norm'?'neutral':tier}">${st.label}</span>`;
}
function segGuideCard(o){
  const active=segFilter.status===o.filter?' active':'';
  const tone={blackspot:'fatal',emerging:'warn',monitor:'info'}[o.filter]||'';
  return `<button type="button" class="status-guide${tone?' status-guide--'+tone:''}${active}" data-seg-filter="${o.filter}" title="Filtro: ${o.title}">
    <span class="sg-title">${o.title}</span>
    <span class="sg-count tnum">${o.count}</span>
  </button>`;
}
const STATUS_SVG={};
function segFilterPills(){
  const items=[
    {v:'all',l:'Të gjitha',n:NAT.segments},
    {v:'blackspot',l:'Pika e Zezë',n:NAT.blackSpots},
    {v:'emerging',l:'Në zhvillim',n:NAT.emerging},
    {v:'monitor',l:'Në vëzhgim',n:NAT.monitor},
  ];
  return `<div class="filter-pills" id="segPills">${items.map(i=>`<button type="button" class="filter-pill${segFilter.status===i.v?' active':''}" data-status="${i.v}">${i.l}<span class="fp-n">${i.n}</span></button>`).join('')}</div>`;
}
function bindSegFilterPills(){
  document.querySelectorAll('#segPills .filter-pill').forEach(btn=>{
    btn.addEventListener('click',()=>{
      segFilter.status=btn.dataset.status;
      const sel=document.getElementById('segStatus');
      if(sel) sel.value=segFilter.status;
      document.querySelectorAll('#segPills .filter-pill').forEach(b=>b.classList.toggle('active',b.dataset.status===segFilter.status));
      syncSegGuideActive();
      renderSegTable();
    });
  });
}
function bindSegGuideFilters(){
  document.querySelectorAll('[data-seg-filter]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const v=btn.dataset.segFilter;
      segFilter.status=segFilter.status===v?'all':v;
      const sel=document.getElementById('segStatus');
      if(sel) sel.value=segFilter.status;
      document.querySelectorAll('.status-guide').forEach(b=>b.classList.toggle('active',b.dataset.segFilter===segFilter.status));
      document.querySelectorAll('#segPills .filter-pill').forEach(b=>b.classList.toggle('active',b.dataset.status===segFilter.status));
      renderSegTable();
    });
  });
}
function renderSegments(){
  if(segFilter.status==='watch') segFilter.status='monitor';
  const roadTypes=Object.entries(NWA_TYPES).map(([k,v])=>({key:k,label:v.label}));
  const qarks=[...new Set(SEGS.map(s=>s.qark))].sort();
  view().innerHTML=`<div class="view-pad page-shell fade-in page-segments">
    ${pageHead('segments')}

    ${pageZone('Klasifikimi',`<div class="grid g3 status-guide-grid">
      ${segGuideCard({title:'Pika e Zezë',count:NAT.blackSpots,filter:'blackspot'})}
      ${segGuideCard({title:'Në Zhvillim',count:NAT.emerging,filter:'emerging'})}
      ${segGuideCard({title:'Në Vëzhgim',count:NAT.monitor,filter:'monitor'})}
    </div>`,'zone-classify')}

    ${pageZone('Regjistri',`<div class="card seg-list-card">
      ${cardHeadCount('Lista e Segmenteve','segCountHint')}
      ${riskLegendBar()}
      <div class="card-pad" style="padding-bottom:0">
        ${segFilterPills()}
      </div>
      <div class="seg-filter-bar">
        <input class="inp seg-search-inp" id="segSearch" placeholder="Kërko…" value="${escapeHtml(segFilter.q)}">
        <select class="inp seg-filter-sel" id="segStatus" title="Statusi">
          <option value="all" ${segFilter.status==='all'?'selected':''}>Të gjitha (${NAT.segments})</option>
          <option value="blackspot" ${segFilter.status==='blackspot'?'selected':''}>Pika e Zezë (${NAT.blackSpots})</option>
          <option value="emerging" ${segFilter.status==='emerging'?'selected':''}>Në zhvillim (${NAT.emerging})</option>
          <option value="monitor" ${segFilter.status==='monitor'?'selected':''}>Në vëzhgim (${NAT.monitor})</option>
        </select>
        <select class="inp seg-filter-sel" id="segQark" title="Qarku"><option value="all">Qarku</option>${qarks.map(q=>`<option ${segFilter.qark===q?'selected':''}>${q}</option>`).join('')}</select>
        <select class="inp seg-filter-sel" id="segRoadType" title="Tipi"><option value="all">Tipi rruge</option>${roadTypes.map(t=>`<option value="${t.key}" ${segFilter.roadType===t.key?'selected':''}>${t.label}</option>`).join('')}</select>
        <select class="inp seg-filter-sel" id="segTier" title="Risku"><option value="all">Risku</option><option value="5" ${segFilter.tier==='5'?'selected':''}>Risk 5</option><option value="4" ${segFilter.tier==='4'?'selected':''}>Risk 4</option><option value="3" ${segFilter.tier==='3'?'selected':''}>Risk 3</option><option value="2" ${segFilter.tier==='2'?'selected':''}>Risk 2</option><option value="1" ${segFilter.tier==='1'?'selected':''}>Risk 1</option></select>
        <select class="inp seg-filter-sel" id="segSort" title="Renditja"><option value="priority" ${segFilter.sort==='priority'?'selected':''}>Prioritet</option><option value="nwa" ${segFilter.sort==='nwa'?'selected':''}>Risku</option><option value="fatalities" ${segFilter.sort==='fatalities'?'selected':''}>Fatalitete</option><option value="accidents" ${segFilter.sort==='accidents'?'selected':''}>Aksidente</option><option value="proactive" ${segFilter.sort==='proactive'?'selected':''}>Rruga</option></select>
      </div>
      <div class="tbl-wrap tbl-scroll seg-tbl-wrap" id="segTblWrap"></div>
    </div>`,'zone-registry')}
  </div>`;
  const apply=()=>{
    syncSegGuideActive();
    document.querySelectorAll('#segPills .filter-pill').forEach(b=>b.classList.toggle('active',b.dataset.status===segFilter.status));
    renderSegTable();
  };
  document.getElementById('segSearch').addEventListener('input',e=>{segFilter.q=e.target.value.toLowerCase();apply();});
  document.getElementById('segStatus').addEventListener('change',e=>{segFilter.status=e.target.value;apply();});
  document.getElementById('segQark').addEventListener('change',e=>{segFilter.qark=e.target.value;apply();});
  document.getElementById('segRoadType').addEventListener('change',e=>{segFilter.roadType=e.target.value;apply();});
  document.getElementById('segTier').addEventListener('change',e=>{segFilter.tier=e.target.value;apply();});
  document.getElementById('segSort').addEventListener('change',e=>{segFilter.sort=e.target.value;apply();});
  bindSegGuideFilters();
  bindSegFilterPills();
  renderSegTable();
}
function syncSegGuideActive(){
  document.querySelectorAll('.status-guide').forEach(b=>b.classList.toggle('active',b.dataset.segFilter===segFilter.status));
}
function renderSegTable(){
  let rows=SEGS.filter(s=>{
    if(segFilter.status==='blackspot'&&!s.isBlackSpot) return false;
    if(segFilter.status==='emerging'&&!s.isEmerging) return false;
    if(segFilter.status==='monitor'&&!s.isMonitor) return false;
    if(segFilter.qark!=='all'&&s.qark!==segFilter.qark) return false;
    if(segFilter.roadType!=='all'&&s.nwaType!==segFilter.roadType) return false;
    if(segFilter.tier!=='all'&&String(s.nwa.integrated)!==segFilter.tier) return false;
    if(segFilter.q){ const hay=(s.road+' '+s.id+' '+s.municipality+' '+s.qark).toLowerCase(); if(!hay.includes(segFilter.q)) return false; }
    return true;
  });
  const sk=segFilter.sort;
  rows.sort((a,b)=> sk==='nwa'?b.nwa.integrated-a.nwa.integrated : sk==='priority'?b.priority-a.priority : sk==='fatalities'?b.m.fatalities-a.m.fatalities : sk==='accidents'?b.m.n-a.m.n : b.nwa.proactive.score-a.nwa.proactive.score);
  const wrap=document.getElementById('segTblWrap');
  const hint=document.getElementById('segCountHint');
  if(hint) hint.textContent=`${rows.length} segmente`;
  if(!wrap) return;
  wrap.innerHTML=rows.length?`<table class="tbl tbl-pro seg-tbl"><thead><tr>
    <th class="col-rank">#</th><th>Segment</th><th>Statusi</th><th class="col-risk-viz">Niveli i riskut</th><th class="col-causes">Shkaku</th><th class="num">${thPeriod('Aks.')}</th><th class="num">${thPeriod('Fat.')}</th><th>${thPeriod('Trendi')}</th>
  </tr></thead><tbody>
  ${rows.map((s,i)=>`<tr class="clickable seg-tr-${segStatusTier(s)}" onclick="location.hash='#/segment/${s.id}'" title="Hap profilin">
    <td class="col-rank"><span class="rank ${i<3?'t'+(i+1):''}">${i+1}</span></td>
    <td class="col-seg"><span class="strong">${escapeHtml(shortRoad(s))}</span><span class="cell-sub">${s.municipality} · km ${s.kmFrom}-${s.kmTo}</span></td>
    <td class="col-status">${segStatusBadge(s)}</td>
    <td class="col-risk-viz">${nwaCell(s.nwa)}</td>
    <td class="col-causes">${segCausesCell(s)}</td>
    <td class="num"><b>${s.m.n}</b></td>
    <td class="num">${toneFatal(s.m.fatalities,'-')}</td>
    <td>${trendChip(s.trend)}</td>
  </tr>`).join('')}
  </tbody></table>`
    :`<div class="empty" style="padding:32px"><p>Asnjë segment nuk përputhet me kriteret.</p></div>`;
}

/* ================================================================
   4. ACCIDENT REGISTRY
   ================================================================ */
const CAUSE_BY_KEY=Object.fromEntries(CAUSES.map(c=>[c.key,c]));
function accCauseLabel(key){ return CAUSE_BY_KEY[key]?.short||CAUSE_BY_KEY[key]?.label||key||'-'; }
function accSegRisk(a){
  const s=SEGS.find(x=>x.id===a.segment);
  return s?s.nwa.integrated:null;
}

let accFilter={q:'',year:'2025',qark:'all',severity:'all',fatal:'all',sort:'date'};
const ACC_PAGE_SIZE=150;
let accPage=1;
function filterAccRows(){
  return ACCIDENTS.filter(a=>{
    if(accFilter.year!=='all'&&String(a.year)!==accFilter.year) return false;
    if(accFilter.qark!=='all'&&a.qark!==accFilter.qark) return false;
    if(accFilter.severity!=='all'&&String(a.severity)!==accFilter.severity) return false;
    if(accFilter.fatal==='yes'&&!(a.fatalities>0)) return false;
    if(accFilter.fatal==='no'&&a.fatalities>0) return false;
    if(accFilter.q){
      const hay=(a.id+' '+a.road+' '+a.roadName+' '+a.segment+' '+a.municipality+' '+a.qark+' '+a.collision_type+' '+a.driver_factor+' '+a.policeId).toLowerCase();
      if(!hay.includes(accFilter.q)) return false;
    }
    return true;
  }).sort((a,b)=>{
    const sk=accFilter.sort;
    return sk==='severity'?b.severity-a.severity||b.date-a.date : sk==='fatalities'?b.fatalities-a.fatalities||b.date-a.date : b.date-a.date;
  });
}
function accRowCells(a){
  const rLevel=accSegRisk(a);
  return `<td class="mono cell-id col-id-freeze">${a.id}</td>
    <td class="num col-risk-freeze">${rLevel!=null?`<span class="acc-risk-lvl" style="--c:${riskLevelColor(rLevel)}">${rLevel}</span>`:'-'}</td>
    <td>${fmt.dateShort(a.date)}</td>
    <td class="cell-meta">${a.weekday||'-'}</td>
    <td class="tnum">${a.time}</td>
    <td class="tnum">${a.year}</td>
    <td class="mono cell-id">${a.segment}</td>
    <td><span class="strong">${escapeHtml(a.road)}</span></td>
    <td>${a.municipality}</td>
    <td>${a.qark}</td>
    <td class="cell-meta">${a.roadType}</td>
    <td class="cell-meta">${escapeHtml(a.collision_type)}</td>
    <td><span class="badge ${a.severity===4?'badge-fatal':a.severity>=3?'badge-warn':'neutral'}">${a.severityLabel}</span></td>
    <td class="num">${toneFatal(a.fatalities,'0')}</td>
    <td class="num">${a.serious_injuries||0}</td>
    <td class="num">${a.minor_injuries||0}</td>
    <td class="num">${a.injured||0}</td>
    <td class="cell-meta">${a.victim_type||'-'}</td>
    <td>${a.alcohol_involved?'<span class="badge badge-warn">Po</span>':'<span class="badge neutral">Jo</span>'}</td>
    <td class="num">${a.vehicles}</td>
    <td class="num">${a.pedestrians||0}</td>
    <td class="cell-meta">${a.weather}</td>
    <td class="cell-meta">${a.lighting}</td>
    <td class="cell-meta">${a.road_condition}</td>
    <td class="num">${a.speed_limit}</td>
    <td class="num">${a.estimated_speed}</td>
    <td class="cell-meta">${escapeHtml(a.driver_factor)}</td>
    <td class="cell-meta">${escapeHtml(a.infrastructure_factor)}</td>
    <td class="cell-meta">${escapeHtml(a.vehicle_factor)}</td>
    <td>${accCauseLabel(a.dominantCause)}</td>
    <td class="cell-meta">${escapeHtml(a.officialCause||'-')}</td>
    <td class="num">${a.response_time}</td>
    <td class="mono cell-meta">${a.policeId||'-'}</td>`;
}
function accMobileCard(a){
  const rLevel=accSegRisk(a);
  return `<article class="acc-card clickable" onclick="location.hash='#/segment/${a.segment}'" title="Hap segmentin ${a.segment}">
    <div class="acc-card-top">
      <span class="acc-card-id mono">${a.id}</span>
      <span class="badge ${a.severity===4?'badge-fatal':a.severity>=3?'badge-warn':'neutral'}">${a.severityLabel}</span>
      ${rLevel!=null?`<span class="acc-risk-lvl" style="--c:${riskLevelColor(rLevel)}">${rLevel}</span>`:''}
    </div>
    <h4 class="acc-card-road">${escapeHtml(a.road)}</h4>
    <p class="acc-card-sub">${fmt.dateShort(a.date)} · ${a.time} · ${a.weekday||''} · ${a.municipality}, ${a.qark}</p>
    <div class="acc-card-stats">
      <span><b>${a.fatalities||0}</b> fat.</span>
      <span><b>${a.injured||0}</b> lënduar</span>
      <span>${escapeHtml(a.collision_type)}</span>
    </div>
    <div class="acc-card-foot">
      <span class="mono cell-id">${a.segment}</span>
      <span>${accCauseLabel(a.dominantCause)}</span>
    </div>
  </article>`;
}
const ACC_CSV_HEADERS=[
  'ID','Niveli i riskut','Data','Dita','Ora','Viti','Segment','Rruga','Bashkia','Qarku','Lloji i rrugës',
  'Lloji i aksidentit','Ashpërsia','Fatalitete','Lëndime të rënda','Lëndime të lehta','Të lënduar','Lloji i viktimës','Alkool',
  'Mjete','Këmbësorë','Moti','Ndriçimi','Sipërfaqja','Limiti (km/h)','Shpejtësia (km/h)','Faktori i drejtuesit','Faktori i infrastrukturës','Faktori i automjetit',
  'Shkaku','Shkaku (INSTAT)','Reagimi (min)','Nr. policia'
];
function accidentToCSVRow(a){
  const rLevel=accSegRisk(a);
  return [
    a.id,rLevel??'',fmt.dateShort(a.date),a.weekday||'',a.time,a.year,a.segment,a.road,
    a.municipality,a.qark,a.roadType,a.collision_type,a.severityLabel,a.fatalities||0,a.serious_injuries||0,
    a.minor_injuries||0,a.injured||0,a.victim_type||'',a.alcohol_involved?'Po':'Jo',a.vehicles,a.pedestrians||0,
    a.weather,a.lighting,a.road_condition,a.speed_limit,a.estimated_speed,a.driver_factor,a.infrastructure_factor,
    a.vehicle_factor,accCauseLabel(a.dominantCause),a.officialCause||'',a.response_time,a.policeId||''
  ].map(csvCell).join(',');
}
function renderAccidents(){
  const qarks=[...new Set(ACCIDENTS.map(a=>a.qark))].sort();
  view().innerHTML=`<div class="view-pad page-shell fade-in page-accidents">
    ${pageHead('accidents')}

    ${pageZone('Regjistri',`<div class="card acc-list-card">
      ${cardHead('Lista e Aksidenteve',`<button type="button" class="btn sm primary" id="accCsv">Eksporto CSV</button>`)}
      <div class="card-pad" style="padding-bottom:0">
        <div class="filter-pills" id="accYearPills">
          <button type="button" class="filter-pill${accFilter.year==='all'?' active':''}" data-year="all">Të gjitha<span class="fp-n">${ACCIDENTS.length}</span></button>
          ${YEARS.map(y=>`<button type="button" class="filter-pill${accFilter.year===String(y)?' active':''}" data-year="${y}">${y}<span class="fp-n">${ACCIDENTS.filter(a=>a.year===y).length}</span></button>`).join('')}
        </div>
      </div>
      <div class="seg-filter-bar acc-filter-bar">
        <input class="inp seg-search-inp" id="accSearch" placeholder="Kërko ID, rrugë, bashki, segment…" value="${escapeHtml(accFilter.q)}">
        <select class="inp seg-filter-sel" id="accQark" title="Qarku"><option value="all">Qarku</option>${qarks.map(q=>`<option ${accFilter.qark===q?'selected':''}>${q}</option>`).join('')}</select>
        <select class="inp seg-filter-sel" id="accSeverity" title="Ashpërsia">
          <option value="all">Ashpërsia</option>
          <option value="4" ${accFilter.severity==='4'?'selected':''}>Fatal</option>
          <option value="3" ${accFilter.severity==='3'?'selected':''}>Lëndime të rënda</option>
          <option value="2" ${accFilter.severity==='2'?'selected':''}>Lëndime të lehta</option>
          <option value="1" ${accFilter.severity==='1'?'selected':''}>Vetëm material</option>
        </select>
        <select class="inp seg-filter-sel" id="accFatal" title="Fatalitete">
          <option value="all">Fatalitete</option>
          <option value="yes" ${accFilter.fatal==='yes'?'selected':''}>Me vdekje</option>
          <option value="no" ${accFilter.fatal==='no'?'selected':''}>Pa vdekje</option>
        </select>
        <select class="inp seg-filter-sel" id="accSort" title="Renditja">
          <option value="date" ${accFilter.sort==='date'?'selected':''}>Data (më i fundit)</option>
          <option value="severity" ${accFilter.sort==='severity'?'selected':''}>Ashpërsia</option>
          <option value="fatalities" ${accFilter.sort==='fatalities'?'selected':''}>Fatalitete</option>
        </select>
        <button type="button" class="btn sm ghost" id="accReset">Hiq filtrat</button>
      </div>
      <div class="acc-tbl-panel acc-desktop-only">
        <div class="acc-tbl-scroll" id="accTblWrap"></div>
        <div class="acc-pager-wrap" id="accPagerWrap"></div>
      </div>
      <div class="acc-mobile-list acc-mobile-only" id="accMobileWrap"></div>
    </div>`,'zone-registry')}
  </div>`;

  const apply=()=>{
    accPage=1;
    document.querySelectorAll('#accYearPills .filter-pill').forEach(b=>b.classList.toggle('active',b.dataset.year===accFilter.year));
    renderAccTable();
  };
  document.getElementById('accSearch').addEventListener('input',e=>{accFilter.q=e.target.value.toLowerCase();apply();});
  document.getElementById('accQark').addEventListener('change',e=>{accFilter.qark=e.target.value;apply();});
  document.getElementById('accSeverity').addEventListener('change',e=>{accFilter.severity=e.target.value;apply();});
  document.getElementById('accFatal').addEventListener('change',e=>{accFilter.fatal=e.target.value;apply();});
  document.getElementById('accSort').addEventListener('change',e=>{accFilter.sort=e.target.value;apply();});
  document.querySelectorAll('#accYearPills .filter-pill').forEach(btn=>{
    btn.addEventListener('click',()=>{accFilter.year=btn.dataset.year;apply();});
  });
  document.getElementById('accCsv')?.addEventListener('click',exportAccCSV);
  document.getElementById('accReset')?.addEventListener('click',()=>{
    accFilter={q:'',year:'2025',qark:'all',severity:'all',fatal:'all',sort:'date'};
    document.getElementById('accSearch').value='';
    document.getElementById('accQark').value='all';
    document.getElementById('accSeverity').value='all';
    document.getElementById('accFatal').value='all';
    document.getElementById('accSort').value='date';
    apply();
  });
  apply();
}
function accPagerHtml(pageRows,totalPages){
  if(totalPages<=1) return '';
  return `<div class="acc-pager">
    <button type="button" class="btn sm ghost" id="accPrev" ${accPage<=1?'disabled':''}>← Mbrapa</button>
    <span class="acc-pager-info">Faqja ${accPage} / ${totalPages} · ${pageRows.length} rreshta</span>
    <button type="button" class="btn sm ghost" id="accNext" ${accPage>=totalPages?'disabled':''}>Para →</button>
  </div>`;
}
function bindAccPager(totalPages){
  document.getElementById('accPrev')?.addEventListener('click',()=>{ if(accPage>1){ accPage--; renderAccTable(); }});
  document.getElementById('accNext')?.addEventListener('click',()=>{ if(accPage<totalPages){ accPage++; renderAccTable(); }});
}
function renderAccTable(){
  const rows=filterAccRows();
  const totalPages=Math.max(1,Math.ceil(rows.length/ACC_PAGE_SIZE));
  if(accPage>totalPages) accPage=totalPages;
  if(accPage<1) accPage=1;
  const pageRows=rows.slice((accPage-1)*ACC_PAGE_SIZE,accPage*ACC_PAGE_SIZE);
  const wrap=document.getElementById('accTblWrap');
  const mobileWrap=document.getElementById('accMobileWrap');
  const empty=`<div class="empty" style="padding:32px"><p>Asnjë aksident nuk përputhet me kriteret.</p></div>`;
  const pager=accPagerHtml(pageRows,totalPages);
  if(wrap){
    wrap.innerHTML=rows.length?`<table class="tbl tbl-pro acc-tbl"><thead><tr>
    <th class="col-id-freeze">ID</th><th class="num col-risk-freeze" title="Niveli i riskut të segmentit (1–5)">Risku</th>
    <th>Data</th><th>Dita</th><th>Ora</th><th>Viti</th>
    <th>Segment</th><th>Rruga</th><th>Bashkia</th><th>Qarku</th><th>Lloji i rrugës</th>
    <th>Lloji i aksidentit</th><th>Ashpërsia</th>
    <th class="num" title="Fatalitete">Fat.</th><th class="num" title="Lëndime të rënda">L. rënda</th><th class="num" title="Lëndime të lehta">L. lehta</th><th class="num" title="Të lënduar">Lënduar</th>
    <th>Lloji i viktimës</th><th title="Alkool">Alk.</th>
    <th class="num">Mjete</th><th class="num" title="Këmbësorë">Këmb.</th>
    <th>Moti</th><th>Ndriçimi</th><th>Sipërfaqja</th>
    <th class="num" title="Limiti i shpejtësisë">Limit</th><th class="num" title="Shpejtësia e vlerësuar">km/h</th>
    <th title="Faktori i drejtuesit">Drejtuesi</th><th title="Faktori i infrastrukturës">Infrastruktura</th><th title="Faktori i automjetit">Automjeti</th>
    <th>Shkaku</th><th title="Shkaku sipas INSTAT">Shkaku (INSTAT)</th><th class="num" title="Koha e reagimit">Reagim (min)</th>
    <th title="Numri i raportit të policisë">Nr. policia</th>
  </tr></thead><tbody>
  ${pageRows.map(a=>`<tr class="clickable" onclick="location.hash='#/segment/${a.segment}'" title="Hap segmentin ${a.segment}">${accRowCells(a)}</tr>`).join('')}
  </tbody></table>`:empty;
    const pagerEl=document.getElementById('accPagerWrap');
    if(pagerEl) pagerEl.innerHTML=rows.length?pager:'';
  }
  if(mobileWrap){
    mobileWrap.innerHTML=rows.length?`<div class="acc-card-stack">${pageRows.map(accMobileCard).join('')}</div>${pager}`:empty;
  }
  bindAccPager(totalPages);
  enhanceA11y();
}
function exportAccCSV(){
  const rows=filterAccRows();
  if(!rows.length) return;
  const csv='\ufeff'+ACC_CSV_HEADERS.map(csvCell).join(',')+'\r\n'+rows.map(accidentToCSVRow).join('\r\n');
  downloadCSV('regjistri-aksidenteve-'+DATA_PERIODS.model.label.replace(/-/g,'-')+'.csv',csv);
}

/* ================================================================
   5. SEGMENT PROFILE (full report page)
   ================================================================ */
function segCausesCell(s){
  if(!s.causes?.length) return '<span class="cell-meta">-</span>';
  const top=s.causes[0];
  const more=s.causes.length-1;
  return `<span class="seg-cause-primary" title="${escapeHtml(s.causes.map(c=>c.shortLabel+' ('+c.count+')').join(', '))}">${top.shortLabel} <b>${top.count}</b></span>${more?`<span class="seg-cause-more">+${more}</span>`:''}`;
}
function renderCausesBars(s){
  if(!s.causes.length) return '<p class="prose muted">Pa aksidente të regjistruara.</p>';
  const max=s.causes[0]?.count||1;
  return `<div class="cause-bars">${s.causes.map(c=>`<div class="cause-bar-row">
    <div class="cbr-head">
      <span class="cbr-name">${c.label}</span>
      <span class="cbr-meta">${c.count} · ${c.contribution}%</span>
    </div>
    <div class="cbr-track"><i style="width:${Math.round(c.count/max*100)}%"></i></div>
  </div>`).join('')}</div>`;
}
function renderCausesTable(s){
  if(!s.causes.length) return '<p class="prose muted">Pa aksidente në historik.</p>';
  return `<table class="tbl cause-tbl"><thead><tr>
    <th>Shkaku</th><th class="num">Herë</th><th class="num">Pjesa</th><th class="num">Vdekje</th><th>Si ndodhi</th>
  </tr></thead><tbody>${s.causes.map(c=>`<tr>
    <td class="cause-name" title="${escapeHtml(c.desc||'')}">${c.label}${c.desc?`<span class="cause-hint" title="${escapeHtml(c.desc)}">?</span>`:''}</td>
    <td class="num"><b>${c.count}</b></td>
    <td class="num">${c.contribution}%</td>
    <td class="num num-fatal">${c.fatalCount||'-'}</td>
    <td class="cause-hist">
      <div class="cause-tags">${c.tags.map(t=>`<span class="cause-tag">${escapeHtml(t)}</span>`).join('')}</div>
      ${c.example?`<span class="cause-ex">${escapeHtml(c.example)}</span>`:''}
    </td>
  </tr>`).join('')}</tbody></table>`;
}
function renderSegmentProfile(id){
  const s=SEGS.find(x=>x.id===id);
  if(!s){ view().innerHTML=`<div class="view-pad"><div class="empty"><p>Segmenti nuk u gjet.</p><a class="btn mt-16" href="#/segments">Kthehu te regjistri</a></div></div>`; return; }
  document.getElementById('pageTitle').textContent='Profili i Segmentit · '+s.id;
  const m=s.m, nwa=s.nwa;
  const bsReasons=blackSpotReasons(s);
  const crashes=[...s.accidents].sort((a,b)=>b.date-a.date);
  const ivs=interventionsFor(s,5);
  const statusBadge=s.isBlackSpot?`<span class="badge badge-fatal">Pikë e Zezë</span>`:s.isEmerging?`<span class="badge badge-warn">Në Zhvillim</span>`:s.isMonitor?`<span class="seg-status mon">Në Vëzhgim</span>`:`<span class="badge neutral">${nwa.meta.label}</span>`;
  const rfRows=Object.values(nwa.proactive.rfs);
  const ev=s.evidence||{};
  view().innerHTML=`<div class="view-pad page-shell fade-in profile-page page-segment">
    <a class="btn sm ghost profile-back" href="#/segments">← Regjistri</a>

    ${pageZone('Vlerësimi',`<div class="profile-hero">
      <div class="ph-top">
        <div class="ph-info">
          <div class="flex-c gap-8 ph-badges">${statusBadge}<span class="ph-tag">${s.roadType}</span></div>
          <h2 class="profile-road">${escapeHtml(s.road)}</h2>
          <div class="ph-meta">
            <span class="ph-chip"><span class="ph-chip-k">ID</span>${s.id}</span>
            <span class="ph-chip"><span class="ph-chip-k">km</span><b>${s.kmFrom}-${s.kmTo}</b></span>
            <span class="ph-chip"><span class="ph-chip-k">${s.municipality}</span></span>
            <span class="ph-chip"><span class="ph-chip-k">AADT</span>${fmt.n(s.aadt)}</span>
            <span class="ph-chip"><span class="ph-chip-k">${s.divided?'Me ndarje':'Pa ndarje'}</span></span>
          </div>
        </div>
        <div class="ph-kpis">
          ${phStat(m.n,'Aksidente','model','historiku i plotë')}
          ${phStat(m.fatalities,'Fatalitete','model','historiku i plotë')}
          <div class="ph-stat ph-stat--trend">${trendChip(s.trend)}<span class="ps-hint">tendenca vjetore</span><span class="ps-period">${periodOf('model')}</span></div>
        </div>
      </div>
    </div>`,'zone-assessment')}

    ${pageZone('Diagnoza',`<div class="profile-row-2">
      <div class="card">
        ${cardHead('Shkaktarët')}
        <div class="card-pad">${renderCausesBars(s)}</div>
      </div>
      <div class="card">
        ${cardHead('Masat e Rekomanduara')}
        <div class="card-pad stack">
          ${ivs.slice(0,4).map(iv=>`<div class="action-card">
            <div class="ac-head"><h6>${iv.measure}</h6><span class="badge neutral">${iv.priority}</span></div>
          </div>`).join('')||'<p class="prose muted">Pa rekomandime.</p>'}
        </div>
      </div>
    </div>`,'zone-diagnosis')}

    ${pageZone('Risku',`<div class="card profile-risk-card">
      <div class="card-pad">${riskViz(nwa)}</div>
      ${s.isBlackSpot?`<div class="profile-bs-block">
        <span class="alert-k">Pikë e Zezë</span>
        <ul class="obs-list compact">${bsReasons.map(r=>`<li>${r}</li>`).join('')}</ul>
      </div>`:''}
    </div>`,'zone-risk')}

    ${pageZone('Koeficientët',`<div class="card">
      <div class="card-pad profile-coef-intro">
        <p class="prose muted">Niveli i riskut llogaritet duke kombinuar <b>gjendjen e rrugës</b> (koeficientët RF të infrastrukturës) me <b>historikun reaktiv</b> të aksidenteve në dritaren ${NWA_REACTIVE_WINDOW.join('-')}.</p>
      </div>
      <div class="profile-row-2 profile-coef-grid">
        <div class="profile-coef-col">
          <h6 class="sub-block-title">Gjendja e rrugës · ${nwa.proactive.score}%</h6>
          <div class="tbl-wrap"><table class="tbl param-tbl"><thead><tr><th>Parametri</th><th class="num" title="Koeficienti i rrezikut">Koef.</th><th class="num">Cilësia</th></tr></thead><tbody>
            ${rfRows.map(r=>`<tr><td>${r.label}</td><td class="num">${r.rf}</td><td class="num">${r.quality}%</td></tr>`).join('')}
          </tbody></table></div>
        </div>
        <div class="profile-coef-col">
          <h6 class="sub-block-title">Historiku reaktiv · ${NWA_REACTIVE_WINDOW.join('-')}</h6>
          <div class="tbl-wrap"><table class="tbl param-tbl"><thead><tr><th>Treguesi</th><th class="num">Vlera</th></tr></thead><tbody>
            <tr><td>Aksidente me viktima</td><td class="num"><b>${nwa.reactive.k}</b></td></tr>
            <tr><td>Densiteti</td><td class="num">${nwa.reactive.crashDensity}</td></tr>
            <tr><td>Shkalla</td><td class="num">${nwa.reactive.crashRate}</td></tr>
            <tr><td>Pritshme</td><td class="num">${nwa.reactive.expected}</td></tr>
            <tr><td>Klasifikimi</td><td class="num">${NWA_REACTIVE_META[nwa.reactive.cls]?.label||nwa.reactive.cls}</td></tr>
            <tr><td>Metrika</td><td class="num">${nwa.reactive.metricUsed==='crash_rate'?'Shkalla (AADT)':'Densiteti'}</td></tr>
            <tr><td>p (i lartë)</td><td class="num">${nwa.reactive.pHigh??'-'}%</td></tr>
            ${nwa.proactive.trafficFiltered?'<tr><td>Filtri trafikut</td><td class="num">p3→p2 (AADT i ulët)</td></tr>':''}
          </tbody></table></div>
        </div>
      </div>
      ${ev.n?`<div class="card-pad profile-evidence">
        <h6 class="sub-block-title">Dëshmi nga historiku</h6>
        <div class="evidence-chips">
          <span class="ev-chip">${ev.overSpeedPct}% mbi limit</span>
          <span class="ev-chip">${ev.noLightPct}% natë pa dritë</span>
          <span class="ev-chip">${ev.wetPct}% sipërfaqe e lagësht</span>
          <span class="ev-chip">Ambulanca ~${ev.avgResp} min</span>
        </div>
      </div>`:''}
    </div>`,'zone-coef')}

    ${pageZone('Konteksti',`<div class="profile-row-2">
      <div class="card">
        ${cardHead('Tendenca')}
        <div class="card-pad mini-trend">${lineChart({h:160,labels:YEARS,area:true,series:[{name:'Aks.',color:'#475569',data:m.byYear},{name:'Fat.',color:'#94a3b8',data:m.fatByYear}]})}${chartFootnote('Vite: '+YEARS.join(', '))}</div>
      </div>
      <div class="card card-map">
        ${cardHead('Vendndodhja')}
        <div class="map-shell profile-map"><div id="mapMain"></div></div>
      </div>
    </div>`,'zone-context')}

    ${pageZone('Historiku i aksidenteve',`<div class="card">
      ${cardHead('Aksidentet e regjistruara')}
      <div class="tbl-wrap tbl-scroll-sm"><table class="tbl tbl-pro"><thead><tr><th>ID</th><th>Data</th><th>Lloji i aksidentit</th><th>Ashpërsia</th><th class="num">Fat.</th><th class="num">Lënduar</th><th>Lloji i viktimës</th><th>Ndriçimi</th><th class="num">Shpejtësia</th></tr></thead><tbody>
        ${crashes.length?crashes.map(a=>`<tr><td class="mono cell-id">${a.id}</td><td>${fmt.dateShort(a.date)} ${a.time}</td><td class="cell-meta">${a.collision_type}</td><td><span class="badge ${a.severity===4?'badge-fatal':a.severity>=3?'badge-warn':'neutral'}">${a.severityLabel}</span></td><td class="num">${toneFatal(a.fatalities,'-')}</td><td class="num">${a.injured||0}</td><td class="cell-meta">${a.victim_type||'-'}${a.alcohol_involved?' · Alkool':''}</td><td class="cell-meta">${a.lighting}</td><td class="num">${a.estimated_speed}</td></tr>`).join(''):`<tr><td colspan="9" class="empty-cell">Pa aksidente të regjistruara.</td></tr>`}
      </tbody></table></div>
    </div>`,'zone-history')}

    <div class="page-actions flex-c gap-12"><a class="btn primary" href="#/reports">Raport</a><a class="btn ghost" href="#/interventions">Ndërhyrjet</a></div>
  </div>`;
  setTimeout(()=>{
    _map=baseMap('mapMain',[s.lat,s.lng],14);
    s.accidents.forEach(a=>L.circleMarker([a.lat,a.lng],{radius:a.fatalities?7:4,color:sevColor(a.severity),weight:a.fatalities?2:0,fillColor:sevColor(a.severity),fillOpacity:.7}).addTo(_map).bindTooltip(`${a.id} · ${a.severityLabel}`));
    L.circle([s.lat,s.lng],{radius:s.lengthKm*500,color:nwaColor(nwa),weight:1.5,fillOpacity:.05,dashArray:'5 5'}).addTo(_map);
    setTimeout(()=>{ if(_map&&_map.invalidateSize) _map.invalidateSize(); },120);
  },30);
}

/* ================================================================
   5. INTERVENTIONS
   ================================================================ */
function renderInterventions(){
  const port=interventionPortfolio(30);
  const avgFr=Math.round(port.reduce((s,i)=>s+i.fr,0)/port.length);
  const avgRr=Math.round(port.reduce((s,i)=>s+i.rr,0)/port.length);
  const byType={};
  port.forEach(i=>byType[i.type]=(byType[i.type]||0)+1);
  const typeColors={Infrastrukturore:'#475569',Shpejtësie:'#64748b',Policore:'#334155',Edukative:'#94a3b8',Emergjente:'#64748b'};
  view().innerHTML=`<div class="view-pad page-shell fade-in page-interventions">
    ${pageHead('interventions',`${port.length} masa të rekomanduara`)}

    ${pageZone('Përmbledhje',`<div class="grid grid-kpi">
      ${kpi({label:'Masa',val:port.length,tone:'acc'})}
      ${kpi({label:'Ulje e riskut',val:avgRr,unit:'%',invert:true,tone:'good'})}
      ${kpi({label:'Ulje e fataliteteve',val:avgFr,unit:'%',invert:true,tone:'good'})}
      ${kpi({label:'Segmente',val:new Set(port.map(p=>p.seg.id)).size,tone:'acc'})}
    </div>`,'zone-summary')}

    ${pageZone('Plani',`<div class="grid g2 iv-plan-grid">
      <div class="card">
        ${cardHead('Masat e Rekomanduara')}
        <div class="tbl-wrap tbl-scroll"><table class="tbl tbl-pro"><thead><tr><th>Masa</th><th>Lloji</th><th>Segment</th><th class="num">Risku</th><th class="num">Fat.</th><th>Prioriteti</th></tr></thead><tbody>
        ${port.map(iv=>`<tr class="clickable" onclick="location.hash='#/segment/${iv.seg.id}'">
          <td><span class="strong">${iv.measure}</span></td>
          <td><span class="badge neutral">${iv.type}</span></td>
          <td class="mono cell-id">${iv.seg.id}</td>
          <td class="num">${toneGood('-'+iv.rr+'%')}</td>
          <td class="num">${toneGood('-'+iv.fr+'%')}</td>
          <td><span class="badge ${iv.priority==='Kritike'?'badge-fatal':iv.priority==='I lartë'?'badge-warn':'neutral'}">${iv.priority}</span></td></tr>`).join('')}
        </tbody></table></div>
      </div>
      <div class="card">
        ${cardHead('Sipas Llojit')}
        <div class="card-pad donut-center">
          ${donut(Object.entries(byType).map(([k,v])=>({val:v,color:typeColors[k]||CHART_COL.slate,label:k})),{center:port.length,sub:'masa',size:170})}
          <div class="legend-list mt-16">
          ${Object.entries(byType).map(([k,v])=>`<div class="legend-row"><span class="lg-dot" style="background:${typeColors[k]||CHART_COL.slate}"></span><span class="legend-name">${k}</span><b>${v}</b></div>`).join('')}
          </div>
        </div>
      </div>
    </div>`,'zone-plan')}
  </div>`;
}

/* ================================================================
   8. REPORTS
   ================================================================ */
let reportSel={type:'national',target:'',qark:'all',q:'',yearFrom:2021,yearTo:2025};

function reportPeriodLabel(){
  return reportSel.yearFrom===reportSel.yearTo?String(reportSel.yearFrom):`${reportSel.yearFrom}-${reportSel.yearTo}`;
}
function setReportPeriod(val){
  if(val==='2014-2025'){reportSel.yearFrom=2014;reportSel.yearTo=2025;}
  else if(val.includes('-')){const p=val.split('-').map(Number);reportSel.yearFrom=p[0];reportSel.yearTo=p[1];}
  else{const y=Number(val);reportSel.yearFrom=y;reportSel.yearTo=y;}
}
function reportMunis(qark){
  const src=qark&&qark!=='all'?SEGS.filter(s=>s.qark===qark):SEGS;
  return [...new Set(src.map(s=>s.municipality))].sort();
}
function reportSegments(){
  let list=[...SEGS];
  if(reportSel.qark&&reportSel.qark!=='all') list=list.filter(s=>s.qark===reportSel.qark);
  if(reportSel.q){
    const q=reportSel.q.toLowerCase();
    list=list.filter(s=>s.id.toLowerCase().includes(q)||s.road.toLowerCase().includes(q)||s.municipality.toLowerCase().includes(q)||s.qark.toLowerCase().includes(q));
  }
  return list.sort((a,b)=>b.priority-a.priority);
}
function filterAccsByPeriod(accs){
  return accs.filter(a=>a.year>=reportSel.yearFrom&&a.year<=reportSel.yearTo);
}
function reportSummaryText(){
  const period=reportPeriodLabel();
  if(reportSel.type==='national') return `Raport kombëtar · Periudha ${period} · Burim zyrtar + model territorial`;
  if(reportSel.type==='regional') return `Raport rajonal · Qarku ${reportSel.target||'-'} · Periudha ${period}`;
  if(reportSel.type==='municipal') return `Raport bashkiak · ${reportSel.target||'-'}${reportSel.qark!=='all'?' · '+reportSel.qark:''} · Periudha ${period}`;
  const s=SEGS.find(x=>x.id===reportSel.target);
  return s?`Raport segmenti · ${s.id} · ${shortRoad(s)} · ${s.municipality} · Periudha ${period}`:`Zgjidh një segment për të gjeneruar raportin.`;
}

function renderReports(){
  const qarks=[...new Set(SEGS.map(s=>s.qark))].sort();
  view().innerHTML=`<div class="view-pad page-shell fade-in page-reports">
    ${pageHead('reports','Raporte kombëtare, rajonale dhe sipas segmentit')}

    ${pageZone('Konfigurimi',`<div class="card rep-card">
      <div class="card-pad">
        <div class="rep-field">
          <label>Lloji i raportit</label>
          <div class="rep-type-tabs" id="repTypeTabs">
            <button type="button" class="rep-type-tab on" data-t="national"><span class="t-title">Kombëtar</span><span class="t-sub">INSTAT · i gjithë vendi</span></button>
            <button type="button" class="rep-type-tab" data-t="regional"><span class="t-title">Qark</span><span class="t-sub">Sipas qarkut</span></button>
            <button type="button" class="rep-type-tab" data-t="municipal"><span class="t-title">Bashki</span><span class="t-sub">Sipas bashkisë</span></button>
            <button type="button" class="rep-type-tab" data-t="segment"><span class="t-title">Segment</span><span class="t-sub">Një segment rruge</span></button>
          </div>
        </div>

        <div class="rep-toolbar-grid">
          <div class="rep-field rep-field-scope hidden" id="fldQark">
            <label for="repQark">Qarku</label>
            <select class="inp" id="repQark"><option value="">Zgjidh qarkun…</option>${qarks.map(q=>`<option>${q}</option>`).join('')}</select>
          </div>
          <div class="rep-field rep-field-scope hidden" id="fldMuniQark">
            <label for="repMuniQark">Filtro qarkun (opsional)</label>
            <select class="inp" id="repMuniQark"><option value="all">Të gjitha qarqet</option>${qarks.map(q=>`<option>${q}</option>`).join('')}</select>
          </div>
          <div class="rep-field rep-field-scope hidden" id="fldMuni">
            <label for="repMuni">Bashkia</label>
            <select class="inp" id="repMuni"><option value="">Zgjidh bashkinë…</option></select>
          </div>
          <div class="rep-field rep-field-scope hidden" id="fldSegQark">
            <label for="repSegQark">Qarku (opsional)</label>
            <select class="inp" id="repSegQark"><option value="all">Të gjitha qarqet</option>${qarks.map(q=>`<option>${q}</option>`).join('')}</select>
          </div>
          <div class="rep-field rep-field-scope hidden" id="fldSegSearch">
            <label for="repSegSearch">Kërko segment</label>
            <input class="inp" id="repSegSearch" placeholder="ID, rrugë, bashki…" autocomplete="off">
          </div>
          <div class="rep-field rep-field-scope hidden" id="fldSegment">
            <label for="repSegment">Segmenti</label>
            <select class="inp" id="repSegment"></select>
          </div>
          <div class="rep-field">
            <label for="repPeriod">Periudha analitike</label>
            <select class="inp" id="repPeriod">
              <option value="2021-2025" selected>2021 - 2025 (model territorial)</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2024-2025">2024 - 2025</option>
              <option value="2014-2025">2014 - 2025 (zyrtare e plotë)</option>
            </select>
          </div>
        </div>

        <div class="rep-summary">
          <span class="rs-label">Konfigurimi aktiv</span>
          <span class="rs-value" id="repSummary">-</span>
          <span class="rs-meta" id="repMeta"></span>
        </div>
        <div class="rep-actions">
          <button type="button" class="btn" id="repReset">Rivendos filtrat</button>
          <button type="button" class="btn" id="repCsv">Eksporto CSV</button>
          <button type="button" class="btn" onclick="window.print()">Printo / PDF</button>
        </div>
      </div>
    </div>`,'zone-config')}

    ${pageZone('Rezultati','<div id="reportOut"></div>','zone-output')}
  </div>`;

  document.querySelectorAll('#repTypeTabs .rep-type-tab').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('#repTypeTabs .rep-type-tab').forEach(x=>x.classList.remove('on'));
      btn.classList.add('on');
      reportSel.type=btn.dataset.t;
      if(reportSel.type==='regional'&&!reportSel.target) reportSel.target=qarks[0]||'';
      if(reportSel.type==='municipal'){
        reportSel.qark='all';
        const munis=reportMunis('all');
        reportSel.target=munis[0]||'';
      }
      if(reportSel.type==='segment'){
        reportSel.qark='all'; reportSel.q='';
        const segs=reportSegments();
        reportSel.target=segs[0]?segs[0].id:'';
      }
      syncReportUI(); drawReport();
    });
  });

  document.getElementById('repQark').addEventListener('change',e=>{reportSel.target=e.target.value;syncReportUI();drawReport();});
  document.getElementById('repMuniQark').addEventListener('change',e=>{
    reportSel.qark=e.target.value;
    const munis=reportMunis(reportSel.qark);
    reportSel.target=munis.includes(reportSel.target)?reportSel.target:(munis[0]||'');
    syncReportUI(); drawReport();
  });
  document.getElementById('repMuni').addEventListener('change',e=>{reportSel.target=e.target.value;syncReportUI();drawReport();});
  document.getElementById('repSegQark').addEventListener('change',e=>{
    reportSel.qark=e.target.value;
    const segs=reportSegments();
    reportSel.target=segs.some(s=>s.id===reportSel.target)?reportSel.target:(segs[0]?segs[0].id:'');
    syncReportUI(); drawReport();
  });
  document.getElementById('repSegSearch').addEventListener('input',e=>{
    reportSel.q=e.target.value.trim();
    const segs=reportSegments();
    reportSel.target=segs.some(s=>s.id===reportSel.target)?reportSel.target:(segs[0]?segs[0].id:'');
    syncReportUI(); drawReport();
  });
  document.getElementById('repSegment').addEventListener('change',e=>{reportSel.target=e.target.value;syncReportUI();drawReport();});
  document.getElementById('repPeriod').addEventListener('change',e=>{setReportPeriod(e.target.value);syncReportUI();drawReport();});
  document.getElementById('repReset').addEventListener('click',()=>{
    reportSel={type:'national',target:'',qark:'all',q:'',yearFrom:2021,yearTo:2025};
    document.querySelectorAll('#repTypeTabs .rep-type-tab').forEach(x=>x.classList.toggle('on',x.dataset.t==='national'));
    document.getElementById('repPeriod').value='2021-2025';
    document.getElementById('repSegSearch').value='';
    syncReportUI(); drawReport();
  });

  const repCsvBtn=document.getElementById('repCsv');
  if(repCsvBtn) repCsvBtn.addEventListener('click',exportReportCSV);

  syncReportUI(); drawReport();
}

function exportReportCSV(){
  const out=document.getElementById('reportOut');
  const tables=out?out.querySelectorAll('table.tbl'):[];
  if(!tables.length){ return; }
  const blocks=[...tables].map(t=>{
    const sec=t.closest('.rs-sec');
    const h=sec?sec.querySelector('h4'):null;
    const title=h?h.textContent.replace(/\s+/g,' ').trim():'';
    const body=[...t.querySelectorAll('thead tr,tbody tr')].map(tr=>
      [...tr.children].map(c=>csvCell(cellText(c))).join(',')).join('\r\n');
    return (title?csvCell(title)+'\r\n':'')+body;
  });
  downloadCSV('raport-'+slugify(reportSel.type)+'.csv','\ufeff'+blocks.join('\r\n\r\n'));
}

function syncReportUI(){
  const t=reportSel.type;
  const show=id=>document.getElementById(id).classList.remove('hidden');
  const hide=id=>document.getElementById(id).classList.add('hidden');
  ['fldQark','fldMuniQark','fldMuni','fldSegQark','fldSegSearch','fldSegment'].forEach(hide);

  if(t==='regional'){
    show('fldQark');
    const q=document.getElementById('repQark');
    if(!reportSel.target) reportSel.target=q.options[1]?q.options[1].value:'';
    q.value=reportSel.target;
  } else if(t==='municipal'){
    show('fldMuniQark'); show('fldMuni');
    document.getElementById('repMuniQark').value=reportSel.qark||'all';
    const munis=reportMunis(reportSel.qark);
    const mSel=document.getElementById('repMuni');
    mSel.innerHTML=(munis.length?munis:['']).map(m=>`<option value="${m}">${m||'-'}</option>`).join('');
    if(!munis.includes(reportSel.target)) reportSel.target=munis[0]||'';
    mSel.value=reportSel.target;
  } else if(t==='segment'){
    show('fldSegQark'); show('fldSegSearch'); show('fldSegment');
    document.getElementById('repSegQark').value=reportSel.qark||'all';
    document.getElementById('repSegSearch').value=reportSel.q||'';
    const segs=reportSegments();
    const sSel=document.getElementById('repSegment');
    sSel.innerHTML=segs.length?segs.map(s=>`<option value="${s.id}">${s.id} · ${escapeHtml(shortRoad(s))} · ${s.municipality}</option>`).join(''):'<option value="">Asnjë segment</option>';
    if(!segs.some(s=>s.id===reportSel.target)) reportSel.target=segs[0]?segs[0].id:'';
    if(segs.length) sSel.value=reportSel.target;
  }

  document.getElementById('repSummary').textContent=reportSummaryText();
  const meta=document.getElementById('repMeta');
  if(t==='national') meta.textContent='INSTAT · Policia · Model';
  else if(t==='segment'&&!reportSel.target) meta.textContent='Kërko ose zgjidh segmentin';
  else meta.textContent='Të dhëna modeluese territoriale';
}

function drawReport(){
  const out=document.getElementById('reportOut');
  if(!out) return;
  const today=fmt.date(new Date(2025,11,31));
  const period=reportPeriodLabel();

  if(reportSel.type==='national'){
    const latest=offLatest();
    const causeTally=OFFICIAL.causes;
    const accs=filterAccsByPeriod(ACCIDENTS);
    const fat=accs.reduce((s,a)=>s+a.fatalities,0);
    const inj=accs.reduce((s,a)=>s+a.injured,0);
    const qarkRows=Object.entries(OFFICIAL.accidentsByQark[2025]||{}).sort((a,b)=>b[1]-a[1]).slice(0,8);
    out.innerHTML=`<div class="report-sheet">
    <div class="rs-head"><div><div class="org">${OFFICIAL.source}</div><h3>Raport Kombëtar i Sigurisë Rrugore</h3><div class="meta">Republika e Shqipërisë · Periudha ${period} · Gjeneruar ${today}</div></div>
      <div class="ph-score"><div class="n">${latest.fatalities}</div><div class="l">Fatalitete ${latest.year}</div></div></div>
    <div class="rs-body">
      <div class="rs-sec"><h4>Përmbledhje</h4><p class="lead">Në ${latest.year} u regjistruan <b>${fmt.n(latest.accidents)}</b> aksidente, <b>${latest.fatalities}</b> fatalitete dhe <b>${fmt.n(latest.injured)}</b> të aksidentuar (INSTAT). Shkalla e fatalitetit: <b>${latest.fatalityRate}%</b>. Totali ${OFFICIAL.period}: <b>${OFFICIAL.totals.fatalities}</b> fatalitete, <b>${fmt.n(OFFICIAL.totals.accidents)}</b> aksidente.</p></div>
      <div class="rs-sec rs-kpi"><h4>Treguesit kryesorë · ${period}</h4><div class="grid g4">
        ${kpi({label:'Aksidente (model)',val:fmt.n(accs.length),tone:'navy',period})}
        ${kpi({label:'Fatalitete (model)',val:fat,tone:'red',period})}
        ${kpi({label:'Të lënduar (model)',val:fmt.n(inj),tone:'injured',period})}
        ${kpi({label:'Pikat e Zeza',val:NAT.blackSpots,tone:'red',period:'model'})}
      </div></div>
      <div class="rs-sec"><h4>Shkaqet dominante (INSTAT)</h4>
        ${causeTally.slice(0,5).map(c=>`<div class="scorebar-row"><span class="sb-name">${c.label}</span><span class="sb-track"><i style="width:${c.pct}%"></i></span><span class="sb-num">${c.pct}%</span></div>`).join('')}
      </div>
      ${qarkRows.length?`<div class="rs-sec"><h4>Aksidente sipas qarkut (INSTAT 2025)</h4><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Qarku</th><th class="num">Aksidente</th></tr></thead><tbody>
        ${qarkRows.map(([q,n])=>`<tr><td>${q}</td><td class="num">${n}</td></tr>`).join('')}
      </tbody></table></div></div>`:''}
      <div class="rs-sec"><h4>Vëzhgime</h4><ul class="obs-list">${OFFICIAL.observations.map(o=>`<li>${o}</li>`).join('')}</ul></div>
      ${sectionDivider('Analiza territoriale NWA')}
      <div class="rs-sec"><h4>Segmentet prioritare (${period})</h4><div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Segment</th><th>Qarku</th><th class="num">Risku</th><th class="num">${thPeriod('Fat.')}</th></tr></thead><tbody>
        ${[...SEGS].sort((a,b)=>b.nwa.integrated-a.nwa.integrated).slice(0,10).map((s,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(shortRoad(s))}</td><td>${s.qark}</td><td class="num"><b style="color:${nwaColor(s.nwa)}">${s.nwa.integrated}</b></td><td class="num">${s.m.fatalities}</td></tr>`).join('')}
      </tbody></table></div></div>
    </div></div>`;
    return;
  }

  if(reportSel.type==='segment'){
    const s=SEGS.find(x=>x.id===reportSel.target);
    if(!s){ out.innerHTML=`<div class="card card-pad"><div class="empty"><p>Zgjidh një segment nga filtrat e mësipërm për të gjeneruar raportin.</p></div></div>`; return; }
    return drawSegmentReport(out,s,today,period);
  }

  if((reportSel.type==='regional'&&!reportSel.target)||(reportSel.type==='municipal'&&!reportSel.target)){
    out.innerHTML=`<div class="card card-pad"><div class="empty"><p>Plotëso fushëveprimin (${reportSel.type==='regional'?'qarkun':'bashkinë'}) për të gjeneruar raportin.</p></div></div>`;
    return;
  }

  let title,scope,segs,accs;
  if(reportSel.type==='regional'){ title='Raport Rajonal · Qarku '+reportSel.target; scope='Qarku '+reportSel.target; segs=SEGS.filter(s=>s.qark===reportSel.target); accs=filterAccsByPeriod(ACCIDENTS.filter(a=>a.qark===reportSel.target)); }
  else { title='Raport për Bashkinë '+reportSel.target; scope='Bashkia '+reportSel.target; segs=SEGS.filter(s=>s.municipality===reportSel.target); accs=filterAccsByPeriod(ACCIDENTS.filter(a=>a.municipality===reportSel.target)); }
  const fat=accs.reduce((a,b)=>a+b.fatalities,0);
  const bs=segs.filter(s=>s.isBlackSpot).length, emg=segs.filter(s=>s.isEmerging).length;
  const avgClass=segs.length?Math.round(segs.reduce((a,s)=>a+s.nwa.integrated,0)/segs.length*10)/10:0;
  const topSeg=[...segs].sort((a,b)=>b.priority-a.priority).slice(0,10);
  const causeTally=causeAgg(segs);
  const domCause=causeTally[0]?causeTally[0].label.toLowerCase():'-';
  out.innerHTML=`<div class="report-sheet">
    <div class="rs-head"><div><div class="org">Platforma Kombëtare për Menaxhimin Proaktiv të Riskut Rrugor</div><h3>${title}</h3><div class="meta">Fushëveprimi: <b>${scope}</b> · Periudha: ${period} · Gjeneruar: ${today}<br>Të dhëna modeluese për validimin e metodologjisë - jo operacionale.</div></div>
      <div class="ph-score"><div class="n" style="color:${NWA_CLASS_META[Math.round(avgClass)]?.color||'#64748b'}">${avgClass}</div><div class="l">Risk mesatar</div></div></div>
    <div class="rs-body">
      <div class="rs-sec"><h4>Përmbledhje ekzekutive</h4><p class="lead">Gjatë periudhës <b>${period}</b>, në fushëveprimin <b>${scope}</b> u regjistruan <b>${fmt.n(accs.length)}</b> aksidente me <b>${fat}</b> fatalitete. <b>${bs}</b> pika të zeza dhe <b>${emg}</b> në zhvillim. Risk mesatar: <b>${avgClass}/5</b>. Shkaku dominant: <b>${domCause}</b>.</p></div>
      <div class="rs-sec rs-kpi"><h4>Treguesit kryesorë</h4><div class="grid g4">
        ${kpi({label:'Aksidente',val:fmt.n(accs.length),tone:'navy',period})}
        ${kpi({label:'Fatalitete',val:fat,tone:'red',period})}
        ${kpi({label:'Pikat e Zeza',val:bs,tone:'red',period:'model'})}
        ${kpi({label:'Në zhvillim',val:emg,tone:'amber',period:'model'})}
      </div></div>
      <div class="rs-sec"><h4>Shkaqet rrënjësore dominante</h4>
        ${causeTally.slice(0,5).map(c=>`<div class="scorebar-row"><span class="sb-name">${c.label}</span><span class="sb-track"><i style="width:${c.pct}%"></i></span><span class="sb-num">${c.pct}%</span></div>`).join('')}
      </div>
      <div class="rs-sec"><h4>Segmentet prioritare · ${period}</h4><div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Segment</th><th>Bashkia</th><th class="num">${thPeriod('Aks.')}</th><th class="num">${thPeriod('Fat.')}</th><th>Risku</th><th>Rruga</th></tr></thead><tbody>
        ${topSeg.length?topSeg.map((s,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(shortRoad(s))}<br><span class="muted" style="font-size:11px">${s.id}</span></td><td>${s.municipality}</td><td class="num">${s.m.n}</td><td class="num" style="color:var(--red)">${s.m.fatalities}</td><td>${nwaCell(s.nwa)}</td><td>${nwaSubBadge(s.nwa.proactive.cls,'pro')}</td></tr>`).join(''):'<tr><td colspan="7" class="muted">Nuk ka segmente në këtë fushëveprim.</td></tr>'}
      </tbody></table></div></div>
      <div class="rs-sec"><h4>Rekomandime</h4><p class="lead">Prioritizo ndërhyrjet në ${bs} pikat e zeza aktive; vendos masa parandaluese te ${emg} segmentet në zhvillim; dhe trajto shkakun dominant (<b>${domCause}</b>) me masa infrastrukturore dhe të menaxhimit të shpejtësisë.</p></div>
    </div>
  </div>`;
}
function drawSegmentReport(out,s,today,period){
  if(!s){out.innerHTML='';return;}
  period=period||reportPeriodLabel();
  const m=s.m,nwa=s.nwa,ivs=interventionsFor(s,4);
  out.innerHTML=`<div class="report-sheet">
    <div class="rs-head"><div><div class="org">Raport Segmenti · ${s.id}</div><h3>${escapeHtml(s.road)} · km ${s.kmFrom}-${s.kmTo}</h3><div class="meta">${s.municipality}, ${s.qark} · ${nwa.typeLabel} · AADT ${fmt.n(s.aadt)} · Periudha ${period} · Gjeneruar ${today}</div></div>
      <div class="ph-score"><div class="n" style="color:${nwaColor(nwa)}">${nwa.integrated}</div><div class="l">${nwa.meta.label}</div></div></div>
    <div class="rs-body">
      <div class="rs-sec"><h4>Vlerësimi i riskut · ${period}</h4><p class="lead"><b>${nwa.meta.label}</b>. Rruga: <b>${NWA_PROACTIVE_META[nwa.proactive.cls].label}</b> (${nwa.proactive.score}%). Aksidente: <b>${NWA_REACTIVE_META[nwa.reactive.cls].label}</b> (${periodOf('nwa')}). Total: <b>${m.n}</b> aksidente, <b>${m.fatalities}</b> fatalitete (${period}).</p></div>
      <div class="rs-sec"><h4>Shkaqet rrënjësore</h4>${s.causes.filter(c=>c.contribution>=8).slice(0,4).map(c=>`<div class="scorebar-row"><span class="sb-name">${c.label}</span><span class="sb-track"><i style="width:${c.contribution}%"></i></span><span class="sb-num">${c.contribution}%</span></div>`).join('')}</div>
      <div class="rs-sec"><h4>Veprime të rekomanduara</h4><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Masa</th><th>Lloji</th><th class="num">Ulje risku</th><th class="num">Ulje fat.</th><th>Prioriteti</th></tr></thead><tbody>
        ${ivs.map(iv=>`<tr><td>${iv.measure}</td><td>${iv.type}</td><td class="num" style="color:var(--green)">-${iv.rr}%</td><td class="num" style="color:var(--green)">-${iv.fr}%</td><td><span class="badge ${iv.priority==='Kritike'?'crit':iv.priority==='I lartë'?'high':'med'}">${iv.priority}</span></td></tr>`).join('')}
      </tbody></table></div></div>
    </div></div>`;
}

/* ================================================================
   9. METHODOLOGY
   ================================================================ */
function mFormula(code){ return `<pre class="m-formula">${code}</pre>`; }
function mWhy(t){ return `<p class="m-why"><span class="m-why-l">Pse</span>${t}</p>`; }
function mWhere(rows){ return `<ul class="m-where">${rows.map(r=>`<li><code>${r[0]}</code><span>${r[1]}</span></li>`).join('')}</ul>`; }

function renderMethodology(){
  view().innerHTML=`<div class="view-pad page-shell fade-in page-methodology">
    ${pageHead('methodology','Metodologjia NWA (DG MOVE 2023)')}
    ${buildMethodologyHTML({SEGS,NAT,OFFICIAL,fmt,secHead,mFormula,mWhy,mWhere,escapeHtml,shortRoad})}
  </div>`;
}

/* ================================================================
   10. DATA QUALITY
   ================================================================ */
function renderQuality(){
  const avgClass=NAT.avgClass;
  const nwaCov=Math.round(SEGS.filter(s=>s.nwa.reactive.cls!=='nodata').length/SEGS.length*100);
  view().innerHTML=`<div class="view-pad page-shell fade-in page-quality">
    ${pageHead('quality',`${NAT.segments} segmente · ${fmt.n(modelYearStats(2025).n)} aksidente (2025)`)}

    ${pageZone('Burimet',`<div class="grid g2">
      <div class="card">
        ${cardHead('Të Dhëna Zyrtare')}
        <div class="card-pad"><div class="kv-list">
          <div class="kv-row"><span class="k">Periudha zyrtare</span><span class="v">${OFFICIAL.period}</span></div>
          <div class="kv-row"><span class="k">Periudha model</span><span class="v">${DATA_PERIODS.model.label}</span></div>
          <div class="kv-row"><span class="k">Dritare NWA</span><span class="v">${DATA_PERIODS.nwa.label}</span></div>
          <div class="kv-row"><span class="k">Aksidente</span><span class="v">${fmt.n(OFFICIAL.totals.accidents)}</span></div>
          <div class="kv-row"><span class="k">Fatalitete</span><span class="v">${OFFICIAL.totals.fatalities}</span></div>
          <div class="kv-row"><span class="k">Burimi</span><span class="v">${OFFICIAL.source}</span></div>
        </div></div>
      </div>
      <div class="card">
        ${cardHead('Model i Rrjetit')}
        <div class="card-pad"><div class="kv-list">
          <div class="kv-row"><span class="k">Segmente</span><span class="v">${NAT.segments}</span></div>
          <div class="kv-row"><span class="k">Periudha</span><span class="v">${DATA_PERIODS.model.label}</span></div>
          <div class="kv-row"><span class="k">Aksidente (2025)</span><span class="v">${fmt.n(modelYearStats(2025).n)} · INSTAT ${offLatest().accidents}</span></div>
          <div class="kv-row"><span class="k">Të lënduar (2025)</span><span class="v">${fmt.n(ACCIDENTS.filter(a=>a.year===2025).reduce((s,a)=>s+a.injured,0))} · INSTAT ${offLatest().injured}</span></div>
          <div class="kv-row"><span class="k">Totali 2021-2025</span><span class="v">${fmt.n(NAT.totAcc)} aks. · ${fmt.n(NAT.totInjured)} lënd.</span></div>
          <div class="kv-row"><span class="k">Rrjeti demo</span><span class="v">${NAT.segments} seg · ${fmt.n(NAT.networkKm)} km</span></div>
          <div class="kv-row"><span class="k">Inventari</span><span class="v">${NETWORK_INVENTORY.source}</span></div>
          <div class="kv-row"><span class="k">Mbulim NWA</span><span class="v">${nwaCov}%</span></div>
          <div class="kv-row"><span class="k">Risk mesatar</span><span class="v">${avgClass}/5</span></div>
          <div class="kv-row"><span class="k">Pikat e Zeza</span><span class="v">${NAT.blackSpots}</span></div>
        </div></div>
      </div>
    </div>`,'zone-sources')}

    ${pageZone('Evolucioni',`<div class="card">
      ${cardHead('Evolucioni')}
      <div class="card-pad">${barChart({h:200,labels:offYears(),data:offSeries('accidents'),color:'#475569'})}${chartFootnote('Aksidente zyrtare · '+OFFICIAL.period)}</div>
    </div>`,'zone-evolution')}
  </div>`;
}

/* ================================================================
   11. SETTINGS
   ================================================================ */
function renderSettings(){
  view().innerHTML=`<div class="view-pad page-shell page-shell--narrow fade-in page-settings">
    ${pageHead('settings','Parametrat e klasifikimit NWA')}

    ${pageZone('Pragjet',`<div class="card">
      ${cardHead('Pragjet')}
      <div class="card-pad"><div class="kv-list">
        <div class="kv-row"><span class="k">Risk i lartë</span><span class="v">Niveli 4-5</span></div>
        <div class="kv-row"><span class="k">Kombinim kritik</span><span class="v">Shumë aksidente + rrugë problematike</span></div>
        <div class="kv-row"><span class="k">Në zhvillim</span><span class="v">Niveli 3</span></div>
        <div class="kv-row"><span class="k">Në vëzhgim</span><span class="v">Niveli 2</span></div>
      </div>
      <p class="note-inline mt-12"><a href="#/methodology">Metodologjia NWA</a></p></div>
    </div>`,'zone-thresholds')}

    ${pageZone('Platforma',`<div class="card">
      ${cardHead('Platforma')}
      <div class="card-pad"><div class="kv-list">
        <div class="kv-row"><span class="k">Versioni</span><span class="v">v1</span></div>
        <div class="kv-row"><span class="k">Të dhëna</span><span class="v">Zyrtare ${OFFICIAL.period} · Model ${DATA_PERIODS.model.label}</span></div>
        <div class="kv-row"><span class="k">Fatalitete 2025</span><span class="v">${offLatest().fatalities}</span></div>
        <div class="kv-row"><span class="k">Segmente</span><span class="v">${NAT.segments}</span></div>
        <div class="kv-row"><span class="k">Objektivi</span><span class="v">Zero Fatalitete 2040</span></div>
      </div></div>
    </div>`,'zone-platform')}
  </div>`;
}

/* ================================================================
   HELPERS
   ================================================================ */
function shortRoad(s){ return s.road.replace(/\s*\(.*?\)/,''); }
function sevColor(sev){ return {4:'#dc2626',3:'#ea580c',2:'#d97706',1:'#0d9488'}[sev]||'#64748b'; }
function trendPct(arr){ const a=arr[0]+arr[1],b=arr[3]+arr[4]; return Math.round((b-a)/(a||1)*100); }
function aggBy(field){
  const map={};
  SEGS.forEach(s=>{ (map[s[field]]=map[s[field]]||[]).push(s); });
  return Object.entries(map).map(([key,arr])=>({key,n:arr.length,avgClass:Math.round(arr.reduce((a,s)=>a+s.nwa.integrated,0)/arr.length*10)/10,fat:arr.reduce((a,s)=>a+s.m.fatalities,0)})).sort((a,b)=>b.avgClass-a.avgClass);
}
function causeAgg(segs){
  const t={}; CAUSES.forEach(c=>t[c.key]=0);
  segs.forEach(s=>s.causes.forEach(c=>t[c.key]+=c.contribution*s.m.n));
  const tot=Object.values(t).reduce((a,b)=>a+b,0)||1;
  return CAUSES.map(c=>({...c,pct:Math.round(t[c.key]/tot*100)})).sort((a,b)=>b.pct-a.pct);
}
function bucketize(vals,labels){
  const b=[0,0,0,0];
  vals.forEach(v=>{ if(v<50)b[0]++;else if(v<70)b[1]++;else if(v<85)b[2]++;else b[3]++; });
  return {vals:b};
}

/* base Leaflet map with clean basemap */
function baseMap(id,center,zoom){
  const map=L.map(id,{zoomControl:true,attributionControl:false,scrollWheelZoom:true}).setView(center,zoom);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{
    maxZoom:19,subdomains:'abcd',
    attribution:'&copy; OpenStreetMap &copy; CARTO'
  }).addTo(map);
  map.zoomControl.setPosition('bottomright');
  return map;
}
function fitAlbania(){ if(_map) _map.fitBounds([[39.6,19.2],[42.7,21.1]],{padding:[20,20]}); }

/* sidebar mobile */
function closeSidebar(){ document.getElementById('sidebar').classList.remove('open'); document.getElementById('scrim').classList.remove('on'); }
document.getElementById('menuToggle').addEventListener('click',()=>{document.getElementById('sidebar').classList.toggle('open');document.getElementById('scrim').classList.toggle('on');});
document.getElementById('scrim').addEventListener('click',closeSidebar);

/* sidebar collapse (desktop) - condensed icon rail, persisted */
function applyCollapse(on){
  document.getElementById('app').classList.toggle('collapsed',on);
  const btn=document.getElementById('collapseToggle');
  if(btn) btn.setAttribute('aria-pressed',on?'true':'false');
  try{ localStorage.setItem('sb-collapsed',on?'1':'0'); }catch(e){}
  setTimeout(()=>{ if(_map&&_map.invalidateSize) _map.invalidateSize(); },260);
}
(function initCollapse(){
  const btn=document.getElementById('collapseToggle'); if(!btn) return;
  let saved='0'; try{ saved=localStorage.getItem('sb-collapsed')||'0'; }catch(e){}
  applyCollapse(saved==='1');
  btn.addEventListener('click',()=>applyCollapse(!document.getElementById('app').classList.contains('collapsed')));
})();

/* interactive chart tooltips (hover + click) */
function initChartTooltips(){
  let tip=document.getElementById('chartTip');
  if(!tip){ tip=document.createElement('div'); tip.id='chartTip'; tip.className='chart-tip'; document.body.appendChild(tip); }
  const move=e=>{ const pad=14, r=tip.getBoundingClientRect();
    let x=e.clientX+pad, y=e.clientY+pad;
    if(x+r.width>window.innerWidth) x=e.clientX-r.width-pad;
    if(y+r.height>window.innerHeight) y=e.clientY-r.height-pad;
    tip.style.left=Math.max(6,x)+'px'; tip.style.top=Math.max(6,y)+'px';
  };
  const show=(e,el)=>{ tip.textContent=el.getAttribute('data-tip'); tip.classList.add('on'); move(e); };
  const hide=()=>tip.classList.remove('on');
  document.addEventListener('mouseover',e=>{ const el=e.target.closest('[data-tip]'); if(el) show(e,el); });
  document.addEventListener('mousemove',e=>{ if(tip.classList.contains('on')) move(e); });
  document.addEventListener('mouseout',e=>{ if(e.target.closest('[data-tip]')) hide(); });
  document.addEventListener('click',e=>{ const el=e.target.closest('[data-tip]'); if(el) show(e,el); else hide(); });
}

/* boot */
function boot(){
  const ver=document.getElementById('appVersion');
  if(ver) ver.textContent='v1 demo · '+APP_BUILD;
  buildNav();
  initChartTooltips();
  const latest=offLatest();
  document.getElementById('tbFatal').textContent=latest.fatalities;
  document.getElementById('tbAcc').textContent=fmt.n(latest.accidents);
  document.getElementById('tbRate').textContent=latest.fatalityRate+'%';
  const tbFatalL=document.querySelector('.topbar-stat .l');
  if(tbFatalL) document.querySelectorAll('.topbar-stat .l').forEach((el,i)=>{
    const labels=['Fatalitete 2025 (INSTAT)','Aksidente 2025 (INSTAT)','Shkalla e fatalitetit 2025'];
    el.textContent=labels[i]||el.textContent;
  });
  if(!location.hash) location.hash='#/dashboard';
  navigate();
}
boot();
