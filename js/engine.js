/* =============================================================
   engine.js — Analytical core.
   Risk Engine · Black Spot Engine · Root Cause Engine ·
   Trend Engine · Early Risk Detection (predictive).
   Everything is derived from ACCIDENTS aggregated to SEGMENTS.
   ============================================================= */

/* Risk Score weighting (documented in Methodology module). */
const RISK_WEIGHTS = [
  {key:'fatality',   label:'Fataliteti',                w:0.24},
  {key:'accident',   label:'Densiteti i aksidenteve',   w:0.17},
  {key:'severity',   label:'Ashpërsia',                 w:0.12},
  {key:'trend',      label:'Trendi',                    w:0.12},
  {key:'speed',      label:'Shpejtësia',                w:0.10},
  {key:'pedestrian', label:'Ekspozimi i këmbësorëve',   w:0.09},
  {key:'infra',      label:'Infrastruktura',            w:0.09},
  {key:'response',   label:'Koha e reagimit',           w:0.07},
];

/* =============================================================
   CALIB — central calibration parameters.
   Every constant is a deliberate choice, NOT a measured truth.
   All values are PROVISIONAL and will be re-fitted on real data.
   (Surfaced in the Methodology module as a versioned table.)
   ============================================================= */
const CALIB_VERSION='v1.0 · provizore';
const CALIB={
  // — sub-score calibration —
  accDenom:1.8,        // aksidente/km/vit që e çojnë treguesin ~drejt 100
  fatKmDenom:1.8,      // normalizimi i fatalitete/km
  fatKmMult:70,        // pesha e komponentit fatalitete/km
  fatCrashMult:11,     // shtesë për çdo përplasje fatale
  severityMult:150,    // raporti i përplasjeve të rënda -> 0..100
  trendBase:50,        // pikënisja neutrale e trendit
  trendMult:22,        // ndjeshmëria ndaj pjerrësisë
  speedOffset:0.82,    // tolerancë para se shpejtësia të ndëshkohet
  speedMult:200,       // ndjeshmëria ndaj tejkalimit
  pedMult:230,         // raporti i këmbësorëve -> 0..100
  infraMult:130,       // raporti me faktor infrastrukture -> 0..100
  respMin:6,           // min të dakorduara (s'ndëshkohet)
  respRange:26,        // intervali deri në ndëshkim maksimal
  // — confidence shrinkage —
  confBase:35,         // besueshmëri bazë me 0 aksidente
  confPerAcc:6.5,      // rritje besueshmërie për çdo aksident
  confFloor:0.72,      // faktori minimal kur besueshmëria = 0
  // — prediction —
  predTrendMult:9, predTrendMin:-22, predTrendMax:26,
  predGrowthMult:16, predGrowthMin:-12, predGrowthMax:20,
  predSpeedMult:22, predSpeedMin:-8, predSpeedMax:14,
  predFatMult:2.2, predFatMax:14,
  predBlendGrowth:0.6, predBlendSpeed:0.4, predBlendFat:0.4,
  logit:{b0:-1.4, slope:0.9, growth:1.1, risk:0.05, riskMid:45, speed:0.8},
  probMin:0.02, probMax:0.97,
  expCritical:78, expBlack:62, expHigh:46,
  // — black spot / emerging / monitoring —
  bsRisk:60, bsAcc:4, bsFat:3, bsRiskHard:68,
  emProb:0.5, emProjected:48, emAcc:2,
  monRisk:50,          // risk minimal për "Segment për monitorim"
  // — priority —
  prRisk:0.5, prProjected:0.18, prFatMult:4, prFatCap:6, prProb:18, prExposure:0.4,
  // — black spot geometry —
  bsRadiusBase:180, bsRadiusPerAcc:22, bsRadiusMax:650,
};

