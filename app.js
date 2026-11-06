(async()=>{
const resp=await fetch("/api/catalog"+location.search,{credentials:"same-origin"});
if(resp.status===401||resp.status===403){location.replace("login.html"+(resp.status===403?"?change=1":""));return}
const D=await resp.json();
const SK=D.user+"."+(D.client?D.client.id:"-");
function saveFile(name,data,mime){const u=URL.createObjectURL(new Blob([data],{type:mime})),a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(u)},1500)}
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const num=v=>{const n=parseFloat(String(v).replace(/\s/g,"").replace(",","."));return isFinite(n)?n:NaN};
const fmt=(n,d=1)=>n.toLocaleString("fr-FR",{minimumFractionDigits:d,maximumFractionDigits:d});
const n1=n=>n.toLocaleString("fr-FR",{maximumFractionDigits:1});
const CART=D.cartons;
const CATMAP={Turbo:"turbo",CHRA:"chra",Autre:"autre"};
const A=D.articles.map(([n,des,L,W,H,P,cat])=>({n,k:n.toLowerCase(),L,W,H,P,q:0,t:des,tl:des.toLowerCase(),g:"",cat:CATMAP[cat]||"autre"}));
A.forEach(a=>a.cat0=a.cat);
const byCode=new Map(A.map((a,i)=>[a.k,i]));
const cs=CART.map(([name,L,W,H])=>({name,L,W,H,d:[L,W,H].sort((x,y)=>y-x),vol:L*W*H})).sort((x,y)=>x.vol-y.vol);
$("cat").textContent=`${A.length} articles et ${cs.length} cartons dans le catalogue (dimensions en mm, poids en kg).`;
const VER={beta:"2.0",phase:1,date:"30/10/2026"};
$("vb").textContent="bêta "+VER.beta;
$("ver").textContent=`Cubelyx, version bêta ${VER.beta} (phase ${VER.phase}), mise à jour du ${VER.date}`;
const mn=$("mn"),mb=$("mb");
function closeMenu(){mn.hidden=true;mb.setAttribute("aria-expanded","false")}
function view(v){document.querySelectorAll("section[data-v]").forEach(s=>s.hidden=s.dataset.v!==v);mn.querySelectorAll("button").forEach(b=>b.setAttribute("aria-current",String(b.dataset.v===v)));closeMenu();scrollTo(0,0)}
mb.onclick=()=>{mn.hidden=!mn.hidden;mb.setAttribute("aria-expanded",String(!mn.hidden))};
mn.onclick=e=>{const b=e.target.closest("button[data-v]");if(b)view(b.dataset.v)};
document.addEventListener("click",e=>{if(!mn.hidden&&!e.target.closest(".top"))closeMenu()});
document.querySelector(".seg").onclick=e=>{const b=e.target.closest("button[data-t]");if(!b)return;document.querySelectorAll(".seg button").forEach(x=>x.setAttribute("aria-selected",String(x===b)));document.querySelectorAll("div[data-t]").forEach(d=>d.hidden=d.dataset.t!==b.dataset.t)};

