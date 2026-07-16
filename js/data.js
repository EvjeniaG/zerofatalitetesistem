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
  driver:['Tejkalim shpejtësie','Nuk dha përparësi','Manovër e gabuar','Lodhje','Alkool ose drogë','Telefon gjatë vozitjes','Distancë shumë e shkurtër','Pa gabim të drejtuesit'],
  infra:['Pa dritë publike','Shenja të dëmtuara','Kthesë e rrezikshme','Kryqëzim i pasigurt','Rrugë e dëmtuar','Mungon trotuar/kalim','Pa problem infrastrukture'],
  vehicle:['Defekt frenash','Goma të konsumuara','Drita jofunksionale','Mbingarkesë','Pa faktor automjeti'],
};
// Root-cause taxonomy used by segment profiles & root-cause engine
const CAUSES = [
  {key:'speed',     label:'Tejkalim shpejtësie',         short:'Shpejtësi',  desc:'Shoferi ka vozitur më shpejt se lejohet — humb kontrollin ose përplaset më fort.', ico:'speed'},
  {key:'pedestrian',label:'Rrezik për këmbësorë',        short:'Këmbësorë',  desc:'Këmbësorët goditen ose janë në rrezik — mungon kalim i sigurt ose vozitet shumë shpejt.', ico:'walk'},
  {key:'lighting',  label:'Rrugë e errët',               short:'Errësirë',   desc:'Aksidenti ndodhi natën ose në muzg — rruga nuk ka dritë të mjaftueshme.', ico:'sun'},
  {key:'curve',     label:'Kthesa e rrezikshme',         short:'Kthesa',     desc:'Makina del nga rruga ose përmbyset në një kthesë të mprehtë.', ico:'road'},
  {key:'junction',  label:'Kryqëzim i pasigurt',         short:'Kryqëzim',   desc:'Përplasje në kryqëzim ku mungon semafori, rrethrrotullimi ose rregulla të qarta të përparësisë.', ico:'pin'},
  {key:'surface',   label:'Rrugë e keqe',                short:'Rrugë',      desc:'Rruga ishte e lagësht, me akull, gropa ose asfalt i dëmtuar — makina rrëshqet lehtë.', ico:'drop'},
  {key:'traffic',   label:'Shumë trafik',                short:'Trafik',     desc:'Shumë makina në të njëjtën rrugë — përplasje nga prapa, zinxhir ose manovra të vështira.', ico:'car'},
  {key:'response',  label:'Ndihma vonon',                short:'Ambulanca',  desc:'Ambulanca ose policia vonojnë të mbërrijnë — pasojat e aksidentit bëhen më të rënda.', ico:'clock'},
];

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
  for(const cor of CORRIDORS){
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
      const trend=clamp(gauss(0.05+danger*0.25-0.2,0.5),-1,1);
      const exposure = (muni.w/12) * (isUrban?1.35:1) * (cor.type==='Autostradë'?1.2:1);
      segCounter++;
      segments.push({
        id:'SEG-'+String(segCounter).padStart(4,'0'),
        corridor:cor.name, road:cor.name.split('(')[0].trim(),
        roadType:cor.type, lat, lng, lengthKm:round1(segLen),
        kmFrom:round1(i*segLen), kmTo:round1((i+1)*segLen),
        municipality:muni.name, qark:muni.qark, speedLimit:cor.limit,
        urban:isUrban, danger, trend, exposure, causeWeights,
        accidents:[]
      });
    }
  }

  /* ---- generate accidents per segment ---- */
  const accidents=[]; let aid=0;
  for(const s of segments){
    // expected accidents over the 5y window
    let lambda = s.danger*6.6*s.exposure + 0.6;
    let count = Math.max(0, Math.round(gauss(lambda, lambda*0.35)));
    count = Math.min(count, 28);
    // distribute per year using trend (growth toward recent years if deteriorating)
    const yearShare=YEARS.map((y,idx)=>{
      const t=idx/(YEARS.length-1); // 0..1
      return Math.max(0.05, 1 + s.trend*(t-0.5)*1.8 + gauss(0,0.12));
    });
    const ysum=yearShare.reduce((a,b)=>a+b,0);
    const perYear=yearShare.map(v=>v/ysum*count);
    const causeArr=CAUSES.map(c=>[c.key,s.causeWeights[c.key]]);
    YEARS.forEach((yr,yi)=>{
      let yc=Math.round(perYear[yi]);
      for(let k=0;k<yc;k++){
        aid++;
        const dominant=weighted(causeArr);
        // position jitter along/near segment
        const jLat=s.lat+gauss(0,0.0045), jLng=s.lng+gauss(0,0.0055/Math.cos(s.lat*Math.PI/180));
        // date
        const month=rint(0,11), day=rint(1,28), hour=lightingHour(dominant,s);
        const date=new Date(yr,month,day,hour,rint(0,59));
        // lighting from hour
        let lighting;
        if(hour>=7&&hour<18) lighting='Dritë dite';
        else if(hour>=18&&hour<20||hour>=5&&hour<7) lighting='Muzg';
        else lighting = (dominant==='lighting'||s.urban===false&&rnd()<0.55)?'Natë pa ndriçim':'Natë me ndriçim';
        // weather/surface
        const weather=weighted([['Kthjellët',55],['Me re',18],['Shi',(dominant==='surface'?22:12)],['Mjegull',5],['Erë e fortë',4],['Akull/Borë',(s.qark==='Kukës'||s.qark==='Dibër'?6:2)]]);
        const surface=weather==='Shi'?'I lagësht':weather==='Akull/Borë'?'Akull/Borë':weighted([['I thatë',70],['I lagësht',16],['Me baltë/zhavorr',9],['Akull/Borë',5]]);
        // speed
        const overFactor = dominant==='speed'?rfloat(1.15,1.55):rfloat(0.8,1.2);
        const estSpeed=Math.round(clamp(s.speedLimit*overFactor+gauss(0,8),20,170));
        // pedestrians
        const pedInvolved = dominant==='pedestrian'? (rnd()<0.85?rint(1,2):0) : (s.urban&&rnd()<0.18?1:0);
        // severity: speed, peds, road type, surface raise it
        let sevScore=0;
        sevScore+=(estSpeed/s.speedLimit-1)*1.6;
        sevScore+= pedInvolved?1.2:0;
        sevScore+= (s.roadType==='Autostradë'||s.roadType==='Rrugë nacionale')?0.6:0;
        sevScore+= (surface==='Akull/Borë'||surface==='I lagësht')?0.3:0;
        sevScore+= dominant==='curve'?0.4:0;
        sevScore+= gauss(0,0.7);
        let severity; // 1 material,2 minor,3 serious,4 fatal
        if(sevScore>2.02) severity=4; else if(sevScore>1.0) severity=3; else if(sevScore>-0.15) severity=2; else severity=1;
        let fatalities=0,serious=0,minor=0;
        if(severity===4){ fatalities=rnd()<0.18?2:1; serious=rint(0,2); minor=rint(0,2); }
        else if(severity===3){ serious=rint(1,2); minor=rint(0,2); }
        else if(severity===2){ minor=rint(1,3); }
        const vehicles = pedInvolved? rint(1,2) : weighted([['1',12],['2',60],['3',20],['4',8]])*1;
        const collision = pedInvolved?'Goditje këmbësori':
          dominant==='curve'?weighted([['Dalje nga rruga',50],['Përmbysje',25],['Përplasje ballore',25]]):
          s.roadType==='Autostradë'?weighted([['Përplasje nga prapa',40],['Zinxhir automjetesh',20],['Dalje nga rruga',25],['Përplasje anësore',15]]):
          weighted([['Përplasje anësore',32],['Përplasje ballore',22],['Përplasje nga prapa',22],['Dalje nga rruga',14],['Goditje pengese',10]]);
        const driver = dominant==='speed'?'Tejkalim shpejtësie':
          dominant==='junction'?'Nuk dha përparësi':
          weighted([['Tejkalim shpejtësie',20],['Nuk dha përparësi',16],['Manovër e gabuar',16],['Lodhje',10],['Alkool ose drogë',12],['Telefon gjatë vozitjes',10],['Distancë shumë e shkurtër',10],['Pa gabim të drejtuesit',6]]);
        const infra = dominant==='lighting'?'Pa dritë publike':
          dominant==='curve'?'Kthesë e rrezikshme':
          dominant==='junction'?'Kryqëzim i pasigurt':
          dominant==='surface'?'Rrugë e dëmtuar':
          dominant==='pedestrian'?'Mungon trotuar/kalim':
          weighted([['Pa problem infrastrukture',45],['Shenja të dëmtuara',16],['Pa dritë publike',12],['Kthesë e rrezikshme',10],['Kryqëzim i pasigurt',9],['Rrugë e dëmtuar',8]]);
        const vehicle = weighted([['Pa faktor automjeti',60],['Goma të konsumuara',12],['Defekt frenash',10],['Drita jofunksionale',9],['Mbingarkesë',9]]);
        // response time minutes (worse for remote / response-cause segments)
        const remote = 1 - clamp(s.municipality==='Tiranë'?0.95:MUNI_BY_NAME[s.municipality].w/16,0.2,1);
        const respTime=Math.round(clamp(gauss(8+remote*16+s.causeWeights.response*6,4),3,55));

        const acc={
          id:'ACC-'+String(aid).padStart(5,'0'),
          lat:round6(jLat), lng:round6(jLng),
          date, year:yr,
          time:String(hour).padStart(2,'0')+':'+String(date.getMinutes()).padStart(2,'0'),
          municipality:s.municipality, qark:s.qark,
          road:s.road, roadName:s.corridor, segment:s.id, roadType:s.roadType,
          collision_type:collision, severity, severityLabel:['','Vetëm material','Lëndime të lehta','Lëndime të rënda','Fatal'][severity],
          fatalities, serious_injuries:serious, minor_injuries:minor,
          vehicles, pedestrians:pedInvolved,
          weather, lighting, road_condition:surface,
          speed_limit:s.speedLimit, estimated_speed:estSpeed,
          driver_factor:driver, infrastructure_factor:infra, vehicle_factor:vehicle,
          response_time:respTime, dominantCause:dominant
        };
        accidents.push(acc);
        s.accidents.push(acc);
      }
    });
  }
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
