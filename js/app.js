/* =============================================================
   app.js - SPA shell: navigation, hash router, module views.
   ============================================================= */

const NAV=[
  {group:'Analizë', items:[
    {id:'dashboard',  label:'Paneli Analitik',      ico:'grid'},
    {id:'risk-map',   label:'Harta e Riskut',       ico:'map'},
    {id:'blackspots', label:'Pikat e Zeza',         ico:'alert',  badge:()=>NAT.blackSpots},
    {id:'segments',   label:'Segmentet',            ico:'layers'},
    {id:'prediction', label:'Parashikimi',          ico:'trend',  badge:()=>NAT.emerging, warn:true},
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
  dashboard:'Paneli Analitik Kombëtar','risk-map':'Harta e Riskut',blackspots:'Pikat e Zeza',
  segments:'Analiza e Segmenteve',prediction:'Parashikimi i Riskut',
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
  if(_map){ try{_map.remove();}catch(e){} _map=null; }
  setActiveNav(route);
  document.getElementById('pageTitle').textContent=TITLES[route]||'-';
  const v=view(); v.scrollTop=0;
  const R={dashboard:renderDashboard,'risk-map':renderRiskMap,blackspots:renderBlackspots,segments:renderSegments,prediction:renderPrediction,interventions:renderInterventions,reports:renderReports,methodology:renderMethodology,quality:renderQuality,settings:renderSettings,segment:()=>renderSegmentProfile(arg)};
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
  const topSeg=[...SEGS].sort((a,b)=>b.priority-a.priority).slice(0,8);
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

    ${sectionDivider('Analiza territoriale e riskut','Identifikim segmentesh · pikat e zeza · parashikim','<span class="data-tag model">Model metodologjik</span>')}

    <div class="grid grid-kpi">
      ${kpi({label:'Pikat e Zeza',val:NAT.blackSpots,ico:'alert',tone:'red'})}
      ${kpi({label:'Në zhvillim',val:NAT.emerging,ico:'trend',tone:'amber'})}
      ${kpi({label:'Segmente me risk ≥ 60',val:NAT.highRisk,ico:'layers',tone:'amber'})}
      ${kpi({label:'Risk mesatar',val:NAT.avgRisk,unit:'/100',ico:'shield'})}
    </div>

    <div class="grid g2 mt-20">
      <div class="card">
        <div class="card-head"><h5>Segmentet prioritare</h5><div class="right"><a class="btn sm" href="#/segments">Të gjitha</a></div></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Segment</th><th>Bashkia</th><th class="num">Aks.</th><th class="num">Fat.</th><th>Trend</th><th style="width:120px">Risk</th></tr></thead><tbody>
          ${topSeg.map((s,i)=>`<tr class="clickable" onclick="location.hash='#/segment/${s.id}'">
            <td><span class="rank ${i<3?'t'+(i+1):''}">${i+1}</span></td>
            <td><span class="strong">${escapeHtml(shortRoad(s))}</span><br><span class="cell-sub">${s.id}</span></td>
            <td>${s.municipality}</td><td class="num">${s.m.n}</td>
            <td class="num num-fatal">${s.m.fatalities}</td>
            <td>${trendChip(s.trend)}</td><td>${riskCell(s.m.risk)}</td></tr>`).join('')}
        </tbody></table></div>
      </div>
      <div class="card card-map">
        <div class="card-head"><h5>Harta e riskut</h5><div class="right"><a class="btn sm" href="#/risk-map">Hap hartën</a></div></div>
        <div class="map-shell"><div id="mapMain"></div></div>
      </div>
    </div>
  </div>`;
  setTimeout(()=>initRiskSummaryMap(),30);
}
function initRiskSummaryMap(){
  _map=baseMap('mapMain',[41.0,19.9],7);
  SEGS.forEach(s=>{
    L.circleMarker([s.lat,s.lng],{radius:3+s.m.risk/14,color:riskColor(s.m.risk),weight:1,fillColor:riskColor(s.m.risk),fillOpacity:.55})
      .addTo(_map).on('click',()=>location.hash='#/segment/'+s.id)
      .bindTooltip(`${shortRoad(s)} · Risk ${s.m.risk}`);
  });
  fitAlbania();
}

/* ================================================================
   2. RISK MAP (multi-layer GIS)
   ================================================================ */
function renderRiskMap(){
  view().innerHTML=`<div class="view-pad fade-in" style="height:calc(100vh - 96px - 48px);display:flex;flex-direction:column;padding-bottom:18px">
    <div class="page-head" style="margin-bottom:14px">
      <h3>Harta e Riskut</h3>
      <p>Analizë hapësinore e segmenteve, pikave të zeza dhe parashikimit. <span class="data-tag model">Të dhëna modeluese</span></p>
    </div>
    <div class="map-shell" style="flex:1;min-height:420px"><div id="mapMain"></div>
      <div class="map-panel map-title">Harta e Riskut Rrugor<span>Analizë territoriale · model metodologjik</span></div>
      <div class="map-panel map-layers">
        <h6>Shtresat</h6>
        <label class="layer-row"><input type="checkbox" id="lyHeat" checked> Dendësia (heatmap)</label>
        <label class="layer-row"><input type="checkbox" id="lyAcc"> Aksidente <span class="cnt">${fmt.n(NAT.totAcc)}</span></label>
        <label class="layer-row"><input type="checkbox" id="lyFat"> Fatalitete <span class="cnt">${ACCIDENTS.filter(a=>a.fatalities>0).length}</span></label>
        <label class="layer-row"><input type="checkbox" id="lyRisk" checked> Risk segmentesh <span class="cnt">${NAT.segments}</span></label>
        <label class="layer-row"><input type="checkbox" id="lyBs" checked> Pikat e Zeza <span class="cnt">${NAT.blackSpots}</span></label>
        <label class="layer-row"><input type="checkbox" id="lyEm"> Në zhvillim <span class="cnt">${NAT.emerging}</span></label>
      </div>
      <div class="map-panel map-legend"><h6>Legjenda</h6>
        <div class="lg-row"><span class="lg-dot" style="background:#dc2626"></span>Kritik</div>
        <div class="lg-row"><span class="lg-dot" style="background:#ea580c"></span>I lartë</div>
        <div class="lg-row"><span class="lg-dot" style="background:#d97706"></span>Mesatar</div>
        <div class="lg-row"><span class="lg-dot" style="background:#0d9488"></span>I ulët</div>
      </div>
    </div>
  </div>`;
  setTimeout(initFullMap,30);
}
function initFullMap(){
  _map=baseMap('mapMain',[41.0,19.9],7);
  const layers={};
  // heat
  const heatPts=ACCIDENTS.map(a=>[a.lat,a.lng,a.fatalities>0?1:0.4]);
  layers.heat=L.heatLayer(heatPts,{radius:22,blur:18,maxZoom:12,gradient:{0.2:'#14b8a6',0.45:'#d97706',0.7:'#ea580c',1:'#dc2626'}});
  // accidents
  layers.acc=L.layerGroup(ACCIDENTS.map(a=>L.circleMarker([a.lat,a.lng],{radius:3,color:sevColor(a.severity),weight:0,fillColor:sevColor(a.severity),fillOpacity:.6}).bindTooltip(`${a.id} · ${a.severityLabel} · ${fmt.dateShort(a.date)}`)));
  // fatalities
  layers.fat=L.layerGroup(ACCIDENTS.filter(a=>a.fatalities>0).map(a=>L.circleMarker([a.lat,a.lng],{radius:5,color:'#7f1d1d',weight:1.5,fillColor:'#dc2626',fillOpacity:.85}).bindTooltip(`${a.fatalities} fatalitet · ${a.roadName}`)));
  // risk segments
  layers.risk=L.layerGroup(SEGS.map(s=>L.circleMarker([s.lat,s.lng],{radius:4+s.m.risk/12,color:riskColor(s.m.risk),weight:1.2,fillColor:riskColor(s.m.risk),fillOpacity:.5}).on('click',()=>location.hash='#/segment/'+s.id).bindTooltip(`${shortRoad(s)} · Risk ${s.m.risk}`)));
  // black spots
  layers.bs=L.layerGroup(BLACKSPOTS.flatMap(b=>[
    L.circle([b.lat,b.lng],{radius:b.radius,color:'#dc2626',weight:1.5,fillColor:'#dc2626',fillOpacity:.12}),
    L.circleMarker([b.lat,b.lng],{radius:6,color:'#fff',weight:2,fillColor:'#dc2626',fillOpacity:1}).on('click',()=>location.hash='#/segment/'+b.seg.id).bindTooltip(`${b.name} · Risk ${b.riskScore}`)
  ]));
  // emerging
  layers.em=L.layerGroup(EMERGING.map(e=>L.circleMarker([e.seg.lat,e.seg.lng],{radius:7,color:'#d97706',weight:2,fillColor:'#fbbf24',fillOpacity:.7}).on('click',()=>location.hash='#/segment/'+e.seg.id).bindTooltip(`Në zhvillim · prob. ${Math.round(e.seg.pred.prob*100)}%`)));

  layers.heat.addTo(_map); layers.risk.addTo(_map); layers.bs.addTo(_map);
  const bind=(id,layer)=>{const el=document.getElementById(id);el.addEventListener('change',()=>{el.checked?layer.addTo(_map):_map.removeLayer(layer);});};
  bind('lyHeat',layers.heat);bind('lyAcc',layers.acc);bind('lyFat',layers.fat);bind('lyRisk',layers.risk);bind('lyBs',layers.bs);bind('lyEm',layers.em);
  fitAlbania();
}

/* ================================================================
   3. BLACK SPOTS
   ================================================================ */
function renderBlackspots(){
  const top=BLACKSPOTS.slice(0,50);
  view().innerHTML=`<div class="view-pad fade-in">
    <div class="page-head"><h3>Pikat e Zeza</h3><p>Identifikim i segmenteve me densitet të lartë aksidentesh dhe fatalitetesh. ${NAT.blackSpots} zona aktive. <span class="data-tag model">Model metodologjik</span></p></div>
    <div class="grid grid-kpi">
      ${kpi({label:'Pika të Zeza aktive',val:NAT.blackSpots,ico:'alert',tone:'red'})}
      ${kpi({label:'Fatalitete',val:BLACKSPOTS.reduce((s,b)=>s+b.seg.m.fatalities,0),ico:'skull',tone:'red'})}
      ${kpi({label:'Risk mesatar',val:Math.round(BLACKSPOTS.reduce((s,b)=>s+b.riskScore,0)/BLACKSPOTS.length),unit:'/100',ico:'shield',tone:'amber'})}
      ${kpi({label:'Në përkeqësim',val:BLACKSPOTS.filter(b=>b.trend.key==='det').length,ico:'trend',tone:'red'})}
    </div>
    <div class="grid g2 mt-20" style="grid-template-columns:1.25fr 1fr">
      <div class="card">
        <div class="card-head"><h5>Renditja Top 50</h5><span class="hint">Rezultati i prioritetit</span></div>
        <div class="tbl-wrap tbl-scroll"><table class="tbl"><thead><tr><th>#</th><th>Pika e Zezë</th><th class="num">Aks.</th><th class="num">Fat.</th><th class="num">Risk</th><th class="num">Prioritet</th><th>Trend</th></tr></thead><tbody>
        ${top.map(b=>`<tr class="clickable" onclick="location.hash='#/segment/${b.seg.id}'" title="Hap profilin e plotë">
          <td><span class="rank ${b.rank<=3?'t'+b.rank:''}">${b.rank}</span></td>
          <td><span class="strong">${escapeHtml(b.name)}</span><br><span class="cell-sub">${b.id} · zona ${b.radius} m · ${b.areaHa} ha</span></td>
          <td class="num">${b.seg.m.n}</td><td class="num num-fatal">${b.seg.m.fatalities}</td>
          <td class="num"><b style="color:${riskColor(b.riskScore)}">${b.riskScore}</b></td>
          <td class="num"><b>${b.priorityScore}</b></td><td>${trendChip(b.trend)}</td></tr>`).join('')}
        </tbody></table></div>
      </div>
      <div class="card card-map">
        <div class="card-head"><h5>Shpërndarja gjeografike</h5></div>
        <div class="map-shell" style="border:none;border-radius:0"><div id="mapMain"></div></div>
      </div>
    </div>
  </div>`;
  setTimeout(()=>{
    _map=baseMap('mapMain',[41,19.9],7);
    BLACKSPOTS.forEach(b=>{
      L.circle([b.lat,b.lng],{radius:b.radius,color:'#dc2626',weight:1,fillColor:'#dc2626',fillOpacity:.12}).addTo(_map);
      L.circleMarker([b.lat,b.lng],{radius:5+b.priorityScore/20,color:'#fff',weight:1.6,fillColor:riskColor(b.riskScore),fillOpacity:1}).addTo(_map).on('click',()=>location.hash='#/segment/'+b.seg.id).bindTooltip(`#${b.rank} ${b.name}`);
    });
    fitAlbania();
  },30);
}

