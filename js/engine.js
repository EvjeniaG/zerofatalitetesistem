/* =============================================================
   engine.js - Motor analitik NWA.
   Vlerësim NWA (proaktive + reaktive + integruar) dhe
   detektimi i pikave të zeza sipas klasës së integruar.
   ============================================================= */

const CALIB = {
  prFatMult: 4,
  prFatCap: 6,
  bsRadiusBase: 180,
  bsRadiusPerAcc: 22,
  bsRadiusMax: 650,
};

function linSlope(ys) {
  const n = ys.length;
  if (n < 2) return 0;
  const xm = (n - 1) / 2;
  const ym = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xm) * (ys[i] - ym);
    den += (i - xm) ** 2;
  }
  return den ? num / den : 0;
}

/* Statistika bazë të aksidenteve - pa Risk Score të vjetër */
function computeSegmentStats(seg) {
  const acc = seg.accidents;
  const n = acc.length;
  const fatalities = acc.reduce((s, a) => s + a.fatalities, 0);
  const serious = acc.reduce((s, a) => s + a.serious_injuries, 0);
  const minor = acc.reduce((s, a) => s + a.minor_injuries, 0);
  const fatalCrashes = acc.filter(a => a.severity === 4).length;
  const byYear = YEARS.map(y => acc.filter(a => a.year === y).length);
  const fatByYear = YEARS.map(y => acc.filter(a => a.year === y).reduce((s, a) => s + a.fatalities, 0));
  const len = seg.lengthKm || 1;
  const accPerKmYr = n / len / YEARS.length;
  const slope = linSlope(byYear);

  return {
    n,
    fatalities,
    serious,
    minor,
    fatalCrashes,
    byYear,
    fatByYear,
    accPerKmYr: round1(accPerKmYr),
    slope,
  };
}

/* Shkaqe rrënjësore - vetëm për rekomandime ndërhyrjeje (jo për klasifikim NWA) */
function rootCauses(seg) {
  const acc = seg.accidents;
  const n = acc.length || 1;
  const tally = {};
  CAUSES.forEach(c => { tally[c.key] = 0; });
  acc.forEach(a => { tally[a.dominantCause] += 1; });
  const out = CAUSES.map(c => {
    const obs = tally[c.key] / n;
    const prof = seg.causeWeights[c.key];
    const score = obs * 0.7 + (prof / 2.2) * 0.3;
    return { ...c, count: tally[c.key], share: obs, score };
  }).sort((a, b) => b.score - a.score);
  const tot = out.reduce((s, c) => s + c.score, 0) || 1;
  out.forEach(c => { c.contribution = Math.round(c.score / tot * 100); });
  return out;
}

const CAUSE_EXPLAIN = {
  speed: 'Shpejtësia mesatare e vlerësuar tejkalon ndjeshëm limitin, duke rritur energjinë e përplasjes dhe distancën e frenimit.',
  pedestrian: 'Përqendrim i lartë i goditjeve të këmbësorëve tregon konflikt këmbësorë-automjete dhe mungesë kalimesh të sigurta.',
  lighting: 'Pjesë e madhe e aksidenteve ndodhin natën pa ndriçim, çka ul dukshmërinë dhe kohën e reagimit.',
  curve: 'Gjeometria e segmentit (kthesa/dalje nga rruga) gjeneron humbje kontrolli dhe përmbysje.',
  junction: 'Nyjet e pakontrolluara prodhojnë konflikte përparësie dhe përplasje anësore.',
  surface: 'Gjendja e sipërfaqes (e lagësht/baltë/akull) ul fërkimin dhe rrit distancën e ndalimit.',
  traffic: 'Volumi i lartë i trafikut rrit ekspozimin dhe përplasjet nga prapa / zinxhir.',
  response: 'Koha e zgjatur e reagimit të emergjencës rrit ashpërsinë e pasojave të aksidenteve.',
};

function trendClass(m) {
  if (m.slope > 0.45) return { key: 'det', label: 'Në përkeqësim', cls: 'det' };
  if (m.slope < -0.45) return { key: 'imp', label: 'Në përmirësim', cls: 'imp' };
  return { key: 'sta', label: 'Stabël', cls: 'sta' };
}

/* =============================================================
   Build the analytical model over all segments.
   ============================================================= */
