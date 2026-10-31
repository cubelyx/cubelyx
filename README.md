# Cubelyx

Répartition des colis et des palettes (version serveur, test privé).

© Bastien Guillot, tous droits réservés.

## Contenu du dépôt

| Fichier | Rôle |
|---|---|
| `server.js` | Serveur : comptes, validation par le modérateur, catalogue par client, import |
| `auth.js` | Mots de passe chiffrés (scrypt), mots de passe provisoires, règles de sécurité |
| `db.js` | Base de données PostgreSQL (tables créées automatiquement au démarrage) |
| `login.html`, `login.js` | Connexion, demande d'accès, changement de mot de passe |
| `app.html`, `app.js` | L'application Cubelyx (répartition des colis et palettes) |
| `admin.html`, `admin.js` | Espace modérateur : demandes d'accès, utilisateurs, clients, import du fichier final |
| `test.js` | Tests automatiques (`node test.js`) |

## Variables d'environnement (à saisir dans Render, jamais dans le code)

| Nom | Rôle |
|---|---|
| `DATABASE_URL` | Adresse de la base PostgreSQL (fournie par Render) |
| `NODE_ENV` | `production` |
| `MODERATOR_EMAIL` | E-mail du compte modérateur créé au premier démarrage |
| `MODERATOR_BOOTSTRAP_PASSWORD` | Mot de passe de départ du modérateur (à changer à la première connexion, puis à supprimer de Render) |

## Sécurité en bref

- Mots de passe chiffrés avec scrypt ; jamais stockés ni journalisés en clair.
- Inscription sur demande, validée par le modérateur ; mot de passe provisoire à usage unique, valable 72 h, à changer à la première connexion.
- Blocage du compte 15 minutes après 5 erreurs de mot de passe.
- Sessions de 12 h, cookie protégé (HttpOnly, Secure, SameSite), jeton stocké haché.
- Chaque utilisateur ne voit que le catalogue de son client.
- Le serveur ne lit jamais de fichier Excel : le fichier est lu dans le navigateur du modérateur, puis envoyé en JSON contrôlé.
