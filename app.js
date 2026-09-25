function initPresentation(C){
const fmt=n=>Math.round(n).toLocaleString('fr-FR').replace(/ | /g,' ')+' €';
const fmtN=n=>Math.round(n).toLocaleString('fr-FR').replace(/ | /g,' ');

/* ---- données ---- */
const D=C.D;
const cats=C.cats;

/* ---- moteur de calcul (identique au fichier Excel) ---- */
function irpp(rni,parts){const q=rni/parts,B=[[0,11497,0],[11497,29315,.11],[29315,83823,.30],[83823,180294,.41],[180294,1e12,.45]];let t=0;for(const[a,b,r]of B){if(q>a)t+=(Math.min(q,b)-a)*r}return Math.round(t*parts)}
function abat10(x){return Math.min(Math.max(x*.1,504),14426)}
function fv(s,t,n){return t===0?s*n:s*(Math.pow(1+t,n)-1)/t}
/* crédit patientèle (mensualités constantes) */
function mkLoan(P,rate,years){if(!P)return{P:0,rate,years:0,pmt:0,annual:0,interest:0,Y:[]};const r=rate/12,n=years*12,pmt=P*r/(1-Math.pow(1+r,-n));let bal=P;const Y=[];
  for(let y=0;y<years;y++){let i=0,p=0;for(let m=0;m<12;m++){const ii=bal*r,pp=pmt-ii;bal-=pp;i+=ii;p+=pp}Y.push({i,p})}
  return{P,rate,years,pmt,annual:pmt*12,interest:pmt*n-P,Y}}
const LOAN=mkLoan(C.loan[0],C.loan[1],C.loan[2]);
const ISf=b=>b<=42500?b*.15:42500*.15+(b-42500)*.25;
function model(R,t,ret,L0,age){const Lo=L0||LOAN,AG=age||D.age;
  const n=Math.max(ret-AG,0);
  const d1b=D.d1b;
  const irB=irpp(d1b+D.d2+D.communs-abat10(D.d2),D.parts);
  const shB=d1b/(d1b+D.d2), epB=d1b-irB*shB-D.besoin*shB;
  const csS=D.csB*R/(D.ca-D.frais-D.csB), base=D.ca-D.frais-R-csS;
  const is=base<=42500?base*.15:42500*.15+(base-42500)*.25;
  const res=base-is, d1s=R;
  const irS=irpp(d1s+D.d2+D.communs-abat10(D.d2),D.parts);
  const shS=d1s/(d1s+D.d2), epS=d1s-irS*shS-D.besoin*shS;
  const totS=epS+res;
  const resY=y=>{if(y>Lo.years)return res;const L=Lo.Y[y-1],b=base-L.i;return b-ISf(b)-L.p};
  const serB=[0],serS=[0];for(let y=1;y<=n;y++){serB.push(serB[y-1]*(1+t)+epB);serS.push(serS[y-1]*(1+t)+epS+resY(y))}
  const res1=resY(1);
  return{age:AG,loanYears:Lo.years,loan:Lo,n,d1b,d1s,shB,shS,csB:D.csB,csS,irB,irS,is,res,res1,loanImpact:res-res1,epB,epS,totB:epB,totS,delta:totS-epB,serB,serS,capB:serB[n],capS:serS[n]};
}
const M=model(D.R,D.t,D.ret);

/* ---- navigation ---- */
const slides=[...document.querySelectorAll('.slide')];
const dots=document.querySelector('.dots');
const DECK=document.documentElement.classList.contains('deck');
let cur=0,lock=false;
slides.forEach((s,i)=>{const b=document.createElement('button');b.setAttribute('aria-label','Planche '+(i+1));b.onclick=()=>show(i);dots.appendChild(b)});
function mark(){[...dots.children].forEach((d,i)=>d.classList.toggle('on',i===cur));
  document.getElementById('counter').innerHTML=`<b>${cur+1}</b> / ${slides.length}`;
  document.documentElement.classList.toggle('dark-slide',slides[cur].classList.contains('merci'))}
function show(i){
  i=Math.min(Math.max(i,0),slides.length-1);
  if(!DECK){slides[i].scrollIntoView({behavior:'smooth'});return}
  if(i===cur&&slides[i].classList.contains('cur'))return;
  slides.forEach((s,j)=>{s.classList.toggle('cur',j===i);s.classList.toggle('up',j<i)});
  cur=i;mark();slides[i].scrollTop=0;setTimeout(()=>play(slides[i]),150);
}
function go(d){
  if(DECK){if(lock)return;lock=true;setTimeout(()=>lock=false,650);show(cur+d);return}
  const tops=slides.map(s=>s.getBoundingClientRect().top);
  let i=d>0?tops.findIndex(y=>y>8):(()=>{let k=0;tops.forEach((y,j)=>{if(y<-8)k=j});return k})();
  if(i<0)i=slides.length-1;slides[i].scrollIntoView({behavior:'smooth'})}
document.getElementById('prev').onclick=()=>go(-1);
document.getElementById('next').onclick=()=>go(1);
function fullscreen(){if(!document.fullscreenElement)document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen();else document.exitFullscreen()}
document.getElementById('fs').onclick=fullscreen;
document.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT')return;
  if(['ArrowDown','ArrowRight','PageDown',' '].includes(e.key)){e.preventDefault();go(1)}
  if(['ArrowUp','ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();go(-1)}
  if(e.key==='Home'){e.preventDefault();show(0)}
  if(e.key==='End'){e.preventDefault();show(slides.length-1)}
  if(e.key==='f'||e.key==='F')fullscreen();
});
if(DECK){
  let acc=0,accT=0;
  addEventListener('wheel',e=>{
    const s=slides[cur];
    if(e.target.closest&&e.target.closest('input'))return;
    const canDown=s.scrollTop+s.clientHeight<s.scrollHeight-2,canUp=s.scrollTop>2;
    if((e.deltaY>0&&canDown)||(e.deltaY<0&&canUp))return;
    e.preventDefault();
    const now=Date.now();if(now-accT>250)acc=0;accT=now;acc+=e.deltaY;
    if(Math.abs(acc)>40){go(acc>0?1:-1);acc=0}
  },{passive:false});
  let ty=null;
  addEventListener('touchstart',e=>ty=e.touches[0].clientY,{passive:true});
  addEventListener('touchend',e=>{if(ty===null)return;const d=ty-e.changedTouches[0].clientY;if(Math.abs(d)>60)go(d>0?1:-1);ty=null},{passive:true});
  addEventListener('resize',()=>{if(!matchMedia("(min-width:1000px) and (min-height:620px)").matches)location.reload()});
}

/* ---- compteurs ---- */
function countUp(el){const to=+el.dataset.count,t0=performance.now(),dur=1300;
  (function f(t){const p=Math.min((t-t0)/dur,1),e=1-Math.pow(1-p,3);el.textContent=fmtN(to*e)+(el.closest('.teaser')?' €':'');if(p<1)requestAnimationFrame(f)})(t0)}

/* ---- 2. cascade ---- */
(function(){
  const rows=[['Chiffre d\'affaires','',D.ca,0,'total'],['Frais de fonctionnement','dont amortissements',-D.frais,D.ca-D.frais,'neg'],['Cotisations sociales','CARMF, CSG, Madelin, URSSAF',-D.csB,D.ca-D.frais-D.csB,'neg'],['Résultat','avant impôt sur le revenu',D.ca-D.frais-D.csB,0,'res']];
  const el=document.getElementById('fall');
  rows.forEach((r,i)=>{const w=Math.abs(r[2])/D.ca*100,l=r[4]==='neg'?r[3]/D.ca*100:0;
    el.insertAdjacentHTML('beforeend',`<div class="row${i===3?' sep':''}"><div class="lab">${r[0]}${r[1]?`<small>${r[1]}</small>`:''}</div><div class="track"><div class="bar ${r[4]}${w>30?' inside':''}" style="left:${l*0.86}%" data-w="${w*0.86}"><span class="v num">${r[2]<0?'− ':''}${fmt(Math.abs(r[2]))}</span></div></div></div>`)});
})();

/* ---- 2b. cotisations ---- */
(function(){
  const c=C.cot.map((x,i)=>[x[0],x[1],x[2],['var(--navy)','var(--orange)','var(--orange-light)','var(--slate)'][i]]);
  const sp=document.getElementById('cs'),lg=document.getElementById('csl');
  c.forEach(([n,s,v,col])=>{const w=v/D.csB*100;
    sp.insertAdjacentHTML('beforeend',`<div style="background:${col}" data-w="${w}" title="${n} : ${fmt(v)}">${w>12?Math.round(w)+' %':''}</div>`);
    lg.insertAdjacentHTML('beforeend',`<div><i style="background:${col}"></i><b class="num">${fmt(v)}<em>${Math.round(w)} %</em></b>${n}${s?'<br>'+s:''}</div>`)});
})();

/* ---- 3. catégories ---- */
(function(){
  const el=document.getElementById('cats');const tot=C.depTot;
  cats.forEach(([nm,items])=>{const s=items.reduce((a,b)=>a+b[1],0);
    const li=items.map(([a,b])=>`<li><span>${a}</span><span class="num">${fmt(b)}</span></li>`).join('');
    el.insertAdjacentHTML('beforeend',`<div class="cat"><button><span class="nm">${nm}</span><span class="am num">${fmt(s)}<em>${Math.round(s/tot*100)} %</em></span><span class="mini"><i data-w="${s/C.catMax*100}"></i></span></button><ul>${li}</ul></div>`)});
  el.querySelectorAll('.cat>button').forEach(b=>b.onclick=()=>b.parentNode.classList.toggle('open'));
})();

/* ---- 4. flux SEL (sankey) ---- */
function drawSankey(host){
  const mob=host.clientWidth<560;
  const W=mob?520:780,labW=mob?250:300,T=mob?96:92,gap=mob?12:14,nw=18;
  const fa=mob?30:30,fn=mob?19:15,rowH=mob?72:66;
  const nodes=[['Frais généraux',D.frais,'hsl(35 30% 80%)'],['Rémunération nette',D.R,'var(--navy)'],['Cotisations sociales',M.csS,'var(--slate)'],['Impôt sur les sociétés',M.is,'hsl(222 20% 78%)'],['Réserves de la société',M.res,'var(--orange)']];
  const short={'Réserves de la société':'Réserves de la société','Impôt sur les sociétés':'Impôt sur les sociétés','Frais généraux':'Frais généraux','Cotisations sociales':'Cotisations sociales','Rémunération nette':'Rémunération nette'};
  const ch=mob?380:360,k=ch/D.ca,x1=W-labW-nw,xm=(nw+x1)/2;
  let yl=T,yr=T;const bands=[],rects=[],labs=[];
  nodes.forEach(([n,v,c],i)=>{const h=v*k,isR=c==='var(--orange)';
    bands.push(`<path class="band${isR?' resband':''}" fill="${c}" d="M${nw} ${yl} C${xm} ${yl} ${xm} ${yr} ${x1} ${yr} L${x1} ${yr+h} C${xm} ${yr+h} ${xm} ${yl+h} ${nw} ${yl+h}Z"><title>${n} : ${fmt(v)}</title></path>`);
    rects.push(`<rect x="${x1}" y="${yr}" width="${nw}" height="${Math.max(h,2)}" rx="3" fill="${c}"/>`);
    labs.push({y:yr+h/2,n:mob?short[n]:n,v,c,isR});yl+=h;yr+=h+gap});
  for(let i=1;i<labs.length;i++)if(labs[i].y-labs[i-1].y<rowH)labs[i].y=labs[i-1].y+rowH;
  const H=Math.max(yr,labs[labs.length-1].y+rowH/2)+14;
  const lx=x1+nw+16;
  const L=labs.map(l=>{
    const pct=Math.round(l.v/D.ca*100)+' %';
    if(l.isR)return `<g class="reslab"><rect x="${lx-4}" y="${l.y-fa-4}" width="${labW-14}" height="${fa+fn+22}" rx="12" fill="var(--orange)"/>
      <text x="${lx+10}" y="${l.y+2}" style="font:400 ${fa}px var(--serif)" fill="#fff">${fmt(l.v)}</text>
      <text x="${lx+10}" y="${l.y+fn+8}" style="font:600 ${fn}px var(--sans)" fill="#fff">${l.n} · ${pct}</text></g>`;
    return `<text x="${lx}" y="${l.y+2}" style="font:400 ${fa}px var(--serif)" fill="var(--fg)">${fmt(l.v)}</text>
      <text x="${lx}" y="${l.y+fn+8}" style="font:500 ${fn}px var(--sans)" fill="var(--muted)">${l.n} · ${pct}</text>`}).join('');
  host.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Répartition du chiffre d'affaires dans la SEL">
   <defs><filter id="glow" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="9" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <text x="0" y="${T-50}" style="font:600 ${fn}px var(--sans)" fill="var(--muted)">Chiffre d'affaires</text>
   <text x="0" y="${T-14}" style="font:400 ${fa+4}px var(--serif)" fill="var(--fg)">${fmt(D.ca)}</text>
   <rect x="0" y="${T}" width="${nw}" height="${ch}" rx="3" fill="var(--navy)"/>
   <g class="bands">${bands.join('')}${rects.join('')}</g>${L}</svg>`;
}
const skHost=document.getElementById('sankey');drawSankey(skHost);

/* ---- 5. comparatif ---- */
(function(){
  const el=document.getElementById('cmp');
  [['Cotisations sociales',M.csB,M.csS],['Impôt sur le revenu du foyer',M.irB,M.irS]].forEach(([n,b,s],i)=>{
    el.insertAdjacentHTML('beforeend',`<div class="card rv d${i+2}"><h3>${n}</h3><div class="pct num">−${Math.round((b-s)/b*100)} %</div>
      <p class="fromto num"><b>${fmt(b)}</b> en BNC → <b>${fmt(s)}</b> en SEL</p><span class="pill num">${fmt(b-s)} de moins par an</span>
      <div class="pair"><span>BNC</span><div class="t"><div class="bar bnc" data-w="${b/b*76}"><span class="v num">${fmt(b)}</span></div></div>
      <span>SEL</span><div class="t"><div class="bar sel" data-w="${s/b*76}"><span class="v num">${fmt(s)}</span></div></div></div></div>`)});
})();

/* ---- 7. graphique retraite ---- */
function drawChart(host,m,animate,fixed){const n=m.n,AGE=m.age;
  const mob=host.clientWidth<600;const W=mob?520:1000,H=mob?420:360,L=mob?64:70,R=mob?16:150,T=mob?40:20,B=40,cw=W-L-R,ch=H-T-B;const fs=mob?17:12;
  const ptsB=m.serB,ptsS=m.serS,ly=Math.min(m.loanYears||0,n);
  const mx=Math.max(...ptsS,...ptsB,1,fixed&&fixed.ref?Math.max(...fixed.ref.serS):0);const step=mx>1e6?250000:mx>4e5?100000:50000;const top=Math.ceil(mx/step)*step;
  const a0=fixed?fixed.a0:AGE,span=fixed?(fixed.a1-fixed.a0):n;
  const X=y=>L+(span?(AGE-a0+y)/span:0)*cw,Y=v=>T+ch-v/top*ch;
  const path=p=>p.map((v,i)=>(i?'L':'M')+X(i).toFixed(1)+' '+Y(v).toFixed(1)).join(' ');
  let g='';for(let v=0;v<=top;v+=step)g+=`<line x1="${L}" x2="${L+cw}" y1="${Y(v)}" y2="${Y(v)}"/>`;
  let ax='';for(let v=0;v<=top;v+=step)ax+=`<text x="${L-10}" y="${Y(v)+5}" text-anchor="end" font-size="${fs}">${v>=1e6?(v/1e6).toLocaleString('fr-FR')+' M€':(v/1000)+' k€'}</text>`;
  if(fixed){const stp=(fixed.a1-fixed.a0)>24?4:2;for(let a=fixed.a0;a<=fixed.a1;a+=(mob?stp*2:stp))ax+=`<text x="${L+(a-a0)/span*cw}" y="${H-12}" text-anchor="middle" font-size="${fs}">${a} ans</text>`}
  else{const ev=mob?(n>16?8:4):(n>20?4:n>10?2:1);for(let y=0;y<=n;y+=ev)ax+=`<text x="${X(y)}" y="${H-12}" text-anchor="middle" font-size="${fs}">${AGE+y} ans</text>`}
  const area=path(ptsS)+` L${X(n)} ${Y(ptsB[n])} `+ptsB.slice().reverse().map((v,i)=>'L'+X(n-i).toFixed(1)+' '+Y(v).toFixed(1)).join(' ')+'Z';
  host.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Capital BNC et SEL"><g class="grid">${g}</g><g class="axis">${ax}</g>
   ${fixed&&fixed.ref?(()=>{const rf=fixed.ref,off=rf.age-AGE,pp=s=>s.map((v,i)=>(i?"L":"M")+X(i+off).toFixed(1)+" "+Y(v).toFixed(1)).join(" ");return `<path class="refl" d="${pp(rf.serS)}"/><path class="refl b" d="${pp(rf.serB)}"/>`})():""}<path class="area" d="${area}"/><path class="ln bnc" d="${path(ptsB)}"/><path class="ln sel" d="${path(ptsS)}"/>${ly>0?`<path class="ln loan" d="${path(ptsS.slice(0,ly+1))}"/><text class="loanlab" x="${X(ly/2)}" y="${Y(ptsS[Math.round(ly/2)])-16}" text-anchor="middle" style="font-size:${mob?17:13}px">Rachat de la patientèle</text>`:""}
   <circle cx="${X(n)}" cy="${Y(ptsB[n])}" r="6" fill="var(--bnc)"/><circle cx="${X(n)}" cy="${Y(ptsS[n])}" r="6" fill="var(--orange)"/>
   ${mob?`<text class="endlab" x="${X(n)}" y="${Y(ptsS[n])-16}" text-anchor="end" style="font-size:20px" fill="var(--orange)">SEL ${fmt(ptsS[n])}</text>
   <text class="endlab" x="${X(n)-12}" y="${Y(ptsB[n])+28}" text-anchor="end" style="font-size:20px" fill="var(--bnc)">BNC ${fmt(ptsB[n])}</text>`:`<text class="endlab" x="${X(n)+14}" y="${Y(ptsS[n])+5}" fill="var(--orange)">SEL ${fmt(ptsS[n])}</text>
   <text class="endlab" x="${X(n)+14}" y="${Y(ptsB[n])+5}" fill="var(--bnc)">BNC ${fmt(ptsB[n])}</text>`}
   <line class="cross" x1="0" x2="0" y1="${T}" y2="${T+ch}" stroke="var(--sand-dark)" stroke-dasharray="4 4" opacity="0"/>
   <rect x="${L}" y="${T}" width="${cw}" height="${ch}" fill="transparent" class="hit"/></svg><div class="tip"></div>`;
  const svg=host.querySelector('svg'),tip=host.querySelector('.tip'),cross=host.querySelector('.cross');
  if(animate){host.querySelectorAll('.ln').forEach(p=>{const l=p.getTotalLength();p.style.strokeDasharray=l;p.style.strokeDashoffset=l;p.getBoundingClientRect();p.style.transition='stroke-dashoffset 1.8s cubic-bezier(.3,.6,.2,1)';p.style.strokeDashoffset=0})}
  function mv(e){const r=svg.getBoundingClientRect(),cx=(e.touches?e.touches[0].clientX:e.clientX);const x=(cx-r.left)/r.width*W;const y=Math.round(Math.min(Math.max((x-L)/cw*span-(AGE-a0),0),n));
    cross.setAttribute('x1',X(y));cross.setAttribute('x2',X(y));cross.setAttribute('opacity',1);
    tip.innerHTML=`${AGE+y} ans · année ${y}<br>SEL <b>${fmt(ptsS[y])}</b><br>BNC ${fmt(ptsB[y])}`;tip.style.left=(X(y)/W*r.width)+'px';tip.style.top=(Y(ptsS[y])/H*r.height)+'px';tip.style.opacity=1}
  svg.addEventListener('mousemove',mv);svg.addEventListener('touchmove',mv,{passive:true});
  svg.addEventListener('mouseleave',()=>{tip.style.opacity=0;cross.setAttribute('opacity',0)});
}
document.getElementById('ln_m').textContent=fmt(LOAN.pmt)+'/mois';document.getElementById('ln_c').textContent=fmt(LOAN.interest)+' d\'intérêts';document.getElementById('ln_i').textContent='≈ − '+fmt(Math.round(M.loanImpact/100)*100)+'/an, '+LOAN.years+' ans';
const chartHost=document.getElementById('chart');
['pj_b','pj_s'].forEach((id,i)=>document.getElementById(id).textContent=fmt(i?M.capS:M.capB));
['pj_d','pj_d2'].forEach(id=>document.getElementById(id).textContent='+'+fmt(M.capS-M.capB).replace(/ €$/,' €'));
drawChart(chartHost,M,false);
let chartDone=false;let rw=innerWidth;addEventListener('resize',()=>{if(Math.abs(innerWidth-rw)>80){rw=innerWidth;drawChart(chartHost,M,false);drawSankey(skHost)}});

/* ---- 8. simulateur ---- */
const ag=document.getElementById('ag'),chart2=document.getElementById('chart2'),r=document.getElementById('r'),t=document.getElementById('t'),a=document.getElementById('a'),v=document.getElementById('v'),lr=document.getElementById('lr'),ld=document.getElementById('ld');
function sim(){
  const R=+r.value,tt=+t.value/100,ret=+a.value,V=+v.value,L=mkLoan(V,+lr.value/100,+ld.value),m=model(R,tt,ret,L,+ag.value);document.getElementById('agv').textContent=ag.value+' ans';
  const REF=model(D.R,D.t,D.ret,LOAN,D.age),a0=Math.min(+ag.value,D.age),a1=Math.max(ret,D.ret);drawChart(chart2,m,false,{a0,a1,ref:REF});
  document.getElementById('vv').textContent=fmt(V);document.getElementById('lrv').textContent=(+lr.value).toLocaleString('fr-FR')+' %';document.getElementById('ldv').textContent=ld.value+' ans';
  document.getElementById('o_net').textContent=fmt(V*(1-0.314));document.getElementById('o_pmt').textContent=V?fmt(L.pmt)+'/mois':'–';
  document.getElementById('o_loan_l').textContent=V?'Remboursement crédit patientèle (années 1 à '+ld.value+')':'Remboursement crédit patientèle';
  document.getElementById('rv').textContent=fmt(R);
  document.getElementById('tv').textContent=(+t.value).toLocaleString('fr-FR')+' %';
  document.getElementById('av').textContent=ret+' ans';
  const set=(id,v)=>document.getElementById(id).textContent=fmt(v);
  set('o_cs_b',m.csB);set('o_cs_s',m.csS);set('o_ir_b',m.irB);set('o_ir_s',m.irS);set('o_is',m.is);
  set('o_ep_b',m.epB);set('o_ep_s',m.epS);set('o_res',m.res);document.getElementById('o_loan').textContent='− '+fmt(m.loanImpact)+'/an';set('o_tot_b',m.totB);set('o_tot_s',m.totS);
  document.getElementById('o_delta').textContent=(m.delta>=0?'+':'−')+' '+fmt(Math.abs(m.delta));
  document.getElementById('o_cap').textContent=(m.capS-m.capB>=0?'+':'−')+' '+fmt(Math.abs(m.capS-m.capB));
  document.getElementById('o_cap_l').textContent='de capital en plus à '+ret+' ans';
  document.getElementById('warn').classList.toggle('on',m.epS<-1);
}
[ag,r,t,a,v,lr,ld].forEach(i=>i.addEventListener('input',sim));
document.getElementById('reset').onclick=()=>{ag.value=D.age;r.value=D.R;t.value=D.t*100;a.value=D.ret;v.value=C.loan[0];lr.value=C.loan[1]*100;ld.value=C.loan[2];sim()};
sim();

/* ---- 9. frise 10 semaines ---- */
(function(){
  const S=[
   ['S1–2','Semaines 1 et 2','Projet et prévisionnel',['Définir le projet, le nom, le siège et l\'objet de la SELAS','Élaborer le prévisionnel sur 3 à 5 ans','Choisir le régime fiscal et le statut social','Rassembler les pièces nécessaires aux statuts']],
   ['S3–4','Semaines 3 et 4','Statuts et capital',['Rédiger les statuts (clause d\'agrément incluse)','Préparer les justificatifs d\'apports','Déposer le capital en banque','Relire et signer les statuts']],
   ['S5','Semaine 5','Agrément de l\'Ordre',['Déposer le dossier complet à l\'Ordre des médecins','Passage en commission ordinale mensuelle','Obtenir l\'agrément préalable obligatoire']],
   ['S6','Semaine 6','Annonce légale',['Rédiger et publier l\'annonce légale de constitution','Obtenir l\'attestation de parution']],
   ['S7–8','Semaines 7 et 8','Immatriculation',['Déposer le dossier complet au Guichet unique','Obtenir SIREN, SIRET et code APE','Récupérer le Kbis de la SELAS']],
   ['S9–10','Semaines 9 et 10','Démarrage',['Ouvrir le compte professionnel et débloquer le capital','Affiliation URSSAF et CPAM, assurances obligatoires','Inscription définitive au tableau de l\'Ordre','Logiciels, télétransmission, puis activité en SELAS']]];
  const tl=document.getElementById('tl'),det=document.getElementById('tldet');
  S.forEach((s,i)=>tl.insertAdjacentHTML('beforeend',`<button data-i="${i}"><span class="dot">${s[0]}</span><span class="lbl"><span class="wk">${s[1]}</span><span class="tt">${s[2]}</span></span></button>`));
  function show(i){[...tl.children].forEach((b,j)=>b.classList.toggle('on',j===i));const s=S[i];
    det.innerHTML=`<div class="big">${s[2]}<small>${s[1]}</small></div><ul>${s[3].map(x=>`<li>${x}</li>`).join('')}</ul>`}
  tl.querySelectorAll('button').forEach(b=>b.onclick=()=>show(+b.dataset.i));
  show(0);
})();

document.querySelectorAll('.cmpt tbody tr').forEach((r,i)=>r.style.transitionDelay=(0.25+i*0.05)+'s');
/* ---- explications au clic (tableau ligne à ligne) ---- */
(function(){
  const modal=document.getElementById('modal'),body=document.getElementById('mbody');
  const TT={bs:'Les besoins du foyer',pb:'Votre part des besoins',ep:'Votre épargne personnelle'};
  function open(s,k){
    const sel=s==='sel',d1=sel?M.d1s:M.d1b,sh=sel?M.shS:M.shB,ir=sel?M.irS:M.irB,tot=d1+D.d2;
    const a={inc:d1,ir:ir*sh,bs:D.besoin*sh},c={inc:D.d2,ir:ir*(1-sh),bs:D.besoin*(1-sh)};
    a.ep=a.inc-a.ir-a.bs;c.ep=c.inc-c.ir-c.bs;
    const row=(lab,x,y,z,key)=>`<tr class="${key===k?'hl':''}"><td>${lab}</td><td class="a">${x}</td><td>${y}</td><td>${z}</td></tr>`;
    const pct=v=>Math.round(v*100)+' %';
    let eq='';
    if(k==='bs')eq=`Les besoins du foyer sont fixes : <b>${fmt(D.besoin)}</b><small>${fmt(C.depMois)} de dépenses par mois + 10 % de marge, sur 12 mois. Ils sont partagés au prorata des revenus : ${pct(sh)} pour vous, ${pct(1-sh)} pour votre conjoint.</small>`;
    if(k==='pb')eq=`${fmt(D.besoin)} × ${pct(sh)} = <b>${fmt(a.bs)}</b><small>Votre part des revenus du foyer : ${fmt(d1)} sur ${fmt(tot)}.</small>`;
    if(k==='ep')eq=`${fmt(a.inc)} − ${fmt(a.ir)} − ${fmt(a.bs)} = <b>${fmt(a.ep)}</b><small>Votre revenu, moins votre part de l'impôt, moins votre part des besoins.${sel?' En SEL, la société met en plus '+fmt(M.res)+' de côté.':''}</small>`;
    body.innerHTML=`<span class="tag ${sel?'sel':''}">${sel?'En SEL':'En BNC'}</span><h3>${TT[k]}</h3>
      <p class="pr">Chacun paie sa part des besoins et de l'impôt du foyer, au prorata de ses revenus.</p>
      <table><thead><tr><th></th><th>Vous</th><th>Conjoint</th><th>Foyer</th></tr></thead><tbody>
      ${row('Revenus',fmt(a.inc),fmt(c.inc),fmt(tot),'')}
      ${row('Part des revenus',pct(sh),pct(1-sh),'100 %','')}
      ${row('Impôt sur le revenu',fmt(a.ir),fmt(c.ir),fmt(ir),'')}
      ${row('Besoins du foyer',fmt(a.bs),fmt(c.bs),fmt(D.besoin),k==='bs'||k==='pb'?k:'')}
      ${row('Épargne personnelle',fmt(a.ep),fmt(c.ep),fmt(a.ep+c.ep),'ep')}
      </tbody></table><div class="eq">${eq}</div>`;
    modal.classList.add('on');modal.setAttribute('aria-hidden','false');
  }
  function close(){modal.classList.remove('on');modal.setAttribute('aria-hidden','true')}
  document.querySelectorAll('.info').forEach(b=>b.onclick=()=>open(b.dataset.s,b.dataset.k));
  modal.addEventListener('click',e=>{if(e.target===modal||e.target.classList.contains('mclose'))close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close()},true);
})();

/* ---- apparition des sections ---- */
function play(s){
  if(s.classList.contains('in'))return;s.classList.add('in');
  s.querySelectorAll('[data-count]').forEach(countUp);
  s.querySelectorAll('[data-w]').forEach(b=>setTimeout(()=>b.style.width=b.dataset.w+'%',150));
  s.querySelectorAll('[data-h]').forEach(b=>setTimeout(()=>b.style.height=(b.dataset.h/C.hMax*100)+'%',200));
  if(s.id==='s7'&&!chartDone){chartDone=true;drawChart(chartHost,M,true)}
}
if(DECK){slides[0].classList.add('cur');cur=0;mark();setTimeout(()=>play(slides[0]),100)}
else{const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){play(e.target);cur=slides.indexOf(e.target);mark()}}),{threshold:.35});slides.forEach(s=>io.observe(s))}

