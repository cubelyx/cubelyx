"use strict";
// Cubelyx - serveur (Node.js, sans framework : moins de dépendances = moins de risques).
const http = require("http"), fs = require("fs"), path = require("path"), crypto = require("crypto"), zlib = require("zlib");
const auth = require("./auth"), dbm = require("./db");

const FILES = { "/login.html": "login.html", "/login.js": "login.js", "/app.html": "app.html", "/app.js": "app.js", "/admin.html": "admin.html", "/admin.js": "admin.js" };
const PUBLIC_FILES = new Set(["/login.html", "/login.js"]), MOD_FILES = new Set(["/admin.html", "/admin.js"]);
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8" };
const SESSION_MS = 12 * 36e5, PROV_MS = 72 * 36e5, LOCK_MS = 15 * 6e4, MAX_FAILS = 5;
const CATS = { turbo: "Turbo", chra: "CHRA", autre: "Autre" };
const SETTING_KEYS = ["maxw", "fill", "tare", "palmin"], DEFAULTS = { maxw: "25", fill: "85", tare: "1", palmin: "5" };
const CSP = "default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";

const err = (status, code, msg) => Object.assign(new Error(msg || code), { status, code });
const uid = () => crypto.randomUUID();
const isEmail = s => typeof s === "string" && s.length <= 254 && /^[^\s@]{1,64}@[^\s@.]+(\.[^\s@.]+)+$/.test(s);
const clean = (s, max) => typeof s === "string" ? s.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) : "";
const isNum = (v, lo, hi) => typeof v === "number" && isFinite(v) && v >= lo && v <= hi;

async function insertMany(t, table, cols, rows, chunk = 400) {
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk), params = [];
    const values = part.map(r => "(" + r.map(v => { params.push(v); return "$" + params.length; }).join(",") + ")").join(",");
    await t.query(`INSERT INTO ${table}(${cols.join(",")}) VALUES ${values}`, params);
  }
}

async function bootstrap(db, env) {
  if ((await db.query("SELECT id FROM users WHERE role='moderator' LIMIT 1")).length) return false;
  const email = clean(env.MODERATOR_EMAIL || "", 254).toLowerCase(), pw = env.MODERATOR_BOOTSTRAP_PASSWORD || "";
  if (!isEmail(email) || !pw) return false;
  const bad = auth.policy(pw, email); if (bad) throw new Error("Mot de passe de démarrage trop faible : " + bad);
  await db.query("INSERT INTO users(id,email,name,role,status,pw_hash,must_change,failed,locked_until,created_at) VALUES($1,$2,'Modérateur','moderator','active',$3,1,0,0,$4)", [uid(), email, await auth.hash(pw), Date.now()]);
  return true;
}

