/* =============================================================
   official.js - Të dhëna zyrtare kombëtare
   Burimi: INSTAT & Strategjia e Sigurisë Rrugore
   Drejtoria e Përgjithshme e Policisë & Ministria e Brendshme
   ============================================================= */

const OFFICIAL = {
  source:'INSTAT & Strategjia e Sigurisë Rrugore - Drejtoria e Përgjithshme e Policisë & Ministria e Brendshme',
  period:'2014-2025',
  yearly:[
    {year:2014,fatalities:264,injured:2617,accidents:1914,fatalityRate:13.8},
    {year:2015,fatalities:270,injured:2692,accidents:1992,fatalityRate:13.6},
    {year:2016,fatalities:269,injured:2778,accidents:2032,fatalityRate:13.2},
    {year:2017,fatalities:222,injured:2611,accidents:1978,fatalityRate:11.2},
    {year:2018,fatalities:213,injured:2291,accidents:1718,fatalityRate:12.4},
    {year:2019,fatalities:227,injured:2044,accidents:1498,fatalityRate:15.2},
    {year:2020,fatalities:181,injured:1598,accidents:1234,fatalityRate:14.7},
    {year:2021,fatalities:197,injured:1860,accidents:1376,fatalityRate:14.3},
    {year:2022,fatalities:164,injured:1599,accidents:1165,fatalityRate:14.1},
    {year:2023,fatalities:192,injured:1731,accidents:1285,fatalityRate:14.9},
    {year:2024,fatalities:175,injured:2255,accidents:1666,fatalityRate:10.5},
    {year:2025,fatalities:200,injured:1913,accidents:1375,fatalityRate:14.5},
  ],
  totals:{fatalities:2574,injured:25989,accidents:19233},
  yoy:[
    {year:2015,fatalities:2.3,injured:2.9,accidents:4.1},
    {year:2016,fatalities:-0.4,injured:3.2,accidents:2.0},
    {year:2017,fatalities:-17.5,injured:-6.0,accidents:-2.7},
    {year:2018,fatalities:-4.1,injured:-12.3,accidents:-13.1},
    {year:2019,fatalities:6.6,injured:-10.8,accidents:-12.8},
    {year:2020,fatalities:-20.3,injured:-21.8,accidents:-17.6},
    {year:2021,fatalities:8.8,injured:16.4,accidents:11.5},
    {year:2022,fatalities:-16.8,injured:-14.0,accidents:-15.3},
    {year:2023,fatalities:17.1,injured:8.3,accidents:10.3},
    {year:2024,fatalities:-8.9,injured:30.3,accidents:29.6},
    {year:2025,fatalities:14.3,injured:-15.2,accidents:-17.5},
  ],
  causes:[
    {label:'Shpejtësia',pct:30},
    {label:'Të kaluarit e rrugës pa kujdes',pct:26},
    {label:'Ndryshim i papritur i drejtimit',pct:9},
    {label:'Alkooli',pct:6},
    {label:'Mosrespektimi i këmbësorëve',pct:6},
    {label:'Qasje e pakujdesshme',pct:6},
    {label:'Parakalim',pct:5},
    {label:'Sinjalistika',pct:5},
    {label:'Mosdhënia e përparësisë',pct:4},
    {label:'Pozicionim jo i rregullt',pct:2},
    {label:'Të tjera',pct:1},
  ],
  alcoholByYear:[
    {year:2014,pct:6.4},{year:2015,pct:4.9},{year:2016,pct:6.1},{year:2017,pct:4.6},
    {year:2018,pct:4.6},{year:2019,pct:3.8},{year:2020,pct:4.8},{year:2021,pct:3.3},
    {year:2022,pct:4.4},{year:2023,pct:2.7},{year:2024,pct:3.7},{year:2025,pct:2.2},
  ],
  victims:[
    {label:'Këmbësor',pct:34},{label:'Drejtues i mjetit',pct:24},{label:'Pasagjer',pct:20},
    {label:'Motoçiklist',pct:13},{label:'Çiklist',pct:8},{label:'Të tjerë',pct:1},
  ],
  fatalitiesByWeekday:[
    {label:'E premte',val:396},{label:'E enjte',val:379},{label:'E martë',val:378},
    {label:'E dielë',val:370},{label:'E hënë',val:367},{label:'E shtunë',val:348},{label:'E mërkurë',val:336},
  ],
  accidentsByQark:{
    2021:{Tiranë:368,Durrës:75,Elbasan:48,Fier:96,Vlorë:87,Shkodër:86,Korçë:110,Kukës:28,Lezhë:138,Berat:20,Dibër:23,Gjirokastër:51},
    2022:{Tiranë:312,Durrës:64,Elbasan:41,Fier:82,Vlorë:74,Shkodër:73,Korçë:93,Kukës:24,Lezhë:117,Berat:17,Dibër:19,Gjirokastër:43},
    2023:{Tiranë:344,Durrës:70,Elbasan:45,Fier:90,Vlorë:82,Shkodër:81,Korçë:103,Kukës:26,Lezhë:129,Berat:19,Dibër:22,Gjirokastër:48},
    2024:{Tiranë:552,Durrës:172,Elbasan:83,Fier:139,Vlorë:155,Shkodër:124,Korçë:60,Kukës:55,Lezhë:173,Berat:30,Dibër:39,Gjirokastër:84},
    2025:{Tiranë:447,Durrës:91,Elbasan:58,Fier:117,Vlorë:106,Shkodër:105,Korçë:134,Kukës:34,Lezhë:169,Berat:24,Dibër:28,Gjirokastër:62},
  },
  observations:[
    '2015-2016: rritje e vogël e aksidenteve.',
    '2017: ulje e fortë e fataliteteve (-17,5%), rënie e vogël e aksidenteve.',
    '2018-2019: rënie e aksidenteve; në 2019 fatalitetet u rritën (+6,6%).',
    '2020: rënie drastike në të gjithë treguesit (COVID-19).',
    '2021: rikthim i fortë pas pandemisë.',
    '2022: përmirësim i përkohshëm - ulje e të gjithë indikatorëve.',
    '2023: rritje e aksidenteve (+10,3%) dhe fataliteteve (+17,1%).',
    '2024: aksidentet +29,6%; fatalitetet -8,9%.',
    '2025: më pak aksidente (-17,5%), por më shumë fatalitete (+14,3%) - aksidente më të rënda.',
  ],
};

