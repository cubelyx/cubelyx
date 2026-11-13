(()=>{
"use strict";
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
async function api(method,path,body){
  const r=await fetch(path,{method,credentials:"same-origin",headers:{"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});
  let d={};try{d=await r.json()}catch(e){}
  if(r.status===401||(r.status===403&&d.error==="must_change")){location.href="login.html";throw new Error("auth")}
  return{s:r.status,d};
}
const fdate=t=>t?new Date(t).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"}):"jamais";
let clients=[];
function showProv(email,prov,h){$("pu").textContent=email;$("pc").textContent=prov;$("ph").textContent=h||72;$("prov").hidden=false;$("prov").scrollIntoView()}
$("pclose").onclick=()=>{$("prov").hidden=true;$("pc").textContent=""};
$("pcopy").onclick=async()=>{try{await navigator.clipboard.writeText($("pc").textContent);$("pcopy").textContent="Copié"}catch(e){$("pcopy").textContent="Sélectionne le code et copie-le"}};
$("lo").onclick=async()=>{try{await api("POST","/api/logout",{})}catch(e){}location.href="login.html"};
async function load(){
  clients=(await api("GET","/api/admin/clients")).d.clients||[];
  const users=(await api("GET","/api/admin/users")).d.users||[];
  const opts=clients.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
  const pend=users.filter(u=>u.status==="pending");
  $("pend").innerHTML=pend.length?pend.map(u=>`<div class="row" data-id="${esc(u.id)}"><div class="t"><b>${esc(u.name)}</b><br><span class="muted">${esc(u.email)} – demandé le ${fdate(u.created_at)}</span></div>
    <select class="cs" aria-label="Client">${opts||'<option value="">Crée d’abord un client</option>'}</select><button class="p" data-a="approve">Valider</button><button class="d" data-a="delete">Refuser</button></div>`).join(""):'<p class="muted">Aucune demande en attente.</p>';
  const act=users.filter(u=>u.status!=="pending");
  const cn=id=>(clients.find(c=>c.id===id)||{}).name||"–";
  $("usr").innerHTML=act.length?act.map(u=>`<div class="row" data-id="${esc(u.id)}"><div class="t"><b>${esc(u.name)}</b> <span class="muted">${u.role==="moderator"?"(modérateur)":""}</span><br><span class="muted">${esc(u.email)} – ${esc(cn(u.client_id))} – ${u.status==="active"?'<span class="ok">actif</span>':'<span class="bad">désactivé</span>'} – dernière connexion : ${fdate(u.last_login)}</span></div>
    ${u.role==="moderator"?"":`<button data-a="reset">Nouveau mot de passe provisoire</button>${u.status==="active"?'<button data-a="disable">Désactiver</button>':'<button data-a="enable">Réactiver</button>'}<button class="d" data-a="delete">Supprimer</button>`}</div>`).join(""):'<p class="muted">Aucun utilisateur.</p>';
  $("cl").innerHTML=clients.length?clients.map(c=>`<div class="row" style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
    <div class="t">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:${esc(c.color||'#4C9AFF')};border:1px solid #fff3;"></span>
        <b>${esc(c.name)}</b>
      </div>
      <span class="muted">Devis : ${esc(c.devis_email||"non renseigné")} • Couleur interface : <code>${esc(c.color||'#4C9AFF')}</code></span>
    </div>
    <div style="display:flex;gap:6px;">
      <button type="button" data-ca="edit" data-id="${esc(c.id)}">Modifier</button>
      <button type="button" class="d" data-ca="delete" data-id="${esc(c.id)}">Supprimer</button>
    </div>
  </div>`).join(""):'<p class="muted">Aucun client pour l’instant.</p>';
  const xd=$("xd"),cur=xd.value;xd.innerHTML='<option value="">(aucun : refuser ces lignes)</option>'+clients.map(c=>`<option>${esc(c.name)}</option>`).join("");xd.value=cur;
  const au=(await api("GET","/api/admin/audit")).d.entries||[];
  $("au").innerHTML="<tr><th>Date</th><th>Action</th><th>Compte</th><th>Détail</th></tr>"+au.map(e=>`<tr><td>${fdate(e.ts)}</td><td>${esc(e.action)}</td><td>${esc(e.email||"")}</td><td>${esc(e.detail||"")}</td></tr>`).join("");
}
document.addEventListener("click",async e=>{
  const b=e.target.closest("button[data-a]");if(!b)return;
  const row=b.closest(".row"),id=row.dataset.id,a=b.dataset.a,email=(row.querySelector(".muted")||{}).textContent||"";
  if(a==="delete"&&!confirm("Supprimer définitivement ce compte ?"))return;
  const body=a==="approve"?{client_id:row.querySelector(".cs").value}:{};
  const r=a==="delete"?await api("DELETE","/api/admin/users/"+id):await api("POST","/api/admin/users/"+id+"/"+a,body);
  if(r.s!==200){alert(r.d.message||"Erreur.");return}
  if(r.d.provisional)showProv(email.split(" – ")[0],r.d.provisional,r.d.expires_hours);
  await load();
  const cb=e.target.closest("button[data-ca]");
  if(cb){
    const ca=cb.dataset.ca,cid=cb.dataset.id;
    const c=clients.find(x=>x.id===cid);
    if(ca==="edit"&&c){
      $("cid").value=c.id;
      $("cn").value=c.name;
      $("ce").value=c.devis_email||"";
      $("ccol").value=c.color||"#4C9AFF";
      $("cbtn").textContent="Mettre à jour "+c.name;
      $("crst").style.display="inline-block";
      $("fcl").scrollIntoView({behavior:"smooth"});
    }
    if(ca==="delete"&&c){
      if(!confirm("Supprimer le client "+c.name+" ?"))return;
      const r=await api("DELETE","/api/admin/clients/"+cid);
      if(r.s===200){resetClientForm();await load()}
      else alert(r.d.message||"Erreur");
    }
    return;
  }
});
function resetClientForm(){
  $("cid").value="";$("fcl").reset();$("ccol").value="#4C9AFF";$("cbtn").textContent="Enregistrer";$("crst").style.display="none";
}
$("crst").onclick=resetClientForm;
$("fcl").addEventListener("submit",async e=>{
  e.preventDefault();
  const r=await api("POST","/api/admin/clients",{id:$("cid").value,name:$("cn").value,devis_email:$("ce").value,color:$("ccol").value});
  if(r.s!==200){alert(r.d.message||"Erreur.");return}
  resetClientForm();
  await load();
});
// ---------- import du fichier final (lu dans le navigateur, le serveur ne lit jamais d'Excel)
const norm=s=>String(s==null?"":s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
const num=v=>typeof v==="number"?v:parseFloat(String(v).replace(",","."));
let payload=null;
function sheet(wb,name){const n=wb.SheetNames.find(x=>norm(x)===norm(name));return n?XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,defval:""}):[]}
function table(rows){if(!rows.length)return[];const h=rows[0].map(norm);return rows.slice(1).filter(r=>r.some(c=>c!=="")).map(r=>{const o={};h.forEach((k,i)=>{if(k)o[k]=r[i]});return o})}
const pick=(o,start)=>{const k=Object.keys(o).find(x=>x===start||x.startsWith(start));return k?o[k]:""};
$("xf").onchange=async ev=>{
  const f=ev.target.files[0];payload=null;$("xgo").disabled=true;$("xe").textContent="";if(!f)return;
  try{
    const wb=XLSX.read(await f.arrayBuffer(),{type:"array"});
    const arts=table(sheet(wb,"Articles")),cart=table(sheet(wb,"Cartons")),pal=table(sheet(wb,"Palettes")),cli=table(sheet(wb,"Clients")),reg=sheet(wb,"Réglages");
    if(!arts.length){$("xs").textContent="Feuille « Articles » introuvable ou vide.";return}
    const settings={};reg.slice(1).forEach(r=>{const k=norm(r[0]);const m=k.includes("poids maximum")?"maxw":k.includes("remplissage")?"fill":k.includes("poids du carton")?"tare":k.includes("passage en palette")?"palmin":null;if(m&&r[1]!=="")settings[m]=num(r[1])});
    const dflt=$("xd").value;
    payload={
      clients:cli.map(c=>({name:String(pick(c,"nom du client")).trim(),devis_email:String(pick(c,"e mail")||"").trim()})).filter(c=>c.name),
      articles:arts.map(a=>({client:String(a.client||dflt||"").trim(),ref:String(a.reference).trim(),designation:String(a.designation||"").trim(),categorie:String(a.categorie||"").trim(),l:num(a["longueur mm"]),w:num(a["largeur mm"]),h:num(a["hauteur mm"]),poids:num(a["poids kg"])})),
      cartons:cart.map(c=>({nom:String(pick(c,"nom du carton")).trim(),l:num(c["longueur mm"]),w:num(c["largeur mm"]),h:num(c["hauteur mm"]),client:String(pick(c,"client")||"").trim()})),
      palettes:pal.map(c=>({nom:String(pick(c,"nom de la palette")).trim(),l:num(c["longueur mm"]),w:num(c["largeur mm"]),h:num(c["hauteur max chargement mm"]),poids_vide:num(c["poids a vide kg"]),client:String(pick(c,"client")||"").trim()})),
      settings};
    const nocl=payload.articles.filter(a=>!a.client).length;
    $("xs").textContent=`${payload.articles.length} articles, ${payload.cartons.length} cartons, ${payload.palettes.length} palettes, ${payload.clients.length} clients${nocl?` – ${nocl} article(s) sans client`:""}.`;
    $("xgo").disabled=false;
  }catch(e){$("xs").textContent="Fichier illisible : "+e.message}
};
$("xgo").onclick=async()=>{
  if(!payload||!confirm("Remplacer les données par ce fichier ?"))return;
  $("xgo").disabled=true;$("xe").textContent="";
  const r=await api("POST","/api/admin/import",payload);
  if(r.s===200){$("xs").innerHTML=`<span class="ok">Import réussi : ${r.d.articles} articles, ${r.d.cartons} cartons, ${r.d.palettes} palettes.</span>`;payload=null;await load()}
  else{$("xe").innerHTML=(r.d.errors||[r.d.message||"Erreur."]).map(esc).join("<br>")+(r.d.total>30?`<br>… et ${r.d.total-30} autre(s).`:"");$("xgo").disabled=false}
};
load();
})();
