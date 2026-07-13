/* =============================================================
   nwa.js - Network Wide Road Safety Assessment (NWA)
   Bazuar në: DG MOVE Handbook (2023), Direktiva 2008/96/EC
   (EU) 2019/1936. Të dhëna fiktive për demonstrim.
   ============================================================= */

const NWA_VERSION = 'Vlerësim i rrjetit · demo';
const NWA_REACTIVE_YEARS = 3;
const NWA_REACTIVE_WINDOW = [2023, 2024, 2025];

const NWA_TYPES = {
  mw_rural: { label: 'Autostradë - rurale', motorway: true, thr: { low: 85, high: 65 } },
  mw_urban: { label: 'Autostradë - urbane', motorway: true, thr: { low: 85, high: 65 } },
  pri_div:  { label: 'Primare - me ndarje', motorway: false, thr: { low: 80, high: 50 } },
  pri_undiv: { label: 'Primare - pa ndarje', motorway: false, thr: { low: 80, high: 50 } },
};

/* Parametrat proaktive (emërtime sipas manualit) */
const NWA_MW_PARAMS = [
  { key: 'laneWidth', label: 'Gjerësia e korsisë' },
  { key: 'roadside', label: 'Ana e rrugës / zona anësore' },
  { key: 'curvature', label: 'Kurbatura' },
  { key: 'interchanges', label: 'Interchange / distanca' },
  { key: 'pedConflict', label: 'Konflikte këmbësorë/çiklistë' },
  { key: 'trafficOps', label: 'Operimi i trafikut / informim' },
];
const NWA_PRI_PARAMS = [
  { key: 'laneWidth', label: 'Gjerësia e korsisë' },
  { key: 'roadside', label: 'Ana e rrugës / zona anësore' },
  { key: 'curvature', label: 'Kurbatura' },
  { key: 'propertyAccess', label: 'Dendësia hyrjeve private' },
  { key: 'junctions', label: 'Kryqëzimet' },
  { key: 'pedConflict', label: 'Konflikte këmbësorë/çiklistë' },
  { key: 'shoulder', label: 'Lloji / gjerësia bankinës' },
  { key: 'passingLanes', label: 'Korsitë e kalimit' },
  { key: 'signsSignals', label: 'Shenjat dhe sinjalistika' },
];

/* Matrica e integrimit (Figura 4.1, Manuali NWA 2023) */
const NWA_INTEGRATE = {
  p3: { r3: 5, r2: 4, nodata: 4, r1: 2 },
  p2: { r3: 5, r2: 3, nodata: 3, r1: 2 },
  p1: { r3: 5, r2: 2, nodata: 1, r1: 1 },
};

const NWA_CLASS_META = {
  5: { label: 'Risk shumë i lartë', short: 'Risk 5', color: '#dc2626', key: 'c5' },
  4: { label: 'Risk i lartë', short: 'Risk 4', color: '#ea580c', key: 'c4' },
  3: { label: 'Risk mesatar', short: 'Risk 3', color: '#ca8a04', key: 'c3' },
  2: { label: 'Risk i ulët', short: 'Risk 2', color: '#65a30d', key: 'c2' },
  1: { label: 'Risk shumë i ulët', short: 'Risk 1', color: '#166534', key: 'c1' },
};

const NWA_PROACTIVE_META = {
  p1: { label: 'Rrugë e sigurt', cls: 'p1', color: '#166534' },
  p2: { label: 'Rrugë mesatare', cls: 'p2', color: '#ca8a04' },
  p3: { label: 'Rrugë problematike', cls: 'p3', color: '#dc2626' },
};
const NWA_REACTIVE_META = {
  r1: { label: 'Pak aksidente', cls: 'r1', color: '#166534' },
  r2: { label: 'Aksidente mesatare', cls: 'r2', color: '#ca8a04' },
  r3: { label: 'Shumë aksidente', cls: 'r3', color: '#dc2626' },
  nodata: { label: 'Pa të dhëna', cls: 'nodata', color: '#64748b' },
};

