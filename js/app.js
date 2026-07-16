/* =============================================================
   app.js - SPA shell: navigation, hash router, module views.
   ============================================================= */

const APP_BUILD='20260629-ui18';
const NAV=[
  {group:'Analizë', items:[
    {id:'dashboard',  label:'Paneli Analitik',      ico:'grid'},
    {id:'risk-map',   label:'Harta e Riskut',       ico:'map'},
    {id:'segments',   label:'Segmentet',            ico:'layers', badge:()=>NAT.blackSpots+NAT.emerging+NAT.monitor, warn:true},
  ]},
  {group:'Veprim', items:[
    {id:'interventions', label:'Ndërhyrjet', ico:'tool'},
    {id:'reports',       label:'Raporte',    ico:'file'},
  ]},
  {group:'Sistemi', items:[
    {id:'methodology', label:'Metodologjia',       ico:'book'},
    {id:'quality',     label:'Cilësia e të Dhënave',ico:'check'},
    {id:'settings',    label:'Konfigurimet',        ico:'gear'},
  ]},
];
const TITLES={
  dashboard:'Paneli Analitik Kombëtar',  'risk-map':'Harta e Riskut',
  segments:'Segmentet Rrugore',
  interventions:'Ndërhyrjet',reports:'Raportimi',methodology:'Metodologjia',
  quality:'Cilësia e të Dhënave',settings:'Konfigurimet',segment:'Profili i Segmentit'
};

let _map=null;
const view=()=>document.getElementById('view');