const DEVIS_EMAIL=D.devis_email||"";
function devisHtml(list){
  const g={},big=PALS[PALS.length-1];
  list.forEach(u=>{const n=u.name.replace(" (brut)","");if(!g[n])g[n]={k:0,ro:u.ro,P:u.P,t:u.t};g[n].k++});
  const lines=Object.entries(g).map(([n,x])=>"- "+n+((x.t&&x.t!=="Hors liste")?" ("+x.t+")":"")+" : quantité "+x.k+", dimensions "+x.ro.map(v=>Math.round(v)).join(" × ")+" mm (L × l × h), poids "+fmt(x.P,2)+" kg l’unité");
  const txt=["Bonjour,","","Je souhaite recevoir un devis d’expédition pour les articles suivants, dont les dimensions dépassent nos conditionnements habituels (cartons et palettes) :","",...lines,"","Dimensions maximales de nos conditionnements : palette de "+big.d.join(" × ")+" mm.","","Merci de m’indiquer votre meilleur tarif et votre délai.","Cordialement,","","Demande préparée avec Cubelyx le "+new Date().toLocaleDateString("fr-FR")].join("\n");
  return `<div class="devis"><h3>Demande de devis</h3><p>Dimensions hors de nos conditionnements : veuillez demander un devis ${DEVIS_EMAIL?`à l’adresse suivante : <b>${esc(DEVIS_EMAIL)}</b>`:"à votre contact habituel"}. Voici une fiche à copier dans votre e-mail.</p><textarea id="devtxt" readonly rows="10" aria-label="Fiche de demande de devis">${esc(txt)}</textarea><button id="devcp" class="sec" type="button">Copier la fiche</button><p id="devmsg" class="muted" role="status"></p></div>`;
}
async function copyDevis(){
  const t=$("devtxt"),m=$("devmsg"),ok="Fiche copiée : colle-la dans ton e-mail.";
  try{await navigator.clipboard.writeText(t.value);m.textContent=ok;return}catch(x){}
  try{t.focus();t.setSelectionRange(0,t.value.length);if(document.execCommand("copy")){m.textContent=ok;return}}catch(x){}
  m.textContent="Sélectionne le texte ci-dessus, copie-le puis colle-le dans ton e-mail.";
}
const ORS=(it,up)=>{
  const r=it.ro,[a,b,e]=it.d;
  const L=up?(it.free?[r,[r[1],r[0],r[2]],[r[0],r[2],r[1]],[r[2],r[0],r[1]],[r[1],r[2],r[0]],[r[2],r[1],r[0]]]:[r,[r[1],r[0],r[2]]]):[[a,b,e],[a,e,b],[b,a,e],[b,e,a],[e,a,b],[e,b,a]];
  const seen=new Set();return L.filter(o=>{const k=o.join();if(seen.has(k))return false;seen.add(k);return true});
};
function placeAt(sp,bs,it,up){
  const nx=[],inn=(p,q)=>p[0]>=q[0]&&p[1]>=q[1]&&p[2]>=q[2]&&p[0]+p[3]<=q[0]+q[3]&&p[1]+p[4]<=q[1]+q[4]&&p[2]+p[5]<=q[2]+q[5];
  for(const t of sp){
    if(bs[0]>=t[0]+t[3]||bs[0]+bs[3]<=t[0]||bs[1]>=t[1]+t[4]||bs[1]+bs[4]<=t[1]||bs[2]>=t[2]+t[5]||bs[2]+bs[5]<=t[2]){nx.push(t);continue}
    if(bs[0]>t[0])nx.push([t[0],t[1],t[2],bs[0]-t[0],t[4],t[5]]);
    if(bs[0]+bs[3]<t[0]+t[3])nx.push([bs[0]+bs[3],t[1],t[2],t[0]+t[3]-bs[0]-bs[3],t[4],t[5]]);
    if(bs[1]>t[1])nx.push([t[0],t[1],t[2],t[3],bs[1]-t[1],t[5]]);
    if(bs[1]+bs[4]<t[1]+t[4])nx.push([t[0],bs[1]+bs[4],t[2],t[3],t[1]+t[4]-bs[1]-bs[4],t[5]]);
    if(bs[2]>t[2])nx.push([t[0],t[1],t[2],t[3],t[4],bs[2]-t[2]]);
    if(bs[2]+bs[5]<t[2]+t[5])nx.push([t[0],t[1],bs[2]+bs[5],t[3],t[4],t[2]+t[5]-bs[2]-bs[5]]);
  }
  return{sp:nx.filter((p,i)=>!nx.some((q,j)=>j!==i&&inn(p,q)&&(j<i||!inn(q,p)))),e:{x:bs[0],y:bs[1],z:bs[2],a:bs[3],b:bs[4],c:bs[5],n:it.name,tilt:!!(up&&it.ro&&bs[5]!==it.ro[2])}};
}
function packStep(sp,it,up){
  const ors=ORS(it,up);let bs=null,bv=Infinity;
  for(const t of sp){
    const sv=t[3]*t[4]*t[5];
    if(sv>=bv)continue;
    for(const o of ors)if(o[0]<=t[3]&&o[1]<=t[4]&&o[2]<=t[5]){bs=[t[0],t[1],t[2],o[0],o[1],o[2]];bv=sv;break}
  }
  return bs?placeAt(sp,bs,it,up):null;
}
const PCACHE=new Map();
function pack3(items,c,up){
  const list=items.slice().sort((p,q)=>q.vol-p.vol);
  let sp=[[0,0,0,c.d[0],c.d[1],c.d[2]]];const placed=[];let ok=true;
  for(const it of list){const r=packStep(sp,it,up);if(!r){ok=false;break}sp=r.sp;placed.push(r.e)}
  if(ok)return placed;
  if(list.length>7)return null;
  const key=(up?"u":"f")+c.d.join()+"|"+list.map(it=>(up?it.ro:it.d).join("x")+(it.free?"f":"")).join(";");
  let res=PCACHE.get(key);
  if(res===undefined){
    let budget=1500;
    const rec=(k,sp0,pl)=>{
      if(k===list.length)return pl;
      const it=list[k],ors=ORS(it,up),cand=[],seen=new Set();
      for(const t of sp0.slice().sort((x,y)=>x[3]*x[4]*x[5]-y[3]*y[4]*y[5]))for(const o of ors){
        if(o[0]<=t[3]&&o[1]<=t[4]&&o[2]<=t[5]){const bs=[t[0],t[1],t[2],o[0],o[1],o[2]],kk=bs.join();if(!seen.has(kk)){seen.add(kk);cand.push(bs)}}
      }
      for(const bs of cand.slice(0,18)){
        if(--budget<0)return null;
        const r=placeAt(sp0,bs,it,up),out=rec(k+1,r.sp,pl.concat([r.e]));
        if(out)return out;
      }
      return null;
    };
    const f=rec(0,[[0,0,0,c.d[0],c.d[1],c.d[2]]],[]);
    res=f?f.map(e=>{const q=Object.assign({},e);delete q.n;return q}):null;
    PCACHE.set(key,res);
  }
  return res?res.map((e,i)=>Object.assign({},e,{n:list[i].name})):null;
}
const EXP={head:["Niveau","N°","Emballage","Dimensions (mm)","Contenu","Carton","Code article","Désignation","Quantité","Poids (kg)","Poids du bloc (kg)"],rows:[],blocks:[],pal:null,nofit:[],sum:[]};
let PALMIN=0,PALWHY="";const PALS=D.palettes.map(([name,l,w,h,P])=>({name,d:[l,w,h],P}));
function palletHtml(bins,raw){
  const items=bins.map(b=>({ro:[b.c.L,b.c.W,b.c.H],d:[b.c.L,b.c.W,b.c.H].sort((x,y)=>y-x),vol:b.c.vol,P:b.w,name:b.c.name,bin:b})).concat((raw||[]).map(u=>({ro:u.ro,d:u.d,vol:u.vol,P:u.P,name:u.name+" (brut)",t:u.t,free:u.free||u.fr}))).sort((p,q)=>q.vol-p.vol);
  const big=PALS[PALS.length-1],groups=[],nofit=[];
  for(const it of items){
    let done=false;
    for(const g of groups){
      if(!g.sp.some(t=>t[3]*t[4]*t[5]>=it.vol))continue;
      const r=packStep(g.sp,it,true);
      if(r){g.sp=r.sp;g.pl.push(r.e);g.items.push(it);done=true;break}
    }
    if(done)continue;
    const r=packStep([[0,0,0,big.d[0],big.d[1],big.d[2]]],it,true);
    if(!r){nofit.push(it);continue}
    groups.push({items:[it],sp:r.sp,pl:[r.e]});
  }
  let totKg=0,body="";
  groups.forEach((g,j)=>{
    const p=PALS.find(p=>pack3(g.items,p,true))||big,pl=pack3(g.items,p,true)||g.pl;
    const hh=Math.max(...pl.map(o=>o.z+o.c)),wc=g.items.reduce((s,u)=>s+u.P,0);
    totKg+=wc+p.P;
    const names=[...new Set(g.items.map(u=>u.name))],sw=n=>`<i class="sw" style="--h:${HUES[names.indexOf(n)%HUES.length]}"></i>`;
    const rawL={},cars=g.items.filter(u=>u.bin),ord=g.items.slice().sort((p,q)=>q.vol-p.vol),num=u=>ord.indexOf(u)+1;
    g.items.filter(u=>!u.bin).forEach(u=>{if(!rawL[u.name])rawL[u.name]={k:0,w:0,t:u.t,no:[]};rawL[u.name].k++;rawL[u.name].w+=u.P;rawL[u.name].no.push(num(u))});
    const rawH=Object.entries(rawL).map(([n,x])=>`<li><span>${sw(n)}<b class="no">n° ${x.no.join(", ")}</b> ${x.k} × ${esc(n)}${x.t?`<br><span class="muted">${esc(x.t)}</span>`:""}</span><span>${fmt(x.w)} kg</span></li>`).join("");
    const carH=cars.length?`<details><summary>${cars.length} carton${cars.length>1?"s":""} sur cette palette</summary><ul>${cars.map(u=>{const c={};u.bin.items.forEach(x=>{if(!c[x.name])c[x.name]={k:0,t:x.t};c[x.name].k++});return `<li><span>${sw(u.name)}<b class="no">n° ${num(u)}</b> ${esc(u.name)}<br><span class="muted">${Object.entries(c).map(([n,x])=>`${x.k} × ${esc(n)}${x.t?" ("+esc(x.t)+")":""}`).join(", ")}</span></span><span>${fmt(u.P)} kg</span></li>`}).join("")}</ul></details>`:"";
    {const ls=[];
    Object.entries(rawL).forEach(([n,x])=>ls.push({t:"n° "+x.no.join(", ")+" - "+x.k+" x "+n.replace(" (brut)","")+" (brut)"+(x.t?" - "+x.t:"")+" - "+fmt(x.w)+" kg"}));
    cars.forEach(u=>{ls.push({t:"n° "+num(u)+" - Carton "+u.name+" - "+fmt(u.P)+" kg"});const c={};u.bin.items.forEach(x=>{if(!c[x.name])c[x.name]={k:0,t:x.t};c[x.name].k++});Object.entries(c).forEach(([n,x])=>ls.push({t:x.k+" x "+n+(x.t?" ("+x.t+")":""),sub:true}))});
    EXP.blocks.push({titre:"Palette "+(j+1)+" / "+groups.length,emb:p.name,dims:p.d[0]+" x "+p.d[1]+" mm",poids:fmt(wc+p.P),lignes:ls})}
    const dims=p.d[0]+"×"+p.d[1];let first=true;const blk=()=>{if(first){first=false;return +(wc+p.P).toFixed(2)}return ""};
    Object.entries(rawL).forEach(([n,x])=>EXP.rows.push(["Palette",j+1,p.name,dims,"Brut","",n.replace(" (brut)",""),x.t||"",x.k,+x.w.toFixed(2),blk()]));
    cars.forEach((u,ci)=>{const c={};u.bin.items.forEach(x=>{if(!c[x.name])c[x.name]={k:0,t:x.t,w:0};c[x.name].k++;c[x.name].w+=x.P});Object.entries(c).forEach(([n,x])=>EXP.rows.push(["Palette",j+1,p.name,dims,"Carton",u.name+" n°"+num(u),n,x.t||"",x.k,+x.w.toFixed(2),blk()]))});
    body+=`<details class="box" open style="--i:${j}"><summary class="bh"><h3>Palette ${j+1}</h3><span class="sm">${fmt(wc+p.P)} kg<br>${esc(p.name)}</span></summary>${plan({c:{d:[p.d[0],p.d[1],hh]},items:g.items,pl})}<div class="gl"><span>Hauteur</span><b>${n1(hh)} / ${n1(p.d[2])} mm</b></div><div class="gauge v"><i style="width:${Math.min(100,hh/p.d[2]*100)}%"></i></div><div class="gl"><span>Poids : contenu + palette</span><b>${fmt(wc)} + ${fmt(p.P)} = ${fmt(wc+p.P)} kg</b></div>${pl.some(o=>o.tilt)?`<p class="muted">Posé sur une autre face : ${[...new Set(pl.filter(o=>o.tilt).map(o=>o.n.replace(" (brut)","")))].map(esc).join(", ")}. Vérifie que c’est possible.</p>`:""}<ul>${rawH}</ul>${carH}</details>`;
  });
  const note=`<div class="note">${icon({L:1,W:1,H:1})}<p>${PALWHY==="size"?"Un article est trop grand pour les cartons : il est posé brut sur la palette.":PALMIN?`Plus de ${PALMIN} colis : palette.`:"Tout part sur palette."} Les turbos sont posés bruts, sans carton ; les CHRA, joints et autres pièces sont en carton, sur la même palette. Rangement vérifié en 3D : tout reste à l’endroit et peut pivoter à plat.</p></div>`;
  EXP.pal={n:groups.length,tot:totKg};EXP.nofit=[...new Set(nofit.map(u=>u.name.replace(" (brut)","")))];
  let h=groups.length?`<h2>${groups.length} palette${groups.length>1?"s":""}, ${fmt(totKg)} kg</h2>${note}${body}`:"";
  if(nofit.length)h+=`<p class="err">Trop grand pour une palette : ${[...new Set(nofit.map(u=>u.name.replace(" (brut)","")))].map(esc).join(", ")}.</p>`+devisHtml(nofit);
  return h;
}
const HUES=[212,162,28,282,350,96,48,192];
function plan(b){
  const [X,Y,Z]=b.c.d,k=300/((X+Y)*.866),H=(Z+(X+Y)*.5)*k;
  const P=(x,y,z)=>(((x-y)*.866+Y*.866)*k).toFixed(1)+","+(((x+y)*.5-z+Z)*k).toFixed(1);
  const lab=o=>{const fs=Math.min(15,(o.a+o.b)*.866*k*.4,(o.a+o.b)*.5*k*.75);if(fs<7)return "";const xy=P(o.x+o.a/2,o.y+o.b/2,o.z+o.c).split(",");return `<text class="nb" x="${xy[0]}" y="${xy[1]}" font-size="${fs.toFixed(1)}">${o.no}</text>`};
  const pg=(q,c)=>`<polygon class="${c}" points="${q.map(v=>P(...v)).join(" ")}"/>`;
  const names=[...new Set(b.items.map(u=>u.name))];
  const its=b.pl.map((o,i)=>Object.assign({},o,{no:i+1})).sort((p,q)=>(p.x+p.y+p.z)-(q.x+q.y+q.z)||(p.x+p.y)-(q.x+q.y));
  const body=its.map((o,j)=>{
    const {x,y,z}=o,x2=x+o.a,y2=y+o.b,z2=z+o.c;
    return `<g class="it" style="--h:${HUES[names.indexOf(o.n)%HUES.length]};--n:${Math.min(j,16)}">`+pg([[x,y,z2],[x2,y,z2],[x2,y2,z2],[x,y2,z2]],"t")+pg([[x2,y,z],[x2,y2,z],[x2,y2,z2],[x2,y,z2]],"r")+pg([[x,y2,z],[x2,y2,z],[x2,y2,z2],[x,y2,z2]],"l")+lab(o)+"</g>";
  }).join("");
  const e=(m,n)=>"M"+P(...m)+"L"+P(...n);
  const fr=[e([X,0,0],[X,0,Z]),e([0,Y,0],[0,Y,Z]),e([X,Y,0],[X,Y,Z]),e([X,0,Z],[X,Y,Z]),e([X,Y,Z],[0,Y,Z]),e([X,0,0],[X,Y,0]),e([X,Y,0],[0,Y,0])].join("");
  return `<svg class="pl" viewBox="0 0 300 ${H.toFixed(1)}" role="img" aria-label="Plan du rangement dans le carton">`+pg([[0,0,0],[X,0,0],[X,Y,0],[0,Y,0]],"fl")+pg([[0,0,0],[0,Y,0],[0,Y,Z],[0,0,Z]],"bw")+pg([[0,0,0],[X,0,0],[X,0,Z],[0,0,Z]],"bw")+body+`<path class="fr" d="${fr}"/></svg>`;
}
function icon(a){
  if(!(a.L>0&&a.W>0&&a.H>0))return '<span class="ic" aria-hidden="true"></span>';
  const k=24/Math.max(a.L,a.W,a.H),l=a.L*k,w=a.W*k,h=a.H*k;
  const p=(x,y,z)=>`${((x-y)*.866+w*.866).toFixed(1)},${((x+y)*.5-z+h).toFixed(1)}`;
  const f=(q,c)=>`<polygon class="${c}" points="${q.map(v=>p(...v)).join(" ")}"/>`;
  return `<svg class="ic" viewBox="0 0 ${((l+w)*.866).toFixed(1)} ${(h+(l+w)*.5).toFixed(1)}" aria-hidden="true">`+f([[0,0,h],[l,0,h],[l,w,h],[0,w,h]],"t")+f([[l,0,0],[l,w,0],[l,w,h],[l,0,h]],"r")+f([[0,w,0],[l,w,0],[l,w,h],[0,w,h]],"l")+"</svg>";
}
const CATS=[["turbo","Turbo"],["chra","CHRA"],["autre","Autre"]];
const CATSEL=a=>`<select class="cat" aria-label="Catégorie">${CATS.map(([v,l])=>`<option value="${v}"${a.cat===v?" selected":""}>${l}</option>`).join("")}</select>`;
function row(i,wc){
  const a=A[i];
  return `<li data-i="${i}">${icon(a)}<div class="nm"><b>${esc(a.n)}</b>${a.t?`<span class="tp">${esc(a.t)}</span>`:a.g?`<span class="tp muted">${esc(a.g)} (déduit du code)</span>`:""}<span class="muted">${n1(a.L)}×${n1(a.W)}×${n1(a.H)} mm, ${fmt(a.P,2)} kg${a.q?`, total ${fmt(a.q*a.P)} kg`:""}</span>${wc?CATSEL(a):""}</div><div class="st"><button type="button" data-d="-1" aria-label="Moins">−</button><input type="number" inputmode="numeric" min="0" value="${a.q}" aria-label="Quantité"><button type="button" data-d="1" aria-label="Plus">+</button></div></li>`;
}
function renderSel(){
  const s=[];for(let i=0;i<A.length;i++)if(A[i].q>0)s.push(i);
  $("mysel").innerHTML=s.slice(0,100).map(i=>row(i,true)).join("")+(s.length>100?`<li class="muted">${s.length-100} autres articles dans la sélection.</li>`:"")||'<li class="muted">Aucun article choisi pour l’instant.</li>';
}
function sum(skip){
  let n=0,w=0,k=0;for(const a of A){n+=a.q;w+=a.q*a.P;if(a.q)k++}
  $("sel").textContent=`${k} articles, ${n} pièces, ${fmt(w)} kg au total`;
  if(skip!=="sel")renderSel();
  saveState();
}
function renderList(skip){
  const f=$("q").value.trim().toLowerCase(),hit=[];
  for(let i=0;i<A.length;i++){if(f?(A[i].k+" "+A[i].tl).includes(f):A[i].q>0)hit.push(i)}
  const li=hit.slice(0,10).map(row).join("");
  $("list").innerHTML=li+(hit.length>10?`<li class="muted">${hit.length-10} autres résultats : précise ta recherche.</li>`:"")||`<li class="muted">${f?"Aucun article trouvé.":"Tape un code dans la recherche pour ajouter des articles."}</li>`;
  sum(skip);
}
$("q").addEventListener("input",()=>renderList());
$("list").addEventListener("click",e=>{const b=e.target.closest("button[data-d]");if(!b)return;const li=b.closest("li"),a=A[li.dataset.i];a.q=Math.max(0,a.q+ +b.dataset.d);li.querySelector("input").value=a.q;sum()});
$("list").addEventListener("input",e=>{if(e.target.tagName!=="INPUT")return;A[e.target.closest("li").dataset.i].q=Math.max(0,Math.floor(num(e.target.value))||0);sum()});
$("mysel").addEventListener("click",e=>{const b=e.target.closest("button[data-d]");if(!b)return;const a=A[b.closest("li").dataset.i];a.q=Math.max(0,a.q+ +b.dataset.d);renderList()});
$("mysel").addEventListener("input",e=>{if(e.target.tagName!=="INPUT")return;A[e.target.closest("li").dataset.i].q=Math.max(0,Math.floor(num(e.target.value))||0);renderList("sel")});
$("mysel").addEventListener("change",e=>{if(e.target.classList.contains("cat")){A[e.target.closest("li").dataset.i].cat=e.target.value;saveState()}});
function addCustom(n,L,W,H,P,q,cat){
  let nm=String(n||"").trim()||"Hors liste "+(A.filter(a=>a.custom).length+1);
  if(byCode.has(nm.toLowerCase())||A.some(a=>a.custom&&a.k===nm.toLowerCase()))nm+=" (hors liste)";
  const a={n:nm,k:nm.toLowerCase(),L,W,H,P,q,t:"Hors liste",tl:"hors liste "+nm.toLowerCase(),g:"",cat,cat0:cat,custom:true};
  A.push(a);return a;
}
$("o_add").onclick=()=>{
  const L=num($("o_L").value),W=num($("o_W").value),H=num($("o_H").value),P=num($("o_P").value),q=Math.max(1,Math.floor(num($("o_q").value))||1),m=$("o_msg");
  if(![L,W,H,P].every(v=>v>0)){m.textContent="Renseigne les trois dimensions (mm) et le poids (kg), avec des nombres supérieurs à 0.";return}
  const a=addCustom($("o_n").value,L,W,H,P,q,$("o_c").value);
  m.textContent=`Ajouté : ${q} × ${a.n}. Retrouve-le dans « Ma sélection ».`;
  ["o_n","o_L","o_W","o_H","o_P"].forEach(i=>$(i).value="");$("o_q").value="1";renderList();
};
function parseOrder(txt){
  const add=new Map(),unk=[];let n=0;
  const codeRe=/[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+/g;
  for(let line of String(txt).split(/\r?\n/)){
    line=line.replace(/\u00a0/g," ").trim();if(!line)continue;
    const toks=line.match(codeRe)||[];let found=null;
    for(const t of toks){let k=t.toLowerCase();if(!byCode.has(k)&&/-\d{4}$/.test(k))k=k.replace(/-\d{4}$/,"");if(byCode.has(k)){found=byCode.get(k);break}}
    if(found===null){const u=toks.find(t=>t.length>=6&&/\d/.test(t)&&!/^(?:ET|RA)-/i.test(t));if(u)unk.push(u);continue}
    const rest=line.replace(codeRe," ");let q=null,m;
    if((m=rest.match(/(\d{1,4})\s*[x×]\b/i)))q=+m[1];
    else if((m=rest.match(/\b[x×]\s*(\d{1,4})\b/i)))q=+m[1];
    else{const ints=rest.match(/\b\d{1,4}\b/g);if(ints)q=+ints[ints.length-1]}
    if(!(q>0))q=1;
    add.set(found,(add.get(found)||0)+q);n++;
  }
  return{add,unk:[...new Set(unk)],n};
}
$("pst_add").onclick=()=>{
  const r=parseOrder($("pst").value),m=$("pst_msg");
  if(!r.n&&!r.unk.length){m.textContent="Aucun code reconnu. Colle une ligne par article : le code, puis la quantité.";return}
  let pcs=0;for(const [i,q] of r.add){A[i].q+=q;pcs+=q}
  m.textContent=r.n+" ligne"+(r.n>1?"s":"")+" ajoutée"+(r.n>1?"s":"")+" ("+pcs+" pièce"+(pcs>1?"s":"")+")"+(r.unk.length?", "+r.unk.length+" code"+(r.unk.length>1?"s":"")+" inconnu"+(r.unk.length>1?"s":"")+" : "+r.unk.slice(0,8).join(", ")+(r.unk.length>8?"…":""):"")+".";
  if(r.n)$("pst").value="";
  renderList();
};
function histGet(){try{return JSON.parse(localStorage.getItem("cubelyx.hist."+SK)||"[]")}catch(e){return[]}}
function histSet(h){try{localStorage.setItem("cubelyx.hist."+SK,JSON.stringify(h))}catch(e){}}
function histAdd(info){
  const q={},c={},cu=[];
  for(const a of A){if(a.custom){if(a.q>0)cu.push({n:a.n,L:a.L,W:a.W,H:a.H,P:a.P,q:a.q,cat:a.cat});continue}if(a.q>0){q[a.n]=a.q;if(a.cat!==a.cat0)c[a.n]=a.cat}}
  const s={q,c,cu},h=histGet();
  if(h.length&&JSON.stringify(h[0].s)===JSON.stringify(s)){h[0].t=Date.now();h[0].i=info}else h.unshift({t:Date.now(),i:info,s});
  histSet(h.slice(0,15));renderHist();
}
function renderHist(){
  const h=histGet();
  $("histl").innerHTML=h.length?h.map((e,k)=>`<li data-k="${k}"><div class="nm"><b>${new Date(e.t).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</b><span class="muted">${e.i.pcs} pièce${e.i.pcs>1?"s":""}, ${e.i.cnt} ${e.i.mode==="palettes"?"palette":"colis"}${e.i.cnt>1&&e.i.mode==="palettes"?"s":""}, ${fmt(e.i.kg)} kg</span></div><div class="st"><button type="button" data-act="open">Rouvrir</button><button type="button" data-act="del" aria-label="Supprimer">✕</button></div></li>`).join(""):'<li class="muted">Aucune commande calculée pour l’instant.</li>';
}
$("histl").addEventListener("click",e=>{
  const b=e.target.closest("button[data-act]");if(!b)return;
  const k=+b.closest("li").dataset.k,h=histGet();
  if(b.dataset.act==="del"){h.splice(k,1);histSet(h);renderHist();return}
  const en=h[k];if(!en)return;
  A.forEach(a=>{a.q=0;a.cat=a.cat0});while(A.length&&A[A.length-1].custom)A.pop();
  for(const [n,v] of Object.entries(en.s.q||{})){const i=byCode.get(n.toLowerCase());if(i!==undefined)A[i].q=v}
  for(const [n,v] of Object.entries(en.s.c||{})){const i=byCode.get(n.toLowerCase());if(i!==undefined)A[i].cat=v}
  (en.s.cu||[]).forEach(o=>addCustom(o.n,o.L,o.W,o.H,o.P,o.q,o.cat));
  renderList();view("add");
});
$("histclr").onclick=()=>{histSet([]);renderHist()};
function saveState(){try{
  const q={},c={},cu=[];
  for(const a of A){if(a.custom){cu.push({n:a.n,L:a.L,W:a.W,H:a.H,P:a.P,q:a.q,cat:a.cat});continue}if(a.q>0)q[a.n]=a.q;if(a.cat!==a.cat0)c[a.n]=a.cat}
  localStorage.setItem("cubelyx.v1."+SK,JSON.stringify({q,c,cu}));
}catch(e){}}
function loadState(){try{
  const st=JSON.parse(localStorage.getItem("cubelyx.v1."+SK)||"null");if(!st)return;
  for(const [n,v] of Object.entries(st.q||{})){const i=byCode.get(n.toLowerCase());if(i!==undefined)A[i].q=v}
  for(const [n,v] of Object.entries(st.c||{})){const i=byCode.get(n.toLowerCase());if(i!==undefined)A[i].cat=v}
  (st.cu||[]).forEach(o=>addCustom(o.n,o.L,o.W,o.H,o.P,o.q,o.cat));
}catch(e){}}
let clrT;$("clr").onclick=()=>{const b=$("clr");if(!b.classList.contains("sure")){b.classList.add("sure");b.textContent="Confirmer";clearTimeout(clrT);clrT=setTimeout(()=>{b.classList.remove("sure");b.textContent="Vider"},3000);return}clearTimeout(clrT);b.classList.remove("sure");b.textContent="Vider";A.forEach(a=>{a.q=0;a.cat=a.cat0});while(A.length&&A[A.length-1].custom)A.pop();$("imsg").textContent="";$("o_msg").textContent="";renderList()};

$("file").onchange=async e=>{
  const f=e.target.files[0];if(!f)return;const m=$("imsg");
  try{
    if(typeof XLSX==="undefined")throw 0;
    const wb=XLSX.read(await f.arrayBuffer(),{type:"array"});
    const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:"",blankrows:false});
    const h=rows[0].map(String);
    let ic=h.findIndex(x=>/codice|code|réf|ref|article|nom/i.test(x)),iq=h.findIndex(x=>/quant|qt|nombre|nb/i.test(x));
    const hd=ic>=0&&iq>=0;if(!hd){ic=0;iq=1}
    const start=hd||isNaN(num(rows[0][iq]))?1:0,unk=[];let ok=0;
    for(const r of rows.slice(start)){
      const raw=String(r[ic]).trim(),q=Math.floor(num(r[iq]));if(!raw)continue;
      const i=byCode.get(raw.toLowerCase());
      if(i===undefined){unk.push(raw);continue}
      if(q>0){A[i].q+=q;ok++}
    }
    m.textContent=`${ok} lignes ajoutées`+(unk.length?`, ${unk.length} codes inconnus : ${unk.slice(0,8).join(", ")}${unk.length>8?"…":""}`:"")+".";
    renderList();
  }catch(x){m.textContent="Impossible de lire ce fichier. Utilise un .xlsx, .xls ou .csv."}
  e.target.value="";
};