/* ---- detektimi i pikave të zeza (pas NWA-Integruar) ---- */
const NWA_BLACK_SPOT_RULES = {
  blackSpot: [
    'Niveli i riskut 4 ose 5 (risk i lartë / shumë i lartë)',
    'OSE shumë aksidente + rrugë problematike - edhe kur niveli është 2–3',
  ],
  emerging: 'Risk mesatar (nivel 3), por jo ende pikë e zezë - kandidat për escalim',
  monitor: 'Risk i ulët (nivel 2) me sinjale mesatare në rrugë ose aksidente',
};

function blackSpotReasons(seg) {
  if (!seg.isBlackSpot) return [];
  const r = [];
  if (seg.nwa.integrated >= 4) {
    r.push(`${NWA_CLASS_META[seg.nwa.integrated].label} (nivel ${seg.nwa.integrated})`);
  }
  if (seg.nwa.reactive.cls === 'r3' && seg.nwa.proactive.cls === 'p3') {
    r.push('Shumë aksidente + rrugë problematike');
  }
  return r;
}

function nwaSegmentStatus(seg) {
  if (seg.isBlackSpot) return { key: 'bs', label: 'Pikë e Zezë', cls: 'crit' };
  if (seg.isEmerging) return { key: 'em', label: 'Në zhvillim', cls: 'amber' };
  if (seg.isMonitor) return { key: 'mon', label: 'Në vëzhgim', cls: 'med' };
  return { key: 'ok', label: 'Normal', cls: 'neutral' };
}

function buildBlackSpotCriteriaHTML(compact) {
  const rules = NWA_BLACK_SPOT_RULES;
  if (compact) {
    return `<div class="callout red"><div><h6>Si detektohen pikat e zeza</h6><ul class="obs-list compact">${rules.blackSpot.map(x => `<li>${x}</li>`).join('')}</ul></div></div>`;
  }
  return `<div class="card mt-20"><div class="card-head"><h5>Si detektohen pikat e zeza</h5><span class="hint">Pas vlerësimit NWA-Integruar</span></div><div class="card-pad stack">
    <p class="prose">Një segment shënohet <b>pikë e zezë</b> kur plotëson <b>njërin</b> nga kriteret:</p>
    <ol class="m-list numbered">${rules.blackSpot.map(x => `<li>${x}</li>`).join('')}</ol>
    <p class="prose mt-12"><b>Në zhvillim:</b> ${rules.emerging}. <b>Për monitorim:</b> ${rules.monitor}.</p>
    ${buildNwaMatrixSnippet()}
  </div></div>`;
}

function buildNwaMatrixSnippet() {
  return `<table class="tbl param-tbl mt-14"><thead><tr><th>Proaktive \\ Reaktive</th><th>r3</th><th>r2</th><th>Pa të dhëna</th><th>r1</th></tr></thead><tbody>
    <tr><td><b>p3</b></td><td class="num">5</td><td class="num">4</td><td class="num">4</td><td class="num">2</td></tr>
    <tr><td><b>p2</b></td><td class="num">5</td><td class="num">3</td><td class="num">3</td><td class="num">2</td></tr>
    <tr><td><b>p1</b></td><td class="num">5</td><td class="num">2</td><td class="num">1</td><td class="num">1</td></tr>
  </tbody></table>`;
}

/* ---- statistikë Poisson (α = 0.05) ---- */
function normQuantile(p) {
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479824614460e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680091794259479e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758227161998e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.223964580411365e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  const plow = 0.02425, phigh = 1 - plow;
  let q, r;
  if (p < plow) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > phigh) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  q = p - 0.5; r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
