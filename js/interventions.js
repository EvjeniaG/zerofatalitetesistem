/* =============================================================
   interventions.js - Prevention is a CONSEQUENCE of analysis.
   Each measure is generated from a segment's diagnosed root cause,
   with expected risk/fatality reduction and priority.
   ============================================================= */
const INTERVENTION_CATALOG={
  speed:[
    {type:'Shpejtësie',measure:'Vendosje kamera mesatare e shpejtësisë (section control)',rr:18,fr:24},
    {type:'Infrastrukturore',measure:'Ngushtim i korsive + sinjalistikë qetësuese trafiku',rr:12,fr:14},
    {type:'Policore',measure:'Patrullim i shtuar + radar i lëvizshëm në orët e pikut',rr:9,fr:11},
  ],
  pedestrian:[
    {type:'Infrastrukturore',measure:'Kalim këmbësorësh i ngritur + ndriçim i dedikuar',rr:16,fr:22},
    {type:'Infrastrukturore',measure:'Ishull mbrojtës qendror dhe gardh kanalizues këmbësorësh',rr:14,fr:18},
    {type:'Shpejtësie',measure:'Zonë 30 km/h dhe tabela paralajmëruese aktive',rr:11,fr:15},
  ],
  lighting:[
    {type:'Infrastrukturore',measure:'Instalim/rehabilitim i ndriçimit publik LED',rr:15,fr:19},
    {type:'Infrastrukturore',measure:'Shenja reflektuese dhe gjurmim anësor retroreflektiv',rr:8,fr:10},
  ],
  curve:[
    {type:'Infrastrukturore',measure:'Riprofilim i kthesës + bariera mbrojtëse anësore',rr:22,fr:28},
    {type:'Infrastrukturore',measure:'Shtresë anti-rrëshqitëse dhe sinjalizim kthese',rr:12,fr:15},
    {type:'Shpejtësie',measure:'Kufizim shpejtësie në kthesë + paralajmërim dinamik',rr:9,fr:12},
  ],
  junction:[
    {type:'Infrastrukturore',measure:'Rikonfigurim në rrethrrotullim ose semaforizim',rr:24,fr:26},
    {type:'Infrastrukturore',measure:'Kanalizim i lëvizjeve + ndalim kthesash të rrezikshme',rr:13,fr:15},
    {type:'Policore',measure:'Kontroll i përparësisë në orët e pikut',rr:7,fr:9},
  ],
  surface:[
    {type:'Infrastrukturore',measure:'Rishtresim asfalti + përmirësim drenazhi',rr:14,fr:16},
    {type:'Emergjente',measure:'Riparim urgjent gropash dhe sinjalizim i përkohshëm',rr:6,fr:7},
  ],
  traffic:[
    {type:'Infrastrukturore',measure:'Korsi shtesë / menaxhim aksesi (hyrje-dalje)',rr:16,fr:14},
    {type:'Edukative',measure:'Fushatë mbi distancën e sigurisë në trafik të dendur',rr:5,fr:6},
  ],
  response:[
    {type:'Emergjente',measure:'Pikë e avancuar reagimi / kohë më e shkurtër ambulance',rr:6,fr:18},
    {type:'Emergjente',measure:'Telefoni emergjence SOS dhe sinjalizim aksidenti',rr:5,fr:12},
  ],
};

function interventionsFor(seg, limit){
  const causes=seg.causes.filter(c=>c.contribution>=8).slice(0,4);
  const out=[];
  causes.forEach(c=>{
    const cat=INTERVENTION_CATALOG[c.key]||[];
    const tmpl=cat[0]; if(!tmpl) return;
    // scale impact by how much this cause contributes & segment risk
    const scale=(c.contribution/100)*(0.6+seg.nwa.integrated/10);
    const rr=Math.round(tmpl.rr*(0.7+scale));
    const fr=Math.round(tmpl.fr*(0.7+scale));
    out.push({
      ...tmpl, cause:c, segId:seg.id,
      rr:clamp(rr,3,38), fr:clamp(fr,3,42),
    });
  });
  // priority = expected fatality reduction weighted by risk reduction & cause weight
  out.forEach(x=>{ x.priorityVal = x.fr*0.6 + x.rr*0.3 + x.cause.contribution*0.1; });
  out.sort((a,b)=>b.priorityVal-a.priorityVal);
  out.forEach((x,i)=>{ x.priority = i===0?'Kritike':i===1?'I lartë':'Mesatar'; });
  return limit?out.slice(0,limit):out;
}

/* National intervention portfolio = top measures across worst segments */
function interventionPortfolio(n){
  const worst=SEGS.filter(s=>s.nwa.integrated>=4||s.isBlackSpot).sort((a,b)=>b.priority-a.priority).slice(0,40);
  const all=[];
  worst.forEach(s=>{ interventionsFor(s,2).forEach(iv=>all.push({...iv,seg:s})); });
  all.sort((a,b)=>b.priorityVal-a.priorityVal);
  return all.slice(0,n||30);
}