/* Periudhat e të dhënave - shfaqen kudo në platformë */
const DATA_PERIODS = {
  official: { label:'2014-2025', desc:'Të dhëna zyrtare kombëtare (INSTAT & Policia)' },
  model:    { label:'2021-2025', desc:'Regjistri territorial kalibruar sipas INSTAT (aksidente, fatalitete & të lënduar për vit)' },
  nwa:      { label:'2023-2025', desc:'Dritare reaktive NWA për vlerësimin e riskut' },
};

function offLatest(){ return OFFICIAL.yearly[OFFICIAL.yearly.length-1]; }
function offPrev(){ return OFFICIAL.yearly[OFFICIAL.yearly.length-2]; }
function offYears(){ return OFFICIAL.yearly.map(y=>y.year); }
function offSeries(field){ return OFFICIAL.yearly.map(y=>y[field]); }
function offYoY(field, year){
  const row=OFFICIAL.yoy.find(y=>y.year===year);
  return row? row[field] : null;
}

/* Mapim shkaktarësh model → taksonomia zyrtare INSTAT */
const OFFICIAL_CAUSE_MAP={
  speed:'Shpejtësia',
  pedestrian:'Mosrespektimi i këmbësorëve',
  lighting:'Sinjalistika',
  curve:'Ndryshim i papritur i drejtimit',
  junction:'Mosdhënia e përparësisë',
  surface:'Qasje e pakujdesshme',
  traffic:'Parakalim',
  response:'Të tjera',
};
function offQarkTargets(year){
  return OFFICIAL.accidentsByQark[year]||null;
}