function linSlope(ys){
  const n=ys.length; if(n<2) return 0;
  const xm=(n-1)/2, ym=ys.reduce((a,b)=>a+b,0)/n;
  let num=0,den=0;
  for(let i=0;i<n;i++){ num+=(i-xm)*(ys[i]-ym); den+=(i-xm)**2; }
  return den? num/den : 0;
}

function computeSegmentMetrics(seg){
  const acc=seg.accidents;
  const n=acc.length;
  const fatalities=acc.reduce((s,a)=>s+a.fatalities,0);
  const serious=acc.reduce((s,a)=>s+a.serious_injuries,0);
  const minor=acc.reduce((s,a)=>s+a.minor_injuries,0);
  const peds=acc.reduce((s,a)=>s+(a.pedestrians>0?1:0),0);
  const fatalCrashes=acc.filter(a=>a.severity===4).length;
  const seriousCrashes=acc.filter(a=>a.severity>=3).length;
  const byYear=YEARS.map(y=>acc.filter(a=>a.year===y).length);
  const fatByYear=YEARS.map(y=>acc.filter(a=>a.year===y).reduce((s,a)=>s+a.fatalities,0));
  const len=seg.lengthKm||1;

  const accPerKmYr = n/len/YEARS.length;
  const fatPerKm = fatalities/len;
  const avgSpeed = n? acc.reduce((s,a)=>s+a.estimated_speed,0)/n : seg.speedLimit;
  const speedExceed = avgSpeed/seg.speedLimit;
  const avgResp = n? acc.reduce((s,a)=>s+a.response_time,0)/n : 12;
  const infraShare = n? acc.filter(a=>!/^Pa faktor/.test(a.infrastructure_factor)).length/n : 0;
  const pedShare = n? peds/n : 0;
  const severeShare = n? seriousCrashes/n : 0;
  const slope = linSlope(byYear);              // accidents/year slope
  const recent = byYear[3]+byYear[4], prior = byYear[0]+byYear[1];
  const growth = (recent+0.5)/(prior+0.5);     // ratio recent vs early

  // ---- sub-scores (0..100) ----
  const accidentScore   = clamp(accPerKmYr/CALIB.accDenom*100, 0, 100);
  const fatalityScore   = clamp((fatPerKm/CALIB.fatKmDenom*CALIB.fatKmMult)+(fatalCrashes*CALIB.fatCrashMult), 0, 100);
  const severityScore   = clamp(severeShare*CALIB.severityMult, 0, 100);
  const trendScore      = clamp(CALIB.trendBase + slope*CALIB.trendMult, 0, 100);
  const speedScore      = clamp((speedExceed-CALIB.speedOffset)*CALIB.speedMult, 0, 100);
  const pedScore        = clamp(pedShare*CALIB.pedMult, 0, 100);
  const infraScore      = clamp(infraShare*CALIB.infraMult, 0, 100);
  const responseScore   = clamp((avgResp-CALIB.respMin)/CALIB.respRange*100, 0, 100);
  const dataConfidence  = clamp(CALIB.confBase + n*CALIB.confPerAcc, 0, 100);

  const sub={fatality:fatalityScore,accident:accidentScore,severity:severityScore,trend:trendScore,speed:speedScore,pedestrian:pedScore,infra:infraScore,response:responseScore};
  let risk=RISK_WEIGHTS.reduce((s,w)=>s+sub[w.key]*w.w,0);
  // confidence shrinkage for sparse-data segments
  risk = risk*(CALIB.confFloor+(1-CALIB.confFloor)*dataConfidence/100);
  risk=clamp(risk,0,100);

  return {
    n, fatalities, serious, minor, peds, fatalCrashes, seriousCrashes,
    byYear, fatByYear, accPerKmYr:round1(accPerKmYr), fatPerKm:round1(fatPerKm),
    avgSpeed:Math.round(avgSpeed), speedExceed, avgResp:Math.round(avgResp),
    infraShare, pedShare, severeShare, slope, growth,
    sub, dataConfidence:Math.round(dataConfidence),
    risk:Math.round(risk)
  };
}