function chi2Quantile(p, df) {
  if (df <= 0) return 0;
  const z = normQuantile(p);
  const a = 2 / (9 * df);
  return df * Math.pow(Math.max(0, 1 - a + z * Math.sqrt(a)), 3);
}
function poissonBounds(k, alpha = 0.05) {
  const lower = k === 0 ? 0 : chi2Quantile(alpha / 2, 2 * k) / 2;
  const upper = chi2Quantile(1 - alpha / 2, 2 * (k + 1)) / 2;
  return { lower, upper };
}
function poissonCDF(k, lambda) {
  if (lambda <= 0) return k < 0 ? 0 : 1;
  let sum = Math.exp(-lambda), term = sum;
  for (let i = 1; i <= k; i++) { term *= lambda / i; sum += term; }
  return Math.min(1, sum);
}

/* ---- tipi NWA i rrugës (4 kategori) ---- */
function mapNwaType(seg) {
  if (seg.roadType === 'Autostradë') return seg.urban ? 'mw_urban' : 'mw_rural';
  if (seg.roadType === 'Rrugë nacionale') {
    const n = parseInt((seg.id || '').replace(/\D/g, ''), 10) || 0;
    return n % 2 === 0 ? 'pri_div' : 'pri_undiv';
  }
  return 'pri_undiv';
}

/* ---- të dhëna fiktive infrastrukture + AADT ---- */
function enrichNwaAttributes(seg) {
  seg.nwaType = mapNwaType(seg);
  const t = NWA_TYPES[seg.nwaType];
  const baseAadt = t.motorway
    ? (seg.urban ? rint(22000, 48000) : rint(12000, 35000))
    : (seg.urban ? rint(8000, 22000) : rint(2500, 14000));
  seg.aadt = Math.round(baseAadt * (0.75 + seg.exposure * 0.35));

  const q = (base, spread) => clamp(base + gauss(0, spread), 0.15, 0.98);
  const cw = seg.causeWeights || {};
  if (t.motorway) {
    seg.nwaParams = {
      laneWidth: q(0.82 - seg.danger * 0.2, 0.08),
      roadside: q(0.78 - seg.danger * 0.25, 0.1),
      curvature: q(0.85 - (cw.curve || 0.2) * 0.35, 0.08),
      interchanges: q(0.8 - seg.danger * 0.15, 0.1),
      pedConflict: q(0.88 - (cw.pedestrian || 0.1) * 0.4, 0.08),
      trafficOps: q(0.84 - seg.danger * 0.12, 0.07),
    };
  } else {
    seg.nwaParams = {
      laneWidth: q(0.75 - seg.danger * 0.22, 0.1),
      roadside: q(0.72 - seg.danger * 0.28, 0.1),
      curvature: q(0.8 - (cw.curve || 0.25) * 0.35, 0.09),
      propertyAccess: q(0.78 - (seg.urban ? 0.25 : 0.1), 0.1),
      junctions: q(0.76 - (cw.junction || 0.2) * 0.35, 0.1),
      pedConflict: q(0.82 - (cw.pedestrian || 0.15) * 0.4, 0.09),
      shoulder: q(0.74 - seg.danger * 0.2, 0.1),
      passingLanes: q(0.8 - seg.danger * 0.15, 0.08),
      signsSignals: q(0.83 - (cw.lighting || 0.1) * 0.25, 0.08),
    };
  }
}

function rfFromQuality(q) {
  return clamp(0.55 + 0.45 * q, 0.55, 1.0);
}

function injuryCrashes(seg, years = NWA_REACTIVE_WINDOW) {
  return seg.accidents.filter(a => years.includes(a.year) && (a.fatalities > 0 || a.serious_injuries > 0 || a.severity >= 3)).length;
}