/* ================================================================
   4. SEGMENT ANALYSIS (list)
   ================================================================ */
let segFilter={q:'',qark:'all',tier:'all',sort:'risk'};
function renderSegments(){
  view().innerHTML=`<div class="view-pad fade-in">
    <div class="page-head"><h3>Analiza e Segmenteve</h3><p>Rrjeti rrugor i ndarë në ${NAT.segments} segmente. <span class="data-tag model">Model metodologjik</span></p></div>
    <div class="card">
      <div class="card-head filter-bar">
        <div class="search-box filter-grow"><input class="inp" id="segSearch" placeholder="Kërko segment, rrugë, bashki ose ID…"></div>
        <select class="inp" id="segQark" title="Filtro sipas qarkut"><option value="all">Të gjitha qarqet</option>${[...new Set(SEGS.map(s=>s.qark))].sort().map(q=>`<option>${q}</option>`).join('')}</select>
        <select class="inp" id="segTier" title="Filtro sipas nivelit të riskut"><option value="all">Të gjitha nivelet e riskut</option><option value="crit">Kritik</option><option value="high">I lartë</option><option value="med">Mesatar</option><option value="low">I ulët</option></select>
        <select class="inp" id="segSort" title="Si renditen rezultatet"><option value="risk">Rendit: Risk (më i lartë së pari)</option><option value="priority">Prioritet</option><option value="fatalities">Fatalitete</option><option value="accidents">Aksidente</option><option value="projected">Risk i projektuar</option></select>
      </div>
      <div class="tbl-wrap" id="segTblWrap"></div>
    </div>
  </div>`;
  const apply=()=>{ renderSegTable(); };
  document.getElementById('segSearch').addEventListener('input',e=>{segFilter.q=e.target.value.toLowerCase();apply();});
  document.getElementById('segQark').addEventListener('change',e=>{segFilter.qark=e.target.value;apply();});
  document.getElementById('segTier').addEventListener('change',e=>{segFilter.tier=e.target.value;apply();});
  document.getElementById('segSort').addEventListener('change',e=>{segFilter.sort=e.target.value;apply();});
  renderSegTable();
}
function renderSegTable(){
  let rows=SEGS.filter(s=>{
    if(segFilter.qark!=='all'&&s.qark!==segFilter.qark) return false;
    if(segFilter.tier!=='all'&&riskTier(s.m.risk).key!==segFilter.tier) return false;
    if(segFilter.q){ const hay=(s.road+' '+s.id+' '+s.municipality+' '+s.qark).toLowerCase(); if(!hay.includes(segFilter.q)) return false; }
    return true;
  });
  const sk=segFilter.sort;
  rows.sort((a,b)=> sk==='risk'?b.m.risk-a.m.risk : sk==='priority'?b.priority-a.priority : sk==='fatalities'?b.m.fatalities-a.m.fatalities : sk==='accidents'?b.m.n-a.m.n : b.pred.projected-a.pred.projected);
  document.getElementById('segTblWrap').innerHTML=`<table class="tbl"><thead><tr>
    <th>Segment</th><th>Bashkia / Qark</th><th>Tipi rruge</th><th class="num">Aksidente</th><th class="num">Fat.</th><th class="num">Shpejt. mes.</th><th>Pse është i rrezikshëm?</th><th>Trend</th><th style="width:120px">Risk</th><th class="num">Proj.</th>
  </tr></thead><tbody>
  ${rows.slice(0,200).map(s=>`<tr class="clickable" onclick="location.hash='#/segment/${s.id}'" title="Hap profilin e plotë të segmentit">
    <td><span class="strong">${escapeHtml(shortRoad(s))}</span><br><span class="cell-sub">${s.id} · km ${s.kmFrom}-${s.kmTo}${segFlags(s)}</span></td>
    <td>${s.municipality}<br><span class="cell-sub">${s.qark}</span></td>
    <td><span class="cell-meta">${s.roadType}</span></td>
    <td class="num">${s.m.n}</td><td class="num num-fatal">${s.m.fatalities||'-'}</td>
    <td class="num">${s.m.avgSpeed}<span class="cell-limit"> km/h (limit ${s.speedLimit})</span></td>
    <td><span class="cell-meta">${s.causes[0]?s.causes[0].label:'-'}</span></td>
    <td>${trendChip(s.trend)}</td><td>${riskCell(s.m.risk)}</td><td class="num"><b style="color:${riskColor(s.pred.projected)}">${s.pred.projected}</b></td>
  </tr>`).join('')}
  </tbody></table>${rows.length>200?`<div class="empty" style="padding:16px"><p>Po shfaqen 200 nga ${rows.length} segmente.</p></div>`:rows.length===0?'<div class="empty"><p>Asnjë segment nuk përputhet me kriteret.</p></div>':''}`;
}