/* ---- Root Cause Engine: ranked contributing causes for a segment ---- */
function rootCauses(seg){
  const acc=seg.accidents, n=acc.length||1;
  const tally={}; CAUSES.forEach(c=>tally[c.key]=0);
  acc.forEach(a=>{ tally[a.dominantCause]+=1; });
  // blend observed dominant-cause frequency with intrinsic profile weights
  const out=CAUSES.map(c=>{
    const obs=tally[c.key]/n;
    const prof=seg.causeWeights[c.key];
    const score=obs*0.7 + (prof/2.2)*0.3;
    return {...c, count:tally[c.key], share:obs, score};
  }).sort((a,b)=>b.score-a.score);
  const tot=out.reduce((s,c)=>s+c.score,0)||1;
  out.forEach(c=>c.contribution=Math.round(c.score/tot*100));
  return out;
}

const CAUSE_EXPLAIN={
  speed:'Shpejtësia mesatare e vlerësuar tejkalon ndjeshëm limitin, duke rritur energjinë e përplasjes dhe distancën e frenimit.',
  pedestrian:'Përqendrim i lartë i goditjeve të këmbësorëve tregon konflikt këmbësorë-automjete dhe mungesë kalimesh të sigurta.',
  lighting:'Pjesë e madhe e aksidenteve ndodhin natën pa ndriçim, çka ul dukshmërinë dhe kohën e reagimit.',
  curve:'Gjeometria e segmentit (kthesa/dalje nga rruga) gjeneron humbje kontrolli dhe përmbysje.',
  junction:'Nyjet e pakontrolluara prodhojnë konflikte përparësie dhe përplasje anësore.',
  surface:'Gjendja e sipërfaqes (e lagësht/baltë/akull) ul fërkimin dhe rrit distancën e ndalimit.',
  traffic:'Volumi i lartë i trafikut rrit ekspozimin dhe përplasjet nga prapa / zinxhir.',
  response:'Koha e zgjatur e reagimit të emergjencës rrit ashpërsinë e pasojave të aksidenteve.',
};

/* ---- Trend Engine: 1/3/5 year classification ---- */
function trendClass(m){
  if(m.slope>0.45) return {key:'det',label:'Në përkeqësim',cls:'det'};
  if(m.slope<-0.45) return {key:'imp',label:'Në përmirësim',cls:'imp'};
  return {key:'sta',label:'Stabël',cls:'sta'};
}

/* ---- Early Risk Detection (predictive, NOT "AI") ---- */
function predict(seg,m){
  // projected risk = current + trend momentum + growth pressure + speed pressure
  const trendComp = clamp(m.slope*CALIB.predTrendMult, CALIB.predTrendMin, CALIB.predTrendMax);
  const growthComp = clamp((m.growth-1)*CALIB.predGrowthMult, CALIB.predGrowthMin, CALIB.predGrowthMax);
  const speedComp = clamp((m.speedExceed-1)*CALIB.predSpeedMult, CALIB.predSpeedMin, CALIB.predSpeedMax);
  const fatPressure = clamp(m.fatalities*CALIB.predFatMult, 0, CALIB.predFatMax);
  let projected = clamp(m.risk + trendComp + growthComp*CALIB.predBlendGrowth + speedComp*CALIB.predBlendSpeed + fatPressure*CALIB.predBlendFat, 0, 100);
  // escalation probability via logistic on the pressure terms
  const L=CALIB.logit;
  const z = L.b0 + L.slope*Math.max(0,m.slope) + L.growth*Math.max(0,m.growth-1) + L.risk*(m.risk-L.riskMid) + L.speed*Math.max(0,m.speedExceed-1);
  let prob = 1/(1+Math.exp(-z));
  prob = clamp(prob,CALIB.probMin,CALIB.probMax);
  let expected;
  if(projected>=CALIB.expCritical) expected='Black Spot kritik';
  else if(projected>=CALIB.expBlack) expected='Black Spot';
  else if(projected>=CALIB.expHigh) expected='Segment me risk të lartë';
  else expected='I qëndrueshëm';
  return {projected:Math.round(projected), prob, expected, trendComp, growthComp, speedComp};
}