function runPack(){
  PALMIN=Math.max(0,Math.floor(num($("palmin").value)||0));
  EXP.rows=[];EXP.blocks=[];EXP.pal=null;EXP.nofit=[];
  const mw=num($("maxw").value),maxW=mw>0?mw:25,fill=Math.min(1,Math.max(.1,(num($("fill").value)||85)/100)),tare=Math.max(0,num($("tare").value)||0);
  const units=[],nodim=[];
  for(const a of A){
    if(a.q<=0)continue;
    if(!(a.L>0&&a.W>0&&a.H>0)){nodim.push(a.n);continue}
    const d=[a.L,a.W,a.H].sort((x,y)=>y-x);
    for(let i=0;i<a.q;i++)units.push({name:a.n,P:a.P,d,vol:a.L*a.W*a.H,ro:[a.L,a.W,a.H],cat:a.cat,t:a.t||a.g,fr:!!a.custom});
  }
  const R=$("res");clearTimeout(window.animT);
  if(!units.length&&!nodim.length){R.innerHTML='<p class="muted">Choisis au moins un article.</p>';return}
  const fits=(m,c)=>m[0]<=c.d[0]&&m[1]<=c.d[1]&&m[2]<=c.d[2];
  const fitCarton=(items,m,vol)=>cs.find(c=>fits(m,c)&&(items.length===1||vol<=c.vol*fill)&&pack3(items,c));
  const packIt=list=>{const lost=[],bins=[];
  list.sort((a,b)=>b.vol-a.vol||b.P-a.P);
  for(const u of list){
    if(!cs.some(c=>fits(u.d,c))){lost.push(u);continue}
    let done=false;
    for(const b of bins){
      const m=b.m.map((v,i)=>Math.max(v,u.d[i])),vol=b.vol+u.vol,w=b.w+u.P;
      if(w<=maxW&&fitCarton(b.items.concat(u),m,vol)){b.m=m;b.vol=vol;b.w=w;b.items.push(u);done=true;break}
    }
    if(!done)bins.push({items:[u],m:u.d.slice(),vol:u.vol,w:tare+u.P});
  }
  bins.forEach(b=>{b.c=fitCarton(b.items,b.m,b.vol);b.tight=b.items.length===1&&b.vol>b.c.vol*fill;b.pl=pack3(b.items,b.c)});return{lost,bins}};
  let {lost,bins}=packIt(units);const n0=bins.length;let rawT=[];
  const palMode=n0>PALMIN||lost.length>0;PALWHY=n0>PALMIN?"count":"size";
  if(palMode){
    const tb=units.filter(u=>u.cat==="turbo");
    if(tb.length){rawT=tb;({lost,bins}=packIt(units.filter(u=>u.cat!=="turbo")))}
    rawT=rawT.concat(lost.map(u=>Object.assign({},u,{free:true})));lost=[];
  }
  const tot=bins.reduce((s,b)=>s+b.w,0);
  let h=bins.length&&!palMode?`<h2>${bins.length} colis, ${fmt(tot)} kg</h2><div class="note">${icon({L:1,W:1,H:1})}<p>Rangement vérifié en 3D : les articles peuvent être tournés dans tous les sens${tare?", carton et calage inclus dans le poids":""}. Si certains articles doivent rester à l’endroit, le résultat peut différer.</p></div>`:"";
  if(palMode)h+=palletHtml(bins,rawT);
  (palMode?[]:bins).forEach((b,i)=>{
    const ordc=b.items.slice().sort((p,q)=>q.vol-p.vol),g={};b.items.forEach(u=>{if(!g[u.name])g[u.name]={n:0,w:0,no:[]};g[u.name].n++;g[u.name].w+=u.P;g[u.name].no.push(ordc.indexOf(u)+1)});const names=[...new Set(b.items.map(u=>u.name))];
    const wp=b.w/maxW,fp=b.vol/b.c.vol,over=b.w>maxW,cl=over?"bad":wp>.9?"warn":"";
    h+=`<article class="box" style="--i:${i}"><div class="bh"><h3>Colis ${i+1}</h3><span>${esc(b.c.name)}<br>${n1(b.c.L)}×${n1(b.c.W)}×${n1(b.c.H)} mm</span></div>
${plan(b)}<div class="gl"><span>Poids</span><b class="${cl}">${fmt(b.w)} / ${fmt(maxW,0)} kg</b></div><div class="gauge ${cl}"><i style="width:${Math.min(100,wp*100)}%"></i></div>
<div class="gl"><span>Remplissage</span><b>${Math.round(fp*100)} %</b></div><div class="gauge v"><i style="width:${Math.min(100,fp*100)}%"></i></div>
<ul>${Object.entries(g).map(([n,x])=>`<li><span><i class="sw" style="--h:${HUES[names.indexOf(n)%HUES.length]}"></i><b class="no">n° ${x.no.join(", ")}</b> ${x.n} × ${esc(n)}</span><span>${fmt(x.w)} kg</span></li>`).join("")}</ul>${b.tight?`<p class="muted">Pièce seule : remplissage au-dessus de ${Math.round(fill*100)} % accepté.</p>`:""}${over?'<p class="err">Un seul article dépasse déjà le poids maximum.</p>':""}</article>`;
  });
  if(lost.length){const g={};lost.forEach(u=>g[u.name]=(g[u.name]||0)+1);
    h+=`<p class="err">Ne rentre dans aucun carton : ${Object.entries(g).map(([n,k])=>k+" × "+esc(n)).join(", ")}.</p>`}
  if(nodim.length)h+=`<p class="err">Dimensions manquantes dans le catalogue, article non placé : ${nodim.map(esc).join(", ")}.</p>`;
  if(!palMode)expColis(bins);
  const pN=EXP.pal?EXP.pal.n:0,pK=EXP.pal?EXP.pal.tot:0;
  EXP.sum=[["Cubelyx – export de répartition"],["Version",$("ver").textContent],["Date",new Date().toLocaleString("fr-FR")],["Mode",palMode?"Palettes":"Colis"],[palMode?"Nombre de palettes":"Nombre de colis",palMode?pN:bins.length],["Poids total (kg)",+(palMode?pK:tot).toFixed(2)],["Poids maximum par colis (kg)",maxW],["Remplissage maximum (%)",Math.round(fill*100)],["Carton et calage (kg)",tare],["Palette si plus de … colis",PALMIN]]
   .concat(lost.length?[["Ne rentre dans aucun carton",[...new Set(lost.map(u=>u.name))].join(", ")]]:[])
   .concat(nodim.length?[["Dimensions manquantes (non placé)",nodim.join(", ")]]:[])
   .concat(EXP.nofit.length?[["Trop grand pour une palette",EXP.nofit.join(", ")]]:[]);
  if(bins.length||rawT.length)h=`<div class="tb"><button id="exp" type="button">Exporter en Excel</button><button id="pdf" type="button">Étiquettes PDF</button>${palMode?'<button id="fold" type="button">Tout replier</button>':""}</div><p id="expmsg" class="muted" role="status"></p>`+h;
  if(bins.length||rawT.length)h+="<p class=\"muted\">Les dimensions viennent du catalogue. Le fournisseur peut faire varier la taille du carton d’une pièce selon son approvisionnement et la disponibilité de ses cartons.</p>";
  if(bins.length||rawT.length)histAdd({mode:palMode?"palettes":"colis",cnt:palMode?pN:bins.length,kg:+(palMode?pK:tot).toFixed(1),pcs:A.reduce((t,a)=>t+a.q,0)});
  const wait=calm()?0:Math.max(0,1300-(Date.now()-(window.t0||0)));
  window.animT=setTimeout(()=>{R.innerHTML=h},wait);
}
function expColis(bins){bins.forEach((b,i)=>{
  const ord=b.items.slice().sort((p,q)=>q.vol-p.vol),g={},ls=[];
  b.items.forEach(u=>{if(!g[u.name])g[u.name]={k:0,t:u.t,w:0,no:[]};g[u.name].k++;g[u.name].w+=u.P;g[u.name].no.push(ord.indexOf(u)+1)});
  let first=true;
  Object.entries(g).forEach(([n,x])=>{EXP.rows.push(["Colis",i+1,b.c.name,b.c.L+"×"+b.c.W+"×"+b.c.H,"Carton","",n,x.t||"",x.k,+x.w.toFixed(2),first?+b.w.toFixed(2):""]);first=false;ls.push({t:"n° "+x.no.join(", ")+" - "+x.k+" x "+n+(x.t?" - "+x.t:"")+" - "+fmt(x.w)+" kg"})});
  EXP.blocks.push({titre:"Colis "+(i+1)+" / "+bins.length,emb:b.c.name,dims:b.c.L+" x "+b.c.W+" x "+b.c.H+" mm",poids:fmt(b.w),lignes:ls});
})}
async function exportPdf(){
  const m=$("expmsg");
  try{
    if(!window.jspdf||!window.jspdf.jsPDF)throw {code:"unavailable"};
    
    const doc=new window.jspdf.jsPDF({unit:"mm",format:"a4"}),T=x=>String(x).replace(/[’‘]/g,"'").replace(/[–—]/g,"-");
    const date=new Date().toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});
    EXP.blocks.forEach((b,i)=>{
      if(i)doc.addPage();
      let y=24;
      doc.setFont("helvetica","bold");doc.setFontSize(30);doc.text(T(b.titre),15,y);y+=11;
      doc.setFontSize(15);doc.text(T(b.emb),15,y);y+=7;
      doc.setFont("helvetica","normal");doc.setFontSize(12);doc.text(T(b.dims+"   |   "+b.poids+" kg"),15,y);y+=7;
      doc.setFontSize(9);doc.setTextColor(110);doc.text(T("Cubelyx - "+$("ver").textContent+" - "+date),15,y);doc.setTextColor(0);y+=6;
      doc.setDrawColor(150);doc.line(15,y,195,y);y+=8;doc.setFontSize(12);
      b.lignes.forEach(l=>{
        doc.setFont("helvetica",l.sub?"normal":"bold");
        for(const part of doc.splitTextToSize(T(l.t),l.sub?165:180)){if(y>282){doc.addPage();y=20}doc.text(part,l.sub?25:15,y);y+=l.sub?5.5:6.5}
      });
    });
    saveFile("Cubelyx_etiquettes_"+new Date().toISOString().slice(0,10)+".pdf",doc.output("arraybuffer"),"application/pdf");
    if(m)m.textContent="Étiquettes enregistrées.";
  }catch(e){if(m)m.textContent=e&&e.code==="declined"?"":"Étiquettes indisponibles dans cet affichage."}
}
async function exportXlsx(){
  const m=$("expmsg");
  try{
    if(typeof XLSX==="undefined")throw {code:"unavailable"};
    
    const wb=XLSX.utils.book_new(),s1=XLSX.utils.aoa_to_sheet(EXP.sum),s2=XLSX.utils.aoa_to_sheet([EXP.head].concat(EXP.rows));
    s1["!cols"]=[{wch:36},{wch:50}];s2["!cols"]=[8,5,18,16,9,28,16,30,9,11,16].map(w=>({wch:w}));
    XLSX.utils.book_append_sheet(wb,s1,"Résumé");XLSX.utils.book_append_sheet(wb,s2,"Détail");
    saveFile("Cubelyx_"+new Date().toISOString().slice(0,10)+".xlsx",XLSX.write(wb,{bookType:"xlsx",type:"array"}),"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    if(m)m.textContent="Fichier enregistré.";
  }catch(e){if(m)m.textContent=e&&e.code==="declined"?"":"Export indisponible dans cet affichage."}
}
$("res").addEventListener("click",e=>{
  if(e.target.closest("#exp"))exportXlsx();
  if(e.target.closest("#pdf")){exportPdf();return}
  if(e.target.closest("#devcp")){copyDevis();return}
  const f=e.target.closest("#fold");
  if(f){const ds=[...document.querySelectorAll("#res details.box")],open=ds.some(d=>d.open);ds.forEach(d=>d.open=!open);f.textContent=open?"Tout déplier":"Tout replier"}
});
const calm=()=>matchMedia("(prefers-reduced-motion: reduce)").matches;
const ANIM='<div class="anim" role="status"><svg viewBox="0 0 120 120" aria-hidden="true"><path class="cb" d="M20 52H100V104H20Z"/><path class="cf" d="M20 104V52L8 40M100 104V52L112 40"/><rect class="i1" x="26" y="88" width="30" height="16"/><rect class="i2" x="60" y="88" width="34" height="16"/><rect class="i3" x="30" y="72" width="58" height="16"/></svg><span>Répartition en cours…</span></div>';
$("go").onclick=()=>{
  view("res");window.t0=Date.now();
  const n=A.reduce((t,a)=>t+a.q,0),go=$("go");
  const run=()=>{try{runPack()}catch(e){$("res").innerHTML='<p class="err">Une erreur est survenue pendant le calcul. Réessaie, ou vide la sélection.</p>'}go.disabled=false};
  go.disabled=true;
  if(calm()){run();return}
  $("res").innerHTML=ANIM.replace("Répartition en cours…","Calcul en cours…"+(n>150?"<br>Grosse commande : quelques secondes…":""));
  setTimeout(run,60);
};
loadState();renderHist();
view("add");renderList();
(()=>{const sp=$("splash");if(!sp)return;const done=()=>sp.remove();if(calm()){done();return}$("spv").textContent="bêta "+VER.beta;sp.addEventListener("click",done);setTimeout(done,1900)})();

// ---- compte, modérateur, déconnexion
["maxw","fill","tare","palmin"].forEach(k=>{$(k).value=D.settings[k]});
$("lo").onclick=async()=>{try{await fetch("/api/logout",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"})}catch(e){}location.href="login.html"};
if(D.client&&D.client.name&&$("cl-name")){$("cl-name").textContent=D.client.name;}
if(D.role==="moderator"){
  $("adm").hidden=false;
}
})();