/* ---------- shared UI helpers ---------- */
function kpi(o){
  const cls=o.tone||'';
  let deltaHtml='';
  if(o.delta!=null){
    const dir=o.delta>0?(o.invert?'down':'up'):o.delta<0?(o.invert?'up':'down'):'flat';
    deltaHtml=`<span class="delta ${dir}">${o.delta>0?'+':''}${o.delta}${o.deltaUnit||'%'}</span>`;
  }
  return `<div class="kpi ${cls}">
    <div class="kpi-label">${o.label}</div>
    <div class="kpi-val tnum">${o.val}${o.unit?`<span class="u">${o.unit}</span>`:''}</div>
    <div class="kpi-sub">${deltaHtml}${o.sub?`<span class="kpi-note">${o.sub}</span>`:''}</div>
  </div>`;
}
function trendChip(tr){
  return `<span class="trend-chip ${tr.cls}">${tr.label}</span>`;
}
function riskCell(score){
  const t=riskTier(score);
  return `<span class="score-pill"><span class="riskbar" style="flex:1"><i style="width:${score}%;background:${t.color}"></i></span><span class="score-num" style="color:${t.color}">${score}</span></span>`;
}
function nwaCell(nwa){ return nwaClassCell(nwa); }
function nwaBadge(nwa){ return nwaClassBadge(nwa); }
function nwaColor(nwa){ return (nwa.meta||NWA_CLASS_META[nwa.integrated]).color; }
function tierBadge(score){ const t=riskTier(score); return `<span class="badge ${t.key} dot">${t.label}</span>`; }
function secHead(title,pill){ return `<div class="sec-head"><h4>${title}</h4>${pill?`<span class="pill">${pill}</span>`:''}<span class="line"></span></div>`; }
function yoyCell(v){
  if(v==null||v===undefined) return '<span class="yoy-flat">-</span>';
  const cls=v>0?'yoy-up':v<0?'yoy-down':'yoy-flat';
  return `<span class="${cls}">${v>0?'+':''}${v}%</span>`;
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
        ${it.badge?`<span class="nav-badge ${it.warn?'warn':''}">${it.badge()}</span>`:''}
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
    const title=(head.querySelector('h5')?.textContent||'tabela').trim();
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
  if(route==='prediction'){ segFilter.status='watch'; location.hash='#/segments'; return; }
  if(_map){ try{_map.remove();}catch(e){} _map=null; }
  setActiveNav(route);
  document.getElementById('pageTitle').textContent=TITLES[route]||'-';
  const v=view(); v.scrollTop=0;
  const R={dashboard:renderDashboard,'risk-map':renderRiskMap,segments:renderSegments,interventions:renderInterventions,reports:renderReports,methodology:renderMethodology,quality:renderQuality,settings:renderSettings,segment:()=>renderSegmentProfile(arg)};
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
  const causeCols=[CHART_COL.red,CHART_COL.amber,CHART_COL.navy,CHART_COL.teal,CHART_COL.blue,'#64748b','#7c3aed','#059669','#ea580c','#334155','#94a3b8'];
  const q25=Object.entries(OFFICIAL.accidentsByQark[2025]).sort((a,b)=>b[1]-a[1]);

  view().innerHTML=`<div class="view-pad fade-in">
    <div class="page-head">
      <h3>Paneli Analitik i Sigurisë Rrugore</h3>
      <p>Pamje kombëtare për periudhën ${OFFICIAL.period}. Të dhënat zyrtare formojnë bazën e vendimmarrjes; analiza territoriale identifikon riskun lokal dhe prioritetet e ndërhyrjes.</p>
    </div>

    <div class="grid grid-kpi">
      ${kpi({label:'Fatalitete',val:latest.fatalities,ico:'skull',tone:'red',delta:y2025.fatalities,sub:`${latest.year} · ndryshim vjetor`})}
      ${kpi({label:'Aksidente',val:fmt.n(latest.accidents),ico:'car',tone:'navy',delta:y2025.accidents,sub:`${latest.year}`})}
      ${kpi({label:'Të aksidentuar',val:fmt.n(latest.injured),ico:'alert',tone:'amber',delta:y2025.injured,sub:'vrarë dhe të plagosur'})}
      ${kpi({label:'Shkalla e fatalitetit',val:latest.fatalityRate,unit:'%',ico:'shield',tone:'red',sub:'për 100 aksidente'})}
    </div>

    <div class="grid g2 mt-20">
      <div class="card">
        <div class="card-head"><h5>Evolucioni kombëtar</h5><span class="data-tag official">Zyrtare · ${OFFICIAL.period}</span></div>
        <div class="card-pad">${lineChart({h:240,labels:years,series:[
          {name:'Aksidente',color:CHART_COL.navy,data:offSeries('accidents')},
          {name:'Fatalitete',color:CHART_COL.red,data:offSeries('fatalities')},
        ]})}
        <div class="flex-c gap-16 mt-12">${chartLegend([{color:CHART_COL.navy,label:'Aksidente'},{color:CHART_COL.red,label:'Fatalitete'}])}</div></div>
      </div>
      <div class="card">
        <div class="card-head"><h5>Shkaku i aksidentit</h5><span class="data-tag official">Zyrtare</span></div>
        <div class="card-pad donut-wrap">
          ${donut(OFFICIAL.causes.map((c,i)=>({val:c.pct,color:causeCols[i],label:c.label})),{center:'100',sub:'kontribut',size:160})}
          <div class="donut-side">
            ${OFFICIAL.causes.slice(0,6).map((c,i)=>`<div class="scorebar-row">
              <span class="sb-name sb-name-wide">${c.label}</span>
              <span class="sb-track"><i style="width:${c.pct}%;background:${causeCols[i]}"></i></span>
              <span class="sb-num">${c.pct}%</span></div>`).join('')}
          </div>
        </div>
      </div>
    </div>

    <div class="grid g2 mt-20">
      <div class="card">
        <div class="card-head"><h5>Ndryshimi vjetor (%)</h5><span class="hint">2021-2025</span></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Viti</th><th class="num">Fatalitete</th><th class="num">Të aksidentuar</th><th class="num">Aksidente</th></tr></thead><tbody>
          ${OFFICIAL.yoy.filter(y=>y.year>=2021).map(y=>`<tr>
            <td>${y.year}</td><td class="num">${yoyCell(y.fatalities)}</td>
            <td class="num">${yoyCell(y.injured)}</td><td class="num">${yoyCell(y.accidents)}</td></tr>`).join('')}
        </tbody></table></div>
      </div>
      <div class="card">
        <div class="card-head"><h5>Vëzhgime kryesore</h5></div>
        <div class="card-pad"><ul class="obs-list">
          ${OFFICIAL.observations.map(o=>`<li>${o}</li>`).join('')}
        </ul></div>
      </div>
    </div>

    <div class="grid g2 mt-20">
      <div class="card">
        <div class="card-head"><h5>Aksidente sipas qarkut</h5><span class="hint">${latest.year}</span></div>
        <div class="card-pad">${barChart({h:220,labels:q25.slice(0,8).map(q=>q[0]),data:q25.slice(0,8).map(q=>q[1]),color:CHART_COL.navy})}</div>
      </div>
      <div class="card">
        <div class="card-head"><h5>Fatalitete sipas ditës së javës</h5><span class="hint">${OFFICIAL.period}</span></div>
        <div class="card-pad">${barChart({h:220,labels:OFFICIAL.fatalitiesByWeekday.map(d=>d.label),data:OFFICIAL.fatalitiesByWeekday.map(d=>d.val),color:CHART_COL.red})}</div>
      </div>
    </div>

    ${sectionDivider('Vlerësimi i rrjetit','Prioritetet sipas nivelit të riskut','<span class="data-tag model">Model</span>')}

    <div class="grid grid-kpi">
      ${kpi({label:'Pikat e Zeza',val:NAT.blackSpots,ico:'alert',tone:'red'})}
      ${kpi({label:'Në zhvillim',val:NAT.emerging,ico:'trend',tone:'amber'})}
      ${kpi({label:'Risk i lartë',val:NAT.highRisk,ico:'layers',tone:'amber',sub:'nivel 4–5'})}
      ${kpi({label:'Risk mesatar',val:NAT.avgClass,unit:'/5',ico:'shield'})}
    </div>

    <div class="grid g2 mt-20">
      <div class="card">
        <div class="card-head"><h5>Segmentet prioritare</h5><div class="right"><a class="btn sm" href="#/segments">Të gjitha</a></div></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Segment</th><th>Bashkia</th><th class="num">Aks.</th><th class="num">Fat.</th><th>Rruga</th><th>Historiku</th><th>Niveli i riskut</th></tr></thead><tbody>
          ${topSeg.map((s,i)=>`<tr class="clickable" onclick="location.hash='#/segment/${s.id}'">
            <td><span class="rank ${i<3?'t'+(i+1):''}">${i+1}</span></td>
            <td><span class="strong">${escapeHtml(shortRoad(s))}</span><br><span class="cell-sub">${s.id}</span></td>
            <td>${s.municipality}</td><td class="num">${s.m.n}</td>
            <td class="num num-fatal">${s.m.fatalities}</td>
            <td>${nwaSubBadge(s.nwa.proactive.cls,'pro')}</td>
            <td>${nwaSubBadge(s.nwa.reactive.cls,'rea')}</td>
            <td>${nwaCell(s.nwa)}</td></tr>`).join('')}
        </tbody></table></div>
      </div>
      <div class="card card-map">
        <div class="card-head"><h5>Harta e riskut</h5><div class="right"><a class="btn sm" href="#/risk-map">Hap hartën</a></div></div>
        <div class="map-shell map-pro"><div id="mapMain"></div></div>
      </div>
    </div>
  </div>`;
  setTimeout(()=>initRiskSummaryMap(),30);
}
function initRiskSummaryMap(){
  _map=baseMap('mapMain',[41.0,19.9],7);
  SEGS.forEach(s=>riskSegmentMarker(s).addTo(_map));
  fitAlbania();
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
  view().innerHTML=`<div class="view-pad fade-in map-view">
    <div class="page-head map-head">
      <h3>Harta e Riskut</h3>
      <p>${NAT.segments} segmente · ${NAT.blackSpots} pika të zeza</p>
    </div>
    <div class="map-shell map-pro map-full"><div id="mapMain"></div>
      <div class="map-panel map-title">Shqipëria<span>Niveli i riskut 1–5</span></div>
      <div class="map-panel map-layers">
        <h6>Shtresat</h6>
        <label class="layer-row"><input type="checkbox" id="lyHeat" checked> Dendësia</label>
        <label class="layer-row"><input type="checkbox" id="lyAcc"> Aksidente <span class="cnt">${fmt.n(NAT.totAcc)}</span></label>
        <label class="layer-row"><input type="checkbox" id="lyFat"> Fatalitete <span class="cnt">${ACCIDENTS.filter(a=>a.fatalities>0).length}</span></label>
        <label class="layer-row"><input type="checkbox" id="lyRisk" checked> Niveli i riskut <span class="cnt">${NAT.segments}</span></label>
        <label class="layer-row"><input type="checkbox" id="lyBs" checked> Pikat e Zeza <span class="cnt">${NAT.blackSpots}</span></label>
        <label class="layer-row"><input type="checkbox" id="lyEm"> Në zhvillim <span class="cnt">${NAT.emerging}</span></label>
      </div>
      <div class="map-panel map-legend map-risk-legend"><h6>Niveli i riskut</h6>
        <div class="risk-gradient-bar"></div>
        ${riskLegendHTML()}
      </div>
    </div>
  </div>`;
  setTimeout(initFullMap,30);
}
function initFullMap(){
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
  const rules=Array.isArray(o.rules)?o.rules:[o.rules];
  return `<button type="button" class="status-guide ${o.tier}${active}" data-seg-filter="${o.filter}" title="Filtro: ${o.title}">
    <div class="sg-top">
      <span class="sg-icon" aria-hidden="true">${o.icon}</span>
      <div class="sg-title-wrap">
        <h5>${o.title}</h5>
        <span class="sg-level">${o.level}</span>
      </div>
      <span class="sg-count tnum">${o.count}</span>
    </div>
    <ul class="sg-rules">${rules.map(r=>`<li>${r}</li>`).join('')}</ul>
    <div class="sg-tags">${o.tags.map(t=>`<span class="sg-tag">${t}</span>`).join('')}</div>
  </button>`;
}
function bindSegGuideFilters(){
  document.querySelectorAll('[data-seg-filter]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const v=btn.dataset.segFilter;
      segFilter.status=segFilter.status===v?'all':v;
      const sel=document.getElementById('segStatus');
      if(sel) sel.value=segFilter.status;
      document.querySelectorAll('.status-guide').forEach(b=>b.classList.toggle('active',b.dataset.segFilter===segFilter.status));
      renderSegTable();
    });
  });
}
function renderSegments(){
  const roadTypes=Object.entries(NWA_TYPES).map(([k,v])=>({key:k,label:v.label}));
  const qarks=[...new Set(SEGS.map(s=>s.qark))].sort();
  const watch=NAT.emerging+NAT.monitor;
  view().innerHTML=`<div class="view-pad fade-in">
    <div class="page-head"><h3>Segmentet Rrugore</h3><p>${NAT.segments} segmente - pika të zeza, në zhvillim, në vëzhgim dhe rrjeti i plotë.</p></div>
    <div class="grid g3 mt-20 status-guide-grid">
      ${segGuideCard({tier:'bs',icon:'!',title:'Pika e Zezë',count:NAT.blackSpots,level:'Veprim i menjëhershëm',filter:'blackspot',rules:NWA_BLACK_SPOT_RULES.blackSpot,tags:['Niveli 4–5','Shumë aksidente','Prioritet maksimal']})}
      ${segGuideCard({tier:'em',icon:'↗',title:'Në zhvillim',count:NAT.emerging,level:'Kandidat për escalim',filter:'emerging',rules:[NWA_BLACK_SPOT_RULES.emerging],tags:['Niveli 3','Jo pikë e zezë','Prioritet i lartë']})}
      ${segGuideCard({tier:'mon',icon:'◎',title:'Në vëzhgim',count:NAT.monitor,level:'Monitorim aktiv',filter:'monitor',rules:[NWA_BLACK_SPOT_RULES.monitor],tags:['Niveli 2','Sinjale mesatare','Vëzhgim']})}
    </div>
    <div class="card mt-20 seg-list-card">
      <div class="card-head seg-list-top">
        <h5>Lista e segmenteve</h5>
        <span class="hint" id="segCountHint"></span>
      </div>
      <div class="seg-filter-bar">
        <input class="inp seg-search-inp" id="segSearch" placeholder="Kërko…" value="${escapeHtml(segFilter.q)}">
        <select class="inp seg-filter-sel" id="segStatus" title="Statusi">
          <option value="all" ${segFilter.status==='all'?'selected':''}>Të gjitha (${NAT.segments})</option>
          <option value="blackspot" ${segFilter.status==='blackspot'?'selected':''}>Pika e Zezë (${NAT.blackSpots})</option>
          <option value="watch" ${segFilter.status==='watch'?'selected':''}>Në vëzhgim (${watch})</option>
          <option value="emerging" ${segFilter.status==='emerging'?'selected':''}>Në zhvillim (${NAT.emerging})</option>
          <option value="monitor" ${segFilter.status==='monitor'?'selected':''}>Monitorim (${NAT.monitor})</option>
        </select>
        <select class="inp seg-filter-sel" id="segQark" title="Qarku"><option value="all">Qarku</option>${qarks.map(q=>`<option ${segFilter.qark===q?'selected':''}>${q}</option>`).join('')}</select>
        <select class="inp seg-filter-sel" id="segRoadType" title="Tipi"><option value="all">Tipi rruge</option>${roadTypes.map(t=>`<option value="${t.key}" ${segFilter.roadType===t.key?'selected':''}>${t.label}</option>`).join('')}</select>
        <select class="inp seg-filter-sel" id="segTier" title="Risku"><option value="all">Risku</option><option value="5" ${segFilter.tier==='5'?'selected':''}>Risk 5</option><option value="4" ${segFilter.tier==='4'?'selected':''}>Risk 4</option><option value="3" ${segFilter.tier==='3'?'selected':''}>Risk 3</option><option value="2" ${segFilter.tier==='2'?'selected':''}>Risk 2</option><option value="1" ${segFilter.tier==='1'?'selected':''}>Risk 1</option></select>
        <select class="inp seg-filter-sel" id="segSort" title="Renditja"><option value="priority" ${segFilter.sort==='priority'?'selected':''}>Prioritet</option><option value="nwa" ${segFilter.sort==='nwa'?'selected':''}>Risku</option><option value="fatalities" ${segFilter.sort==='fatalities'?'selected':''}>Fatalitete</option><option value="accidents" ${segFilter.sort==='accidents'?'selected':''}>Aksidente</option><option value="proactive" ${segFilter.sort==='proactive'?'selected':''}>Rruga</option></select>
      </div>
      <div class="tbl-wrap tbl-scroll seg-tbl-wrap" id="segTblWrap"></div>
    </div>
  </div>`;
  const apply=()=>{ syncSegGuideActive(); renderSegTable(); };
  document.getElementById('segSearch').addEventListener('input',e=>{segFilter.q=e.target.value.toLowerCase();apply();});
  document.getElementById('segStatus').addEventListener('change',e=>{segFilter.status=e.target.value;apply();});
  document.getElementById('segQark').addEventListener('change',e=>{segFilter.qark=e.target.value;apply();});
  document.getElementById('segRoadType').addEventListener('change',e=>{segFilter.roadType=e.target.value;apply();});
  document.getElementById('segTier').addEventListener('change',e=>{segFilter.tier=e.target.value;apply();});
  document.getElementById('segSort').addEventListener('change',e=>{segFilter.sort=e.target.value;apply();});
  bindSegGuideFilters();
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
    if(segFilter.status==='watch'&&!(s.isEmerging||s.isMonitor)) return false;
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
  wrap.innerHTML=rows.length?`<table class="tbl seg-tbl"><thead><tr>
    <th class="col-rank">#</th><th>Segment</th><th>Statusi</th><th class="col-causes">Pse ndodhën</th><th>Bashkia / Qark</th><th class="col-risk">Risku</th><th class="num">Aks.</th><th class="num">Fat.</th><th>Trendi</th>
  </tr></thead><tbody>
  ${rows.map((s,i)=>`<tr class="clickable seg-tr-${segStatusTier(s)}" onclick="location.hash='#/segment/${s.id}'" title="Hap profilin e segmentit">
    <td class="col-rank"><span class="rank ${i<3?'t'+(i+1):''}">${i+1}</span></td>
    <td class="col-seg"><span class="strong">${escapeHtml(shortRoad(s))}</span><span class="cell-sub">${s.id} · km ${s.kmFrom}–${s.kmTo}</span></td>
    <td class="col-status">${segStatusBadge(s)}</td>
    <td class="col-causes">${segCausesCell(s)}</td>
    <td>${s.municipality}<span class="cell-sub">${s.qark}</span></td>
    <td class="col-risk">${nwaCell(s.nwa)}</td>
    <td class="num"><b>${s.m.n}</b></td>
    <td class="num num-fatal"><b>${s.m.fatalities||'-'}</b></td>
    <td>${trendChip(s.trend)}</td>
  </tr>`).join('')}
  </tbody></table>`
    :`<div class="empty" style="padding:32px"><p>Asnjë segment nuk përputhet me kriteret.</p></div>`;
}

