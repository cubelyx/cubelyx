(()=>{
"use strict";
const $=id=>document.getElementById(id);
const show=v=>{["pl","pr","pc"].forEach(x=>$(x).hidden=x!==v)};
async function post(path,body){
  try{const r=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify(body||{})});
    let d={};try{d=await r.json()}catch(e){}return{s:r.status,d}}
  catch(e){return{s:0,d:{message:"Connexion au serveur impossible."}}}
}
const go=role=>{location.href=role==="moderator"?"/admin.html":"/app.html"};
$("gr").onclick=()=>show("pr");$("gl").onclick=()=>show("pl");
$("fl").addEventListener("submit",async e=>{
  e.preventDefault();$("ml").textContent="";
  const r=await post("/api/login",{email:$("le").value,password:$("lp").value});
  if(r.s===200){if(r.d.mustChange){$("cc").value=$("lp").value;$("lp").value="";show("pc")}else go(r.d.role)}
  else $("ml").textContent=r.d.message||"Erreur.";
});
$("fr").addEventListener("submit",async e=>{
  e.preventDefault();const m=$("mr");m.className="m";m.textContent="";
  const r=await post("/api/register",{name:$("rn").value,email:$("re").value});
  m.className="m "+(r.s===200?"ok":"bad");m.textContent=r.d.message||"Erreur.";
  if(r.s===200){$("fr").reset()}
});
$("fc").addEventListener("submit",async e=>{
  e.preventDefault();const m=$("mc");m.textContent="";
  if($("cn").value!==$("cf").value){m.textContent="Les deux mots de passe ne sont pas identiques.";return}
  const r=await post("/api/password",{current:$("cc").value,new:$("cn").value});
  if(r.s===200){const me=await (await fetch("/api/me",{credentials:"same-origin"})).json();go(me.role)}
  else m.textContent=r.d.message||"Erreur.";
});
// déjà connecté ? (lien « Mon mot de passe » ou changement obligatoire)
(async()=>{
  try{const r=await fetch("/api/me",{credentials:"same-origin"});
    if(r.status===200){const me=await r.json();if(me.mustChange||location.search.includes("change")){show("pc")}else go(me.role)}}catch(e){}
})();
})();
