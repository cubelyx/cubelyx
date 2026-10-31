"use strict";
// Tests automatiques : lance-les avec « node test.js » (base SQLite en mémoire, aucun risque pour les vraies données).
const dbm = require("./db"), auth = require("./auth"), { createServer, bootstrap } = require("./server");
let ok = 0, ko = 0;
const t = (name, cond, extra) => { if (cond) ok++; else { ko++; console.log("  ECHEC :", name, extra === undefined ? "" : JSON.stringify(extra)); } };
(async () => {
  const db = dbm.sqliteAdapter(); await dbm.init(db); await auth.init();
  t("bootstrap crée le modérateur", await bootstrap(db, { MODERATOR_EMAIL: "Boss@Exemple.fr", MODERATOR_BOOTSTRAP_PASSWORD: "Demarrage!2026xx" }));
  t("bootstrap ne recrée pas", !(await bootstrap(db, { MODERATOR_EMAIL: "x@y.fr", MODERATOR_BOOTSTRAP_PASSWORD: "Autre!Mdp2026yy" })));
  let weak = false; try { await bootstrap(dbm.sqliteAdapter(), {}); } catch (e) { weak = true; } // base non initialisée -> erreur attendue
  const srv = createServer(db, { prod: false }); await new Promise(r => srv.listen(0, r));
  const base = "http://127.0.0.1:" + srv.address().port;
  const jar = () => ({ c: "" });
  const call = async (j, method, path, body, hdr = {}) => {
    const r = await fetch(base + path, { method, redirect: "manual", headers: Object.assign({ "Content-Type": "application/json", Cookie: j.c }, hdr), body: body === undefined ? undefined : JSON.stringify(body) });
    const sc = r.headers.get("set-cookie"); if (sc) j.c = sc.split(";")[0].endsWith("=") ? "" : sc.split(";")[0];
    let data = null; try { data = await r.json(); } catch (e) {} return { s: r.status, d: data, h: r.headers };
  };
  const mod = jar(), anon = jar();
  // --- pages et en-têtes
  let r = await call(anon, "GET", "/login.html"); t("login.html public", r.s === 200);
  t("en-têtes de sécurité", /default-src 'self'/.test(r.h.get("content-security-policy") || "") && r.h.get("x-content-type-options") === "nosniff" && r.h.get("x-frame-options") === "DENY");
  r = await call(anon, "GET", "/app.html"); t("app.html sans session -> redirection", r.s === 302 && /login/.test(r.h.get("location")));
  r = await call(anon, "GET", "/admin.html"); t("admin.html sans session -> redirection", r.s === 302);
  r = await call(anon, "GET", "/server.js"); t("code serveur non servi", r.s === 404);
  r = await call(anon, "GET", "/../../etc/passwd"); t("chemin interdit", r.s === 404 || r.s === 400);
  r = await call(anon, "GET", "/api/catalog"); t("API sans session -> 401", r.s === 401);
  // --- connexion
  r = await call(anon, "POST", "/api/login", { email: "inconnu@x.fr", password: "nimportequoi" }); const m1 = r.d && r.d.message; t("e-mail inconnu -> 401", r.s === 401);
  r = await call(anon, "POST", "/api/login", { email: "boss@exemple.fr", password: "mauvais" }); t("mauvais mot de passe -> même message", r.s === 401 && r.d.message === m1);
  r = await call(anon, "POST", "/api/login", { email: "boss@exemple.fr", password: "Demarrage!2026xx" }, { Origin: "https://evil.example" }); t("origine étrangère refusée", r.s === 403);
  r = await call(mod, "POST", "/api/login", { email: "BOSS@exemple.fr", password: "Demarrage!2026xx" }); t("modérateur se connecte", r.s === 200 && r.d.mustChange === true && /sid=/.test(mod.c));
  r = await call(mod, "GET", "/api/catalog"); t("changement de mot de passe exigé", r.s === 403 && r.d.error === "must_change");
  r = await call(mod, "POST", "/api/password", { current: "Demarrage!2026xx", new: "court" }); t("mot de passe faible refusé", r.s === 400);
  r = await call(mod, "POST", "/api/password", { current: "Demarrage!2026xx", new: "Demarrage!2026xx" }); t("même mot de passe refusé", r.s === 400);
  r = await call(mod, "POST", "/api/password", { current: "faux", new: "Nouveau!Mdp-2026" }); t("ancien mot de passe faux refusé", r.s === 403);
  r = await call(mod, "POST", "/api/password", { current: "Demarrage!2026xx", new: "Nouveau!Mdp-2026" }); t("changement accepté", r.s === 200);
  r = await call(anon, "POST", "/api/login", { email: "boss@exemple.fr", password: "Demarrage!2026xx" }); t("ancien mot de passe ne marche plus", r.s === 401);
  r = await call(mod, "GET", "/api/me"); t("/api/me", r.s === 200 && r.d.role === "moderator" && r.d.mustChange === false);
  r = await call(mod, "GET", "/admin.html"); t("admin.html accessible au modérateur", r.s === 200);
  // --- import catalogue
  const file = (extra) => Object.assign({
    clients: [{ name: "Diesel Levante", devis_email: "devis@dl.fr" }, { name: "Autre Client", devis_email: "" }],
    articles: [
      { client: "Diesel Levante", ref: "8G12-300-885", designation: "Turbocompresseur neuf", categorie: "Turbo", l: 300, w: 235, h: 230, poids: 6.11 },
      { client: "Diesel Levante", ref: "1000-010-006", designation: "CHRA", categorie: "chra", l: 140, w: 140, h: 162, poids: 1.48 },
      { client: "Autre Client", ref: "SECRET-001", designation: "Pièce confidentielle", categorie: "Autre", l: 100, w: 100, h: 100, poids: 1 }],
    cartons: [{ nom: "DL 355X255X308", l: 350, w: 250, h: 300, client: "" }, { nom: "Carton privé", l: 200, w: 200, h: 200, client: "Autre Client" }],
    palettes: [{ nom: "Palette 80X120", l: 800, w: 1200, h: 1600, poids_vide: 5, client: "" }],
    settings: { maxw: 25, fill: 85, tare: 1, palmin: 5 } }, extra);
  r = await call(mod, "POST", "/api/admin/import", file({ articles: [{ client: "Diesel Levante", ref: "X", categorie: "Bidule", l: 1, w: 1, h: 1, poids: 1 }] })); t("import invalide rejeté (catégorie)", r.s === 400 && r.d.total >= 1);
  r = await call(mod, "POST", "/api/admin/import", file({ articles: [{ client: "Inconnu", ref: "X", categorie: "Autre", l: 1, w: 1, h: 1, poids: 1 }] })); t("import client inconnu rejeté", r.s === 400);
  r = await call(mod, "POST", "/api/admin/import", file({ articles: [{ client: "Diesel Levante", ref: "A", categorie: "Autre", l: -5, w: 1, h: 1, poids: 1 }] })); t("dimension négative rejetée", r.s === 400);
  r = await call(mod, "POST", "/api/admin/import", file({ articles: [{ client: "Diesel Levante", ref: "A", categorie: "Autre", l: 1, w: 1, h: 1, poids: 1 }, { client: "Diesel Levante", ref: "a", categorie: "Autre", l: 1, w: 1, h: 1, poids: 1 }] })); t("doublon rejeté", r.s === 400);
  r = await call(mod, "POST", "/api/admin/import", file()); t("import valide", r.s === 200 && r.d.articles === 3 && r.d.clients === 2, r.d);
  // --- inscription et validation
  const reg = async (email, name = "Jean Test") => call(jar(), "POST", "/api/register", { email, name });
  r = await reg("jean@dl.fr"); t("inscription -> demande reçue", r.s === 200);
  const r2 = await reg("jean@dl.fr"); t("inscription en double -> même réponse (pas de fuite)", r2.s === 200 && r2.d.message === r.d.message);
  r = await call(jar(), "POST", "/api/register", { email: "pas-un-mail", name: "x" }); t("inscription invalide refusée", r.s === 400);
  r = await call(anon, "POST", "/api/login", { email: "jean@dl.fr", password: "Peu importe!123" }); t("compte en attente ne peut pas se connecter", r.s === 401);
  let users = (await call(mod, "GET", "/api/admin/users")).d.users, jean = users.find(u => u.email === "jean@dl.fr"); t("demande visible du modérateur", jean && jean.status === "pending");
  const clients = (await call(mod, "GET", "/api/admin/clients")).d.clients, dl = clients.find(c => c.name === "Diesel Levante"), ac = clients.find(c => c.name === "Autre Client");
  r = await call(mod, "POST", `/api/admin/users/${jean.id}/approve`, {}); t("validation sans client refusée", r.s === 400);
  r = await call(mod, "POST", `/api/admin/users/${jean.id}/approve`, { client_id: dl.id }); const prov = r.d && r.d.provisional; t("validation -> mot de passe provisoire", r.s === 200 && /^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/.test(prov), r.d);
  const ju = jar(); r = await call(ju, "POST", "/api/login", { email: "jean@dl.fr", password: prov }); t("utilisateur se connecte avec le provisoire", r.s === 200 && r.d.mustChange === true);
  r = await call(ju, "GET", "/api/catalog"); t("catalogue bloqué avant changement", r.s === 403);
  r = await call(ju, "POST", "/api/password", { current: prov, new: "jean@dl.fr12345" }); t("mot de passe contenant l'e-mail refusé", r.s === 400);
  r = await call(ju, "POST", "/api/password", { current: prov, new: "MonMotDePasse!2026" }); t("utilisateur choisit son mot de passe", r.s === 200);
  r = await call(ju, "GET", "/api/catalog"); const cat = r.d;
  t("catalogue de son client uniquement", r.s === 200 && cat.articles.length === 2 && !JSON.stringify(cat).includes("SECRET-001") && cat.client.name === "Diesel Levante", cat.articles);
  t("cartons : communs + ceux du client, pas ceux des autres", cat.cartons.length === 1 && cat.cartons[0][0] === "DL 355X255X308");
  t("palettes et réglages fournis", cat.palettes.length === 1 && cat.settings.maxw === "25" && cat.devis_email === "devis@dl.fr");
  r = await call(ju, "GET", "/api/catalog?client=" + ac.id); t("un utilisateur ne peut pas lire un autre client", r.s === 200 && !JSON.stringify(r.d).includes("SECRET-001"));
  r = await call(ju, "GET", "/api/admin/users"); t("utilisateur simple refusé sur l'admin", r.s === 403);
  r = await call(ju, "POST", "/api/admin/import", file()); t("import refusé aux utilisateurs", r.s === 403);
  r = await call(ju, "GET", "/admin.html"); t("page admin refusée aux utilisateurs", r.s === 302);
  r = await call(mod, "GET", "/api/catalog?client=" + ac.id); t("le modérateur peut consulter un client", r.s === 200 && JSON.stringify(r.d).includes("SECRET-001"));
  // --- verrouillage après erreurs
  const lk = jar(); await reg("luc@dl.fr", "Luc Essai"); users = (await call(mod, "GET", "/api/admin/users")).d.users; const luc = users.find(u => u.email === "luc@dl.fr");
  const pv = (await call(mod, "POST", `/api/admin/users/${luc.id}/approve`, { client_id: dl.id })).d.provisional;
  let last; for (let i = 0; i < 5; i++) last = await call(jar(), "POST", "/api/login", { email: "luc@dl.fr", password: "faux" + i });
  r = await call(jar(), "POST", "/api/login", { email: "luc@dl.fr", password: pv }); t("compte bloqué après 5 erreurs (même avec le bon mot de passe)", r.s === 429);
  // --- expiration du provisoire
  await call(mod, "POST", `/api/admin/users/${luc.id}/reset`, {}); const pv2 = (await call(mod, "POST", `/api/admin/users/${luc.id}/reset`, {})).d.provisional;
  await db.query("UPDATE users SET pw_expires=$1, locked_until=0 WHERE id=$2", [Date.now() - 1000, luc.id]);
  r = await call(jar(), "POST", "/api/login", { email: "luc@dl.fr", password: pv2 }); t("mot de passe provisoire expiré refusé", r.s === 401);
  // --- désactivation, déconnexion
  r = await call(mod, "POST", `/api/admin/users/${jean.id}/disable`, {}); t("désactivation", r.s === 200);
  r = await call(ju, "GET", "/api/me"); t("session coupée après désactivation", r.s === 401);
  r = await call(jar(), "POST", "/api/login", { email: "jean@dl.fr", password: "MonMotDePasse!2026" }); t("compte désactivé ne se connecte plus", r.s === 401);
  r = await call(mod, "POST", "/api/logout", {}); t("déconnexion", r.s === 200);
  r = await call(mod, "GET", "/api/me"); t("session invalide après déconnexion", r.s === 401);
  // --- limites
  const big = await fetch(base + "/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "a@b.fr", name: "x".repeat(200000) }) }); t("corps trop volumineux -> 413", big.status === 413);
  const bad = await fetch(base + "/api/register", { method: "POST", headers: { "Content-Type": "text/plain" }, body: "x" }); t("type non JSON refusé", bad.status === 415);
  const sc = await db.query("SELECT pw_hash FROM users WHERE email='jean@dl.fr'"); t("mot de passe stocké chiffré (scrypt)", /^scrypt\$32768\$8\$3\$/.test(sc[0].pw_hash) && !sc[0].pw_hash.includes("MonMotDePasse"));
  const tk = await db.query("SELECT id_hash FROM sessions LIMIT 1"); t("jetons de session stockés hachés", !tk.length || /^[0-9a-f]{64}$/.test(tk[0].id_hash));
  let reg6; for (let i = 0; i < 6; i++) reg6 = await call(jar(), "POST", "/api/register", { email: `bot${i}@x.fr`, name: "Bot " + i }); t("limitation des inscriptions (6e refusée)", reg6.s === 429);
  const aud = await call(mod, "POST", "/api/login", { email: "boss@exemple.fr", password: "Nouveau!Mdp-2026" }); r = await call(mod, "GET", "/api/admin/audit"); t("journal d'audit", r.s === 200 && r.d.entries.some(e => e.action === "approve"));
  console.log(`\n${ok} tests réussis, ${ko} échec(s).`); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error("Erreur de test :", e); process.exit(1); });
