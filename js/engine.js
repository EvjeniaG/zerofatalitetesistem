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

/* Shkaqe nga historiku i aksidenteve - çdo shkak veç e veç */
function tallyField(acc, field) {
  const t = {};
  acc.forEach(a => {
    const v = a[field];
    if (v) t[v] = (t[v] || 0) + 1;
  });
  return t;
}
function topEntry(tally) {
  return Object.entries(tally).sort((a, b) => b[1] - a[1])[0] || null;
}
function rootCauses(seg) {
  const acc = seg.accidents;
  const n = acc.length;
  if (!n) return [];
  const tally = {};
  CAUSES.forEach(c => { tally[c.key] = 0; });
  acc.forEach(a => { tally[a.dominantCause] += 1; });
  const out = CAUSES
    .map(c => ({ ...c, count: tally[c.key], share: tally[c.key] / n }))
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count);
  const tot = out.reduce((s, c) => s + c.count, 0) || 1;
  out.forEach(c => { c.contribution = Math.round(c.count / tot * 100); });
  return out;
}

const PARAM_CAUSE_LINK = {
  curvature: ['curve'],
  pedConflict: ['pedestrian'],
  junctions: ['junction'],
  interchanges: ['junction'],
  propertyAccess: ['junction', 'traffic'],
  signsSignals: ['lighting', 'junction'],
  trafficOps: ['lighting', 'traffic'],
  roadside: ['curve', 'surface'],
  shoulder: ['surface'],
  laneWidth: ['traffic', 'speed'],
  passingLanes: ['traffic'],
};

function accidentEvidence(seg) {
  const acc = seg.accidents;
  const n = acc.length || 1;
  const byCause = {};
  CAUSES.forEach(c => { byCause[c.key] = acc.filter(a => a.dominantCause === c.key); });
  const night = acc.filter(a => (a.lighting || '').includes('Natë'));
  const noLight = acc.filter(a => a.lighting === 'Natë pa ndriçim');
  const overSpeed = acc.filter(a => a.estimated_speed > a.speed_limit * 1.08);
  const wet = acc.filter(a => ['I lagësht', 'Akull/Borë', 'Me baltë/zhavorr'].includes(a.road_condition));
  const ped = acc.filter(a => a.pedestrians > 0 || (a.collision_type || '').includes('këmbësor'));
  const fatal = acc.filter(a => a.fatalities > 0);
  const avgSpeed = Math.round(acc.reduce((s, a) => s + a.estimated_speed, 0) / n);
  const avgResp = Math.round(acc.reduce((s, a) => s + a.response_time, 0) / n);
  return {
    n, night, noLight, overSpeed, wet, ped, fatal,
    nightPct: Math.round(night.length / n * 100),
    noLightPct: Math.round(noLight.length / n * 100),
    overSpeedPct: Math.round(overSpeed.length / n * 100),
    wetPct: Math.round(wet.length / n * 100),
    pedPct: Math.round(ped.length / n * 100),
    avgSpeed, avgResp, byCause,
  };
}

function weakParamsForCause(seg, causeKey) {
  const rfs = seg.nwa?.proactive?.rfs || {};
  return Object.entries(PARAM_CAUSE_LINK)
    .filter(([pk, keys]) => keys.includes(causeKey) && rfs[pk] && rfs[pk].quality < 72)
    .map(([pk]) => rfs[pk])
    .sort((a, b) => a.quality - b.quality);
}

const CAUSE_SHORT = {
  speed: 'Shpejtësi',
  pedestrian: 'Këmbësorë',
  lighting: 'Errësirë',
  curve: 'Kthesa',
  junction: 'Kryqëzim',
  surface: 'Rrugë',
  traffic: 'Trafik',
  response: 'Ambulanca',
};

const SKIP_TAGS = new Set(['Pa problem infrastrukture', 'Pa gabim të drejtuesit', 'Pa faktor automjeti']);

function humanizeTag(text) {
  if (!text || SKIP_TAGS.has(text)) return '';
  const map = {
    'Shpejtësi e tepërt': 'Tejkalim shpejtësisë',
    'Tejkalim shpejtësie': 'Tejkalim shpejtësisë',
    'Mosrespektim përparësie': 'Nuk dha përparësi',
    'Nuk dha përparësi': 'Nuk dha përparësi',
    'Nyje e pakontrolluar': 'Kryqëzim pa kontroll',
    'Kryqëzim i pasigurt': 'Kryqëzim pa kontroll',
    'Ndriçim i munguar': 'Pa dritë publike',
    'Pa dritë publike': 'Pa dritë publike',
    'Natë pa ndriçim': 'Natë pa dritë',
    'Sipërfaqe e dëmtuar': 'Rrugë e dëmtuar',
    'Rrugë e dëmtuar': 'Rrugë e dëmtuar',
    'Mungesë trotuari/kalimi': 'Mungon kalim këmbësorësh',
    'Mungon trotuar/kalim': 'Mungon kalim këmbësorësh',
  };
  return map[text] || text;
}

function pushTag(tags, text) {
  const t = humanizeTag(text);
  if (t && !tags.includes(t)) tags.push(t);
}

function causeExamples(acc, limit = 1) {
  return [...acc].sort((a, b) => b.date - a.date).slice(0, limit).map(a => ({
    date: fmt.dateShort(a.date),
    collision: a.collision_type,
  }));
}