/* ================================================================
   5. SEGMENT PROFILE (full report page)
   ================================================================ */
function renderSegmentProfile(id){
  const s=SEGS.find(x=>x.id===id);
  if(!s){ view().innerHTML=`<div class="view-pad"><div class="empty"><p>Segmenti nuk u gjet.</p><a class="btn mt-16" href="#/segments">Kthehu te segmentet</a></div></div>`; return; }
  document.getElementById('pageTitle').textContent='Profili i Segmentit · '+s.id;
  const m=s.m, p=s.pred;
  const crashes=[...s.accidents].sort((a,b)=>b.date-a.date);
  const ivs=interventionsFor(s,5);
  const statusBadge=s.isBlackSpot?`<span class="badge crit dot">Pikë e Zezë aktive</span>`:s.isEmerging?`<span class="badge med dot">Pikë e Zezë në zhvillim</span>`:`<span class="badge ${riskTier(m.risk).key} dot">${riskTier(m.risk).label}</span>`;
  view().innerHTML=`<div class="view-pad fade-in">
    <a class="btn sm ghost" href="#/segments" style="margin-bottom:14px">Kthehu te segmentet</a>
    <div class="profile-hero">
      <div class="ph-top">
        <div>
          <div class="flex-c gap-8" style="margin-bottom:6px">${statusBadge}<span class="badge neutral">${s.roadType}</span></div>
          <h3>${escapeHtml(s.road)}</h3>
          <div class="ph-meta"><span>${s.id}</span><span>km <b>${s.kmFrom}-${s.kmTo}</b></span><span><b>${s.municipality}</b>, ${s.qark}</span><span>Gjatësi <b>${fmt.km(s.lengthKm)}</b></span><span>Limit <b>${s.speedLimit} km/h</b></span></div>
        </div>
        <div class="ph-score"><div class="n" style="color:${riskColor(m.risk)}">${m.risk}</div><div class="l">Risk Score / 100</div></div>
      </div>
    </div>

    <div class="grid g4 mt-20">
      ${kpi({label:'Aksidente (5 vjet)',val:m.n,ico:'car',tone:'navy',sub:`${m.accPerKmYr}/km/vit`})}
      ${kpi({label:'Fatalitete',val:m.fatalities,ico:'skull',tone:'red',sub:`${m.fatalCrashes} aksidente fatale`})}
      ${kpi({label:'Të lënduar rëndë',val:m.serious,ico:'alert',tone:'amber',sub:`${m.minor} të lehta`})}
      ${kpi({label:'Probabilitet eskalimi',val:Math.round(p.prob*100),unit:'%',ico:'trend',tone:p.prob>0.6?'red':'amber',sub:`Proj. risk ${p.projected}`})}
    </div>

    <div class="grid g2 mt-20" style="grid-template-columns:1fr 1.1fr">
      <div class="card">
        <div class="card-head"><h5>Përbërësit e Risk Score</h5><span class="hint">peshat e Risk Engine</span></div>
        <div class="card-pad">
          ${RISK_WEIGHTS.map(w=>`<div class="scorebar-row">
            <span class="sb-name">${w.label}<span class="w">${Math.round(w.w*100)}%</span></span>
            <span class="sb-track"><i style="width:${Math.round(m.sub[w.key])}%"></i></span>
            <span class="sb-num">${Math.round(m.sub[w.key])}</span></div>`).join('')}
          <div class="callout navy mt-16"><div><h6>Si lexohet</h6><p>Risk Score = shuma e peshuar e nën-treguesve, e rregulluar me besueshmërinë e të dhënave (${m.dataConfidence}%). Sa më shumë të dhëna, aq më i qëndrueshëm vlerësimi.</p></div></div>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><h5>Analiza e shkaqeve rrënjësore</h5><span class="hint">Pse është i rrezikshëm?</span></div>
        <div class="card-pad">
          <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px">
          ${s.causes.filter(c=>c.contribution>=6).slice(0,4).map(c=>`<div class="cause-card">
            <div class="cc-head"><div><h6>${c.label}</h6><span class="cc-contrib">${c.contribution}% e kontributit · ${c.count} aks.</span></div></div>
            <p>${CAUSE_EXPLAIN[c.key]}</p></div>`).join('')}
          </div>
        </div>
      </div>
    </div>

    <div class="grid g2 mt-20">
      <div class="card">
        <div class="card-head"><h5>Trendi i aksidenteve</h5><span class="hint">1 / 3 / 5 vjet · ${trendChip(s.trend)}</span></div>
        <div class="card-pad">${lineChart({h:200,labels:YEARS,area:true,series:[{name:'Aksidente',color:CHART_COL.navy,data:m.byYear},{name:'Fatalitete',color:CHART_COL.red,data:m.fatByYear}]})}
        <div class="flex-c gap-16 mt-12">${chartLegend([{color:CHART_COL.navy,label:'Aksidente'},{color:CHART_COL.red,label:'Fatalitete'}])}</div></div>
      </div>
      <div class="card">
        <div class="card-head"><h5>Zbulimi i hershëm i riskut</h5><span class="hint">Projeksion metodologjik</span></div>
        <div class="card-pad">
          <div class="grid g3" style="gap:12px">
            <div class="qmeter"><div class="qn" style="color:${riskColor(m.risk)}">${m.risk}</div><div class="ql">Risk aktual</div></div>
            <div class="qmeter"><div class="qn" style="color:${riskColor(p.projected)}">${p.projected}</div><div class="ql">Risk i projektuar</div></div>
            <div class="qmeter"><div class="qn" style="color:${p.prob>0.6?'#dc2626':'#d97706'}">${Math.round(p.prob*100)}%</div><div class="ql">Prob. eskalimi</div></div>
          </div>
          <div class="callout mt-16"><div><h6>Klasifikimi i pritshëm: ${p.expected}</h6><p>Bazuar në trend (${m.slope>0?'+':''}${round1(m.slope)} aks./vit), rritjen e periudhës së fundit (×${round1(m.growth)}) dhe tejkalimin e shpejtësisë (×${round1(m.speedExceed)}).</p></div></div>
        </div>
      </div>
    </div>

    <div class="card mt-20">
      <div class="card-head"><h5>Lokalizimi</h5><span class="hint">aksidentet e regjistruara në këtë segment</span></div>
      <div class="map-shell" style="height:300px;border:none;border-radius:0"><div id="mapMain"></div></div>
    </div>

    <div class="card mt-20">
      <div class="card-head"><h5>Veprime të rekomanduara</h5><span class="hint">pasojë e analizës - jo shkak</span></div>
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
    L.circle([s.lat,s.lng],{radius:s.lengthKm*500,color:riskColor(m.risk),weight:1.5,fillOpacity:.05,dashArray:'5 5'}).addTo(_map);
  },30);
}

/* ================================================================
   6. PREDICTIVE RISK (Early Risk Detection)
   ================================================================ */
const PRED_CLASSES=['Black Spot kritik','Black Spot','Segment me risk të lartë','I qëndrueshëm'];
let predFilter={cls:'all',qark:'all'};
function predRows(){
  let rows=SEGS.filter(s=>!s.isBlackSpot);
  if(predFilter.cls!=='all') rows=rows.filter(s=>s.pred.expected===predFilter.cls);
  if(predFilter.qark!=='all') rows=rows.filter(s=>s.qark===predFilter.qark);
  return rows.sort((a,b)=>b.pred.prob-a.pred.prob).slice(0,50);
}
function renderPrediction(){
  const escalate=SEGS.filter(s=>s.pred.prob>=0.5).length;
  const qarks=[...new Set(SEGS.map(s=>s.qark))].sort();
  view().innerHTML=`<div class="view-pad fade-in">
    <div class="page-head"><h3>Parashikimi i Riskut</h3><p>Zbulimi i hershëm i segmenteve që lëvizin drejt statusit të pikës së zezë. <span class="data-tag model">Model metodologjik</span></p></div>
    <div class="grid grid-kpi">
      ${kpi({label:'Në zhvillim',val:NAT.emerging,ico:'trend',tone:'amber'})}
      ${kpi({label:'Për monitorim',val:NAT.monitor,ico:'eye',tone:'navy'})}
      ${kpi({label:'Prob. eskalimi ≥ 50%',val:escalate,ico:'alert',tone:'red'})}
      ${kpi({label:'Risk i projektuar',val:NAT.projAvg,unit:'/100',ico:'shield',sub:`aktual ${NAT.avgRisk}`})}
    </div>
    <div class="card mt-20">
      <div class="card-head filter-bar">
        <h5 class="filter-grow">Segmentet me probabilitet eskalimi</h5>
        <select class="inp" id="predCls" title="Filtro sipas klasifikimit të pritur">
          <option value="all">Të gjitha klasifikimet</option>
          ${PRED_CLASSES.map(c=>`<option ${predFilter.cls===c?'selected':''}>${c}</option>`).join('')}
        </select>
        <select class="inp" id="predQark" title="Filtro sipas qarkut">
          <option value="all">Të gjitha qarqet</option>
          ${qarks.map(q=>`<option ${predFilter.qark===q?'selected':''}>${q}</option>`).join('')}
        </select>
      </div>
      <div class="tbl-wrap tbl-scroll" id="predTblWrap"></div>
    </div>
  </div>`;
  document.getElementById('predCls').addEventListener('change',e=>{predFilter.cls=e.target.value;renderPredTable();});
  document.getElementById('predQark').addEventListener('change',e=>{predFilter.qark=e.target.value;renderPredTable();});
  renderPredTable();
}
function renderPredTable(){
  const em=predRows();
  const body=em.length?em.map((s,i)=>`<tr class="clickable" onclick="location.hash='#/segment/${s.id}'" title="Shiko detajet dhe masat e rekomanduara">
        <td><span class="rank ${i<3?'t'+(i+1):''}">${i+1}</span></td>
        <td><span class="strong">${escapeHtml(shortRoad(s))}</span><br><span class="cell-sub">${s.id}${s.isEmerging?' · <span class="status-flag emerging">Në zhvillim</span>':''}</span></td>
        <td>${s.municipality}</td>
        <td class="num">${s.m.risk}</td><td class="num"><b style="color:${riskColor(s.pred.projected)}">${s.pred.projected}</b> <span class="pred-delta">+${s.pred.projected-s.m.risk}</span></td>
        <td><span class="score-pill"><span class="riskbar" style="flex:1"><i style="width:${Math.round(s.pred.prob*100)}%;background:${s.pred.prob>0.6?'#dc2626':'#d97706'}"></i></span><span class="score-num">${Math.round(s.pred.prob*100)}%</span></span></td>
        <td><span class="badge ${/kritik/i.test(s.pred.expected)?'crit':/Black/.test(s.pred.expected)?'high':'med'}">${s.pred.expected}</span></td>
        <td><span class="cell-meta">${s.causes[0]?s.causes[0].label:'-'}</span></td></tr>`).join(''):`<tr><td colspan="8" class="empty-row">Asnjë segment nuk përputhet me filtrat e zgjedhur.</td></tr>`;
  document.getElementById('predTblWrap').innerHTML=`<table class="tbl"><thead><tr><th>#</th><th>Segment</th><th>Bashkia</th><th class="num">Risk aktual</th><th class="num">Risk projektuar</th><th class="th-prob">Probabiliteti</th><th>Klasifikimi</th><th>Shkaku</th></tr></thead><tbody>${body}</tbody></table>`;
}

