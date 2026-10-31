"use strict";
// Accès à la base. PostgreSQL en production ; SQLite intégré à Node pour les tests.
const SCHEMA = [
  "CREATE TABLE IF NOT EXISTS clients(id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, devis_email TEXT, created_at BIGINT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, role TEXT NOT NULL, status TEXT NOT NULL, client_id TEXT, pw_hash TEXT, must_change INTEGER NOT NULL DEFAULT 0, pw_expires BIGINT, failed INTEGER NOT NULL DEFAULT 0, locked_until BIGINT NOT NULL DEFAULT 0, created_at BIGINT NOT NULL, last_login BIGINT)",
  "CREATE TABLE IF NOT EXISTS sessions(id_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at BIGINT NOT NULL, expires_at BIGINT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS articles(client_id TEXT NOT NULL, ref TEXT NOT NULL, designation TEXT, l DOUBLE PRECISION NOT NULL, w DOUBLE PRECISION NOT NULL, h DOUBLE PRECISION NOT NULL, poids DOUBLE PRECISION NOT NULL, categorie TEXT NOT NULL, PRIMARY KEY(client_id, ref))",
  "CREATE TABLE IF NOT EXISTS cartons(id TEXT PRIMARY KEY, nom TEXT NOT NULL, l DOUBLE PRECISION NOT NULL, w DOUBLE PRECISION NOT NULL, h DOUBLE PRECISION NOT NULL, client_id TEXT)",
  "CREATE TABLE IF NOT EXISTS palettes(id TEXT PRIMARY KEY, nom TEXT NOT NULL, l DOUBLE PRECISION NOT NULL, w DOUBLE PRECISION NOT NULL, h DOUBLE PRECISION NOT NULL, poids_vide DOUBLE PRECISION NOT NULL, client_id TEXT)",
  "CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY, ts BIGINT NOT NULL, user_id TEXT, action TEXT NOT NULL, detail TEXT)",
  "CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)",
  "CREATE INDEX IF NOT EXISTS idx_articles_client ON articles(client_id)"
];
function pgAdapter(url, ssl) {
  const pg = require("pg");
  pg.types.setTypeParser(20, v => Number(v));            // BIGINT -> nombre
  const pool = new pg.Pool({ connectionString: url, max: 8, ssl: ssl === "disable" ? false : { rejectUnauthorized: false } });
  const wrap = c => ({ query: async (t, p = []) => (await c.query(t, p)).rows });
  return {
    query: async (t, p = []) => (await pool.query(t, p)).rows,
    async tx(fn) {
      const c = await pool.connect();
      try { await c.query("BEGIN"); const r = await fn(wrap(c)); await c.query("COMMIT"); return r; }
      catch (e) { try { await c.query("ROLLBACK"); } catch (x) {} throw e; }
      finally { c.release(); }
    },
    close: () => pool.end()
  };
}
function sqliteAdapter(file) {                           // uniquement pour les tests
  const { DatabaseSync } = require("node:sqlite"), d = new DatabaseSync(file || ":memory:");
  const q = async (t, p = []) => d.prepare(t.replace(/\$(\d+)/g, "?$1")).all(...p).map(r => ({ ...r }));
  return { query: q, async tx(fn) { d.exec("BEGIN"); try { const r = await fn({ query: q }); d.exec("COMMIT"); return r; } catch (e) { d.exec("ROLLBACK"); throw e; } }, close: () => d.close() };
}
async function init(db) { for (const s of SCHEMA) await db.query(s); }
module.exports = { pgAdapter, sqliteAdapter, init };