/* ---- NWA-Proaktive ---- */
function computeProactive(seg, aadtThreshold15) {
  const t = NWA_TYPES[seg.nwaType];
  const paramDefs = t.motorway ? NWA_MW_PARAMS : NWA_PRI_PARAMS;
  const rfs = {};
  let product = 1;
  paramDefs.forEach(p => {
    const q = seg.nwaParams[p.key];
    const rf = rfFromQuality(q);
    rfs[p.key] = { label: p.label, quality: round1(q * 100), rf: round2(rf) };
    product *= rf;
  });
  let score = clamp(100 * product, 0, 100);
  let cls;
  if (score >= t.thr.low) cls = 'p1';
  else if (score >= t.thr.high) cls = 'p2';
  else cls = 'p3';
  let trafficFiltered = false;
  if (cls === 'p3' && seg.aadt <= aadtThreshold15) { cls = 'p2'; trafficFiltered = true; }
  return { score: Math.round(score), cls, rfs, paramDefs, trafficFiltered, thresholds: t.thr };
}

/* ---- NWA-Reaktive ---- */
function buildReactiveReference(segments) {
  const ref = {};
  Object.keys(NWA_TYPES).forEach(tp => {
    const pool = segments.filter(s => s.nwaType === tp);
    let totalK = 0, totalKmYr = 0, totalVehKmYr = 0;
    pool.forEach(s => {
      const k = injuryCrashes(s);
      totalK += k;
      totalKmYr += s.lengthKm * NWA_REACTIVE_YEARS;
      totalVehKmYr += s.aadt * s.lengthKm * NWA_REACTIVE_YEARS;
    });
    ref[tp] = {
      n: pool.length,
      meanDensity: totalKmYr ? totalK / totalKmYr : 0,
      meanRate: totalVehKmYr ? totalK / totalVehKmYr : 0,
      totalK, totalKmYr, totalVehKmYr,
    };
  });
  return ref;
}

function computeReactive(seg, ref) {
  const k = injuryCrashes(seg);
  const r = ref[seg.nwaType];
  if (!r || r.n < 3) {
    return { cls: 'nodata', k, crashDensity: 0, crashRate: 0, expected: 0, hasData: false };
  }
  const crashDensity = k / (seg.lengthKm * NWA_REACTIVE_YEARS);
  const crashRate = k / (seg.aadt * seg.lengthKm * NWA_REACTIVE_YEARS);
  const expectedK = r.meanDensity * seg.lengthKm * NWA_REACTIVE_YEARS;
  const bounds = poissonBounds(Math.max(0, Math.round(expectedK)));
  const useRate = seg.aadt > 0 && r.meanRate > 0;
  const metric = useRate ? crashRate : crashDensity;
  const refMetric = useRate ? r.meanRate : r.meanDensity;
  const refBounds = poissonBounds(Math.max(0, Math.round(refMetric * (useRate ? seg.aadt * seg.lengthKm * NWA_REACTIVE_YEARS : seg.lengthKm * NWA_REACTIVE_YEARS))));
  let cls;
  if (k > bounds.upper || metric > refMetric * 1.45) cls = 'r3';
  else if (k < bounds.lower && metric < refMetric * 0.65) cls = 'r1';
  else cls = 'r2';
  const pHigh = 1 - poissonCDF(k - 1, Math.max(expectedK, 0.01));
  return {
    cls, k, crashDensity: round3(crashDensity), crashRate: round5(crashRate),
    expected: round2(expectedK), bounds, refMetric: round5(refMetric),
    metricUsed: useRate ? 'crash_rate' : 'crash_density',
    pHigh: round2(pHigh), hasData: true,
  };
}

function round3(x) { return Math.round(x * 1000) / 1000; }
function round5(x) { return Math.round(x * 100000) / 100000; }

/* ---- NWA-Integruar ---- */
function integrateNwa(proactive, reactive) {
  const rKey = reactive.hasData ? reactive.cls : 'nodata';
  const integrated = NWA_INTEGRATE[proactive.cls][rKey];
  return { integrated, meta: NWA_CLASS_META[integrated] };
}