function buildModel() {
  const nwaModel = buildNwaAssessment(SEGMENTS);
  const segs = SEGMENTS.map((seg, i) => {
    const m = computeSegmentStats(seg);
    const causes = rootCauses(seg);
    const trend = trendClass(m);
    const nwa = nwaModel.results[i];
    return { ...seg, m, causes, trend, nwa };
  });

  segs.forEach(s => {
    s.priority = Math.round(clamp(
      s.nwa.integrated * 18 + Math.min(s.m.fatalities, CALIB.prFatCap) * CALIB.prFatMult
      + (s.nwa.reactive.cls === 'r3' ? 8 : 0),
      0, 100,
    ));
  });

  /* Detektimi i pikave të zeza - vetëm NWA */
  segs.forEach(s => {
    s.isBlackSpot = s.nwa.integrated >= 4
      || (s.nwa.reactive.cls === 'r3' && s.nwa.proactive.cls === 'p3');
  });
  /* Në zhvillim / vëzhgim - pas matricës së integrimit */
  segs.forEach(s => {
    s.isEmerging = !s.isBlackSpot && s.nwa.integrated === 3;
  });
  segs.forEach(s => {
    s.isMonitor = !s.isBlackSpot && !s.isEmerging
      && s.nwa.integrated === 2
      && (s.nwa.reactive.cls === 'r2' || s.nwa.proactive.cls === 'p2');
  });

  const blackSpots = segs.filter(s => s.isBlackSpot)
    .sort((a, b) => b.priority - a.priority)
    .map((s, i) => {
      const radius = Math.round(clamp(CALIB.bsRadiusBase + s.m.n * CALIB.bsRadiusPerAcc, CALIB.bsRadiusBase, CALIB.bsRadiusMax));
      return {
        id: 'BS-' + String(i + 1).padStart(3, '0'),
        name: bsName(s),
        seg: s,
        lat: s.lat,
        lng: s.lng,
        radius,
        areaHa: round1(Math.PI * radius * radius / 10000),
        nwaClass: s.nwa.integrated,
        priorityScore: s.priority,
        trend: s.trend,
        reasons: blackSpotReasons(s),
        municipality: s.municipality,
        qark: s.qark,
        rank: i + 1,
      };
    });

  const emerging = segs.filter(s => s.isEmerging)
    .sort((a, b) => b.priority - a.priority)
    .map((s, i) => ({ id: 'EM-' + String(i + 1).padStart(3, '0'), seg: s, rank: i + 1 }));

  const monitor = segs.filter(s => s.isMonitor)
    .sort((a, b) => b.priority - a.priority)
    .map((s, i) => ({ id: 'MO-' + String(i + 1).padStart(3, '0'), seg: s, rank: i + 1 }));

  return { segs, blackSpots, emerging, monitor };
}

function bsName(s) {
  const km = Math.round((s.kmFrom + s.kmTo) / 2);
  return `${s.road} · km ${km} (${s.municipality})`;
}

const MODEL = buildModel();
const SEGS = MODEL.segs;
const BLACKSPOTS = MODEL.blackSpots;
const EMERGING = MODEL.emerging;
const MONITOR = MODEL.monitor;

/* =============================================================
   National aggregates
   ============================================================= */
function nationalStats() {
  const totAcc = ACCIDENTS.length;
  const totFatal = ACCIDENTS.reduce((s, a) => s + a.fatalities, 0);
  const totSerious = ACCIDENTS.reduce((s, a) => s + a.serious_injuries, 0);
  const totMinor = ACCIDENTS.reduce((s, a) => s + a.minor_injuries, 0);
  const highRisk = SEGS.filter(s => s.nwa.integrated >= 4).length;
  const avgClass = Math.round(SEGS.reduce((s, x) => s + x.nwa.integrated, 0) / SEGS.length * 20) / 20;
  const avgResp = Math.round(ACCIDENTS.reduce((s, a) => s + a.response_time, 0) / totAcc);
  const fatRate = round1(totFatal / totAcc * 100);
  const accByYear = YEARS.map(y => ACCIDENTS.filter(a => a.year === y).length);
  const fatByYear = YEARS.map(y => ACCIDENTS.filter(a => a.year === y).reduce((s, a) => s + a.fatalities, 0));
  return {
    totAcc,
    totFatal,
    totSerious,
    totMinor,
    highRisk,
    avgClass,
    avgRisk: avgClass,
    avgResp,
    fatRate,
    blackSpots: BLACKSPOTS.length,
    emerging: EMERGING.length,
    monitor: MONITOR.length,
    accByYear,
    fatByYear,
    segments: SEGS.length,
  };
}
const NAT = nationalStats();