function causeSummary(seg, cause, acc) {
  const tags = [];
  const coll = topEntry(tallyField(acc, 'collision_type'));
  const driver = topEntry(tallyField(acc, 'driver_factor'));
  const infra = topEntry(tallyField(acc, 'infrastructure_factor'));
  const light = topEntry(tallyField(acc, 'lighting'));

  if (cause.key === 'speed') {
    if (driver) pushTag(tags, driver[0]);
    const over = acc.filter(a => a.estimated_speed > a.speed_limit * 1.08).length;
    if (over) pushTag(tags, `Mbi ${seg.speedLimit} km/h`);
  } else if (cause.key === 'pedestrian') {
    if (coll) pushTag(tags, coll[0]);
  } else if (cause.key === 'lighting') {
    const dark = acc.filter(a => a.lighting === 'Natë pa ndriçim').length;
    if (dark) pushTag(tags, `${dark} natë pa dritë`);
    else if (light) pushTag(tags, light[0]);
  } else if (cause.key === 'curve' || cause.key === 'junction') {
    if (coll) pushTag(tags, coll[0]);
    if (cause.key === 'junction' && driver) pushTag(tags, driver[0]);
  } else if (cause.key === 'surface') {
    const wet = acc.filter(a => ['I lagësht', 'Akull/Borë', 'Me baltë/zhavorr'].includes(a.road_condition)).length;
    if (wet) pushTag(tags, `${wet} me lagësht/akull`);
    else if (infra) pushTag(tags, infra[0]);
  } else if (cause.key === 'traffic') {
    const vol = seg.aadt >= 1000 ? `~${Math.round(seg.aadt / 1000)} mijë makina/ditë` : `${fmt.n(seg.aadt)} makina/ditë`;
    pushTag(tags, vol);
  } else if (cause.key === 'response') {
    const avg = Math.round(acc.reduce((s, a) => s + a.response_time, 0) / acc.length);
    pushTag(tags, `Ambulanca ~${avg} min`);
  }

  if (coll && tags.length < 3) pushTag(tags, coll[0]);

  const ex = causeExamples(acc, 1)[0];
  const example = ex ? `Shembull: ${ex.date} · ${ex.collision}` : '';
  const clean = tags.filter((t, i, a) => t !== cause.label && a.indexOf(t) === i);
  const summary = clean.slice(0, 3).join(' · ') || cause.label;
  return { summary, tags: clean.slice(0, 3), example };
}

function enrichCauseDetails(seg, causes) {
  return causes.map(c => {
    const causeAcc = seg.accidents.filter(a => a.dominantCause === c.key);
    const fatalCount = causeAcc.filter(a => a.fatalities > 0).length;
    const { summary, tags, example } = causeSummary(seg, c, causeAcc);
    return { ...c, fatalCount, shortLabel: c.short || CAUSE_SHORT[c.key] || c.label, summary, tags, example };
  });
}

function segmentRiskNarrative(seg) {
  if (!seg.m.n) return 'Pa aksidente të regjistruara.';
  const top = seg.causes.slice(0, 3).map(c => `${c.shortLabel} (${c.count})`).join(', ');
  const rest = seg.causes.length > 3 ? ` dhe ${seg.causes.length - 3} të tjera` : '';
  return `${seg.m.n} aksidente - kryesorisht: ${top}${rest}`;
}

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
    const trend = trendClass(m);
    const nwa = nwaModel.results[i];
    const causes = enrichCauseDetails({ ...seg, m, nwa }, rootCauses(seg));
    const evidence = accidentEvidence({ ...seg, m, nwa });
    const weakParams = {};
    causes.forEach(c => { weakParams[c.key] = weakParamsForCause({ ...seg, nwa }, c.key); });
    return { ...seg, m, causes, trend, nwa, evidence, weakParams };
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
  const injByYear = YEARS.map(y => ACCIDENTS.filter(a => a.year === y).reduce((s, a) => s + a.injured, 0));
  const victimMix = {};
  ACCIDENTS.forEach(a => { victimMix[a.victim_type] = (victimMix[a.victim_type] || 0) + 1; });
  const weekdayMix = {};
  ACCIDENTS.forEach(a => { weekdayMix[a.weekday] = (weekdayMix[a.weekday] || 0) + 1; });
  const alcoholPct = round1(ACCIDENTS.filter(a => a.alcohol_involved).length / totAcc * 100);
  const totInjured = ACCIDENTS.reduce((s, a) => s + a.injured, 0);
  const nwaWindow = ACCIDENTS.filter(a => a.countsForNwa).length;
  return {
    totAcc,
    totFatal,
    totSerious,
    totMinor,
    totInjured,
    highRisk,
    avgClass,
    avgRisk: avgClass,
    avgResp,
    fatRate,
    alcoholPct,
    nwaWindow,
    blackSpots: BLACKSPOTS.length,
    emerging: EMERGING.length,
    monitor: MONITOR.length,
    accByYear,
    fatByYear,
    injByYear,
    victimMix,
    weekdayMix,
    segments: SEGS.length,
    networkKm: NETWORK_INVENTORY.totalKm,
  };
}
const NAT = nationalStats();