function aadtPercentile15(segments) {
  const out = {};
  Object.keys(NWA_TYPES).forEach(tp => {
    const vals = segments.filter(s => s.nwaType === tp).map(s => s.aadt).sort((a, b) => a - b);
    const idx = Math.floor(vals.length * 0.15);
    out[tp] = vals[Math.max(0, idx)] || 0;
  });
  return out;
}

function nwaScoreFromClass(c) { return [0, 15, 35, 55, 75, 95][c] || 0; }

/* ---- Ndërtimi i modelit NWA për të gjithë rrjetin ---- */
function buildNwaAssessment(segments) {
  segments.forEach(enrichNwaAttributes);
  const aadt15 = aadtPercentile15(segments);
  const ref = buildReactiveReference(segments);
  const results = segments.map(seg => {
    const proactive = computeProactive(seg, aadt15[seg.nwaType]);
    const reactive = computeReactive(seg, ref);
    const { integrated, meta } = integrateNwa(proactive, reactive);
    return {
      type: seg.nwaType,
      typeLabel: NWA_TYPES[seg.nwaType].label,
      aadt: seg.aadt,
      proactive, reactive, integrated, meta,
      score: nwaScoreFromClass(integrated),
      ref: ref[seg.nwaType],
    };
  });
  return { results, ref, aadt15, version: NWA_VERSION };
}

function nwaClassBadge(nwa) {
  const m = nwa.meta || NWA_CLASS_META[nwa.integrated];
  return `<span class="risk-pill" style="background:${m.color}12;border-color:${m.color}40;color:${m.color}"><span class="risk-pill-dot" style="background:${m.color}"></span>${m.label}</span>`;
}
function nwaClassCell(nwa) {
  const m = nwa.meta || NWA_CLASS_META[nwa.integrated];
  return `<span class="risk-pill risk-pill-sm" style="background:${m.color}12;border-color:${m.color}40;color:${m.color}"><span class="risk-pill-dot" style="background:${m.color}"></span><span>${m.label}</span><span class="risk-pill-num">${nwa.integrated}</span></span>`;
}
function nwaSubBadge(cls, kind) {
  const meta = kind === 'pro' ? NWA_PROACTIVE_META[cls] : NWA_REACTIVE_META[cls];
  if (!meta) return '';
  return `<span class="risk-chip ${meta.cls}" style="--chip:${meta.color}">${meta.label}</span>`;
}
function riskLegendHTML() {
  return [5, 4, 3, 2, 1].map(i => {
    const m = NWA_CLASS_META[i];
    return `<div class="lg-row"><span class="lg-dot" style="background:${m.color}"></span><span class="lg-label">${m.label}</span><span class="lg-num">${i}</span></div>`;
  }).join('');
}
function riskLevelColor(level) {
  return (NWA_CLASS_META[level] || NWA_CLASS_META[3]).color;
}