/* ================================================================
   7. INTERVENTIONS
   ================================================================ */
function renderInterventions(){
  const port=interventionPortfolio(30);
  const avgFr=Math.round(port.reduce((s,i)=>s+i.fr,0)/port.length);
  const avgRr=Math.round(port.reduce((s,i)=>s+i.rr,0)/port.length);
  const byType={};
  port.forEach(i=>byType[i.type]=(byType[i.type]||0)+1);
  const typeColors={Infrastrukturore:CHART_COL.navy,Shpejtësie:CHART_COL.teal,Policore:CHART_COL.blue,Edukative:CHART_COL.amber,Emergjente:CHART_COL.red};
  view().innerHTML=`<div class="view-pad fade-in">
    <div class="page-head"><h3>Ndërhyrjet</h3><p>Masa të rekomanduara si pasojë e analizës së riskut. <span class="data-tag model">Model metodologjik</span></p></div>
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
      <div class="rs-sec"><h4>Segmentet prioritare (model · ${period})</h4><div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Segment</th><th class="num">Risk</th><th class="num">Fat.</th></tr></thead><tbody>
        ${[...SEGS].sort((a,b)=>b.priority-a.priority).slice(0,10).map((s,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(shortRoad(s))}</td><td class="num"><b style="color:${riskColor(s.m.risk)}">${s.m.risk}</b></td><td class="num">${s.m.fatalities}</td></tr>`).join('')}
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
  const avgRisk=segs.length?Math.round(segs.reduce((a,s)=>a+s.m.risk,0)/segs.length):0;
  const topSeg=[...segs].sort((a,b)=>b.priority-a.priority).slice(0,10);
  const causeTally=causeAgg(segs);
  const domCause=causeTally[0]?causeTally[0].label.toLowerCase():'-';
  out.innerHTML=`<div class="report-sheet">
    <div class="rs-head"><div><div class="org">Platforma Kombëtare për Menaxhimin Proaktiv të Riskut Rrugor</div><h3>${title}</h3><div class="meta">Fushëveprimi: <b>${scope}</b> · Periudha: ${period} · Gjeneruar: ${today}<br>Të dhëna modeluese për validimin e metodologjisë - jo operacionale.</div></div>
      <div class="ph-score"><div class="n" style="color:${riskColor(avgRisk)}">${avgRisk}</div><div class="l">Risk mesatar</div></div></div>
    <div class="rs-body">
      <div class="rs-sec"><h4>Përmbledhje ekzekutive</h4><p class="lead">Gjatë periudhës <b>${period}</b>, në fushëveprimin <b>${scope}</b> u regjistruan <b>${fmt.n(accs.length)}</b> aksidente me <b>${fat}</b> fatalitete dhe ${accs.reduce((a,b)=>a+b.serious_injuries,0)} të lënduar rëndë. Janë identifikuar <b>${bs}</b> pika të zeza aktive dhe <b>${emg}</b> segmente në zhvillim. Risku mesatar i segmenteve është <b>${avgRisk}/100</b>. Shkaku dominant: <b>${domCause}</b>.</p></div>
      <div class="rs-sec rs-kpi"><h4>Treguesit kryesorë</h4><div class="grid g4">
        ${kpi({label:'Aksidente',val:fmt.n(accs.length),tone:'navy'})}
        ${kpi({label:'Fatalitete',val:fat,tone:'red'})}
        ${kpi({label:'Pikat e Zeza',val:bs,tone:'red'})}
        ${kpi({label:'Në zhvillim',val:emg,tone:'amber'})}
      </div></div>
      <div class="rs-sec"><h4>Shkaqet rrënjësore dominante</h4>
        ${causeTally.slice(0,5).map(c=>`<div class="scorebar-row"><span class="sb-name">${c.label}</span><span class="sb-track"><i style="width:${c.pct}%"></i></span><span class="sb-num">${c.pct}%</span></div>`).join('')}
      </div>
      <div class="rs-sec"><h4>Segmentet prioritare</h4><div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Segment</th><th>Bashkia</th><th class="num">Aks.</th><th class="num">Fat.</th><th class="num">Risk</th><th>Trend</th></tr></thead><tbody>
        ${topSeg.length?topSeg.map((s,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(shortRoad(s))}<br><span class="muted" style="font-size:11px">${s.id}</span></td><td>${s.municipality}</td><td class="num">${s.m.n}</td><td class="num" style="color:var(--red)">${s.m.fatalities}</td><td class="num"><b style="color:${riskColor(s.m.risk)}">${s.m.risk}</b></td><td>${trendChip(s.trend)}</td></tr>`).join(''):'<tr><td colspan="7" class="muted">Nuk ka segmente në këtë fushëveprim.</td></tr>'}
      </tbody></table></div></div>
      <div class="rs-sec"><h4>Rekomandime</h4><p class="lead">Prioritizo ndërhyrjet në ${bs} pikat e zeza aktive; vendos masa parandaluese te ${emg} segmentet në zhvillim; dhe trajto shkakun dominant (<b>${domCause}</b>) me masa infrastrukturore dhe të menaxhimit të shpejtësisë.</p></div>
    </div>
  </div>`;
}
function drawSegmentReport(out,s,today,period){
  if(!s){out.innerHTML='';return;}
  period=period||reportPeriodLabel();
  const m=s.m,p=s.pred,ivs=interventionsFor(s,4);
  out.innerHTML=`<div class="report-sheet">
    <div class="rs-head"><div><div class="org">Raport Segmenti · ${s.id}</div><h3>${escapeHtml(s.road)} · km ${s.kmFrom}-${s.kmTo}</h3><div class="meta">${s.municipality}, ${s.qark} · ${s.roadType} · Limit ${s.speedLimit} km/h · Periudha ${period} · Gjeneruar ${today}</div></div>
      <div class="ph-score"><div class="n" style="color:${riskColor(m.risk)}">${m.risk}</div><div class="l">Risk Score</div></div></div>
    <div class="rs-body">
      <div class="rs-sec"><h4>Statusi</h4><p class="lead">Ky segment klasifikohet si <b>${s.isBlackSpot?'Pikë e Zezë aktive':s.isEmerging?'Pikë e Zezë në zhvillim':riskTier(m.risk).label}</b>. Në periudhën e analizës janë regjistruar <b>${m.n}</b> aksidente, <b>${m.fatalities}</b> fatalitete dhe ${m.serious} të lënduar rëndë. Trendi: <b>${s.trend.label.toLowerCase()}</b>; risku i projektuar <b>${p.projected}/100</b> (probabilitet eskalimi <b>${Math.round(p.prob*100)}%</b>).</p></div>
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

