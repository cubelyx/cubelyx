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
      }
    ],
    clients: [
      { id: "cl_dl", name: "Diesel Levante", devis_email: "devis@diesellevante.com", created_at: Date.now() }
    ],
    settings: {
      maxw: 25,
      fill: 85,
      tare: 1,
      palmin: 5
    },
    cartons: [
      ["DL 355X255X308", 350, 250, 300, ""],
      ["DL 450X300X350", 450, 300, 350, ""],
      ["DL 250X200X200", 250, 200, 200, ""],
      ["Carton Standard 600X400X400", 600, 400, 400, ""]
    ],
    palettes: [
      ["Palette Europe 80X120", 800, 1200, 1600, 20, ""],
      ["Demi-Palette 60X80", 600, 800, 1200, 10, ""]
    ],
    articles: [
      ["00LK-3M-028-SW", "Turbocompresseur SW", 310, 240, 250, 6.5, "Turbo"],
      ["00LK-3M-001-SW", "Turbocompresseur SW1", 300, 235, 230, 6.1, "Turbo"],
      ["00LK-2T-004-SW", "CHRA 2T", 140, 140, 162, 1.48, "CHRA"],
      ["00LK-2T-005-SW", "CHRA 2T-5", 145, 145, 170, 1.6, "CHRA"],
      ["00LK-3M-045-SW", "Turbocompresseur SW45", 320, 250, 260, 7.2, "Turbo"],
      ["8G12-300-885", "Turbocompresseur neuf", 300, 235, 230, 6.11, "Turbo"],
      ["1000-010-006", "Cartouche CHRA", 140, 140, 162, 1.48, "CHRA"],
      ["ACC-552-PIECE", "Autre pièce mécanique", 180, 120, 100, 2.0, "Autre"]
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
      return JSON.parse(raw);
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

      const client = store.clients.find(c => c.id === currentUser.client_id) || store.clients[0] || { name: "Client", devis_email: "" };

      return makeResp(200, {
        user: currentUser.name,
        role: currentUser.role,
        client: { id: client.id, name: client.name },
        devis_email: client.devis_email || store.moderator_email,
        articles: store.articles,
        cartons: store.cartons,
        palettes: store.palettes,
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
      if (path === "/api/admin/clients") {
        if (method === "GET") {
          return makeResp(200, { ok: true, clients: store.clients });
        }
        if (method === "POST") {
          const name = String(body.name || "").trim();
          const devis_email = String(body.devis_email || "").trim();
          if (!name) return makeResp(400, { ok: false, message: "Nom requis." });
          let c = store.clients.find(x => x.name.toLowerCase() === name.toLowerCase());
          if (c) {
            c.devis_email = devis_email;
          } else {
            c = { id: "cl_" + Math.random().toString(36).substr(2, 9), name, devis_email, created_at: Date.now() };
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
        if (body.articles && Array.isArray(body.articles)) {
          // Formatage des articles pour Cubelyx: [ref, designation, L, W, H, P, cat]
          store.articles = body.articles.map(a => [
            a.ref,
            a.designation || a.ref,
            Number(a.l || a.L || 0),
            Number(a.w || a.W || 0),
            Number(a.h || a.H || 0),
            Number(a.poids || a.P || 0),
            a.categorie || "Autre"
          ]);
        }
        if (body.cartons && Array.isArray(body.cartons)) {
          store.cartons = body.cartons.map(c => [
            c.nom || c.name,
            Number(c.l || c.L || 0),
            Number(c.w || c.W || 0),
            Number(c.h || c.H || 0),
            c.client || ""
          ]);
        }
        if (body.palettes && Array.isArray(body.palettes)) {
          store.palettes = body.palettes.map(p => [
            p.nom || p.name,
            Number(p.l || p.L || 0),
            Number(p.w || p.W || 0),
            Number(p.h || p.H || 0),
            Number(p.poids_vide || 0),
            p.client || ""
          ]);
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
          detail: `Import de ${store.articles.length} articles, ${store.cartons.length} cartons, ${store.palettes.length} palettes.`
        });

        saveStore(store);
        return makeResp(200, { ok: true, imported: { articles: store.articles.length, cartons: store.cartons.length } });
      }
    }

    return makeResp(404, { ok: false, error: "not_found", message: "Route inconnue." });
  };

  console.log("Cubelyx API Shim actif (Mode 100% Client-Side Gratuit).");
})();
