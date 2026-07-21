/* =============================================================
   data.js - Synthetic but internally-consistent national dataset.
   Built around the accident as the atomic unit. Segments and
   black spots are DERIVED from accidents, never the reverse.
   All values come from a fixed seed -> reproducible across loads.
   ============================================================= */

const MUNICIPALITIES = [
  {name:'Tiranë',      qark:'Tiranë',      lat:41.3275, lng:19.8187, w:30, urban:0.95},
  {name:'Durrës',      qark:'Durrës',      lat:41.3231, lng:19.4414, w:16, urban:0.85},
  {name:'Elbasan',     qark:'Elbasan',     lat:41.1125, lng:20.0822, w:10, urban:0.75},
  {name:'Fier',        qark:'Fier',        lat:40.7239, lng:19.5567, w:9,  urban:0.7},
  {name:'Vlorë',       qark:'Vlorë',       lat:40.4660, lng:19.4914, w:9,  urban:0.78},
  {name:'Shkodër',     qark:'Shkodër',     lat:42.0683, lng:19.5126, w:8,  urban:0.72},
  {name:'Korçë',       qark:'Korçë',       lat:40.6186, lng:20.7808, w:7,  urban:0.7},
  {name:'Berat',       qark:'Berat',       lat:40.7058, lng:19.9522, w:5,  urban:0.65},
  {name:'Lezhë',       qark:'Lezhë',       lat:41.7836, lng:19.6436, w:5,  urban:0.6},
  {name:'Gjirokastër', qark:'Gjirokastër', lat:40.0758, lng:20.1389, w:4,  urban:0.6},
  {name:'Dibër',       qark:'Dibër',       lat:41.6840, lng:20.4280, w:3,  urban:0.55},
  {name:'Kukës',       qark:'Kukës',       lat:42.0769, lng:20.4219, w:3,  urban:0.5},
];
const MUNI_BY_NAME = Object.fromEntries(MUNICIPALITIES.map(m=>[m.name,m]));

/* Road corridors as polylines (lat,lng waypoints). Segments are
   carved from these so positions follow plausible road geometry. */
