"use strict";
// Mots de passe : scrypt (intégré à Node), sel aléatoire, comparaison à temps constant.
const crypto = require("crypto");
const N = 32768, R = 8, P = 3, KEY = 64, MAXMEM = 128 * 1024 * 1024;
const scrypt = (pw, salt, n = N, r = R, p = P) => new Promise((ok, ko) =>
  crypto.scrypt(String(pw).normalize("NFKC"), salt, KEY, { N: n, r, p, maxmem: MAXMEM }, (e, k) => e ? ko(e) : ok(k)));

async function hash(pw) {
  const salt = crypto.randomBytes(16), k = await scrypt(pw, salt);
  return ["scrypt", N, R, P, salt.toString("base64"), k.toString("base64")].join("$");
}
async function verify(pw, stored) {
  try {
    const [alg, n, r, p, s, h] = String(stored).split("$");
    if (alg !== "scrypt") return false;
    const exp = Buffer.from(h, "base64"), k = await scrypt(pw, Buffer.from(s, "base64"), +n, +r, +p);
    return k.length === exp.length && crypto.timingSafeEqual(k, exp);
  } catch (e) { return false; }
}
let dummy = "";   // faux hash : même durée de calcul quand l'e-mail n'existe pas
async function init() { dummy = await hash(crypto.randomBytes(16).toString("hex")); }
const getDummy = () => dummy;

const COMMON = new Set(["password1234", "motdepasse12", "azertyuiop12", "qwertyuiop12", "123456789012", "administrateur"]);
function policy(pw, email = "") {
  if (typeof pw !== "string") return "Mot de passe invalide.";
  if (pw.length < 12) return "12 caractères minimum.";
  if (pw.length > 128) return "128 caractères maximum.";
  if (/^(.)\1+$/.test(pw)) return "Mot de passe trop simple.";
  const low = pw.toLowerCase(), local = String(email).split("@")[0].toLowerCase();
  if (COMMON.has(low) || (local.length >= 4 && low.includes(local))) return "Mot de passe trop prévisible.";
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(x => x.test(pw)).length;
  if (classes < 3) return "Mélange au moins 3 types de caractères : minuscules, majuscules, chiffres, symboles.";
  return null;
}
const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";   // sans 0/O/1/I/L
function provisional() {
  let s = ""; for (let i = 0; i < 16; i++) { s += ALPHA[crypto.randomInt(ALPHA.length)]; if (i % 4 === 3 && i < 15) s += "-"; }
  return s;
}
const token = () => crypto.randomBytes(32).toString("base64url");
const sha = t => crypto.createHash("sha256").update(String(t)).digest("hex");
module.exports = { hash, verify, init, getDummy, policy, provisional, token, sha };