window.addEventListener('beforeprint',()=>slides.forEach(s=>{play(s);s.querySelectorAll('[data-count]').forEach(el=>el.textContent=fmtN(+el.dataset.count)+(el.closest('.teaser')?' €':''))}));
}

/* ---- lecteur MYsel : déchiffrement du lien ---- */
(function(){
const $=i=>document.getElementById(i);
const b64u=s=>{s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return Uint8Array.from(atob(s),c=>c.charCodeAt(0))};
const P=new URLSearchParams(location.hash.slice(1));
const exp=P.get('e'),data=P.get('d');
const lock=$('lock'),msg=$('msg'),f=$('f'),err=$('e');
function stop(t){msg.textContent=t;f.style.display='none'}
if(!data){stop("Lien incomplet. Ouvrez le lien complet reçu de MYsel.");return}
if(exp){const d=exp.slice(6,8)+'/'+exp.slice(4,6)+'/'+exp.slice(0,4);$('exp').textContent="Accès personnel et confidentiel, valable jusqu'au "+d+'.';
  if(new Date()>new Date(exp.slice(0,4)+'-'+exp.slice(4,6)+'-'+exp.slice(6,8)+'T23:59:59')){stop('Accès expiré. Contactez MYsel pour obtenir un nouvel accès.');return}}
if(!(window.crypto&&crypto.subtle&&window.DecompressionStream)){stop('Votre navigateur est trop ancien. Ouvrez ce lien dans Chrome ou Safari à jour.');return}
const raw=b64u(data);
async function derive(code,salt,it){const km=await crypto.subtle.importKey('raw',new TextEncoder().encode(code),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:it,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['decrypt'])}
async function unlock(code){
  const n=raw[0],it=150000;let o=1,K=null;
  for(let i=0;i<n;i++){const salt=raw.slice(o,o+16),iv=raw.slice(o+16,o+28),w=raw.slice(o+28,o+76);o+=76;
    if(K)continue;try{const kc=await derive(code,salt,it);K=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv},kc,w))}catch(_){}}
  if(!K)throw new Error('code');
  const key=await crypto.subtle.importKey('raw',K,'AES-GCM',false,['decrypt']);
  const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:raw.slice(o,o+12)},key,raw.slice(o+12));
  const txt=await new Response(new Blob([pt]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
  return JSON.parse(txt)}
function show(p){
  const tpl=$('tpl').innerHTML.replace(/\{\{v(\d+)\}\}/g,(m,i)=>p.v[+i]);
  $('app').outerHTML=tpl;document.title=p.title;lock.remove();document.body.classList.add('unlocked');
  const svg="<svg xmlns='http://www.w3.org/2000/svg' width='420' height='260'><text x='20' y='150' transform='rotate(-24 210 130)' font-family='sans-serif' font-size='17' fill='rgba(28,36,56,0.07)'>Confidentiel · "+p.who.replace(/[<&]/g,'')+"</text></svg>";
  const wm=document.createElement('div');wm.id='wm';wm.style.backgroundImage='url("data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)+'")';document.body.appendChild(wm);
  ['contextmenu','dragstart','copy'].forEach(ev=>document.addEventListener(ev,e=>e.preventDefault()));
  document.addEventListener('keydown',e=>{const k=(e.key||'').toLowerCase();if((e.ctrlKey||e.metaKey)&&['s','p','u','c'].includes(k)){e.preventDefault();e.stopPropagation()}},true);
  initPresentation(p.C)}
async function go(){const code=$('c').value.replace(/[\s-]/g,'').toUpperCase();if(!code)return;
  const b=$('b');b.disabled=true;b.textContent='Ouverture…';err.textContent='';
  try{show(await unlock(code))}catch(x){err.textContent=x&&x.message==='code'?'Code incorrect.':'Ouverture impossible ('+(x&&x.message||x)+').';b.disabled=false;b.textContent='Accéder à la présentation'}}
$('b').addEventListener('click',go);$('c').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();go()}});
})();
