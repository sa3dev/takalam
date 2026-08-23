# Pièges de déploiement

Ce que cette pile a coûté à découvrir la première fois. `DEPLOYMENT.md` donne la
marche à suivre ; ce fichier-ci liste les pannes qui **ne se signalent pas
elles-mêmes** — celles où le site répond 200, les journaux sont vides, et
pourtant rien ne fonctionne.

Chaque entrée est écrite dans l'ordre où on la rencontre : le symptôme d'abord,
parce que c'est tout ce qu'on a quand ça arrive.

---

## 1. Changer le domaine impose de reconstruire l'image

**Symptôme** — Le site s'affiche, mais `/api/*` répond 500 et la conversation
vocale ne démarre jamais. Aucune erreur nulle part.

**Cause** — `next.config.js` est lu par `next build`, pas par le serveur qui
tourne. Ses `rewrites()`, `headers()` et son bloc `env` sont gelés dans `.next/`
au moment de la construction. Une variable fournie au conteneur arrive trop
tard : la configuration retombe sur ses défauts `localhost`, silencieusement.

Trois dégâts simultanés, tous invisibles :

| Réglage | Valeur gravée si la variable manque au build |
|---|---|
| Proxy `/api/*` | `http://localhost:8000` → rien n'écoute → **500** |
| URL WebSocket | `ws://localhost:8000` → le navigateur du visiteur, pas le serveur |
| CSP `connect-src` | `ws://localhost:8000` → bloque la bonne origine de toute façon |

**Règle** — Les quatre variables passent en `build.args` dans
`docker-compose.prod.yml`, jamais seulement en `environment`. Modifier le
domaine = **rebuild**, pas restart.

**Vérifier** avant de déployer, sur l'image construite :

```bash
docker run --rm <image-builder> sh -c 'cat .next/routes-manifest.json' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print([r['destination'] for r in d['rewrites']['afterFiles'] if '/api/' in r['source']])"
# attendu : ['http://backend:8000/api/:path*']

docker run --rm <image-builder> sh -c 'grep -rhoE "wss?://[a-zA-Z0-9._:-]+" .next/static/chunks/*.js | sort -u'
# attendu : wss://api.<domaine>  — surtout pas localhost
```

---

## 2. `localhost` dans un healthcheck rend le conteneur malsain

**Symptôme** — Le domaine renvoie 404 comme s'il n'existait pas, avec le
certificat `TRAEFIK DEFAULT CERT`. L'application, elle, sert du 200 quand on
l'interroge directement.

**Cause** — Dans un conteneur, `localhost` résout vers `::1` avant `127.0.0.1`.
Les serveurs écoutent sur `0.0.0.0`, donc en IPv4 seulement. Le `wget` de busybox
ne réessaie pas en IPv4 après un refus — il abandonne. Le healthcheck échoue en
boucle, **Traefik écarte les conteneurs non sains**, aucun service n'est
construit, les routeurs qui le référencent sont abandonnés.

D'où un 404 rigoureusement identique à celui d'un domaine jamais configuré.
C'est ce qui rend la panne si trompeuse : on cherche du côté du DNS, des
certificats, de la configuration Dokploy — et tout y est correct.

**Règle** — Toujours `127.0.0.1` dans un healthcheck, jamais `localhost`. Le
`urllib` de Python essaie les adresses l'une après l'autre et masquerait le
problème : ne pas dépendre de la tolérance du client HTTP.

**Diagnostiquer** — Terminal du conteneur dans Dokploy (ni sudo ni SSH requis) :

```sh
wget --spider -q http://localhost:3000/  ; echo "localhost -> $?"
wget --spider -q http://127.0.0.1:3000/  ; echo "127.0.0.1 -> $?"
```

`1` puis `0` : c'est ce piège.

---

## 3. Un 404 Traefik ne dit pas *pourquoi*

Distinguer les deux cas coûte une commande, et oriente tout le reste :

```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: undomainebidon.invalid" http://<IP>/
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: <ton-domaine>" http://<IP>/
```

Même code sur les deux → **aucun routeur** pour ton domaine (conteneur malsain,
ou domaine jamais enregistré). Un `308`/`301` sur le tien → le routeur existe,
le problème est en aval.

Vérifier aussi qui répond, car un 404 applicatif n'est pas un 404 Traefik :

```bash
curl -sI https://api.<domaine>/ws/test | grep -i "server\|content-type"
# server: uvicorn + application/json  → le backend est vivant, c'est FastAPI qui répond
```

---

## 4. Git ne versionne pas les répertoires vides

**Symptôme** — La construction échoue chez Dokploy sur
`"/app/public": not found`, alors qu'elle passe en local.

**Cause** — `frontend/public/` existait sur le disque du développeur et nulle
part ailleurs. `COPY . .` l'embarquait en local ; un clone propre ne le crée pas.

**Règle** — Tout répertoire attendu par un `Dockerfile` doit contenir au moins un
fichier versionné (`.gitkeep`). Ce genre de panne ne peut apparaître qu'au tout
premier déploiement, jamais avant.

**Vérifier** un build comme le ferait la CI, depuis un clone neuf :

```bash
git clone --no-hardlinks . /tmp/citest && cd /tmp/citest/frontend
docker build --target production -t citest .
```

---

## 5. Le domaine de l'API ne doit servir que `/ws`

**Pourquoi** — `TRUSTED_PROXY_COUNT` décrit **une** longueur de chaîne de
proxies. Or les deux chemins n'ont pas la même :

| Chemin | Chaîne | Sauts |
|---|---|---|
| `<domaine>/api/*` (proxy Next) | client → Traefik → Next → backend | 2 |
| `api.<domaine>/api/*` (direct) | client → Traefik → backend | 1 |

Avec un seul réglage global, le domaine direct fait lire `X-Forwarded-For` à la
mauvaise position — et selon la configuration de Traefik, cette position peut
être fournie par le client. Les limites de débit sur `/auth/login` et
`/auth/register` sautent alors : force brute et création de comptes en masse,
chaque compte valant un quota gratuit de pipeline payant.

**Règle** — Dans Dokploy, le domaine `api.` porte le **Path `/ws`**. Seul le
WebSocket en a besoin ; il se limite par `user_id`, pas par IP. Tout le HTTP
passe alors obligatoirement par le proxy Next, et la chaîne à 2 sauts devient la
seule possible.

**Vérifier** :

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://api.<domaine>/api/health
# attendu : 404  ← c'est le succès, plus de route HTTP directe
```

Si Dokploy ajoute un middleware `stripPrefix` avec le Path, le retirer : le
backend attend `/ws/{session_id}` en entier.

---

## Contrôles après chaque mise en production

```bash
D=takalamapp.com

# Certificats — les trois doivent être signés Let's Encrypt, pas TRAEFIK DEFAULT
for h in $D www.$D api.$D; do
  printf "%-24s " "$h"
  echo | openssl s_client -connect $h:443 -servername $h 2>/dev/null \
    | openssl x509 -noout -issuer
done

# Routage
curl -sI https://$D/ | head -1                                  # 200
curl -s  https://$D/api/health                                  # {"status":"healthy",...}
curl -s -o /dev/null -w "%{http_code}\n" https://api.$D/api/health   # 404 attendu

# Limites de débit — des 429 doivent apparaître avant la 15e requête
for i in $(seq 1 15); do
  curl -s -o /dev/null -w "%{http_code} " -H "X-Forwarded-For: 10.0.0.$i" \
    -H 'Content-Type: application/json' -X POST https://$D/api/auth/login \
    -d '{"email":"nobody@example.com","password":"x"}'
done; echo
```

Et le contrôle qu'aucune commande ne remplace : **créer un compte, tenir une
conversation, regarder la jauge descendre.** C'est le seul qui prouve que la
chaîne WebSocket complète — ticket, socket, Whisper, quota — fonctionne.

---

## Accès au VPS

- **Sans SSH ni sudo** : le tableau de bord Dokploy expose un terminal serveur et
  un terminal par conteneur. Suffisant pour la plupart des diagnostics ci-dessus.
- **En SSH** : `ssh -i ~/.ssh/id_hetzner sadev@<IP>` — chemin absolu ou `~`, un
  chemin relatif échoue silencieusement.
- **Attention** : enchaîner les tentatives d'authentification ratées déclenche
  fail2ban et bannit l'IP une dizaine de minutes. Ne pas balayer plusieurs clés.
- `sadev` n'est pas dans le groupe `docker` ; `sudo` réclame un mot de passe. Pour
  s'en affranchir : `sudo usermod -aG docker sadev` (équivaut à un accès root —
  décision consciente).

---

## Reste à traiter

- **Le tableau de bord Dokploy est servi en HTTP nu sur le port 3000.** Les
  identifiants qui donnent accès à toute l'infrastructure — variables
  d'environnement et secrets compris — transitent en clair. À placer derrière un
  domaine en HTTPS (`dokploy.<domaine>`), puis restreindre le port.
- **`/etc/dokploy` est en `drwxrwxrwx`**, et le `.env` de production y est
  lisible par tous les comptes de la machine.