const CORRIDORS = [
  {name:'Autostrada A1 (Tiranë-Durrës)', type:'Autostradë', limit:110, seg:14,
   pts:[[41.3210,19.7820],[41.3260,19.6900],[41.3320,19.6000],[41.3300,19.5200],[41.3231,19.4414]]},
  {name:'Autostrada A2 (Fier-Vlorë)', type:'Autostradë', limit:110, seg:8,
   pts:[[40.7239,19.5567],[40.6400,19.5200],[40.5500,19.5000],[40.4660,19.4914]]},
  {name:'Autostrada A3 (Tiranë-Elbasan)', type:'Autostradë', limit:100, seg:10,
   pts:[[41.3000,19.8400],[41.2400,19.9100],[41.1900,19.9700],[41.1400,20.0300],[41.1125,20.0822]]},
  {name:'Rruga SH2 (Tiranë-Durrës, e vjetër)', type:'Rrugë nacionale', limit:80, seg:10,
   pts:[[41.3275,19.8000],[41.3400,19.7100],[41.3500,19.6200],[41.3450,19.5300],[41.3231,19.4414]]},
  {name:'Rruga SH4 (Durrës-Fier)', type:'Rrugë nacionale', limit:90, seg:14,
   pts:[[41.3231,19.4414],[41.1800,19.4700],[41.0200,19.5000],[40.8800,19.5400],[40.7239,19.5567]]},
  {name:'Rruga SH8 (Vlorë-Sarandë, bregdetare)', type:'Rrugë interurbane', limit:60, seg:12,
   pts:[[40.4660,19.4914],[40.3600,19.4700],[40.2400,19.6200],[40.1500,19.7800],[40.0758,19.9500]]},
  {name:'Rruga SH3 (Elbasan-Korçë)', type:'Rrugë nacionale', limit:80, seg:16,
   pts:[[41.1125,20.0822],[40.9800,20.2400],[40.8400,20.4200],[40.7200,20.6000],[40.6186,20.7808]]},
  {name:'Rruga SH1 (Tiranë-Lezhë-Shkodër)', type:'Rrugë nacionale', limit:90, seg:18,
   pts:[[41.3500,19.8000],[41.5200,19.7200],[41.7000,19.6700],[41.7836,19.6436],[41.9300,19.5800],[42.0683,19.5126]]},
  {name:'Rruga SH6 (Fier-Gjirokastër)', type:'Rrugë nacionale', limit:80, seg:14,
   pts:[[40.7239,19.5567],[40.5600,19.6800],[40.4000,19.8200],[40.2400,19.9800],[40.0758,20.1389]]},
  {name:'Rruga SH7 (Elbasan-Dibër)', type:'Rrugë interurbane', limit:70, seg:12,
   pts:[[41.1125,20.0822],[41.2600,20.1600],[41.4200,20.2700],[41.5600,20.3600],[41.6840,20.4280]]},
  {name:'Rruga SH5 (Lezhë-Kukës)', type:'Rrugë interurbane', limit:60, seg:12,
   pts:[[41.7836,19.6436],[41.8400,19.9000],[41.9200,20.1200],[42.0000,20.3000],[42.0769,20.4219]]},
  {name:'Rruga SH4 (Berat-Fier)', type:'Rrugë nacionale', limit:80, seg:8,
   pts:[[40.7058,19.9522],[40.7100,19.8200],[40.7180,19.6900],[40.7239,19.5567]]},
  {name:'Unaza e Madhe (Tiranë)', type:'Aksi/Unazë urbane', limit:50, seg:10,
   pts:[[41.3450,19.8050],[41.3380,19.8350],[41.3180,19.8400],[41.3050,19.8150],[41.3150,19.7850],[41.3380,19.7900],[41.3450,19.8050]]},
  {name:'Bulevardi & hyrjet (Durrës)', type:'Rrugë urbane kryesore', limit:50, seg:7,
   pts:[[41.3380,19.4550],[41.3290,19.4480],[41.3180,19.4520],[41.3100,19.4650],[41.3160,19.4780]]},
  {name:'Aksi urban (Vlorë)', type:'Rrugë urbane kryesore', limit:50, seg:6,
   pts:[[40.4780,19.4880],[40.4660,19.4914],[40.4520,19.4980],[40.4420,19.5080]]},
  {name:'Aksi urban (Shkodër)', type:'Rrugë urbane kryesore', limit:50, seg:6,
   pts:[[42.0780,19.5050],[42.0683,19.5126],[42.0560,19.5200],[42.0460,19.5320]]},
  {name:'Aksi urban (Korçë)', type:'Rrugë urbane kryesore', limit:50, seg:5,
   pts:[[40.6280,20.7700],[40.6186,20.7808],[40.6080,20.7900],[40.6000,20.7980]]},
  {name:'Hyrja jugore (Elbasan)', type:'Rrugë urbane kryesore', limit:50, seg:5,
   pts:[[41.1220,20.0700],[41.1125,20.0822],[41.1020,20.0920],[41.0930,20.1020]]},
];

const VOCAB = {
  collision:['Përplasje ballore','Përplasje anësore','Përplasje nga prapa','Dalje nga rruga','Goditje këmbësori','Përmbysje','Goditje pengese','Zinxhir automjetesh'],
  weather:['Kthjellët','Me re','Shi','Mjegull','Erë e fortë','Akull/Borë'],
  lighting:['Dritë dite','Muzg','Natë me ndriçim','Natë pa ndriçim'],
  surface:['I thatë','I lagësht','Me baltë/zhavorr','Akull/Borë'],
  driver:['Tejkalim shpejtësie','Nuk dha përparësi','Manovër e gabuar','Lodhje','Alkool ose drogë','Telefon gjatë vozitjes','Distancë e pamjaftueshme','Pa faj të drejtuesit'],
  infra:['Pa ndriçim publik','Shenja të dëmtuara','Kthesë e rrezikshme','Kryqëzim i pasigurt','Rrugë e dëmtuar','Mungon trotuar ose kalim','Pa problem infrastrukture'],
  vehicle:['Defekt frenash','Goma të konsumuara','Drita jofunksionale','Mbingarkesë','Pa problem automjeti'],
};
// Root-cause taxonomy used by segment profiles & root-cause engine
const CAUSES = [
  {key:'speed',     label:'Tejkalim shpejtësie',         short:'Shpejtësi',  desc:'Shoferi ka vozitur më shpejt se lejohet - humb kontrollin ose përplaset më fort.', ico:'speed'},
  {key:'pedestrian',label:'Rrezik për këmbësorë',        short:'Këmbësorë',  desc:'Këmbësorët goditen ose janë në rrezik - mungon kalim i sigurt ose vozitet shumë shpejt.', ico:'walk'},
  {key:'lighting',  label:'Rrugë e errët',               short:'Errësirë',   desc:'Aksidenti ndodhi natën ose në muzg - rruga nuk ka dritë të mjaftueshme.', ico:'sun'},
  {key:'curve',     label:'Kthesa e rrezikshme',         short:'Kthesa',     desc:'Makina del nga rruga ose përmbyset në një kthesë të mprehtë.', ico:'road'},
  {key:'junction',  label:'Kryqëzim i pasigurt',         short:'Kryqëzim',   desc:'Përplasje në kryqëzim ku mungon semafori, rrethrrotullimi ose rregulla të qarta të përparësisë.', ico:'pin'},
  {key:'surface',   label:'Rrugë e keqe',                short:'Rrugë',      desc:'Rruga ishte e lagësht, me akull, gropa ose asfalt i dëmtuar - makina rrëshqet lehtë.', ico:'drop'},
  {key:'traffic',   label:'Shumë trafik',                short:'Trafik',     desc:'Shumë makina në të njëjtën rrugë - përplasje nga prapa, zinxhir ose manovra të vështira.', ico:'car'},
  {key:'response',  label:'Ndihma vonon',                short:'Ambulanca',  desc:'Ambulanca ose policia vonojnë të mbërrijnë - pasojat e aksidentit bëhen më të rënda.', ico:'clock'},
];

const WEEKDAY_LABELS=['E diel','E hën','E mart','E mërkur','E enjte','E premte','E shtun'];
const VICTIM_TYPES=[
  {label:'Këmbësor',w:34},{label:'Drejtues i mjetit',w:24},{label:'Pasagjer',w:20},
  {label:'Motoçiklist',w:13},{label:'Çiklist',w:8},{label:'Të tjerë',w:1},
];
const NETWORK_INVENTORY={
  source:'Inventar demo · bazuar në korridore & inspektime fiktive',
  inspectionCycle:'2024',
  totalKm:0,
  roadClasses:['Autostradë','Rrugë nacionale','Rrugë interurbane','Rrugë urbane kryesore','Aksi/Unazë urbane'],
};