const SUBSCORES=[
  {key:'fatality',  formula:'clamp( (fat_per_km / 1.8) * 70 + perplasje_fatale * 11 , 0, 100 )',
    why:'Fataliteti është pasoja që synohet të eliminohet (Zero Fatalitete 2040), prandaj mban peshën më të lartë. Kombinon dendësinë e vdekjeve për kilometër me numrin e përplasjeve fatale, që një vdekje e vetme të mos humbasë në mesatare.'},
  {key:'accident',  formula:'clamp( (aksidente_per_km_per_vit / 1.8) * 100 , 0, 100 )',
    why:'Frekuenca e aksidenteve, e normalizuar për gjatësi dhe vite, tregon ekspozim të vazhdueshëm ndaj rrezikut dhe jo një ngjarje të izoluar.'},
  {key:'severity',  formula:'clamp( raport_perplasjeve_te_renda * 150 , 0, 100 )',
    why:'Dallon segmentet ku aksidentet prodhojnë pasoja të rënda (vdekje ose plagosje serioze) nga ato me dëme kryesisht materiale.'},
  {key:'trend',     formula:'clamp( 50 + pjerresi * 22 , 0, 100 )',
    why:'Fut drejtimin në kohë në vlerësim: një segment në përkeqësim merr risk më të lartë se një tjetër identik por në përmirësim. Vlera 50 është pikënisja neutrale.'},
  {key:'speed',     formula:'clamp( (shpejtesi_mes / limit - 0.82) * 200 , 0, 100 )',
    why:'Tejkalimi i limitit rrit energjinë e përplasjes dhe distancën e frenimit. Pragu 0.82 toleron variacion normal të shpejtësisë para se treguesi të fillojë të rritet.'},
  {key:'pedestrian',formula:'clamp( raport_kembesoresh * 230 , 0, 100 )',
    why:'Këmbësorët janë përdoruesit më të cenueshëm; një peshë e lartë e goditjeve me këmbësorë sinjalizon konflikt këmbësorë-automjete dhe mungesë kalimesh të sigurta.'},
  {key:'infra',     formula:'clamp( raport_aksidentesh_me_faktor_infrastrukture * 130 , 0, 100 )',
    why:'Izolon mangësitë e korrigjueshme të rrugës (sinjalistikë, gjeometri, sipërfaqe), të cilat adresohen drejtpërdrejt me ndërhyrje inxhinierike.'},
  {key:'response',  formula:'clamp( (min_reagimi - 6) / 26 * 100 , 0, 100 )',
    why:'Koha e zgjatur e reagimit të emergjencës rrit vdekshmërinë e të plagosurve dhe reflekton mbulimin gjeografik të shërbimeve mjekësore.'},
];

