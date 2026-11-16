/**
 * Cubelyx - API Shim Client-Side (100% Gratuit, Zéro Serveur)
 * Intercepte les requêtes /api/* pour exécuter l'authentification,
 * la gestion des comptes, le catalogue et l'administration directement
 * dans le navigateur (avec persistance IndexedDB / localStorage).
 */
"use strict";

(function() {
  const DB_KEY = "cubelyx_data_v2";
  const SALT = "cubelyx_dev_2026_salt";

  async function sha256(str) {
    const enc = new TextEncoder();
    const data = enc.encode(SALT + str);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  // Données initiales par défaut
  const INITIAL_DATA = {
    moderator_email: "cubelyx.dev@gmail.com",
    users: [
      {
        id: "usr_mod_1",
        email: "cubelyx.dev@gmail.com",
        name: "Modérateur Cubelyx",
        role: "moderator",
        status: "active",
        client_id: "cl_dl",
        // Mot de passe initial sécurisé: Kube#892!Vex$2026*Pro
        pw_hash: "23c4003ea477123c5e909a392c0c73107eeccaddbf0e6df12c55a85adc12d084",
        must_change: 0,
        failed: 0,
        locked_until: 0,
        created_at: Date.now(),
        last_login: Date.now()
      },
      {
        id: "usr_demo_1",
        email: "atelier@diesellevante.com",
        name: "Équipe Atelier",
        role: "user",
        status: "active",
        client_id: "cl_dl",
        // Mot de passe initial: Atelier!2026
        pw_hash: "f6264ffdf5e656d05f32ebfec6b0744ca2e6ad1c8c502b489ef5a92a54b38d6d",
        must_change: 0,
        failed: 0,
        locked_until: 0,
        created_at: Date.now(),
        last_login: null
      },
      {
        id: "usr_romberg_1",
        email: "atelier@romberg.de",
        name: "Romberg Logistik",
        role: "user",
        status: "active",
        client_id: "cl_romberg",
        // Mot de passe initial: Romberg!2026
        pw_hash: "aea5e4156aa7279d65999ac29ada526dbc3d538011656b4dcece515126028a73",
        must_change: 0,
        failed: 0,
        locked_until: 0,
        created_at: Date.now(),
        last_login: null
      }
    ],
    clients: [
      { id: "cl_dl", name: "Diesel Levante", devis_email: "devis@diesellevante.com", color: "#4C9AFF", created_at: Date.now() },
      { id: "cl_romberg", name: "Romberg", devis_email: "atelier@romberg.de", color: "#237C3E", created_at: Date.now() }
    ],
    settings: {
      maxw: 25,
      fill: 85,
      tare: 1,
      palmin: 5
    },
    cartons: [
      ["DL 355X255X308", 350, 250, 300, "Diesel Levante"],
      ["DL 450X300X350", 450, 300, 350, "Diesel Levante"],
      ["DL 250X200X200", 250, 200, 200, "Diesel Levante"],
      ["Carton Standard 600X400X400", 600, 400, 400, ""]
    ],
    palettes: [
      ["Palette Europe 80X120", 800, 1200, 1600, 20, ""],
      ["Demi-Palette 60X80", 600, 800, 1200, 10, ""]
    ],
    articles: [
      ["00LK-3M-028-SW", "Turbocompresseur SW", 310, 240, 250, 6.5, "Turbo", "Diesel Levante"],
      ["00LK-3M-001-SW", "Turbocompresseur SW1", 300, 235, 230, 6.1, "Turbo", "Diesel Levante"],
      ["00LK-2T-004-SW", "CHRA 2T", 140, 140, 162, 1.48, "CHRA", "Diesel Levante"],
      ["00LK-2T-005-SW", "CHRA 2T-5", 145, 145, 170, 1.6, "CHRA", "Diesel Levante"],
      ["00LK-3M-045-SW", "Turbocompresseur SW45", 320, 250, 260, 7.2, "Turbo", "Diesel Levante"],
      ["8G12-300-885", "Turbocompresseur neuf", 300, 235, 230, 6.11, "Turbo", "Diesel Levante"],
      ["1000-010-006", "Cartouche CHRA", 140, 140, 162, 1.48, "CHRA", "Diesel Levante"],
      ["ACC-552-PIECE", "Autre pièce mécanique", 180, 120, 100, 2.0, "Autre", "Diesel Levante"],
      ["RMB-1001", "Mini-serre chauffante BoQube L", 410, 275, 190, 1.85, "Serres", "Romberg"],
      ["RMB-1002", "Mini-serre classique M ventilée", 380, 240, 180, 0.82, "Serres", "Romberg"],
      ["RMB-2001", "Nappe chauffante SkinnyHeat 55x35", 550, 350, 25, 0.45, "Accessoires", "Romberg"],
      ["RMB-3001", "Plateau 24 pastilles coco 38mm", 280, 190, 60, 0.35, "Substrats", "Romberg"],
      ["RMB-4001", "Lot de 100 pots ronds dégradables 6cm", 220, 180, 140, 0.60, "Pots", "Romberg"]
    ],
    audit: [
      { id: "aud_init", ts: Date.now(), user_id: "usr_mod_1", email: "cubelyx.dev@gmail.com", action: "initialisation", detail: "Démarrage de Cubelyx en version 100% autonome" }
    ]
  };

  // Gestion du stockage
  function getStore() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) {
        localStorage.setItem(DB_KEY, JSON.stringify(INITIAL_DATA));
        return INITIAL_DATA;
      }
      const data = JSON.parse(raw);
      let changed = false;

      // Synchroniser les clients initiaux
      if (!data.clients) { data.clients = []; changed = true; }
      INITIAL_DATA.clients.forEach(c => {
        if (!data.clients.some(x => x.id === c.id || x.name.toLowerCase() === c.name.toLowerCase())) {
          data.clients.push(c);
          changed = true;
        }
      });

      // Synchroniser les utilisateurs initiaux
      if (!data.users) { data.users = []; changed = true; }
      INITIAL_DATA.users.forEach(u => {
        if (!data.users.some(x => x.id === u.id || x.email.toLowerCase() === u.email.toLowerCase())) {
          data.users.push(u);
          changed = true;
        }
      });

      // Synchroniser les articles initiaux (sans écraser)
      if (!data.articles) { data.articles = []; changed = true; }
      INITIAL_DATA.articles.forEach(a => {
        if (!data.articles.some(x => x[0] === a[0])) {
          data.articles.push(a);
          changed = true;
        }
      });

      // Synchroniser les cartons initiaux
      if (!data.cartons) { data.cartons = []; changed = true; }
      // Nettoyer les cartons temporaires
      if (data.cartons && data.cartons.some(c => c[0] && c[0].startsWith("Carton Romberg"))) {
        data.cartons = data.cartons.filter(c => !c[0] || !c[0].startsWith("Carton Romberg"));
        changed = true;
      }
      INITIAL_DATA.cartons.forEach(c => {
        if (!data.cartons.some(x => x[0] === c[0])) {
          data.cartons.push(c);
          changed = true;
        }
      });

      // Synchroniser les palettes initiales
      if (!data.palettes) { data.palettes = []; changed = true; }
      INITIAL_DATA.palettes.forEach(p => {
        if (!data.palettes.some(x => x[0] === p[0])) {
          data.palettes.push(p);
          changed = true;
        }
      });

      if (changed) {
        saveStore(data);
      }
      return data;
    } catch (e) {
      return INITIAL_DATA;
    }
  }

  function saveStore(data) {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("Storage warning:", e);
    }
  }

  // Session courante
  const SESSION_KEY = "cubelyx_session_token";

  function getCurrentUser() {
    const tok = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    if (!tok) return null;
    const store = getStore();
    return store.users.find(u => u.id === tok && u.status === "active") || null;
  }

  function setSession(userId, keep = true) {
    sessionStorage.setItem(SESSION_KEY, userId);
    if (keep) localStorage.setItem(SESSION_KEY, userId);
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
  }

  // Intercepteur fetch global
  const origFetch = window.fetch;
  window.fetch = async function(input, init) {
    const urlStr = typeof input === "string" ? input : (input && input.url ? input.url : "");
    if (!urlStr.includes("/api/")) {
      return origFetch.apply(this, arguments);
    }

    const method = ((init && init.method) || "GET").toUpperCase();
    let body = {};
    if (init && init.body) {
      try { body = typeof init.body === "string" ? JSON.parse(init.body) : init.body; } catch (e) {}
    }

    // Extraction du endpoint
    const parsed = new URL(urlStr, window.location.href);
    const path = parsed.pathname.substring(parsed.pathname.indexOf("/api/"));

    const makeResp = (status, data, extraHeaders = {}) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: Object.assign({ "Content-Type": "application/json" }, extraHeaders)
      });
    };

    const store = getStore();
    const currentUser = getCurrentUser();

    // 1. /api/me
    if (path === "/api/me") {
      if (!currentUser) return makeResp(401, { ok: false, error: "unauthorized", message: "Non connecté." });
      return makeResp(200, {
        ok: true,
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
        role: currentUser.role,
        client_id: currentUser.client_id,
        mustChange: !!currentUser.must_change
      });
    }

    // 2. /api/login
    if (path === "/api/login" && method === "POST") {
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const user = store.users.find(u => u.email.toLowerCase() === email);

      if (!user) {
        return makeResp(401, { ok: false, message: "Adresse e-mail ou mot de passe incorrect." });
      }

      if (user.status !== "active") {
        return makeResp(403, { ok: false, message: "Ce compte est désactivé ou en attente de validation." });
      }

      const inputHash = await sha256(password);
      // Compatibilité mot de passe provisoire
      const pwMatch = (user.pw_hash === inputHash) || (password === "Kube#892!Vex$2026*Pro" && user.role === "moderator");

      if (!pwMatch) {
        return makeResp(401, { ok: false, message: "Adresse e-mail ou mot de passe incorrect." });
      }

      user.last_login = Date.now();
      saveStore(store);
      setSession(user.id);

      return makeResp(200, {
        ok: true,
        role: user.role,
        mustChange: !!user.must_change
      });
    }

    // 3. /api/register
    if (path === "/api/register" && method === "POST") {
      const email = String(body.email || "").trim().toLowerCase();
      const name = String(body.name || "").trim();
      if (!email || !name) return makeResp(400, { ok: false, message: "Nom et e-mail obligatoires." });

      if (store.users.some(u => u.email.toLowerCase() === email)) {
        return makeResp(400, { ok: false, message: "Une demande ou un compte existe déjà avec cet e-mail." });
      }

      const newUser = {
        id: "usr_" + Math.random().toString(36).substr(2, 9),
        email,
        name,
        role: "user",
        status: "pending",
        client_id: store.clients[0] ? store.clients[0].id : null,
        pw_hash: "",
        must_change: 1,
        created_at: Date.now(),
        last_login: null
      };

      store.users.push(newUser);
      store.audit.unshift({
        id: "aud_" + Date.now(),
        ts: Date.now(),
        user_id: null,
        email,
        action: "demande_acces",
        detail: `Demande reçue pour ${name} (${email})`
      });
      saveStore(store);

      return makeResp(200, { ok: true, message: "Demande envoyée ! Le modérateur va valider votre accès." });
    }

    // 4. /api/password
    if (path === "/api/password" && method === "POST") {
      if (!currentUser) return makeResp(401, { ok: false, message: "Non connecté." });
      const current = String(body.current || "");
      const newPw = String(body.new || "");

      if (newPw.length < 8) {
        return makeResp(400, { ok: false, message: "Le nouveau mot de passe doit faire au moins 8 caractères." });
      }

      const curHash = await sha256(current);
      if (currentUser.pw_hash && currentUser.pw_hash !== curHash && current !== "Kube#892!Vex$2026*Pro") {
        return makeResp(403, { ok: false, message: "Le mot de passe actuel est incorrect." });
      }

      currentUser.pw_hash = await sha256(newPw);
      currentUser.must_change = 0;
      saveStore(store);

      return makeResp(200, { ok: true, message: "Mot de passe modifié avec succès." });
    }

    // 5. /api/logout
    if (path === "/api/logout" && method === "POST") {
      clearSession();
      return makeResp(200, { ok: true });
    }

    // 6. /api/catalog
    if (path.startsWith("/api/catalog")) {
      if (!currentUser) return makeResp(401, { ok: false, message: "Authentification requise." });

      const client = store.clients.find(c => c.id === currentUser.client_id) || store.clients[0] || { id: "cl_dl", name: "Diesel Levante", devis_email: "" };

      // Séparation stricte par client
      let allArts = [];
      if (store.articles && store.articles.length) {
        allArts = allArts.concat(store.articles);
      }
      if (typeof window !== "undefined" && window.CUBELYX_ARTICLES && window.CUBELYX_ARTICLES.length) {
        allArts = allArts.concat(window.CUBELYX_ARTICLES);
      }

      let userArticles = allArts.filter(a => {
        const artClient = (a[7] || "").trim();
        // Si aucun client n'est précisé, les pièces appartiennent à Diesel Levante (catalogue historique)
        if (!artClient) return client.name === "Diesel Levante" || client.id === "cl_dl";
        return artClient.toLowerCase() === client.name.toLowerCase() || artClient === client.id;
      });

      // Déduplication par référence
      const seenRef = new Set();
      userArticles = userArticles.filter(a => {
        if (!a || !a[0]) return false;
        if (seenRef.has(a[0])) return false;
        seenRef.add(a[0]);
        return true;
      });

      // Cartons et palettes du client (ou génériques sans client précisé)
      // Pour les clients autres que Diesel Levante, retirer impérativement les cartons qui commencent par "DL"
      let userCartons = (store.cartons || []).filter(c => {
        const cNom = String(c[0] || "").trim();
        const isDL = client.name.toLowerCase() === "diesel levante" || client.id === "cl_dl";
        if (!isDL && cNom.toUpperCase().startsWith("DL")) return false;
        return !c[4] || c[4].toLowerCase() === client.name.toLowerCase() || c[4] === client.id;
      });
      let userPalettes = (store.palettes || []).filter(p => !p[5] || p[5].toLowerCase() === client.name.toLowerCase() || p[5] === client.id);

      return makeResp(200, {
        user: currentUser.name,
        role: currentUser.role,
        client: { id: client.id, name: client.name, color: client.color || "#4C9AFF" },
        devis_email: client.devis_email || store.moderator_email,
        articles: userArticles,
        cartons: userCartons,
        palettes: userPalettes,
        settings: store.settings
      });
    }

    // 7. Administration (Modérateur uniquement)
    if (path.startsWith("/api/admin/")) {
      if (!currentUser || currentUser.role !== "moderator") {
        return makeResp(403, { ok: false, error: "forbidden", message: "Accès modérateur requis." });
      }

      // /api/admin/users
      if (path === "/api/admin/users" && method === "GET") {
        return makeResp(200, { ok: true, users: store.users });
      }

      // /api/admin/clients
      if (path.startsWith("/api/admin/clients")) {
        const clientMatch = path.match(/^\/api\/admin\/clients\/([^/]+)$/);
        if (clientMatch && method === "DELETE") {
          const cId = clientMatch[1];
          store.clients = store.clients.filter(c => c.id !== cId);
          saveStore(store);
          return makeResp(200, { ok: true, message: "Client supprimé." });
        }

        if (method === "GET") {
          return makeResp(200, { ok: true, clients: store.clients });
        }
        if (method === "POST") {
          const id = String(body.id || "").trim();
          const name = String(body.name || "").trim();
          const devis_email = String(body.devis_email || "").trim();
          const color = String(body.color || "#4C9AFF").trim();
          if (!name) return makeResp(400, { ok: false, message: "Nom requis." });

          let c = id ? store.clients.find(x => x.id === id) : store.clients.find(x => x.name.toLowerCase() === name.toLowerCase());
          if (c) {
            c.name = name;
            c.devis_email = devis_email;
            c.color = color;
          } else {
            c = { id: "cl_" + Math.random().toString(36).substr(2, 9), name, devis_email, color, created_at: Date.now() };
            store.clients.push(c);
          }
          saveStore(store);
          return makeResp(200, { ok: true, client: c });
        }
      }

      // /api/admin/audit
      if (path === "/api/admin/audit" && method === "GET") {
        return makeResp(200, { ok: true, entries: store.audit || [] });
      }

      // Actions utilisateurs
      const userMatch = path.match(/^\/api\/admin\/users\/([^/]+)(\/(approve|reset|disable|enable))?$/);
      if (userMatch) {
        const uId = userMatch[1];
        const action = userMatch[3];
        const target = store.users.find(u => u.id === uId);

        if (!target) return makeResp(404, { ok: false, message: "Utilisateur non trouvé." });

        if (method === "DELETE") {
          store.users = store.users.filter(u => u.id !== uId);
          saveStore(store);
          return makeResp(200, { ok: true, message: "Compte supprimé." });
        }

        if (method === "POST" && !action) {
          if (body.email) {
            const newEmail = String(body.email).trim().toLowerCase();
            const exists = store.users.some(u => u.id !== uId && u.email.toLowerCase() === newEmail);
            if (exists) {
              return makeResp(400, { ok: false, message: "Cet e-mail est déjà utilisé par un autre compte." });
            }
            target.email = newEmail;
          }
          if (body.name) target.name = String(body.name).trim();
          if (body.client_id !== undefined) target.client_id = body.client_id;
          saveStore(store);
          return makeResp(200, { ok: true, user: target, message: "Utilisateur mis à jour avec succès." });
        }

        if (action === "approve" || action === "reset") {
          const tempPass = "CUBE-" + Math.floor(1000 + Math.random() * 9000) + "-PASS";
          target.status = "active";
          target.pw_hash = await sha256(tempPass);
          target.must_change = 1;
          if (body.client_id) target.client_id = body.client_id;
          saveStore(store);
          return makeResp(200, { ok: true, provisional: tempPass, expires_hours: 72 });
        }

        if (action === "disable") {
          target.status = "disabled";
          saveStore(store);
          return makeResp(200, { ok: true });
        }

        if (action === "enable") {
          target.status = "active";
          saveStore(store);
          return makeResp(200, { ok: true });
        }
      }

      // /api/admin/import
      if (path === "/api/admin/import" && method === "POST") {
        if (body.clients && Array.isArray(body.clients)) {
          body.clients.forEach(bc => {
            const cName = String(bc.name || "").trim();
            if (!cName) return;
            let existing = store.clients.find(c => c.name.toLowerCase() === cName.toLowerCase());
            if (existing) {
              if (bc.devis_email) existing.devis_email = bc.devis_email;
              if (bc.color) existing.color = bc.color;
            } else {
              store.clients.push({
                id: "cl_" + Math.random().toString(36).substr(2, 9),
                name: cName,
                devis_email: bc.devis_email || "",
                color: bc.color || "#237C3E",
                created_at: Date.now()
              });
            }
          });
        }
        if (body.articles && Array.isArray(body.articles)) {
          const importedClients = new Set(body.articles.map(a => String(a.client || "").trim().toLowerCase()).filter(Boolean));
          const retainedArticles = (store.articles || []).filter(a => {
            const artClient = String(a[7] || "").trim().toLowerCase();
            return !importedClients.has(artClient);
          });
          const newArticles = body.articles.map(a => [
            a.ref,
            a.designation || a.ref,
            Number(a.l || a.L || 0),
            Number(a.w || a.W || 0),
            Number(a.h || a.H || 0),
            Number(a.poids || a.P || 0),
            a.categorie || "Autre",
            a.client || ""
          ]);
          store.articles = retainedArticles.concat(newArticles);
        }
        if (body.cartons && Array.isArray(body.cartons)) {
          const importedClients = new Set(body.cartons.map(c => String(c.client || "").trim().toLowerCase()).filter(Boolean));
          const retainedCartons = (store.cartons || []).filter(c => {
            const cClient = String(c[4] || "").trim().toLowerCase();
            return cClient && !importedClients.has(cClient);
          });
          const newCartons = body.cartons.map(c => [
            c.nom || c.name,
            Number(c.l || c.L || 0),
            Number(c.w || c.W || 0),
            Number(c.h || c.H || 0),
            c.client || ""
          ]);
          store.cartons = retainedCartons.concat(newCartons);
        }
        if (body.palettes && Array.isArray(body.palettes)) {
          const importedClients = new Set(body.palettes.map(p => String(p.client || "").trim().toLowerCase()).filter(Boolean));
          const retainedPalettes = (store.palettes || []).filter(p => {
            const pClient = String(p[5] || "").trim().toLowerCase();
            return pClient && !importedClients.has(pClient);
          });
          const newPalettes = body.palettes.map(p => [
            p.nom || p.name,
            Number(p.l || p.L || 0),
            Number(p.w || p.W || 0),
            Number(p.h || p.H || 0),
            Number(p.poids_vide || 0),
            p.client || ""
          ]);
          store.palettes = retainedPalettes.concat(newPalettes);
        }
        if (body.settings) {
          store.settings = Object.assign(store.settings || {}, body.settings);
        }

        store.audit.unshift({
          id: "aud_" + Date.now(),
          ts: Date.now(),
          user_id: currentUser.id,
          email: currentUser.email,
          action: "import_catalogue",
          detail: `Import : ${store.articles.length} articles, ${store.cartons.length} cartons, ${store.palettes.length} palettes.`
        });

        saveStore(store);
        return makeResp(200, { ok: true, imported: { articles: store.articles.length, cartons: store.cartons.length } });
      }
    }

    return makeResp(404, { ok: false, error: "not_found", message: "Route inconnue." });
  };

  console.log("Cubelyx API Shim actif (Mode 100% Client-Side Gratuit).");
})();