function pickVictimType(cause, pedInvolved){
  if(pedInvolved||cause==='pedestrian') return weighted([['Këmbësor',70],['Drejtues i mjetit',15],['Pasagjer',10],['Të tjerë',5]]);
  if(cause==='speed'||cause==='curve') return weighted([['Drejtues i mjetit',45],['Pasagjer',30],['Motoçiklist',15],['Këmbësor',10]]);
  return weighted(VICTIM_TYPES.map(v=>[v.label,v.w]));
}
function syncInjured(acc){
  acc.injured=(acc.fatalities||0)+(acc.serious_injuries||0)+(acc.minor_injuries||0);
}
function buildSegmentInfra(cor, segIdx, segCount, isUrban, danger, cw){
  const divided=cor.type==='Autostradë'?true:cor.type==='Rrugë nacionale'?(segIdx%3!==2):false;
  const frac0=segIdx/segCount, frac1=(segIdx+1)/segCount;
  const polyline=[interpAlong(cor.pts,frac0),interpAlong(cor.pts,frac1)];
  const motorway=cor.type==='Autostradë';
  const baseAadt=motorway
    ?(isUrban?rint(22000,48000):rint(12000,35000))
    :(isUrban?rint(8000,22000):rint(2500,14000));
  const q=(base,spread)=>clamp(base+gauss(0,spread),0.15,0.98);
  const nwaParams=motorway?{
    laneWidth:q(0.82-danger*0.2,0.08),
    roadside:q(0.78-danger*0.25,0.1),
    curvature:q(0.85-(cw.curve||0.2)*0.35,0.08),
    interchanges:q(0.8-danger*0.15,0.1),
    pedConflict:q(0.88-(cw.pedestrian||0.1)*0.4,0.08),
    trafficOps:q(0.84-danger*0.12,0.07),
  }:{
    laneWidth:q(0.75-danger*0.22,0.1),
    roadside:q(0.72-danger*0.28,0.1),
    curvature:q(0.8-(cw.curve||0.25)*0.35,0.09),
    propertyAccess:q(0.78-(isUrban?0.25:0.1),0.1),
    junctions:q(0.76-(cw.junction||0.2)*0.35,0.1),
    pedConflict:q(0.82-(cw.pedestrian||0.15)*0.4,0.09),
    shoulder:q(0.74-danger*0.2,0.1),
    passingLanes:q(0.8-danger*0.15,0.08),
    signsSignals:q(0.83-(cw.lighting||0.1)*0.25,0.08),
  };
  const iRAP=clamp(Math.round(5-danger*3.2+gauss(0,0.35)),1,5);
  const inspMonth=rint(3,10), inspDay=rint(1,28);
  return {
    divided,polyline,
    aadt:Math.round(baseAadt*(0.75+(isUrban?1.1:0.9))),
    aadtYear:2024,aadtSource:'Demo · numërim trafiku',
    iRAP,iRAPYear:2024,
    nwaParams,
    nwaInspection:{
      date:new Date(2024,inspMonth,inspDay),
      inspector:'Inspektori Demo · AKM',
      method:'Inspektim në terren + GIS',
      notes:divided?'Rrugë me ndarje fizike':'Rrugë pa ndarje / me vija',
    },
  };
}

/* ---- geometry helpers ---- */
function corridorLength(pts){
  let L=0; for(let i=1;i<pts.length;i++) L+=haversine(pts[i-1][0],pts[i-1][1],pts[i][0],pts[i][1]);
  return L;
}
function interpAlong(pts, frac){
  const total=corridorLength(pts); let target=total*frac, acc=0;
  for(let i=1;i<pts.length;i++){
    const d=haversine(pts[i-1][0],pts[i-1][1],pts[i][0],pts[i][1]);
    if(acc+d>=target){ const t=(target-acc)/d; return [pts[i-1][0]+(pts[i][0]-pts[i-1][0])*t, pts[i-1][1]+(pts[i][1]-pts[i-1][1])*t]; }
    acc+=d;
  }
  return pts[pts.length-1].slice();
}
function nearestMuni(lat,lng){
  let best=MUNICIPALITIES[0],bd=1e9;
  for(const m of MUNICIPALITIES){ const d=haversine(lat,lng,m.lat,m.lng); if(d<bd){bd=d;best=m;} }
  return best;
}

const YEARS=[2021,2022,2023,2024,2025];
const NOW=new Date(2025,11,31);

/* =============================================================
   Build segments from corridors, then generate accidents.
   ============================================================= */
function buildDataset(){
  const segments=[]; let segCounter=0;
  const SEG_MULT=1.8; // densify network to ~300+ segments (~600 m each)
  for(let ci=0;ci<CORRIDORS.length;ci++){
    const cor=CORRIDORS[ci];
    const len=corridorLength(cor.pts);
    const segCount=Math.max(cor.seg, Math.round(cor.seg*SEG_MULT));
    const segLen=len/segCount;
    for(let i=0;i<segCount;i++){
      const frac=(i+0.5)/segCount;
      const [lat,lng]=interpAlong(cor.pts,frac);
      const muni=nearestMuni(lat,lng);
      const isUrban=/urbane|Unazë/.test(cor.type);
      // intrinsic danger 0..1 (some segments inherently worse)
      const baseDanger={'Autostradë':0.42,'Rrugë nacionale':0.5,'Rrugë interurbane':0.55,'Rrugë urbane kryesore':0.46,'Aksi/Unazë urbane':0.5,'Rrugë urbane dytësore':0.34}[cor.type]||0.45;
      const danger=clamp(gauss(baseDanger,0.16),0.08,0.96);
      // assign 1-3 dominant causes biased by road context
      const causeWeights={};
      CAUSES.forEach(c=>causeWeights[c.key]=rfloat(0.05,0.3));
      if(isUrban){ causeWeights.pedestrian+=rfloat(0.4,0.9); causeWeights.junction+=rfloat(0.3,0.7); causeWeights.traffic+=rfloat(0.3,0.7); }
      else { causeWeights.speed+=rfloat(0.4,0.9); causeWeights.curve+=rfloat(0.2,0.7); }
      if(cor.type==='Autostradë'){ causeWeights.speed+=0.5; causeWeights.traffic+=0.4; }
      if(rnd()<0.4) causeWeights.lighting+=rfloat(0.4,0.9);
      if(rnd()<0.3) causeWeights.surface+=rfloat(0.3,0.7);
      causeWeights.response += (1-muni.w/30)*0.5 + (isUrban?0:0.3);
      // trend slope: -1 improving .. +1 deteriorating
      const intrinsicTrend=clamp(gauss(0.05+danger*0.25-0.2,0.5),-1,1);
      const exposure = (muni.w/12) * (isUrban?1.35:1) * (cor.type==='Autostradë'?1.2:1);
      const infra=buildSegmentInfra(cor,i,segCount,isUrban,danger,causeWeights);
      segCounter++;
      segments.push({
        id:'SEG-'+String(segCounter).padStart(4,'0'),
        corridorId:'COR-'+String(ci+1).padStart(2,'0'),
        corridor:cor.name, road:cor.name.split('(')[0].trim(),
        roadType:cor.type, lat, lng, lengthKm:round1(segLen),
        kmFrom:round1(i*segLen), kmTo:round1((i+1)*segLen),
        municipality:muni.name, qark:muni.qark, speedLimit:cor.limit,
        urban:isUrban, danger, intrinsicTrend, exposure, causeWeights,
        ...infra,
        accidents:[]
      });
    }
  }
  NETWORK_INVENTORY.totalKm=Math.round(segments.reduce((s,x)=>s+x.lengthKm,0));

  /* ---- ndarje sipas peshës së segmentit ---- */
  function allocateCounts(weights, total){
    const sum=weights.reduce((a,b)=>a+b,0)||1;
    const raw=weights.map(w=>(w/sum)*total);
    const counts=raw.map(r=>Math.floor(r));
    let rem=total-counts.reduce((a,b)=>a+b,0);
    const order=raw.map((r,i)=>({i,frac:r-counts[i]})).sort((a,b)=>b.frac-a.frac);
    for(let j=0;j<rem;j++) counts[order[j%order.length].i]++;
    return counts;
  }
  function severityPayload(severity){
    let fatalities=0,serious=0,minor=0;
    if(severity===4){ fatalities=rnd()<0.18?2:1; serious=rint(0,2); minor=rint(0,2); }
    else if(severity===3){ serious=rint(1,2); minor=rint(0,2); }
    else if(severity===2){ minor=rint(1,3); }
    return {
      fatalities, serious_injuries:serious, minor_injuries:minor,
      severityLabel:['','Vetëm material','Lëndime të lehta','Lëndime të rënda','Fatal'][severity],
    };
  }
  function setAccidentSeverity(acc,severity){
    acc.severity=severity;
    const p=severityPayload(severity);
    acc.fatalities=p.fatalities;
    acc.serious_injuries=p.serious_injuries;
    acc.minor_injuries=p.minor_injuries;
    acc.severityLabel=p.severityLabel;
    syncInjured(acc);
  }
  function calibrateFatalitiesForYear(allAcc,year,targetFat){
    const pool=allAcc.filter(a=>a.year===year);
    if(!pool.length||targetFat==null) return;
    let current=pool.reduce((s,a)=>s+a.fatalities,0);
    const shuffled=[...pool].sort(()=>rnd()-0.5);
    let guard=0;
    while(current<targetFat&&guard++<pool.length*8){
      const a=shuffled[guard%shuffled.length];
      if(a.fatalities===0){ setAccidentSeverity(a,4); current+=a.fatalities; }
      else if(a.fatalities===1&&current+1<=targetFat&&rnd()<0.35){ a.fatalities=2; current++; }
    }
    guard=0;
    while(current>targetFat&&guard++<pool.length*8){
      const a=shuffled[guard%shuffled.length];
      if(a.fatalities>0){ const was=a.fatalities; setAccidentSeverity(a,rnd()<0.55?3:2); current-=was; }
    }
    if(current!==targetFat){
      const diff=targetFat-current;
      const a=pool[Math.floor(rnd()*pool.length)];
      a.fatalities=Math.max(0,a.fatalities+diff);
      if(a.fatalities>0){ a.severity=4; a.severityLabel='Fatal'; }
      else if(a.severity===4) setAccidentSeverity(a,3);
      syncInjured(a);
    }
  }
  function calibrateInjuredForYear(allAcc,year,targetInj){
    const pool=allAcc.filter(a=>a.year===year);
    if(!pool.length||targetInj==null) return;
    let current=pool.reduce((s,a)=>s+a.injured,0);
    const shuffled=[...pool].sort(()=>rnd()-0.5);
    let guard=0;
    while(current<targetInj&&guard++<pool.length*12){
      const a=shuffled[guard%shuffled.length];
      a.minor_injuries+=1; syncInjured(a); current++;
    }
    guard=0;
    while(current>targetInj&&guard++<pool.length*12){
      const a=shuffled[guard%shuffled.length];
      if(a.minor_injuries>0){ a.minor_injuries--; syncInjured(a); current--; }
      else if(a.serious_injuries>0&&a.fatalities===0){ a.serious_injuries--; if(a.severity===3&&a.serious_injuries===0) setAccidentSeverity(a,2); current--; }
    }
  }
  function calibrateAlcoholForYear(allAcc,year){
    const row=OFFICIAL.alcoholByYear.find(x=>x.year===year);
    if(!row) return;
    const pool=allAcc.filter(a=>a.year===year);
    const target=Math.round(pool.length*row.pct/100);
    let current=pool.filter(a=>a.alcohol_involved).length;
    const shuffled=[...pool].sort(()=>rnd()-0.5);
    let g=0;
    while(current<target&&g++<pool.length*4){
      const a=shuffled[g%shuffled.length];
      if(!a.alcohol_involved){ a.alcohol_involved=true; a.driver_factor='Alkool ose drogë'; current++; }
    }
    g=0;
    while(current>target&&g++<pool.length*4){
      const a=shuffled[g%shuffled.length];
      if(a.alcohol_involved&&a.driver_factor==='Alkool ose drogë'){
        a.alcohol_involved=false;
        a.driver_factor=weighted([['Tejkalim shpejtësie',25],['Manovër e gabuar',20],['Lodhje',15],['Pa faj të drejtuesit',10]]);
        current--;
      }
    }
  }
  function allocateByQark(segments, segWeights, year, total){
    const qTargets=offQarkTargets(year);
    if(!qTargets) return allocateCounts(segWeights, total);
    const byQark={};
    segments.forEach((s,i)=>{
      if(!byQark[s.qark]) byQark[s.qark]=[];
      byQark[s.qark].push({idx:i,w:segWeights[i]});
    });
    const alloc=new Array(segments.length).fill(0);
    let assigned=0;
    for(const [qark,target] of Object.entries(qTargets)){
      const pool=byQark[qark]||[];
      if(!pool.length) continue;
      const counts=allocateCounts(pool.map(p=>p.w), target);
      counts.forEach((c,j)=>{ alloc[pool[j].idx]+=c; assigned+=c; });
    }
    if(assigned<total){
      const rem=total-assigned;
      const extra=allocateCounts(segWeights, rem);
      extra.forEach((c,i)=>{ alloc[i]+=c; });
    }
    return alloc;
  }
  function createAccident(s,yr,aid){
    const causeArr=CAUSES.map(c=>[c.key,s.causeWeights[c.key]]);
    const dominant=weighted(causeArr);
    const jLat=s.lat+gauss(0,0.0045), jLng=s.lng+gauss(0,0.0055/Math.cos(s.lat*Math.PI/180));
    const month=rint(0,11), day=rint(1,28), hour=lightingHour(dominant,s);
    const date=new Date(yr,month,day,hour,rint(0,59));
    let lighting;
    if(hour>=7&&hour<18) lighting='Dritë dite';
    else if(hour>=18&&hour<20||hour>=5&&hour<7) lighting='Muzg';
    else lighting=(dominant==='lighting'||s.urban===false&&rnd()<0.55)?'Natë pa ndriçim':'Natë me ndriçim';
    const weather=weighted([['Kthjellët',55],['Me re',18],['Shi',(dominant==='surface'?22:12)],['Mjegull',5],['Erë e fortë',4],['Akull/Borë',(s.qark==='Kukës'||s.qark==='Dibër'?6:2)]]);
    const surface=weather==='Shi'?'I lagësht':weather==='Akull/Borë'?'Akull/Borë':weighted([['I thatë',70],['I lagësht',16],['Me baltë/zhavorr',9],['Akull/Borë',5]]);
    const overFactor=dominant==='speed'?rfloat(1.15,1.55):rfloat(0.8,1.2);
    const estSpeed=Math.round(clamp(s.speedLimit*overFactor+gauss(0,8),20,170));
    const pedInvolved=dominant==='pedestrian'?(rnd()<0.85?rint(1,2):0):(s.urban&&rnd()<0.18?1:0);
    let sevScore=0;
    sevScore+=(estSpeed/s.speedLimit-1)*1.6;
    sevScore+=pedInvolved?1.2:0;
    sevScore+=(s.roadType==='Autostradë'||s.roadType==='Rrugë nacionale')?0.6:0;
    sevScore+=(surface==='Akull/Borë'||surface==='I lagësht')?0.3:0;
    sevScore+=dominant==='curve'?0.4:0;
    sevScore+=gauss(0,0.7);
    let severity;
    if(sevScore>2.02) severity=4; else if(sevScore>1.0) severity=3; else if(sevScore>-0.15) severity=2; else severity=1;
    const inj=severityPayload(severity);
    const vehicles=pedInvolved?rint(1,2):weighted([['1',12],['2',60],['3',20],['4',8]])*1;
    const collision=pedInvolved?'Goditje këmbësori':
      dominant==='curve'?weighted([['Dalje nga rruga',50],['Përmbysje',25],['Përplasje ballore',25]]):
      s.roadType==='Autostradë'?weighted([['Përplasje nga prapa',40],['Zinxhir automjetesh',20],['Dalje nga rruga',25],['Përplasje anësore',15]]):
      weighted([['Përplasje anësore',32],['Përplasje ballore',22],['Përplasje nga prapa',22],['Dalje nga rruga',14],['Goditje pengese',10]]);
    const driver=dominant==='speed'?'Tejkalim shpejtësie':
      dominant==='junction'?'Nuk dha përparësi':
      weighted([['Tejkalim shpejtësie',20],['Nuk dha përparësi',16],['Manovër e gabuar',16],['Lodhje',10],['Alkool ose drogë',12],['Telefon gjatë vozitjes',10],['Distancë shumë e shkurtër',10],['Pa gabim të drejtuesit',6]]);
    const infra=dominant==='lighting'?'Pa ndriçim publik':
      dominant==='curve'?'Kthesë e rrezikshme':
      dominant==='junction'?'Kryqëzim i pasigurt':
      dominant==='surface'?'Rrugë e dëmtuar':
      dominant==='pedestrian'?'Mungon trotuar/kalim':
      weighted([['Pa problem infrastrukture',45],['Shenja të dëmtuara',16],['Pa dritë publike',12],['Kthesë e rrezikshme',10],['Kryqëzim i pasigurt',9],['Rrugë e dëmtuar',8]]);
    const vehicle=weighted([['Pa faktor automjeti',60],['Goma të konsumuara',12],['Defekt frenash',10],['Drita jofunksionale',9],['Mbingarkesë',9]]);
    const remote=1-clamp(s.municipality==='Tiranë'?0.95:MUNI_BY_NAME[s.municipality].w/16,0.2,1);
    const respTime=Math.round(clamp(gauss(8+remote*16+s.causeWeights.response*6,4),3,55));
    const alcoholBase=(dominant==='speed'&&rnd()<0.08)||rnd()<(OFFICIAL.alcoholByYear.find(x=>x.year===yr)?.pct||4)/100*0.85;
    const acc={
      id:'ACC-'+String(aid).padStart(5,'0'),
      policeId:'POL-'+yr+'-'+String(aid).padStart(5,'0'),
      lat:round6(jLat), lng:round6(jLng),
      date, year:yr,
      weekday:WEEKDAY_LABELS[date.getDay()],
      hour:date.getHours(),
      time:String(hour).padStart(2,'0')+':'+String(date.getMinutes()).padStart(2,'0'),
      municipality:s.municipality, qark:s.qark,
      road:s.road, roadName:s.corridor, segment:s.id, roadType:s.roadType,
      collision_type:collision, severity, severityLabel:inj.severityLabel,
      fatalities:inj.fatalities, serious_injuries:inj.serious_injuries, minor_injuries:inj.minor_injuries,
      vehicles, pedestrians:pedInvolved,
      victim_type:pickVictimType(dominant,pedInvolved),
      weather, lighting, road_condition:surface,
      speed_limit:s.speedLimit, estimated_speed:estSpeed,
      driver_factor:alcoholBase?'Alkool ose drogë':driver,
      alcohol_involved:alcoholBase,
      infrastructure_factor:infra, vehicle_factor:vehicle,
      response_time:respTime, dominantCause:dominant,
      officialCause:OFFICIAL_CAUSE_MAP[dominant]||'Të tjera',
      countsForNwa:false,
    };
    syncInjured(acc);
    return acc;
  }

  /* ---- aksidente: kalibrim sipas INSTAT për çdo vit ---- */
  const accidents=[]; let aid=0;
  const segWeights=segments.map(s=>Math.max(0.01,s.danger*s.exposure*(s.lengthKm||1)));
  for(const yr of YEARS){
    const off=OFFICIAL.yearly.find(y=>y.year===yr);
    if(!off) continue;
    const alloc=allocateByQark(segments, segWeights, yr, off.accidents);
    for(let si=0;si<segments.length;si++){
      const s=segments[si];
      for(let k=0;k<alloc[si];k++){
        aid++;
        const acc=createAccident(s,yr,aid);
        accidents.push(acc);
        s.accidents.push(acc);
      }
    }
    calibrateFatalitiesForYear(accidents, yr, off.fatalities);
    calibrateInjuredForYear(accidents, yr, off.injured);
    calibrateAlcoholForYear(accidents, yr);
  }
  accidents.forEach(a=>{
    a.countsForNwa=[2023,2024,2025].includes(a.year)&&(a.fatalities>0||a.serious_injuries>0||a.severity>=3);
  });
  return {segments, accidents};
}
function round6(x){ return Math.round(x*1e6)/1e6; }
function lightingHour(cause,s){
  if(cause==='lighting') return weighted([['19',1],['20',2],['21',3],['22',3],['23',2],['0',2],['1',2],['2',1],['3',1]])*1;
  if(s.urban) return rint(7,21);
  return weighted([['6',1],['7',2],['8',3],['9',2],['12',2],['14',2],['16',3],['17',3],['18',2],['20',2],['22',2],['2',1]])*1;
}

/* run once */
const DATA = buildDataset();
const ACCIDENTS = DATA.accidents;
const SEGMENTS = DATA.segments;