function renderMethodology(){
  const W=k=>Math.round((RISK_WEIGHTS.find(w=>w.key===k)||{w:0}).w*100);
  const wlabel=k=>(RISK_WEIGHTS.find(w=>w.key===k)||{}).label||k;
  const ex=[...SEGS].sort((a,b)=>b.m.risk-a.m.risk)[0];
  const exRows=RISK_WEIGHTS.map(w=>({label:w.label,val:ex.m.sub[w.key],w:w.w,contrib:ex.m.sub[w.key]*w.w}));
  const exWeighted=exRows.reduce((a,r)=>a+r.contrib,0);
  const exFactor=0.72+0.28*ex.m.dataConfidence/100;
  view().innerHTML=`<div class="view-pad fade-in method" style="max-width:1020px">
    <div class="page-head"><h3>Metodologjia</h3><p>Dokumentim i plotë dhe i auditueshëm i çdo llogaritjeje në platformë: formula, variablat dhe arsyetimi pas tyre. Çdo tregues buron nga aksidentet e agreguara në nivel segmenti rrugor.</p></div>

    ${secHead('1 · Dy shtresat e të dhënave')}
    <div class="card card-pad">
      <p class="prose">Platforma i mban të ndara qartë dy shtresat e të dhënave, për transparencë dhe besueshmëri metodologjike:</p>
      <table class="tbl param-tbl mt-14"><thead><tr><th>Shtresa</th><th>Përmbajtja</th><th>Roli</th></tr></thead><tbody>
        <tr><td><b>Zyrtare</b></td><td>${OFFICIAL.source} (${OFFICIAL.period}): totale vjetore të aksidenteve dhe fataliteteve.</td><td>Burim referencë për treguesit kombëtarë dhe trendin historik.</td></tr>
        <tr><td><b>Modeluese</b></td><td>${NAT.segments} segmente rrugore me ${fmt.n(NAT.totAcc)} aksidente të modeluara në nivel pike.</td><td>Mundëson analizën segmentore, pikat e zeza dhe parashikimin, deri në lidhjen me regjistrat operacionalë (Policia Rrugore / ARRSH).</td></tr>
      </tbody></table>
      ${mWhy('Të dhënat zyrtare ende nuk kanë granularitet në nivel segmenti. Shtresa modeluese shërben për të validuar metodologjinë - formulat, pragjet dhe motorët - pa pretenduar saktësi gjeografike absolute para integrimit me të dhënat reale.')}
    </div>

    ${secHead('2 · Përpunimi: nga aksidenti te segmenti')}
    <div class="card card-pad">
      <p class="prose">Për çdo segment mblidhen aksidentet që i përkasin dhe llogariten madhësitë bazë mbi 5 vitet e analizës. Çdo madhësi normalizohet, që segmentet të jenë të krahasueshme mes tyre:</p>
      ${mFormula(
`n                  = numri i aksidenteve ne segment
fatalitete         = shuma e vdekjeve
fat_per_km         = fatalitete / gjatesi_km
aksidente_per_km_per_vit = n / gjatesi_km / 5
shpejtesi_mes      = mesatarja e shpejtesise se vleresuar
perplasje_fatale   = aksidente me ashpersi maksimale (vdekjeprurese)
raport_perplasjeve_te_renda = perplasje te renda / n     (vlere 0-1)`)}
      ${mWhy('Pjesëtimi për gjatësi dhe për numrin e viteve e bën të drejtë krahasimin e një segmenti të shkurtër me një të gjatë, dhe të një me histori të gjatë me një të ri. Raportet (0-1) i bëjnë treguesit të pavarur nga madhësia e segmentit.')}
    </div>

    ${secHead('3 · Risk Engine - tetë nën-treguesit (0-100)')}
    <div class="card card-pad">
      <p class="prose">Risku ndërtohet nga tetë nën-tregues, secili i kthyer në një shkallë të përbashkët 0-100. Funksioni <code>clamp(x,0,100)</code> e kufizon vlerën brenda intervalit. Shumëzuesit (p.sh. 150 ose 230) janë faktorë kalibrimi që e shtrijnë një raport 0-1 në shkallën 0-100, të zgjedhur që një segment tipik i rrezikshëm të afrohet te kufiri i sipërm.</p>
      <table class="tbl param-tbl mt-14"><thead><tr><th>Nën-tregues</th><th>Formula (0-100)</th><th class="num">Pesha</th></tr></thead><tbody>
        ${SUBSCORES.map(s=>`<tr><td><b>${wlabel(s.key)}</b><div class="cell-note">${s.why}</div></td><td><code class="m-inline">${s.formula}</code></td><td class="num"><b>${W(s.key)}%</b></td></tr>`).join('')}
      </tbody></table>
    </div>

    ${secHead('4 · Risk Engine - agregimi final')}
    <div class="card card-pad">
      <p class="prose">Risk Score-i përfundimtar është mesatarja e peshuar e tetë nën-treguesve, e korrigjuar me besueshmërinë e të dhënave të segmentit:</p>
      ${mFormula(
`Risk = SUM( nen_tregues[k] * pesha[k] )        // peshat: ${RISK_WEIGHTS.map(w=>W(w.key)+'%').join(' / ')}
besueshmeria = clamp(35 + n * 6.5, 0, 100)
Risk = Risk * (0.72 + 0.28 * besueshmeria/100)
Risk = clamp(Risk, 0, 100)`)}
      ${mWhere([
        ['nen_tregues[k]','vlera 0-100 e secilit prej 8 nën-treguesve'],
        ['pesha[k]','rëndësia relative e treguesit (shuma e peshave = 100%)'],
        ['besueshmeria','rritet me numrin e aksidenteve n: më shumë të dhëna, më shumë besim'],
      ])}
      ${mWhy('Korrigjimi sipas besueshmërisë ("confidence shrinkage") i tërheq segmentet me pak të dhëna drejt një vlerësimi më të kujdesshëm (faktor nga 0.72 në 1.00), për të shmangur klasifikime ekstreme që vijnë vetëm nga 1-2 aksidente të rastësishme.')}

      <div class="m-example">
        <div class="m-example-h">Shembull i llogaritjes mbi segmentin me riskun më të lartë: <b>${escapeHtml(shortRoad(ex))}</b> · ${ex.id} · n=${ex.m.n}</div>
        <table class="tbl param-tbl"><thead><tr><th>Nën-tregues</th><th class="num">Vlera</th><th class="num">Pesha</th><th class="num">Kontribut</th></tr></thead><tbody>
          ${exRows.map(r=>`<tr><td>${r.label}</td><td class="num">${Math.round(r.val)}</td><td class="num">${Math.round(r.w*100)}%</td><td class="num">${round1(r.contrib)}</td></tr>`).join('')}
          <tr class="m-example-tot"><td><b>Shuma e peshuar</b></td><td class="num"></td><td class="num"></td><td class="num"><b>${round1(exWeighted)}</b></td></tr>
        </tbody></table>
        ${mFormula(
`Shuma e peshuar      = ${round1(exWeighted)}
besueshmeria (n=${ex.m.n})    = ${ex.m.dataConfidence}
faktori = 0.72 + 0.28 * ${ex.m.dataConfidence}/100 = ${round1(exFactor)}
Risk final = ${round1(exWeighted)} * ${round1(exFactor)} = ${ex.m.risk}`)}
      </div>
    </div>

    ${secHead('5 · Trend Engine - drejtimi në kohë')}
    <div class="card card-pad">
      <p class="prose">Trendi matet me pjerrësinë e regresionit linear (metoda e katrorëve më të vegjël) mbi numrin vjetor të aksidenteve:</p>
      ${mFormula(
`pjerresi = SUM( (i - i_mes) * (y[i] - y_mes) ) / SUM( (i - i_mes)^2 )
ku y[i] = numri i aksidenteve ne vitin i (5 vlera)

Klasifikimi:
  pjerresi &gt;  0.45  -&gt;  Ne perkeqesim
  pjerresi &lt; -0.45  -&gt;  Ne permiresim
  ndryshe            -&gt;  Stabel`)}
      ${mWhy('Pjerrësia jep shpejtësinë e ndryshimit (aksidente shtesë në vit), më e qëndrueshme se thjesht krahasimi i vitit të parë me të fundit, sepse përdor të gjitha pikat.')}
    </div>

    ${secHead('6 · Root Cause Engine - shkaqet rrënjësore')}
    <div class="card card-pad">
      <p class="prose">Për çdo segment renditen shkaqet kontribuese duke kombinuar atë që vërejmë me profilin strukturor të segmentit:</p>
      ${mFormula(
`per cdo shkak:
  e_vezhguar = numer_aksidentesh_me_kete_shkak / n
  score = e_vezhguar * 0.7 + (profil_shkaku / 2.2) * 0.3
kontribut(%) = score / SUM(score_te_te_gjithe_shkaqeve) * 100`)}
      ${mWhy('Kombinimi 70/30 balancon evidencën empirike (çfarë ndodhi realisht) me njohuritë e segmentit (gjeometri, limit, ekspozim), duke shmangur konkluzione nga pak raste.')}
    </div>

    ${secHead('7 · Early Risk Detection - parashikimi')}
    <div class="card card-pad">
      <p class="prose">Risku i projektuar shton mbi riskun aktual momentumin e trendit, presionin e rritjes, shpejtësisë dhe fataliteteve:</p>
      ${mFormula(
`trendComp   = clamp(pjerresi * 9, -22, 26)
growthComp  = clamp((rritje - 1) * 16, -12, 20)     // rritje = (2 vitet e fundit + 0.5) / (2 vitet e para + 0.5)
speedComp   = clamp((shpejtesi_mes/limit - 1) * 22, -8, 14)
fatPressure = clamp(fatalitete * 2.2, 0, 14)
Risk_projektuar = clamp(Risk + trendComp + 0.6*growthComp + 0.4*speedComp + 0.4*fatPressure, 0, 100)`)}
      <p class="prose mt-14">Probabiliteti i eskalimit drejt pikës së zezë llogaritet me një model logjistik:</p>
      ${mFormula(
`z = -1.4 + 0.9*max(0,pjerresi) + 1.1*max(0,rritje-1) + 0.05*(Risk-45) + 0.8*max(0,shpejtesi_mes/limit-1)
probabilitet = 1 / (1 + e^(-z))            // i kufizuar ne 2%-97%

Kategoria e pritur (nga Risk_projektuar):
  >= 78  ->  Black Spot kritik
  >= 62  ->  Black Spot
  >= 46  ->  Segment me risk te larte
  ndryshe ->  I qendrueshem`)}
      ${mWhy('Forma logjistike kthen presionet e ndryshme në një probabilitet 0-1 të interpretueshëm. Kufizimi 2%-97% shmang siguri të rreme absolute. Ky është model statistikor transparent, jo "kuti e zezë".')}
    </div>

    ${secHead('8 · Klasifikimi në tre nivele dhe prioriteti')}
    <div class="card card-pad">
      <p class="prose">Segmentet ndahen në tre nivele. Asnjë numër nuk është i paracaktuar: numri i pikave të zeza është <b>gjetje</b>, jo objektiv. Nuk ka "dysheme kuotash".</p>
      ${mFormula(
`Pike e Zeze    =  (Risk >= 60 DHE n >= 4)  OSE  fatalitete >= 3  OSE  Risk >= 68
Ne zhvillim    =  jo pike e zeze  DHE  probabilitet >= 0.5  DHE  trend ne perkeqesim
                  DHE  Risk_projektuar >= 48  DHE  n >= 2
Per monitorim  =  as pike e zeze, as ne zhvillim,  por  Risk >= 50

Prioriteti = clamp(0.5*Risk + 0.18*Risk_projektuar + 4*min(fatalitete,6)
                   + 18*probabilitet + 0.4*n , 0, 100)`)}
      ${mWhere([
        ['Pikë e zezë','rrezik i konsoliduar - shumë aksidente, fatalitete ose risk shumë i lartë'],
        ['Në zhvillim','ende jo pikë e zezë, por në rrugën drejt saj (trend + probabilitet)'],
        ['Për monitorim','risk i ngritur që meriton vëzhgim, pa u etiketuar pikë e zezë'],
        ['Prioriteti','rendit ndërhyrjet: balancon riskun aktual, atë të projektuar, vdekjet dhe ekspozimin'],
      ])}
      ${mWhy(`Numrat dalin natyrshëm nga kriteret: <b>${NAT.blackSpots}</b> pika të zeza, <b>${NAT.emerging}</b> në zhvillim dhe <b>${NAT.monitor}</b> për monitorim. Lista "për monitorim" zëvendëson çdo mbushje artificiale të numrit, duke ruajtur pamjen kombëtare pa cenuar besueshmërinë.`)}
    </div>

    ${secHead('9 · Parametra kalibrimi (provizorë)')}
    <div class="card card-pad">
      <p class="prose">Konstantet e mëposhtme janë <b>zgjedhje kalibrimi</b>, jo të vërteta të matura. Janë të grumbulluara në një vend të vetëm (<code>CALIB</code>, <span class="data-tag">${CALIB_VERSION}</span>) dhe do të rikalibrohen sapo të integrohen të dhënat reale. Ky version i mban të dukshme dhe e bën rikalibrimin trivial.</p>
      <table class="tbl param-tbl mt-14"><thead><tr><th>Parametri</th><th class="num">Vlera</th><th>Roli</th></tr></thead><tbody>
        ${[
          ['accDenom',CALIB.accDenom,'pragu aksidente/km/vit që e çon densitetin drejt 100'],
          ['speedOffset',CALIB.speedOffset,'tolerancë e shpejtësisë para se treguesi të rritet'],
          ['severityMult / pedMult / infraMult',`${CALIB.severityMult} / ${CALIB.pedMult} / ${CALIB.infraMult}`,'faktorë që shtrijnë raportet 0-1 në shkallën 0-100'],
          ['confFloor',CALIB.confFloor,'faktori minimal i besueshmërisë për segmente me pak të dhëna'],
          ['bsRisk / bsAcc / bsFat / bsRiskHard',`${CALIB.bsRisk} / ${CALIB.bsAcc} / ${CALIB.bsFat} / ${CALIB.bsRiskHard}`,'pragjet e pikës së zezë'],
          ['monRisk',CALIB.monRisk,'risk minimal për listën "për monitorim"'],
          ['logit (b0, slope, growth, speed)',`${CALIB.logit.b0}, ${CALIB.logit.slope}, ${CALIB.logit.growth}, ${CALIB.logit.speed}`,'koeficientët e modelit logjistik të eskalimit'],
        ].map(r=>`<tr><td><code class="m-inline">${r[0]}</code></td><td class="num">${r[1]}</td><td><span class="cell-note">${r[2]}</span></td></tr>`).join('')}
      </tbody></table>
      ${mWhy('Duke i mbajtur konstantet të dokumentuara dhe të versionuara, metodologjia nuk pretendon saktësi absolute; çdo vlerë mund të diskutohet, sfidohet dhe zëvendësohet pa prekur logjikën.')}
    </div>

    ${secHead('10 · Validim dhe ndjeshmëri')}
    <div class="card card-pad">
      <p class="prose">Dy kontrolle të llogaritura drejtpërdrejt mbi modelin aktual, që tregojnë nëse sistemi shton vlerë dhe sa i qëndrueshëm është:</p>
      <div class="grid g2 mt-14" style="gap:14px">
        <div class="m-stat">
          <div class="m-stat-v">${VALID.rho}</div>
          <div class="m-stat-l">Korrelacioni (Spearman) i prioritetit me renditjen e thjeshtë sipas fataliteteve</div>
          <div class="m-stat-n">${VALID.addsInfo?'Nën 0.90: renditja shton informacion përtej numrit të vdekjeve.':'Mbi 0.90: renditja i afrohet shumë "rendit sipas vdekjeve" - shqyrto peshat.'}</div>
        </div>
        <div class="m-stat">
          <div class="m-stat-v">${VALID.stability}%</div>
          <div class="m-stat-l">Qëndrueshmëria e Top-20 kur peshat luhaten ±20% (40 prova)</div>
          <div class="m-stat-n">Sa më afër 100%, aq më pak e ndjeshme është renditja ndaj zgjedhjeve të peshave.</div>
        </div>
      </div>
      ${mWhy('Testi i korrelacionit (#3) verifikon që 8 nën-treguesit shtojnë informacion përtej fatalitetit. Analiza e ndjeshmërisë (#6) llogaritet lirë sepse nën-treguesit janë fiks - vetëm peshat ndryshojnë. Hapi i mëtejshëm, validimi parashikues me të dhëna reale (mbajtje e 1 viti jashtë + AUC), do të shtohet sapo të lidhemi me regjistrat operacionalë.')}
    </div>

    ${secHead('11 · Gjeometria e zonës dhe agregatet kombëtare')}
    <div class="card card-pad">
      ${mFormula(
`rrezja_m = clamp(180 + n*22, 180, 650)         // zona e ndikimit te nje pike te zeze
siperfaqja_ha = PI * rrezja_m^2 / 10000

Shkalla e fatalitetit (kombetare) = fatalitete_total / aksidente_total * 100
Risk mesatar = mesatarja e Risk per te gjitha segmentet`)}
      ${mWhy('Rrezja rritet me numrin e aksidenteve për të reflektuar shtrirjen reale të grumbullimit; konvertimi në hektarë jep një masë të kuptueshme të zonës që kërkon ndërhyrje.')}
    </div>

    ${secHead('12 · Supozimet dhe kufizimet')}
    <div class="card card-pad">
      <ul class="m-list">
        <li>Shtresa modeluese shërben për validim metodologjik; koordinatat dhe vlerat e segmenteve nuk përfaqësojnë ende vendndodhje reale.</li>
        <li>Të gjithë parametrat (seksioni 9) janë provizorë dhe do të rikalibrohen me të dhënat operacionale.</li>
        <li>Të gjitha formulat janë deterministe dhe të auditueshme - nuk ka "model i fshehtë"; çdo vlerë mund të riprodhohet nga inputet.</li>
        <li>Validimi parashikues (holdout + AUC) është hapi tjetër, i mundshëm vetëm me të dhëna reale kohore.</li>
        <li>Treguesit zyrtarë (INSTAT/Policia) mbeten burimi autoritativ për raportimin publik.</li>
      </ul>
    </div>
  </div>`;
}

