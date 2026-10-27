# Casa

L'appli de l'appart de Lionel et Jaz. Spécifications : [CAHIER_DES_CHARGES.md](CAHIER_DES_CHARGES.md), maquettes dans [docs/](docs/).

Next.js (App Router) + MongoDB Atlas + Ably, déployé sur Vercel.

## Lancer en local

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:3000.

## Mise en place (une seule fois)

### 1. MongoDB Atlas (cluster existant, base `casa`)

1. **Database Access** → ajouter un utilisateur dédié, par exemple `casa-app`, avec un mot de passe long, rôle « Read and write to any database » (ou limité à `casa`).
2. **Network Access** → autoriser `0.0.0.0/0` (les adresses IP de Vercel changent).
3. **Connect → Drivers** → copier la chaîne de connexion `mongodb+srv://…`.

### 2. Fichier `.env.local`

Remplir `.env.local` (déjà créé à partir de `.env.example`, jamais commité) :

- `MONGODB_URI` : la chaîne de connexion Atlas.
- `ACCESS_CODE_HASH` : lancer `npm run hash-code -- <ton code à 6 chiffres>` et copier la ligne « Pour .env.local » (avec les `\$`).
- `ABLY_API_KEY` : à remplir quand le compte Ably existe. Sans clé, l'appli fonctionne et recharge les écrans toutes les 15 secondes.

### 3. Index et catégories par défaut

```bash
npm run seed
```

Le script peut être relancé sans risque : il ne remplace rien.

### 4. Vercel

1. Pousser le dépôt sur GitHub (dépôt privé), puis **Add New → Project** sur Vercel et importer le dépôt.
2. **Settings → Environment Variables** : `MONGODB_URI`, `MONGODB_DB=casa`, `ACCESS_CODE_HASH` (la valeur **sans** les `\`, ligne « Pour Vercel » du script), puis `ABLY_API_KEY` plus tard.
3. Les fonctions tournent à Paris (`vercel.json`, région `cdg1`). Si le cluster Atlas est dans une autre région, ça marche quand même, un peu plus lentement.

### 5. Ably (plus tard)

Créer une appli sur ably.com, copier la clé « Root » (ou une clé avec les droits publish, subscribe, presence) dans `ABLY_API_KEY` sur Vercel et dans `.env.local`, puis redéployer.

## Changer le code d'accès

Relancer `npm run hash-code -- <nouveau code>`, remplacer `ACCESS_CODE_HASH` sur Vercel et redéployer. Les téléphones déjà connectés restent connectés. Pour les déconnecter tous, vider la collection `devices`.

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement (service worker désactivé) |
| `npm run build` | Build de production (avec le service worker) |
| `npm test` | Tests unitaires (Vitest) |
| `npm run typecheck` | Vérification TypeScript |
| `npm run hash-code -- 123456` | Empreinte bcrypt d'un code |
| `npm run seed` | Index et catégories par défaut |