/* =============================================================
   Build the analytical model over all segments.
   ============================================================= */
function buildModel(){
  const segs=SEGMENTS.map(seg=>{
    const m=computeSegmentMetrics(seg);
    const causes=rootCauses(seg);
    const trend=trendClass(m);
    const pred=predict(seg,m);
    return {...seg, m, causes, trend, pred};
  });

  // priority score = blend of current risk, fatalities, escalation, exposure
  segs.forEach(s=>{
    s.priority=Math.round(clamp(
      s.m.risk*CALIB.prRisk + s.pred.projected*CALIB.prProjected
      + Math.min(s.m.fatalities,CALIB.prFatCap)*CALIB.prFatMult
      + s.pred.prob*CALIB.prProb + s.m.n*CALIB.prExposure, 0, 100));
  });

  // ---- Black Spot Engine ----
  // qualify naturally: established danger (high risk + recurring crashes + fatalities).
  // NOTE: no quota floor — the count is a FINDING, not a target.
  segs.forEach(s=>{
    s.isBlackSpot = (s.m.risk>=CALIB.bsRisk && s.m.n>=CALIB.bsAcc) || (s.m.fatalities>=CALIB.bsFat) || (s.m.risk>=CALIB.bsRiskHard);
  });
  // emerging: not black spot, but escalating toward it
  segs.forEach(s=>{
    s.isEmerging = !s.isBlackSpot && s.pred.prob>=CALIB.emProb && s.trend.key==='det' && s.pred.projected>=CALIB.emProjected && s.m.n>=CALIB.emAcc;
  });
  // monitoring: elevated risk but neither black spot nor emerging (watch-list, not a black spot)
  segs.forEach(s=>{
    s.isMonitor = !s.isBlackSpot && !s.isEmerging && s.m.risk>=CALIB.monRisk;
  });

  // build black spot objects (named, with radius/area)
  const blackSpots=segs.filter(s=>s.isBlackSpot)
    .sort((a,b)=>b.priority-a.priority)
    .map((s,i)=>{
      const radius=Math.round(clamp(CALIB.bsRadiusBase+s.m.n*CALIB.bsRadiusPerAcc,CALIB.bsRadiusBase,CALIB.bsRadiusMax));
      return {
        id:'BS-'+String(i+1).padStart(3,'0'),
        name:bsName(s), seg:s, lat:s.lat, lng:s.lng, radius,
        areaHa:round1(Math.PI*radius*radius/10000),
        riskScore:s.m.risk, fatalityScore:Math.round(s.m.sub.fatality),
        priorityScore:s.priority, trend:s.trend,
        municipality:s.municipality, qark:s.qark, rank:i+1
      };
    });
  const emerging=segs.filter(s=>s.isEmerging)
    .sort((a,b)=>b.pred.prob-a.pred.prob)
    .map((s,i)=>({id:'EM-'+String(i+1).padStart(3,'0'),seg:s,rank:i+1}));

  return {segs, blackSpots, emerging};
}
let _bsCounter={};
function bsName(s){
  const km=Math.round((s.kmFrom+s.kmTo)/2);
  return `${s.road} · km ${km} (${s.municipality})`;
}

const MODEL = buildModel();
const SEGS = MODEL.segs;
const BLACKSPOTS = MODEL.blackSpots;
const EMERGING = MODEL.emerging;