/* ================================================================
   10. DATA QUALITY
   ================================================================ */
function renderQuality(){
  const conf=Math.round(SEGS.reduce((a,s)=>a+s.m.dataConfidence,0)/SEGS.length);
  view().innerHTML=`<div class="view-pad fade-in">
    <div class="page-head"><h3>Cilësia e të Dhënave</h3><p>Monitorim i dy shtresave: zyrtare (INSTAT/Policia) dhe modeluese (segmente).</p></div>
    <div class="grid g2 mt-20">
      <div class="card"><div class="card-head"><h5>Të dhëna zyrtare</h5><span class="data-tag official">INSTAT · Policia</span></div>
        <div class="card-pad"><div class="kv-list">
          <div class="kv-row"><span class="k">Periudha</span><span class="v">${OFFICIAL.period}</span></div>
          <div class="kv-row"><span class="k">Aksidente totale</span><span class="v">${fmt.n(OFFICIAL.totals.accidents)}</span></div>
          <div class="kv-row"><span class="k">Fatalitete totale</span><span class="v">${OFFICIAL.totals.fatalities}</span></div>
          <div class="kv-row"><span class="k">Burimi</span><span class="v">${OFFICIAL.source}</span></div>
        </div></div></div>
      <div class="card"><div class="card-head"><h5>Model territorial</h5><span class="data-tag model">Metodologjik</span></div>
        <div class="card-pad"><div class="kv-list">
          <div class="kv-row"><span class="k">Segmente</span><span class="v">${NAT.segments}</span></div>
          <div class="kv-row"><span class="k">Aksidente modeluese</span><span class="v">${fmt.n(NAT.totAcc)}</span></div>
          <div class="kv-row"><span class="k">Besueshmëria mesatare</span><span class="v">${conf}%</span></div>
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
    <div class="page-head"><h3>Konfigurimet</h3><p>Parametra të platformës dhe pragjet metodologjike.</p></div>
    <div class="card"><div class="card-head"><h5>Pragjet e motorit të pikave të zeza</h5></div><div class="card-pad stack">
      <div class="scorebar-row"><span class="sb-name">Risk minimal për pikë të zezë</span><span class="sb-track"><i style="width:60%"></i></span><span class="sb-num">60</span></div>
      <div class="scorebar-row"><span class="sb-name">Aksidente minimale</span><span class="sb-track"><i style="width:40%"></i></span><span class="sb-num">4</span></div>
      <div class="scorebar-row"><span class="sb-name">Fatalitete për kalim direkt</span><span class="sb-track"><i style="width:30%"></i></span><span class="sb-num">3</span></div>
      <div class="scorebar-row"><span class="sb-name">Prob. eskalimi për "në zhvillim"</span><span class="sb-track"><i style="width:50%"></i></span><span class="sb-num">50%</span></div>
      <p class="note-inline">Në këtë version metodologjik pragjet janë të fiksuara; në prodhim do të jenë të konfigurueshme nga administratori.</p>
    </div></div>
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
  return Object.entries(map).map(([key,arr])=>({key,n:arr.length,avgRisk:Math.round(arr.reduce((a,s)=>a+s.m.risk,0)/arr.length),fat:arr.reduce((a,s)=>a+s.m.fatalities,0)})).sort((a,b)=>b.avgRisk-a.avgRisk);
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
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{maxZoom:19,subdomains:'abcd'}).addTo(map);
  return map;
}
function fitAlbania(){ if(_map) _map.fitBounds([[39.6,19.2],[42.7,21.1]],{padding:[20,20]}); }

/* sidebar mobile */
function closeSidebar(){ document.getElementById('sidebar').classList.remove('open'); document.getElementById('scrim').classList.remove('on'); }
document.getElementById('menuToggle').addEventListener('click',()=>{document.getElementById('sidebar').classList.toggle('open');document.getElementById('scrim').classList.toggle('on');});
document.getElementById('scrim').addEventListener('click',closeSidebar);

/* sidebar collapse (desktop) — condensed icon rail, persisted */
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
