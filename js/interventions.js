/* =============================================================
   interventions.js - Masat e parandalimit lidhen me shkaktarët.
   ============================================================= */
const INTERVENTION_CATALOG={
  speed:[
    {type:'Kontroll shpejtësie',measure:'Kamera shpejtësie',rr:18,fr:24},
    {type:'Infrastrukturore',measure:'Ngushtim korsish dhe sinjalizim qetësues trafiku',rr:12,fr:14},
    {type:'Policore',measure:'Patrullë e shtuar dhe radar lëvizës në orët e pikut',rr:9,fr:11},
  ],
  pedestrian:[
    {type:'Infrastrukturore',measure:'Kalim këmbësorësh i ngritur me ndriçim të dedikuar',rr:16,fr:22},
    {type:'Infrastrukturore',measure:'Ishull mbrojtës qendror dhe gardh ndarës për këmbësorë',rr:14,fr:18},
    {type:'Kontroll shpejtësie',measure:'Zonë 30 km/h dhe tabela paralajmëruese aktive',rr:11,fr:15},
  ],
  lighting:[
    {type:'Infrastrukturore',measure:'Instalim ose rehabilitim i ndriçimit publik (LED)',rr:15,fr:19},
    {type:'Infrastrukturore',measure:'Shenja reflektuese dhe vijë anësore retroreflektive',rr:8,fr:10},
  ],
  curve:[
    {type:'Infrastrukturore',measure:'Riprofilim kthese dhe barierë mbrojtëse anësore',rr:22,fr:28},
    {type:'Infrastrukturore',measure:'Shtresë anti-rrëshqitëse dhe sinjalizim i kthesës',rr:12,fr:15},
    {type:'Kontroll shpejtësie',measure:'Kufizim shpejtësie në kthesë dhe paralajmërim dinamik',rr:9,fr:12},
  ],
  junction:[
    {type:'Infrastrukturore',measure:'Rikonfigurim në rrethrrotullim ose semaforizim',rr:24,fr:26},
    {type:'Infrastrukturore',measure:'Kanalizim lëvizjesh dhe ndalim kthesash të rrezikshme',rr:13,fr:15},
    {type:'Policore',measure:'Kontroll i përparësisë në orët e pikut',rr:7,fr:9},
  ],
  surface:[
    {type:'Infrastrukturore',measure:'Rishtresim asfalti dhe përmirësim drenazhi',rr:14,fr:16},
    {type:'Emergjente',measure:'Riparim urgjent i gropave dhe sinjalizim i përkohshëm',rr:6,fr:7},
  ],
  traffic:[
    {type:'Infrastrukturore',measure:'Korsi shtesë dhe menaxhim hyrjesh-daljesh',rr:16,fr:14},
    {type:'Edukative',measure:'Fushatë për distancën e sigurtë në trafik të dendur',rr:5,fr:6},
  ],
  response:[
    {type:'Emergjente',measure:'Pikë e avancuar reagimi për kohë më të shkurtër të ambulancës',rr:6,fr:18},
    {type:'Emergjente',measure:'Telefon emergjence dhe sinjalizim i aksidentit',rr:5,fr:12},
  ],
};

function interventionsFor(seg, limit){
  const causes=seg.causes.filter(c=>c.contribution>=8).slice(0,4);
  const out=[];
  causes.forEach(c=>{
    const cat=INTERVENTION_CATALOG[c.key]||[];
    const tmpl=cat[0]; if(!tmpl) return;
    const scale=(c.contribution/100)*(0.6+seg.nwa.integrated/10);
    const rr=Math.round(tmpl.rr*(0.7+scale));
    const fr=Math.round(tmpl.fr*(0.7+scale));
    out.push({
      ...tmpl, cause:c, segId:seg.id,
      rr:clamp(rr,3,38), fr:clamp(fr,3,42),
    });
  });
  out.forEach(x=>{ x.priorityVal = x.fr*0.6 + x.rr*0.3 + x.cause.contribution*0.1; });
  out.sort((a,b)=>b.priorityVal-a.priorityVal);
  out.forEach((x,i)=>{ x.priority = i===0?'Kritike':i===1?'E lartë':'Mesatare'; });
  return limit?out.slice(0,limit):out;
}

function interventionPortfolio(n){
  const worst=SEGS.filter(s=>s.nwa.integrated>=4||s.isBlackSpot).sort((a,b)=>b.priority-a.priority).slice(0,40);
  const all=[];
  worst.forEach(s=>{ interventionsFor(s,2).forEach(iv=>all.push({...iv,seg:s})); });
  all.sort((a,b)=>b.priorityVal-a.priorityVal);
  return all.slice(0,n||30);
}