/* ---- Metodologjia: HTML i plotë NWA ---- */
function buildMethodologyHTML(D) {
  const ex = [...D.SEGS].sort((a, b) => b.nwa.integrated - a.nwa.integrated)[0];
  const n = ex.nwa;
  const rfList = Object.values(n.proactive.rfs);
  return `<div class="view-pad fade-in method" style="max-width:1020px">
    <div class="page-head"><h3>Metodologjia</h3><p>Kuadri teknik i vlerësimit të rrjetit (NWA · DG MOVE 2023). Të dhëna demo.</p></div>

    ${D.secHead('1 · Baza ligjore dhe qëllimi')}
    <div class="card card-pad">
      <p class="prose">NWA është metodologjia e rekomanduar nga BE për vlerësimin e sigurisë rrugore në shkallë rrjeti (Direktiva 2008/96/EC, e ndryshuar nga 2019/1936). Qëllimi: klasifikimi i segmenteve në klasa përparësie për inspektime të synuara dhe ndërhyrje.</p>
      <table class="tbl param-tbl mt-14"><thead><tr><th>Burimi</th><th>Përshkrimi</th></tr></thead><tbody>
        <tr><td><b>Manuali NWA</b></td><td>Network Wide Road Safety Assessment - Methodology and Implementation Handbook (DG MOVE, tetor 2023)</td></tr>
        <tr><td><b>Direktiva RISM</b></td><td>Road Infrastructure Safety Management - vlerësim në shkallë rrjeti, ripërsëritje çdo 5 vjet</td></tr>
        <tr><td><b>Demo I4A</b></td><td>${D.NAT.segments} segmente · ${D.fmt.n(D.NAT.totAcc)} aksidente fiktive · motori në <code>nwa.js</code></td></tr>
      </tbody></table>
      ${D.mWhy('Ky demo implementon logjikën NWA (reaktive + proaktive + integruar). Të dhënat janë sintetike deri në integrimin me regjistrat zyrtarë.')}
    </div>

    ${D.secHead('2 · Katër tipet e rrugës')}
    <div class="card card-pad">
      <table class="tbl param-tbl"><thead><tr><th>Tipi</th><th>Prag p1 (i ulët)</th><th>Prag p3 (i lartë)</th><th>Parametra</th></tr></thead><tbody>
        <tr><td>Autostradë rurale / urbane</td><td class="num">≥ 85%</td><td class="num">&lt; 65%</td><td class="num">6</td></tr>
        <tr><td>Primare me / pa ndarje</td><td class="num">≥ 80%</td><td class="num">&lt; 50%</td><td class="num">9</td></tr>
      </tbody></table>
    </div>

    ${D.secHead('3 · NWA-Proaktive')}
    <div class="card card-pad">
      ${D.mFormula(`Score(i) = 100 x RF1(i) x RF2(i) x ... x RFn(i)

Klasifikimi: p1 (i ulët) / p2 (i ndërmjetëm) / p3 (i lartë)
Filtri trafikut: p3 + AADT në 15% më të ulët → p2`)}
      ${D.mWhy('RF-të në demo gjenerohen nga atributet fiktive të segmentit. Me të dhëna reale: inspektime, GIS, iRAP/RRMSP.')}
    </div>

    ${D.secHead('4 · NWA-Reaktive (Poisson)')}
    <div class="card card-pad">
      ${D.mFormula(`Kufiri i poshtëm:  χ²(α/2, 2k) / 2
Kufiri i sipërm:   χ²(1-α/2, 2(k+1)) / 2
Periudha: ${NWA_REACTIVE_WINDOW.join(', ')} (${NWA_REACTIVE_YEARS} vite)
Klasifikimi: r1 / r2 / r3 / nodata`)}
    </div>

    ${D.secHead('5 · NWA-Integruar (5 klasa)')}
    <div class="card card-pad">
      <table class="tbl param-tbl mt-14"><thead><tr><th>Proaktive \\ Reaktive</th><th>r3</th><th>r2</th><th>Pa të dhëna</th><th>r1</th></tr></thead><tbody>
        <tr><td><b>p3</b></td><td class="num">5</td><td class="num">4</td><td class="num">4</td><td class="num">2</td></tr>
        <tr><td><b>p2</b></td><td class="num">5</td><td class="num">3</td><td class="num">3</td><td class="num">2</td></tr>
        <tr><td><b>p1</b></td><td class="num">5</td><td class="num">2</td><td class="num">1</td><td class="num">1</td></tr>
      </tbody></table>
      <table class="tbl param-tbl mt-14"><thead><tr><th>Niveli</th><th>Emërtimi (risku)</th><th>Ngjyra</th></tr></thead><tbody>
        <tr><td class="num">5</td><td>Risk shumë i lartë</td><td>E kuqe</td></tr>
        <tr><td class="num">4</td><td>Risk i lartë</td><td>Portokalli</td></tr>
        <tr><td class="num">3</td><td>Risk mesatar</td><td>E verdhë</td></tr>
        <tr><td class="num">2</td><td>Risk i ulët</td><td>Jeshile e çelët</td></tr>
        <tr><td class="num">1</td><td>Risk shumë i ulët</td><td>Jeshile e errët</td></tr>
      </tbody></table>
    </div>

    ${D.secHead('6 · Detektimi i pikave të zeza')}
    <div class="card card-pad">
      <p class="prose">Pas llogaritjes së klasës së integruar (matrica Fig. 4.1), platforma aplikon kriteret e mëposhtme - <b>jo</b> një “Risk Score” të ponderuar:</p>
      <ol class="m-list numbered">${NWA_BLACK_SPOT_RULES.blackSpot.map(x => `<li>${x}</li>`).join('')}</ol>
      <p class="prose mt-12"><b>Në zhvillim:</b> ${NWA_BLACK_SPOT_RULES.emerging}. <b>Për monitorim:</b> ${NWA_BLACK_SPOT_RULES.monitor}.</p>
      ${buildNwaMatrixSnippet()}
      ${D.mWhy('Kriteret pasqyrojnë prioritetin e inspektimeve sipas manualit NWA: kombinimi i rrezikut të vërtetuar (reaktive) dhe të parashikuar (proaktive).')}
    </div>

    ${D.secHead('7 · Shembull llogaritjeje')}
    <div class="card card-pad">
      <p class="prose">Segmenti me klasën më të lartë: <b>${D.escapeHtml(D.shortRoad(ex))}</b> · ${ex.id}</p>
      <table class="tbl param-tbl mt-14"><tbody>
        <tr><td>Tipi NWA</td><td>${n.typeLabel}</td></tr>
        <tr><td>Proaktive</td><td>${n.proactive.score}% → ${NWA_PROACTIVE_META[n.proactive.cls].label}</td></tr>
        <tr><td>Reaktive</td><td>k=${n.reactive.k} → ${NWA_REACTIVE_META[n.reactive.cls].label}</td></tr>
        <tr><td><b>Klasa integruar</b></td><td><b>${n.integrated} · ${n.meta.label}</b></td></tr>
      </tbody></table>
      ${D.mFormula(`Score = 100 x ${rfList.map(r => r.rf).join(' x ')} = ${n.proactive.score}%`)}
    </div>

    ${D.secHead('8 · Burime zyrtare')}
    <div class="card card-pad">
      <ul class="m-list">
        <li><a href="https://road-safety.transport.ec.europa.eu/system/files/2023-11/NWA-Handbook8.pdf" target="_blank" rel="noopener">Manuali NWA (PDF, DG MOVE, 2023)</a></li>
        <li><a href="https://road-safety.transport.ec.europa.eu/workshop-network-wide-road-safety-assessment-methodology-2023-01-16_en" target="_blank" rel="noopener">Workshop zyrtar NWA (16 janar 2023)</a></li>
        <li><a href="https://www.nrso.ntua.gr/european-commission-eu-methodology-for-network-wide-road-safety-assessment-2023/" target="_blank" rel="noopener">NTUA - Përmbledhje metodologjike</a></li>
      </ul>
      ${D.mWhy('Implementimi: <code>js/nwa.js</code> + <code>js/engine.js</code>. RF-të demo janë sintetike.')}
    </div>

    ${D.secHead('9 · Kufizimet e demos')}
    <div class="card card-pad">
      <ul class="m-list">
        <li>Të dhënat e aksidenteve dhe infrastrukturës janë <b>fiktive</b>.</li>
        <li>RF-të approximohen nga profile segmenti, jo nga inspektime / mjeti Excel zyrtar.</li>
        <li>Segmentimi nuk ndjek plotësisht manualin (gjatësitë maksimale 4.2 / 5.1).</li>
        <li>Trendi i aksidenteve në profile është vetëm për kontekst historik, jashtë klasifikimit NWA.</li>
      </ul>
    </div>
  </div>`;
}