/* =============================================================
   Validation diagnostics (transparency, not "AI").
   - Discrimination: does the priority ranking add information
     beyond a naive "sort by fatalities"? (Spearman rho)
   - Sensitivity: how stable is the Top-20 risk ranking when the
     weights are perturbed by ±20%? (sub-scores are fixed, so this
     is cheap to recompute.)
   ============================================================= */
function spearman(a,b){
  const rank=arr=>{
    const idx=arr.map((v,i)=>[v,i]).sort((x,y)=>x[0]-y[0]);
    const r=new Array(arr.length);
    for(let i=0;i<idx.length;i++) r[idx[i][1]]=i+1;
    return r;
  };
  const ra=rank(a), rb=rank(b), n=a.length;
  const mean=x=>x.reduce((s,v)=>s+v,0)/x.length;
  const ma=mean(ra), mb=mean(rb);
  let num=0,da=0,db=0;
  for(let i=0;i<n;i++){ const x=ra[i]-ma,y=rb[i]-mb; num+=x*y; da+=x*x; db+=y*y; }
  return (da&&db)? num/Math.sqrt(da*db) : 0;
}
function riskFromWeights(s,weights){
  let r=weights.reduce((a,w)=>a+s.m.sub[w.key]*w.w,0);
  r=r*(CALIB.confFloor+(1-CALIB.confFloor)*s.m.dataConfidence/100);
  return r;
}
function validationDiagnostics(){
  // #3 discrimination vs naive fatality ranking
  const rho=spearman(SEGS.map(s=>s.priority), SEGS.map(s=>s.m.fatalities));
  // #6 sensitivity: perturb weights ±20%, measure Top-20 overlap with baseline
  const baseTop=new Set([...SEGS].sort((a,b)=>b.m.risk-a.m.risk).slice(0,20).map(s=>s.id));
  let overlapSum=0; const trials=40;
  for(let t=0;t<trials;t++){
    const w=RISK_WEIGHTS.map(x=>({key:x.key,w:x.w*(0.8+RNG()*0.4)}));
    const top=[...SEGS].map(s=>({id:s.id,r:riskFromWeights(s,w)}))
      .sort((a,b)=>b.r-a.r).slice(0,20);
    const ov=top.filter(x=>baseTop.has(x.id)).length;
    overlapSum+=ov/20;
  }
  return {rho:round1(rho), addsInfo:rho<0.9, stability:Math.round(overlapSum/trials*100)};
}
const VALID = validationDiagnostics();

/* =============================================================
   National aggregates
   ============================================================= */
function nationalStats(){
  const totAcc=ACCIDENTS.length;
  const totFatal=ACCIDENTS.reduce((s,a)=>s+a.fatalities,0);
  const totSerious=ACCIDENTS.reduce((s,a)=>s+a.serious_injuries,0);
  const totMinor=ACCIDENTS.reduce((s,a)=>s+a.minor_injuries,0);
  const highRisk=SEGS.filter(s=>s.m.risk>=60).length;
  const avgRisk=Math.round(SEGS.reduce((s,x)=>s+x.m.risk,0)/SEGS.length);
  const avgResp=Math.round(ACCIDENTS.reduce((s,a)=>s+a.response_time,0)/totAcc);
  const fatRate=round1(totFatal/totAcc*100);
  const projAvg=Math.round(SEGS.reduce((s,x)=>s+x.pred.projected,0)/SEGS.length);
  const accByYear=YEARS.map(y=>ACCIDENTS.filter(a=>a.year===y).length);
  const fatByYear=YEARS.map(y=>ACCIDENTS.filter(a=>a.year===y).reduce((s,a)=>s+a.fatalities,0));
  return {totAcc,totFatal,totSerious,totMinor,highRisk,avgRisk,avgResp,fatRate,projAvg,
    blackSpots:BLACKSPOTS.length, emerging:EMERGING.length,
    monitor:SEGS.filter(s=>s.isMonitor).length, accByYear, fatByYear,
    segments:SEGS.length};
}
const NAT = nationalStats();