/* ================================================================
   5. SEGMENT PROFILE (full report page)
   ================================================================ */
function segCausesCell(s){
  if(!s.causes?.length) return '<span class="cell-meta">—</span>';
  const top=s.causes.slice(0,2);
  const more=s.causes.length-top.length;
  return `<div class="seg-cause-list">${top.map(c=>`<span class="seg-cause-chip" title="${escapeHtml(c.summary)}">${c.shortLabel} <b>${c.count}</b></span>`).join('')}${more?`<span class="seg-cause-more">+${more}</span>`:''}</div>`;
}
function renderCausesTable(s){
  if(!s.causes.length) return '<p class="prose muted">Pa aksidente në historik.</p>';
  return `<table class="tbl cause-tbl"><thead><tr>
    <th>Shkaku</th><th class="num">Herë</th><th class="num">Pjesa</th><th class="num">Vdekje</th><th>Si ndodhi</th>
  </tr></thead><tbody>${s.causes.map(c=>`<tr>
    <td class="cause-name" title="${escapeHtml(c.desc||'')}">${c.label}${c.desc?`<span class="cause-hint" title="${escapeHtml(c.desc)}">?</span>`:''}</td>
    <td class="num"><b>${c.count}</b></td>
    <td class="num">${c.contribution}%</td>
    <td class="num num-fatal">${c.fatalCount||'—'}</td>
    <td class="cause-hist">
      <div class="cause-tags">${c.tags.map(t=>`<span class="cause-tag">${escapeHtml(t)}</span>`).join('')}</div>
      ${c.example?`<span class="cause-ex">${escapeHtml(c.example)}</span>`:''}
    </td>
  </tr>`).join('')}</tbody></table>`;
}
function renderSegmentProfile(id){
  const s=SEGS.find(x=>x.id===id);
  if(!s){ view().innerHTML=`<div class="view-pad"><div class="empty"><p>Segmenti nuk u gjet.</p><a class="btn mt-16" href="#/segments">Kthehu te segmentet</a></div></div>`; return; }
  document.getElementById('pageTitle').textContent='Profili i Segmentit · '+s.id;
  const m=s.m, nwa=s.nwa;
  const status=nwaSegmentStatus(s);
  const bsReasons=blackSpotReasons(s);
  const crashes=[...s.accidents].sort((a,b)=>b.date-a.date);
  const ivs=interventionsFor(s,5);
  const statusBadge=s.isBlackSpot?`<span class="badge crit dot">Pikë e Zezë</span>`:s.isEmerging?`<span class="badge med dot">Në zhvillim</span>`:s.isMonitor?`<span class="badge neutral dot">Në vëzhgim</span>`:nwaBadge(nwa);
  const rfRows=Object.values(nwa.proactive.rfs);
  view().innerHTML=`<div class="view-pad fade-in">
    <a class="btn sm ghost" href="#/segments" style="margin-bottom:14px">← Segmentet</a>
    <div class="profile-hero">
      <div class="ph-top">
        <div>
          <div class="flex-c gap-8 ph-badges">${statusBadge}<span class="ph-tag">${s.roadType}</span><span class="ph-tag ph-tag-type">${nwa.typeLabel}</span></div>
          <h3>${escapeHtml(s.road)}</h3>
          <div class="ph-meta">
            <span class="ph-chip"><span class="ph-chip-k">ID</span>${s.id}</span>
            <span class="ph-chip"><span class="ph-chip-k">km</span><b>${s.kmFrom}–${s.kmTo}</b></span>
            <span class="ph-chip"><span class="ph-chip-k">Vendndodhja</span><b>${s.municipality}</b>, ${s.qark}</span>
            <span class="ph-chip"><span class="ph-chip-k">AADT</span><b>${fmt.n(s.aadt)}</b></span>
            <span class="ph-chip"><span class="ph-chip-k">Limit</span><b>${s.speedLimit} km/h</b></span>
          </div>
        </div>
        <div class="ph-score ph-score-risk">
          <div class="n" style="color:${nwaColor(nwa)}">${nwa.integrated}</div>
          <div class="l">${nwa.meta.label}</div>
        </div>
      </div>
    </div>

    <div class="grid g4 mt-20">
      ${kpi({label:'Aksidente (5 vjet)',val:m.n,ico:'car',tone:'navy',sub:`${m.accPerKmYr}/km/vit`})}
      ${kpi({label:'Fatalitete',val:m.fatalities,ico:'skull',tone:'red',sub:`${m.fatalCrashes} fatale`})}
      ${kpi({label:'Të lënduar rëndë',val:m.serious,ico:'alert',tone:'amber',sub:`${m.minor} të lehta`})}
      ${kpi({label:'Statusi',val:status.label,ico:'shield',tone:s.isBlackSpot?'red':s.isEmerging?'amber':'navy'})}
    </div>

    <div class="grid g2 mt-20" style="grid-template-columns:1fr 1.1fr">
      <div class="card">
        <div class="card-head"><h5>Gjendja e rrugës</h5><span class="hint">${nwa.proactive.score}% · ${nwaSubBadge(nwa.proactive.cls,'pro')}</span></div>
        <div class="card-pad">
          <table class="tbl param-tbl"><thead><tr><th>Parametri</th><th class="num">Vlerësimi</th><th class="num">Cilësia</th></tr></thead><tbody>
            ${rfRows.map(r=>`<tr><td>${r.label}</td><td class="num">${r.rf}</td><td class="num">${r.quality}%</td></tr>`).join('')}
          </tbody></table>
          <p class="param-note"><b>Si lexohen:</b> <b>Cilësia</b> tregon sa e mirë është elementi (0–100%, më lartë = më sigurt). <b>Vlerësimi</b> është faktori RF (0.55–1.0), i llogaritur nga cilësia. Rezultati i rrugës = 100 × shumëzimi i të gjitha vlerësimeve.</p>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><h5>Historiku i aksidenteve</h5><span class="hint">${NWA_REACTIVE_WINDOW.join('–')} · ${nwaSubBadge(nwa.reactive.cls,'rea')}</span></div>
        <div class="card-pad">
          <table class="tbl param-tbl"><thead><tr><th>Treguesi</th><th class="num">Vlera</th></tr></thead><tbody>
            <tr><td>Aksidente me viktima</td><td class="num"><b>${nwa.reactive.k}</b></td></tr>
            <tr><td>Densiteti (aks/km/vit)</td><td class="num">${nwa.reactive.crashDensity}</td></tr>
            <tr><td>Shkalla (për AADT)</td><td class="num">${nwa.reactive.crashRate}</td></tr>
            <tr><td>Pritshme (krahasim)</td><td class="num">${nwa.reactive.expected}</td></tr>
          </tbody></table>
        </div>
      </div>
    </div>

    <div class="grid g2 mt-20" style="grid-template-columns:1fr 1.1fr">
      <div class="card">
        <div class="card-head"><h5>Niveli i riskut</h5><span class="hint">Vlerësim i përgjithshëm</span></div>
        <div class="card-pad">
          <p class="prose"><b>${nwa.meta.label}</b> - nga kombinimi i <b>${NWA_PROACTIVE_META[nwa.proactive.cls].label.toLowerCase()}</b> dhe <b>${NWA_REACTIVE_META[nwa.reactive.cls].label.toLowerCase()}</b>.</p>
          ${nwaBadge(nwa)}
        </div>
      </div>
      <div class="card">
        <div class="card-head"><h5>${s.isBlackSpot?'Pse është pikë e zezë?':'Përmbledhje'}</h5></div>
        <div class="card-pad">
          ${s.isBlackSpot?`<ul class="obs-list">${bsReasons.map(r=>`<li>${r}</li>`).join('')}</ul>`:`<p class="prose">${status.label}.</p>`}
        </div>
      </div>
    </div>

    <div class="card mt-20">
      <div class="card-head"><h5>Pse ndodhën aksidentet</h5><span class="hint">${segmentRiskNarrative(s)}</span></div>
      <div class="card-pad">${renderCausesTable(s)}</div>
    </div>

    <div class="grid g2 mt-20 profile-side-pair" style="grid-template-columns:1fr 1.1fr">
      <div class="card">
        <div class="card-head"><h5>Trendi i aksidenteve</h5><span class="hint">${trendChip(s.trend)}</span></div>
        <div class="card-pad">${lineChart({h:220,labels:YEARS,area:true,series:[{name:'Aksidente',color:CHART_COL.navy,data:m.byYear},{name:'Fatalitete',color:CHART_COL.red,data:m.fatByYear}]})}
        <div class="flex-c gap-16 mt-12">${chartLegend([{color:CHART_COL.navy,label:'Aksidente'},{color:CHART_COL.red,label:'Fatalitete'}])}</div></div>
      </div>
      <div class="card card-map">
        <div class="card-head"><h5>Lokalizimi</h5><span class="hint">${s.municipality}, ${s.qark}</span></div>
        <div class="map-shell map-pro"><div id="mapMain"></div></div>
      </div>
    </div>

    <div class="card mt-20">
      <div class="card-head"><h5>Veprime të rekomanduara</h5></div>
      <div class="card-pad stack">
        ${ivs.map(iv=>`<div class="action-card ${iv.priority==='Kritike'?'crit':iv.priority==='I lartë'?'high':''}">
          <div class="ac-head"><h6>${iv.measure}</h6><span class="ac-tag badge ${iv.priority==='Kritike'?'crit':iv.priority==='I lartë'?'high':'med'}">${iv.priority}</span></div>
          <p><b>Adreson:</b> ${iv.cause.label} (${iv.cause.contribution}% e riskut) · <b>Lloji:</b> ${iv.type}</p>
          <div class="action-metrics">
            <div class="am">Reduktim risku<b class="green">-${iv.rr}%</b></div>
            <div class="am">Reduktim fatalitetesh<b class="green">-${iv.fr}%</b></div>
          </div></div>`).join('')}
      </div>
    </div>

    <div class="card mt-20">
      <div class="card-head"><h5>Historiku i aksidenteve</h5><span class="hint">${crashes.length} regjistrime</span></div>
      <div class="tbl-wrap tbl-scroll-sm"><table class="tbl"><thead><tr><th>ID</th><th>Data</th><th>Ora</th><th>Lloji</th><th>Ashpërsia</th><th class="num">Fat.</th><th>Ndriçim</th><th>Kushte</th><th class="num">Shpejt.</th></tr></thead><tbody>
        ${crashes.map(a=>`<tr><td class="mono cell-id">${a.id}</td><td>${fmt.dateShort(a.date)}</td><td>${a.time}</td><td class="cell-meta">${a.collision_type}</td><td><span class="badge ${a.severity===4?'crit':a.severity===3?'high':a.severity===2?'med':'neutral'}">${a.severityLabel}</span></td><td class="num${a.fatalities?' num-fatal':''}">${a.fatalities||'-'}</td><td class="cell-meta">${a.lighting}</td><td class="cell-meta">${a.weather}</td><td class="num">${a.estimated_speed}</td></tr>`).join('')}
      </tbody></table></div>
    </div>
    <div class="flex-c gap-12 mt-20"><a class="btn navy" href="#/reports">Gjenero raport</a><a class="btn" href="#/interventions">Shiko ndërhyrjet</a></div>
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
  const typeColors={Infrastrukturore:CHART_COL.navy,Shpejtësie:CHART_COL.teal,Policore:CHART_COL.blue,Edukative:CHART_COL.amber,Emergjente:CHART_COL.red};
  view().innerHTML=`<div class="view-pad fade-in">
    <div class="page-head"><h3>Ndërhyrjet</h3><p>${port.length} masa për segmentet me risk të lartë.</p></div>
    <div class="grid grid-kpi">
      ${kpi({label:'Masa në portofol',val:port.length,ico:'tool',tone:'navy'})}
      ${kpi({label:'Reduktim mes. risku',val:avgRr,unit:'%',ico:'shield',tone:'navy',invert:true})}
      ${kpi({label:'Reduktim mes. fatalitetesh',val:avgFr,unit:'%',ico:'shield',tone:'green',invert:true})}
      ${kpi({label:'Segmente të mbuluara',val:new Set(port.map(p=>p.seg.id)).size,ico:'layers'})}
    </div>
    <div class="grid g2 mt-20" style="grid-template-columns:1.4fr 1fr">
      <div class="card">
        <div class="card-head"><h5>Portofoli i prioritizuar i ndërhyrjeve</h5><span class="hint">renditur sipas prioritetit</span></div>
        <div class="tbl-wrap tbl-scroll"><table class="tbl"><thead><tr><th>Masa</th><th>Lloji</th><th>Segment</th><th class="num">-Risk</th><th class="num">-Fat.</th><th>Prioritet</th></tr></thead><tbody>
        ${port.map(iv=>`<tr class="clickable" onclick="location.hash='#/segment/${iv.seg.id}'">
          <td><span class="strong">${iv.measure}</span><br><span class="cell-sub">adreson: ${iv.cause.label}</span></td>
          <td><span class="badge neutral">${iv.type}</span></td>
          <td class="mono cell-id">${iv.seg.id}</td>
          <td class="num num-gain">-${iv.rr}%</td>
          <td class="num num-gain">-${iv.fr}%</td>
          <td><span class="badge ${iv.priority==='Kritike'?'crit':iv.priority==='I lartë'?'high':'med'}">${iv.priority}</span></td></tr>`).join('')}
        </tbody></table></div>
      </div>
      <div class="card">
        <div class="card-head"><h5>Përbërja sipas tipit</h5></div>
        <div class="card-pad donut-center">
          ${donut(Object.entries(byType).map(([k,v])=>({val:v,color:typeColors[k]||CHART_COL.slate,label:k})),{center:port.length,sub:'masa',size:170})}
          <div class="legend-list mt-16">
          ${Object.entries(byType).map(([k,v])=>`<div class="legend-row"><span class="lg-dot" style="background:${typeColors[k]||CHART_COL.slate}"></span><span class="legend-name">${k}</span><b>${v}</b></div>`).join('')}
          </div>
        </div>
      </div>
    </div>
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
  view().innerHTML=`<div class="view-pad fade-in">
    <div class="page-head"><h3>Raportimi</h3><p>Gjenero raporte ekzekutive kombëtare, rajonale, bashkiake ose për segment. Konfiguro filtrat dhe shiko paraprakisht përmbledhjen para printimit.</p></div>

    <div class="card rep-card" style="margin-bottom:20px">
      <div class="card-head"><h5>Konfigurimi i raportit</h5><span class="hint">Lloji · fushëveprimi · periudha</span></div>
      <div class="card-pad">
        <div class="rep-field">
          <label>Lloji i raportit</label>
          <div class="rep-type-tabs" id="repTypeTabs">
            <button type="button" class="rep-type-tab on" data-t="national"><span class="t-title">Kombëtar</span><span class="t-sub">Përmbledhje zyrtare + prioritete</span></button>
            <button type="button" class="rep-type-tab" data-t="regional"><span class="t-title">Qark</span><span class="t-sub">Analizë rajonale</span></button>
            <button type="button" class="rep-type-tab" data-t="municipal"><span class="t-title">Bashki</span><span class="t-sub">Fokus lokal</span></button>
            <button type="button" class="rep-type-tab" data-t="segment"><span class="t-title">Segment</span><span class="t-sub">Profil i detajuar</span></button>
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
            <div class="rep-seg-count" id="repSegCount"></div>
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
          <button type="button" class="btn navy" onclick="window.print()">Printo / PDF</button>
        </div>
      </div>
    </div>
    <div id="reportOut"></div>
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
    sSel.innerHTML=segs.length?segs.slice(0,120).map(s=>`<option value="${s.id}">${s.id} · ${escapeHtml(shortRoad(s))} · ${s.municipality}</option>`).join(''):'<option value="">Asnjë segment</option>';
    if(!segs.some(s=>s.id===reportSel.target)) reportSel.target=segs[0]?segs[0].id:'';
    if(segs.length) sSel.value=reportSel.target;
    document.getElementById('repSegCount').textContent=segs.length?(segs.length>120?`Po shfaqen 120 nga ${segs.length} segmente`: `${segs.length} segmente`):'Asnjë segment nuk përputhet.';
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
    out.innerHTML=`<div class="report-sheet">
    <div class="rs-head"><div><div class="org">${OFFICIAL.source}</div><h3>Raport Kombëtar i Sigurisë Rrugore</h3><div class="meta">Republika e Shqipërisë · Periudha ${period} · Gjeneruar ${today}</div></div>
      <div class="ph-score"><div class="n">${latest.fatalities}</div><div class="l">Fatalitete ${latest.year}</div></div></div>
    <div class="rs-body">
      <div class="rs-sec"><h4>Përmbledhje</h4><p class="lead">Në ${latest.year} u regjistruan <b>${fmt.n(latest.accidents)}</b> aksidente, <b>${latest.fatalities}</b> fatalitete dhe <b>${fmt.n(latest.injured)}</b> të aksidentuar. Shkalla e fatalitetit: <b>${latest.fatalityRate}%</b>. Totali ${OFFICIAL.period}: <b>${OFFICIAL.totals.fatalities}</b> fatalitete, <b>${fmt.n(OFFICIAL.totals.accidents)}</b> aksidente.</p></div>
      <div class="rs-sec"><h4>Shkaqet dominante</h4>
        ${causeTally.slice(0,5).map(c=>`<div class="scorebar-row"><span class="sb-name">${c.label}</span><span class="sb-track"><i style="width:${c.pct}%"></i></span><span class="sb-num">${c.pct}%</span></div>`).join('')}
      </div>
      <div class="rs-sec"><h4>Vëzhgime</h4><ul class="obs-list">${OFFICIAL.observations.map(o=>`<li>${o}</li>`).join('')}</ul></div>
      ${sectionDivider('Analiza territoriale','Pikat e zeza · segmente prioritare','<span class="data-tag model">Model</span>')}
      <div class="rs-sec"><h4>Segmentet prioritare (${period})</h4><div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Segment</th><th class="num">Risku</th><th class="num">Fat.</th></tr></thead><tbody>
        ${[...SEGS].sort((a,b)=>b.nwa.integrated-a.nwa.integrated).slice(0,10).map((s,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(shortRoad(s))}</td><td class="num"><b style="color:${nwaColor(s.nwa)}">${s.nwa.integrated}</b></td><td class="num">${s.m.fatalities}</td></tr>`).join('')}
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
        ${kpi({label:'Aksidente',val:fmt.n(accs.length),tone:'navy'})}
        ${kpi({label:'Fatalitete',val:fat,tone:'red'})}
        ${kpi({label:'Pikat e Zeza',val:bs,tone:'red'})}
        ${kpi({label:'Në zhvillim',val:emg,tone:'amber'})}
      </div></div>
      <div class="rs-sec"><h4>Shkaqet rrënjësore dominante</h4>
        ${causeTally.slice(0,5).map(c=>`<div class="scorebar-row"><span class="sb-name">${c.label}</span><span class="sb-track"><i style="width:${c.pct}%"></i></span><span class="sb-num">${c.pct}%</span></div>`).join('')}
      </div>
      <div class="rs-sec"><h4>Segmentet prioritare</h4><div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Segment</th><th>Bashkia</th><th class="num">Aks.</th><th class="num">Fat.</th><th>Risku</th><th>Rruga</th></tr></thead><tbody>
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
      <div class="rs-sec"><h4>Vlerësimi i riskut</h4><p class="lead"><b>${nwa.meta.label}</b>. Rruga: <b>${NWA_PROACTIVE_META[nwa.proactive.cls].label}</b> (${nwa.proactive.score}%). Aksidente: <b>${NWA_REACTIVE_META[nwa.reactive.cls].label}</b>. Total: <b>${m.n}</b> aksidente, <b>${m.fatalities}</b> fatalitete.</p></div>
      <div class="rs-sec"><h4>Shkaqet rrënjësore</h4>${s.causes.filter(c=>c.contribution>=8).slice(0,4).map(c=>`<div class="scorebar-row"><span class="sb-name">${c.label}</span><span class="sb-track"><i style="width:${c.contribution}%"></i></span><span class="sb-num">${c.contribution}%</span></div>`).join('')}</div>
      <div class="rs-sec"><h4>Veprime të rekomanduara</h4><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Masa</th><th>Lloji</th><th class="num">-Risk</th><th class="num">-Fat.</th><th>Prioritet</th></tr></thead><tbody>
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
  view().innerHTML=buildMethodologyHTML({SEGS,NAT,OFFICIAL,fmt,secHead,mFormula,mWhy,mWhere,escapeHtml,shortRoad});
}

/* ================================================================
   10. DATA QUALITY
   ================================================================ */
function renderQuality(){
  const avgClass=NAT.avgClass;
  const nwaCov=Math.round(SEGS.filter(s=>s.nwa.reactive.cls!=='nodata').length/SEGS.length*100);
  view().innerHTML=`<div class="view-pad fade-in">
    <div class="page-head"><h3>Cilësia e të Dhënave</h3><p>Të dhëna zyrtare dhe mbulimi i vlerësimit të rrjetit.</p></div>
    <div class="grid g2 mt-20">
      <div class="card"><div class="card-head"><h5>Të dhëna zyrtare</h5><span class="data-tag official">INSTAT · Policia</span></div>
        <div class="card-pad"><div class="kv-list">
          <div class="kv-row"><span class="k">Periudha</span><span class="v">${OFFICIAL.period}</span></div>
          <div class="kv-row"><span class="k">Aksidente totale</span><span class="v">${fmt.n(OFFICIAL.totals.accidents)}</span></div>
          <div class="kv-row"><span class="k">Fatalitete totale</span><span class="v">${OFFICIAL.totals.fatalities}</span></div>
          <div class="kv-row"><span class="k">Burimi</span><span class="v">${OFFICIAL.source}</span></div>
        </div></div></div>
      <div class="card"><div class="card-head"><h5>Model i rrjetit</h5><span class="data-tag model">Demo</span></div>
        <div class="card-pad"><div class="kv-list">
          <div class="kv-row"><span class="k">Segmente</span><span class="v">${NAT.segments}</span></div>
          <div class="kv-row"><span class="k">Aksidente modeluese</span><span class="v">${fmt.n(NAT.totAcc)}</span></div>
          <div class="kv-row"><span class="k">Mbulim historiku</span><span class="v">${nwaCov}%</span></div>
          <div class="kv-row"><span class="k">Risk mesatar</span><span class="v">${avgClass}/5</span></div>
          <div class="kv-row"><span class="k">Pikat e zeza</span><span class="v">${NAT.blackSpots}</span></div>
        </div></div></div>
    </div>
    <div class="card mt-20"><div class="card-head"><h5>Evolucioni zyrtar i aksidenteve</h5></div>
      <div class="card-pad">${barChart({h:200,labels:offYears(),data:offSeries('accidents'),color:CHART_COL.navy})}</div>
    </div>
  </div>`;
}

/* ================================================================
   11. SETTINGS
   ================================================================ */
function renderSettings(){
  view().innerHTML=`<div class="view-pad fade-in" style="max-width:880px">
    <div class="page-head"><h3>Konfigurimet</h3><p>Parametra të platformës.</p></div>
    <div class="card"><div class="card-head"><h5>Pragjet e pikave të zeza</h5></div><div class="card-pad"><div class="kv-list">
      <div class="kv-row"><span class="k">Risk i lartë</span><span class="v">Nivel 4–5</span></div>
      <div class="kv-row"><span class="k">Kombinim kritik</span><span class="v">Shumë aksidente + rrugë problematike</span></div>
      <div class="kv-row"><span class="k">Në zhvillim</span><span class="v">Risk mesatar (nivel 3)</span></div>
      <div class="kv-row"><span class="k">Në vëzhgim</span><span class="v">Risk i ulët + sinjale mesatare</span></div>
    </div><p class="note-inline mt-12">Detajet e plota në <a href="#/methodology">Metodologji</a>.</p></div></div>
    <div class="card mt-20"><div class="card-head"><h5>Rreth platformës</h5></div><div class="card-pad">
      <div class="kv-list">
        <div class="kv-row"><span class="k">Versioni</span><span class="v">v1 · metodologjik</span></div>
        <div class="kv-row"><span class="k">Të dhëna zyrtare</span><span class="v">${OFFICIAL.period}</span></div>
        <div class="kv-row"><span class="k">Fatalitete 2025</span><span class="v">${offLatest().fatalities}</span></div>
        <div class="kv-row"><span class="k">Model segmentesh</span><span class="v">${NAT.segments}</span></div>
        <div class="kv-row"><span class="k">Pikat e zeza</span><span class="v">${NAT.blackSpots}</span></div>
        <div class="kv-row"><span class="k">Objektivi</span><span class="v">Zero Fatalitete 2040</span></div>
      </div>
    </div></div>
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
  if(!location.hash) location.hash='#/dashboard';
  navigate();
}
boot();