function createServer(db, opts = {}) {
  const prod = !!opts.prod, dir = opts.dir || __dirname, cookieName = prod ? "__Host-sid" : "sid";
  const cache = {};
  for (const [u, f] of Object.entries(FILES)) { const p = path.join(dir, f); cache[u] = fs.existsSync(p) ? fs.readFileSync(p) : null; }
  const hits = new Map();
  const limited = (key, max, win) => { const t = Date.now(); let h = hits.get(key); if (!h || t > h.r) { h = { n: 0, r: t + win }; hits.set(key, h); } return ++h.n > max; };
  const sweep = setInterval(() => { const t = Date.now(); for (const [k, h] of hits) if (t > h.r) hits.delete(k); }, 6e4); sweep.unref();

  const secHeaders = () => Object.assign({ "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "X-Frame-Options": "DENY", "Permissions-Policy": "camera=(), microphone=(), geolocation=()", "Cross-Origin-Opener-Policy": "same-origin" },
    prod ? { "Strict-Transport-Security": "max-age=31536000; includeSubDomains" } : {});
  const cookies = req => Object.fromEntries((req.headers.cookie || "").split(";").map(s => s.trim().split("=")).filter(a => a[0]).map(a => [a[0], a.slice(1).join("=")]));
  const setCookie = tok => `${cookieName}=${tok}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MS / 1000}${prod ? "; Secure" : ""}`;
  const clearCookie = () => `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${prod ? "; Secure" : ""}`;
  const sameOrigin = req => {
    const sf = req.headers["sec-fetch-site"], o = req.headers.origin;
    if (sf && !["same-origin", "none"].includes(sf)) return false;
    if (o) { try { return new URL(o).host === req.headers.host; } catch (e) { return false; } }
    return true;
  };
  const audit = (userId, action, detail) => db.query("INSERT INTO audit(id,ts,user_id,action,detail) VALUES($1,$2,$3,$4,$5)", [uid(), Date.now(), userId || null, action, clean(String(detail || ""), 300)]);

  async function session(req) {
    const tok = cookies(req)[cookieName]; if (!tok || tok.length > 100) return null;
    const r = await db.query("SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id_hash=$1 AND s.expires_at>$2 AND u.status='active'", [auth.sha(tok), Date.now()]);
    return r[0] || null;
  }
  function readJson(req, limit) {
    return new Promise((ok, ko) => {
      if (!/^application\/json/i.test(req.headers["content-type"] || "")) return ko(err(415, "type", "Format non pris en charge."));
      const parts = []; let n = 0, over = false;
      req.on("data", c => { if (over) return; n += c.length; if (n > limit) { over = true; parts.length = 0; ko(err(413, "size", "Envoi trop volumineux.")); return; } parts.push(c); });
      req.on("end", () => { if (over) return; try { ok(JSON.parse(Buffer.concat(parts).toString("utf8") || "{}")); } catch (e) { ko(err(400, "json", "Requête illisible.")); } });
      req.on("error", () => ko(err(400, "io")));
    });
  }
  function sendJson(req, res, status, obj, extra) {
    const body = Buffer.from(JSON.stringify(obj)), h = Object.assign({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }, secHeaders(), extra);
    if (body.length > 2048 && /\bgzip\b/.test(req.headers["accept-encoding"] || "")) { h["Content-Encoding"] = "gzip"; h.Vary = "Accept-Encoding"; res.writeHead(status, h); res.end(zlib.gzipSync(body)); }
    else { res.writeHead(status, h); res.end(body); }
  }
  async function serveStatic(req, res, p, m) {
    if (m !== "GET" && m !== "HEAD") throw err(405, "method", "Méthode non autorisée.");
    if (p === "/") { const u = await session(req); res.writeHead(302, Object.assign({ Location: u ? "/app.html" : "/login.html" }, secHeaders())); return res.end(); }
    const f = cache[p]; if (!f) throw err(404, "notfound", "Page introuvable.");
    if (!PUBLIC_FILES.has(p)) {
      const u = await session(req);
      if (!u || (MOD_FILES.has(p) && u.role !== "moderator")) { res.writeHead(302, Object.assign({ Location: "/login.html" }, secHeaders())); return res.end(); }
    }
    res.writeHead(200, Object.assign({ "Content-Type": MIME[path.extname(p)], "Content-Security-Policy": CSP, "Cache-Control": "no-store" }, secHeaders()));
    res.end(m === "HEAD" ? undefined : f);
  }

  async function getSettings() { const s = Object.assign({}, DEFAULTS); for (const r of await db.query("SELECT key,value FROM settings")) s[r.key] = r.value; return s; }

  async function route(req, res, m, p, url, body, ip) {
    const J = (s, o, x) => sendJson(req, res, s, o, x);
    // ---------- public
    if (m === "POST" && p === "/api/register") {
      if (limited("reg:" + ip, 5, 36e5)) throw err(429, "rate", "Trop de demandes. Réessaie plus tard.");
      const email = clean(body.email, 254).toLowerCase(), name = clean(body.name, 80);
      if (!isEmail(email) || name.length < 2) throw err(400, "invalid", "Renseigne ton nom et une adresse e-mail valide.");
      if ((await db.query("SELECT COUNT(*) AS n FROM users WHERE status='pending'"))[0].n >= 200) throw err(429, "full", "Trop de demandes en attente. Réessaie plus tard.");
      if (!(await db.query("SELECT id FROM users WHERE email=$1", [email])).length) {
        const id = uid(); await db.query("INSERT INTO users(id,email,name,role,status,must_change,failed,locked_until,created_at) VALUES($1,$2,$3,'user','pending',0,0,0,$4)", [id, email, name, Date.now()]); await audit(id, "register", email);
      }
      return J(200, { ok: true, message: "Demande reçue. L'administrateur doit la valider avant de t'envoyer un mot de passe provisoire." });
    }
    if (m === "POST" && p === "/api/login") {
      if (limited("log:" + ip, 20, 9e5)) throw err(429, "rate", "Trop d'essais. Réessaie dans quelques minutes.");
      const email = clean(body.email, 254).toLowerCase(), pw = typeof body.password === "string" ? body.password.slice(0, 200) : "";
      const u = (await db.query("SELECT * FROM users WHERE email=$1", [email]))[0], t = Date.now();
      const okPw = await auth.verify(pw, u && u.pw_hash ? u.pw_hash : auth.getDummy());
      if (u && u.locked_until > t) throw err(429, "locked", "Compte temporairement bloqué. Réessaie dans quelques minutes.");
      const valid = u && u.pw_hash && okPw && u.status === "active" && !(u.must_change && u.pw_expires && t > u.pw_expires);
      if (!valid) {
        if (u && u.status === "active") { const f = u.failed + 1; await db.query("UPDATE users SET failed=$1,locked_until=$2 WHERE id=$3", [f >= MAX_FAILS ? 0 : f, f >= MAX_FAILS ? t + LOCK_MS : 0, u.id]); await audit(u.id, "login_fail", ""); }
        throw err(401, "badcreds", "Identifiants incorrects, ou compte non activé.");
      }
      const tok = auth.token();
      await db.query("INSERT INTO sessions(id_hash,user_id,created_at,expires_at) VALUES($1,$2,$3,$4)", [auth.sha(tok), u.id, t, t + SESSION_MS]);
      await db.query("UPDATE users SET failed=0,locked_until=0,last_login=$1 WHERE id=$2", [t, u.id]);
      await db.query("DELETE FROM sessions WHERE expires_at<$1", [t]); await audit(u.id, "login_ok", "");
      return J(200, { ok: true, mustChange: !!u.must_change, role: u.role }, { "Set-Cookie": setCookie(tok) });
    }
    // ---------- connecté
    const u = await session(req); if (!u) throw err(401, "auth", "Connexion requise.");
    if (m === "POST" && p === "/api/logout") {
      await db.query("DELETE FROM sessions WHERE id_hash=$1", [auth.sha(cookies(req)[cookieName] || "")]);
      return J(200, { ok: true }, { "Set-Cookie": clearCookie() });
    }
    if (u.must_change && !["/api/me", "/api/password"].includes(p)) throw err(403, "must_change", "Tu dois d'abord changer ton mot de passe.");
    if (m === "GET" && p === "/api/me") {
      const c = u.client_id ? (await db.query("SELECT id,name FROM clients WHERE id=$1", [u.client_id]))[0] : null;
      return J(200, { id: u.id, email: u.email, name: u.name, role: u.role, mustChange: !!u.must_change, client: c || null });
    }
    if (m === "POST" && p === "/api/password") {
      const cur = typeof body.current === "string" ? body.current.slice(0, 200) : "", nw = body.new;
      if (!(await auth.verify(cur, u.pw_hash))) throw err(403, "badpw", "Mot de passe actuel incorrect.");
      const bad = auth.policy(nw, u.email); if (bad) throw err(400, "weak", bad);
      if (await auth.verify(nw, u.pw_hash)) throw err(400, "same", "Choisis un mot de passe différent de l'actuel.");
      await db.query("UPDATE users SET pw_hash=$1,must_change=0,pw_expires=NULL,failed=0,locked_until=0 WHERE id=$2", [await auth.hash(nw), u.id]);
      await db.query("DELETE FROM sessions WHERE user_id=$1 AND id_hash<>$2", [u.id, auth.sha(cookies(req)[cookieName] || "")]);
      await audit(u.id, "password_change", ""); return J(200, { ok: true });
    }
    if (m === "GET" && p === "/api/catalog") {
      let cid = u.client_id;
      if (u.role === "moderator") cid = url.searchParams.get("client") || cid || ((await db.query("SELECT id FROM clients ORDER BY name LIMIT 1"))[0] || {}).id;
      const settings = await getSettings();
      if (!cid) return J(200, { client: null, articles: [], cartons: [], palettes: [], settings, devis_email: "", role: u.role });
      const cl = (await db.query("SELECT id,name,devis_email FROM clients WHERE id=$1", [cid]))[0]; if (!cl) throw err(404, "client", "Client introuvable.");
      const arts = (await db.query("SELECT ref,designation,l,w,h,poids,categorie FROM articles WHERE client_id=$1 ORDER BY ref", [cid])).map(r => [r.ref, r.designation || "", r.l, r.w, r.h, r.poids, r.categorie]);
      const cartons = (await db.query("SELECT nom,l,w,h FROM cartons WHERE client_id IS NULL OR client_id=$1 ORDER BY l*w*h", [cid])).map(r => [r.nom, r.l, r.w, r.h]);
      const pal = (await db.query("SELECT nom,l,w,h,poids_vide FROM palettes WHERE client_id IS NULL OR client_id=$1 ORDER BY l*w*h", [cid])).map(r => [r.nom, r.l, r.w, r.h, r.poids_vide]);
      return J(200, { client: { id: cl.id, name: cl.name }, articles: arts, cartons, palettes: pal, settings, devis_email: cl.devis_email || "", role: u.role, user: u.id });
    }
    // ---------- modérateur
    if (!p.startsWith("/api/admin/")) throw err(404, "notfound", "Introuvable.");
    if (u.role !== "moderator") throw err(403, "forbidden", "Accès réservé au modérateur.");
    if (m === "GET" && p === "/api/admin/users") return J(200, { users: (await db.query("SELECT id,email,name,role,status,client_id,created_at,last_login FROM users ORDER BY created_at DESC")).map(r => r) });
    if (m === "GET" && p === "/api/admin/clients") return J(200, { clients: await db.query("SELECT id,name,devis_email FROM clients ORDER BY name") });
    if (m === "GET" && p === "/api/admin/audit") return J(200, { entries: await db.query("SELECT a.ts,a.action,a.detail,u.email FROM audit a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.ts DESC LIMIT 100") });
    if (m === "POST" && p === "/api/admin/clients") {
      const name = clean(body.name, 80), de = clean(body.devis_email || "", 254).toLowerCase();
      if (name.length < 2 || (de && !isEmail(de))) throw err(400, "invalid", "Nom ou e-mail invalide.");
      const ex = (await db.query("SELECT id FROM clients WHERE name=$1", [name]))[0];
      if (ex) await db.query("UPDATE clients SET devis_email=$1 WHERE id=$2", [de, ex.id]); else await db.query("INSERT INTO clients(id,name,devis_email,created_at) VALUES($1,$2,$3,$4)", [uid(), name, de, Date.now()]);
      await audit(u.id, "client_save", name); return J(200, { ok: true });
    }
    let mm;
    if ((mm = p.match(/^\/api\/admin\/users\/([0-9a-f-]{36})\/(approve|reset|disable|enable)$/)) && m === "POST") {
      const t = (await db.query("SELECT * FROM users WHERE id=$1", [mm[1]]))[0]; if (!t) throw err(404, "user", "Utilisateur introuvable.");
      if (t.id === u.id) throw err(400, "self", "Action impossible sur ton propre compte.");
      const act = mm[2];
      if (act === "approve" || act === "reset") {
        let cid = t.client_id;
        if (act === "approve") { cid = body.client_id; if (!cid || !(await db.query("SELECT id FROM clients WHERE id=$1", [cid])).length) throw err(400, "client", "Choisis un client."); }
        else if (t.status !== "active") throw err(400, "state", "Le compte doit être actif.");
        const prov = auth.provisional();
        await db.query("UPDATE users SET status='active',client_id=$1,pw_hash=$2,must_change=1,pw_expires=$3,failed=0,locked_until=0 WHERE id=$4", [cid, await auth.hash(prov), Date.now() + PROV_MS, t.id]);
        await db.query("DELETE FROM sessions WHERE user_id=$1", [t.id]); await audit(u.id, act, t.email);
        return J(200, { ok: true, provisional: prov, expires_hours: PROV_MS / 36e5 });
      }
      if (act === "disable") { await db.query("UPDATE users SET status='disabled' WHERE id=$1", [t.id]); await db.query("DELETE FROM sessions WHERE user_id=$1", [t.id]); }
      else { if (!t.pw_hash) throw err(400, "nopw", "Génère d'abord un mot de passe provisoire (réinitialiser)."); await db.query("UPDATE users SET status='active' WHERE id=$1", [t.id]); }
      await audit(u.id, act, t.email); return J(200, { ok: true });
    }
    if ((mm = p.match(/^\/api\/admin\/users\/([0-9a-f-]{36})$/)) && m === "DELETE") {
      const t = (await db.query("SELECT * FROM users WHERE id=$1", [mm[1]]))[0]; if (!t) throw err(404, "user", "Utilisateur introuvable.");
      if (t.id === u.id || t.role === "moderator") throw err(400, "self", "Suppression impossible.");
      await db.query("DELETE FROM sessions WHERE user_id=$1", [t.id]); await db.query("DELETE FROM users WHERE id=$1", [t.id]); await audit(u.id, "delete_user", t.email); return J(200, { ok: true });
    }
    if (m === "POST" && p === "/api/admin/import") return importAll(u, body, J);
    throw err(404, "notfound", "Introuvable.");
  }

  async function importAll(u, b, J) {
    const errs = [], push = s => { if (errs.length < 400) errs.push(s); };
    const clients = Array.isArray(b.clients) ? b.clients : [], arts = Array.isArray(b.articles) ? b.articles : [], cartons = Array.isArray(b.cartons) ? b.cartons : [], pals = Array.isArray(b.palettes) ? b.palettes : [];
    if (arts.length > 40000 || cartons.length > 500 || pals.length > 200 || clients.length > 200) throw err(400, "size", "Fichier trop volumineux.");
    const cNames = new Set(), cl = [];
    clients.forEach((c, i) => { const name = clean(c && c.name, 80), de = clean((c && c.devis_email) || "", 254).toLowerCase(); if (name.length < 2) return push("Clients ligne " + (i + 2) + " : nom manquant."); if (de && !isEmail(de)) push("Clients ligne " + (i + 2) + " : e-mail invalide."); cNames.add(name); cl.push({ name, devis_email: de }); });
    const existing = new Set((await db.query("SELECT name FROM clients")).map(r => r.name));
    const known = n => cNames.has(n) || existing.has(n);
    const seen = new Set(), A = [];
    arts.forEach((a, i) => {
      const row = "Articles ligne " + (i + 2) + " : ";
      const client = clean(a && a.client, 80), ref = clean(a && a.ref, 60), des = clean((a && a.designation) || "", 120), cat = CATS[String((a && a.categorie) || "").toLowerCase()];
      if (!client || !known(client)) return push(row + "client absent ou inconnu (« " + client + " »).");
      if (!ref || /[<>"'`\\]/.test(ref)) return push(row + "référence invalide.");
      if (!cat) return push(row + "catégorie invalide (Turbo, CHRA ou Autre).");
      if (![a.l, a.w, a.h].every(v => isNum(v, 0, 20000)) || !isNum(a.poids, 0, 5000)) return push(row + "dimensions ou poids invalides.");
      const k = client + "\u0001" + ref.toLowerCase(); if (seen.has(k)) return push(row + "référence en double pour ce client."); seen.add(k);
      A.push({ client, ref, des, cat, l: a.l, w: a.w, h: a.h, poids: a.poids });
    });
    const C = [], Pa = [];
    cartons.forEach((c, i) => { const nom = clean(c && c.nom, 60), cl2 = clean((c && c.client) || "", 80); if (!nom || ![c.l, c.w, c.h].every(v => isNum(v, 1, 20000))) return push("Cartons ligne " + (i + 2) + " : invalide."); if (cl2 && !known(cl2)) return push("Cartons ligne " + (i + 2) + " : client inconnu."); C.push({ nom, l: c.l, w: c.w, h: c.h, client: cl2 }); });
    pals.forEach((c, i) => { const nom = clean(c && c.nom, 60), cl2 = clean((c && c.client) || "", 80); if (!nom || ![c.l, c.w, c.h].every(v => isNum(v, 1, 20000)) || !isNum(c.poids_vide, 0, 1000)) return push("Palettes ligne " + (i + 2) + " : invalide."); if (cl2 && !known(cl2)) return push("Palettes ligne " + (i + 2) + " : client inconnu."); Pa.push({ nom, l: c.l, w: c.w, h: c.h, pv: c.poids_vide, client: cl2 }); });
    const st = {}; for (const k of SETTING_KEYS) if (b.settings && b.settings[k] != null) { const v = Number(b.settings[k]); if (!isFinite(v) || v < 0 || v > 10000) push("Réglage « " + k + " » invalide."); else st[k] = String(v); }
    if (errs.length) return J(400, { ok: false, errors: errs.slice(0, 30), total: errs.length });
    await db.tx(async t => {
      for (const c of cl) { const ex = (await t.query("SELECT id FROM clients WHERE name=$1", [c.name]))[0]; if (ex) await t.query("UPDATE clients SET devis_email=$1 WHERE id=$2", [c.devis_email, ex.id]); else await t.query("INSERT INTO clients(id,name,devis_email,created_at) VALUES($1,$2,$3,$4)", [uid(), c.name, c.devis_email, Date.now()]); }
      const idOf = Object.fromEntries((await t.query("SELECT id,name FROM clients")).map(r => [r.name, r.id]));
      for (const n of new Set(A.map(a => a.client))) await t.query("DELETE FROM articles WHERE client_id=$1", [idOf[n]]);
      await insertMany(t, "articles", ["client_id", "ref", "designation", "l", "w", "h", "poids", "categorie"], A.map(a => [idOf[a.client], a.ref, a.des, a.l, a.w, a.h, a.poids, a.cat]));
      await t.query("DELETE FROM cartons"); await insertMany(t, "cartons", ["id", "nom", "l", "w", "h", "client_id"], C.map(c => [uid(), c.nom, c.l, c.w, c.h, c.client ? idOf[c.client] : null]));
      await t.query("DELETE FROM palettes"); await insertMany(t, "palettes", ["id", "nom", "l", "w", "h", "poids_vide", "client_id"], Pa.map(c => [uid(), c.nom, c.l, c.w, c.h, c.pv, c.client ? idOf[c.client] : null]));
      for (const [k, v] of Object.entries(st)) await t.query("INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [k, v]);
    });
    await audit(u.id, "import", `${A.length} articles, ${C.length} cartons, ${Pa.length} palettes`);
    return J(200, { ok: true, articles: A.length, cartons: C.length, palettes: Pa.length, clients: cl.length });
  }

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://x"), p = url.pathname, m = req.method;
    const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
    try {
      if (limited("g:" + ip, 600, 6e4)) throw err(429, "rate", "Trop de requêtes.");
      if (!p.startsWith("/api/")) return await serveStatic(req, res, p, m);
      let body = {};
      if (m !== "GET" && m !== "HEAD") { if (!sameOrigin(req)) throw err(403, "origin", "Requête refusée."); body = await readJson(req, p === "/api/admin/import" ? 12e6 : 64e3); if (!body || typeof body !== "object" || Array.isArray(body)) throw err(400, "json", "Requête illisible."); }
      await route(req, res, m, p, url, body, ip);
    } catch (e) {
      const status = e.status || 500; if (status === 500) console.error("Erreur serveur:", e && e.message);
      if (res.headersSent) return res.end();
      if (status === 413) res.once("finish", () => req.destroy());
      sendJson(req, res, status, { ok: false, error: e.code || "server", message: status === 500 ? "Erreur serveur." : e.message }, status === 413 ? { Connection: "close" } : undefined);
    }
  });
}

async function main() {
  const url = process.env.DATABASE_URL; if (!url) { console.error("DATABASE_URL manquant."); process.exit(1); }
  const prod = process.env.NODE_ENV === "production", db = dbm.pgAdapter(url, process.env.PGSSL);
  await dbm.init(db); await auth.init();
  if (await bootstrap(db, process.env)) console.log("Compte modérateur créé : connecte-toi puis change le mot de passe.");
  createServer(db, { prod }).listen(process.env.PORT || 3000, () => console.log("Cubelyx prêt."));
}
module.exports = { createServer, bootstrap };
if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });
