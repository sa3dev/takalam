# Mise en ligne — Dokploy sur VPS

Marche à suivre pour passer de la branche au site en ligne. L'ordre compte : le
DNS doit se propager avant que Dokploy puisse obtenir un certificat.

> Les manipulations Docker, DNS et applicatives ci-dessous ont été vérifiées.
> Les libellés exacts de l'interface Dokploy peuvent différer selon la version —
> à recouper avec sa documentation, la logique reste la même.

---

## 1. Le nom de domaine

À acheter chez n'importe quel registrar (OVH, Namecheap, Porkbun, Cloudflare).
Compte 10 à 15 €/an pour un `.com`.

Le projet suppose **deux entrées** — c'est ce que suppose déjà
`.env.production.example` :

| Domaine | Sert | Pourquoi séparé |
|---|---|---|
| `takalam.xyz` | le frontend Next.js | ce que les gens tapent |
| `api.takalam.xyz` | le backend FastAPI | le WebSocket ne peut pas passer par le proxy Next |

Le second n'est pas une coquetterie : les appels REST transitent par le proxy de
Next (`/api/*`), mais le WebSocket attaque le backend directement. Il lui faut
donc une adresse publique à lui.

### DNS

Deux enregistrements `A` vers l'IP du VPS :

```
@      A     <IP_DU_VPS>
api    A     <IP_DU_VPS>
```

Vérifier la propagation avant de continuer — sinon l'émission du certificat
échoue et il faut recommencer :

```bash
dig +short takalam.xyz
dig +short api.takalam.xyz
```

Les deux doivent renvoyer l'IP du VPS. Compte de quelques minutes à quelques
heures.

---

## 2. Avant de déployer — le contrôle qui peut tout bloquer

**Sur une base neuve, il n'y a rien à faire** : les migrations se déroulent de
zéro, vérifié. Ce point ne concerne **que** le cas d'une base PostgreSQL
existante contenant déjà les tables.

`init_db()` lance `alembic upgrade head` au démarrage, sans rattrapage d'erreur.
La migration initiale `622eb7bc76e4` crée réellement les tables. Si la base a ses
tables mais n'est pas tamponnée à cette révision, le démarrage échoue sur
`CREATE TABLE users` — *already exists* — et l'API ne démarre pas.

```sql
SELECT * FROM alembic_version;
```

- Contient `622eb7bc76e4` ou `8f3c21a7d9e4` → rien à faire.
- Table vide ou absente, mais les tables métier existent → `alembic stamp 622eb7bc76e4` **avant** de déployer.

---

## 3. Les secrets

À générer sur ta machine, pas à réutiliser d'un environnement à l'autre :

```bash
echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)"
echo "SECRET_KEY=$(openssl rand -hex 32)"
echo "JWT_SECRET=$(openssl rand -hex 32)"
```

`GROQ_API_KEY` vient de console.groq.com. C'est la seule clé indispensable :
Edge TTS ne demande rien, OpenAI et ElevenLabs ne servent pas.

---

## 4. Dans Dokploy

1. **Créer une application de type Docker Compose**, branchée sur le dépôt
   GitHub, branche `main` (après fusion de `feat/freemium-paywall`).
2. **Fichier compose** : `docker-compose.prod.yml`.
3. **Variables d'environnement** : recopier `.env.production.example` en
   remplaçant les valeurs. Les entrées à ajuster au domaine réel :

   ```
   NEXT_PUBLIC_API_URL=https://api.takalam.xyz
   NEXT_PUBLIC_WS_URL=wss://api.takalam.xyz
   NEXT_PUBLIC_DOMAIN=takalam.xyz
   ALLOWED_ORIGINS=https://takalam.xyz
   ```

   `wss://` et non `ws://` : en HTTPS, un navigateur refuse une WebSocket en
   clair. La politique de sécurité du contenu se règle d'elle-même sur cette
   variable, il n'y a rien d'autre à modifier.

4. **Domaines** : `takalam.xyz` vers le service `frontend` port 3000,
   `api.takalam.xyz` vers le service `backend` port 8000. Activer HTTPS
   (Let's Encrypt) sur les deux.
5. **Déployer**, puis suivre les journaux du backend : la ligne
   `Database initialized` signale que les migrations sont passées.

---

## 5. Après le premier déploiement

### Vérifier le nombre de proxies

`TRUSTED_PROXY_COUNT` vaut 2 par défaut en production : Traefik, puis le proxy
Next. **À confirmer plutôt qu'à croire.** Une valeur trop basse fait voir la même
IP pour tous les visiteurs, et les limites de débit — dont celle qui protège la
mesure de conversion — deviennent globales : le premier curieux bloquerait tout
le monde.

Depuis deux réseaux différents (ton wifi, ton téléphone en 4G), crée un compte
sur chacun, puis :

```bash
docker logs takalam-backend | grep -i "rate\|limit"
```

Plus simple et sans ambiguïté : dans Dokploy, ouvre un terminal sur le conteneur
backend et regarde ce que voit l'application.

```bash
docker exec takalam-backend python -c "
from app.core.rate_limit import get_client_ip
print('à comparer avec ton IP réelle, via https://ifconfig.me')"
```

Si toutes les requêtes semblent venir d'une IP en `172.x.x.x` (réseau Docker),
la valeur est trop basse — passe à 3 et redéploie.

### Contrôles fonctionnels

- Créer un compte, tenir une conversation, vérifier que la réponse audio arrive.
- La jauge de temps de parole descend après chaque tour → le WebSocket passe.
- Ouvrir le tableau de bord, vérifier qu'une analyse apparaît.
- Forcer le mur pour voir le paywall :
  ```bash
  docker exec takalam-redis redis-cli set "quota:spoken:<user_id>:$(date -u +%F)" 600
  ```

### Sauvegardes

Rien n'est sauvegardé par défaut. Le volume `postgres_data` contient les comptes
et l'historique : c'est la seule chose qu'un incident rendrait irrécupérable.
Dokploy propose des sauvegardes planifiées vers S3 — à activer avant d'avoir de
vrais utilisateurs, pas après.

---

## Points connus

**Un seul worker backend.** `ConnectionManager` garde les connexions WebSocket en
mémoire ; plusieurs workers scinderaient cet état et une conversation sur deux
tomberait. La montée en charge passera par du Redis partagé, pas par
`--workers 2`.

**Noms de conteneurs figés.** `container_name` est codé en dur dans le compose,
ce qui empêche deux déploiements simultanés du même projet sur un même hôte (par
exemple une préproduction à côté). À retirer si tu veux un environnement de
recette sur le même VPS.

**Ressources.** Les limites déclarées totalisent ~2,1 Go de mémoire. Un VPS de
4 Go est confortable, 2 Go est juste — surveille Postgres en premier.

---

## Ce qui a été vérifié pour ce guide

- La pile de production démarre : les quatre services atteignent `healthy`.
- Les migrations se déroulent de zéro sur une base vierge jusqu'à
  `8f3c21a7d9e4`, avec les 6 tables créées.
- Aucun port n'est publié sur l'hôte : `curl http://localhost:8000` échoue depuis
  la machine, seul le réseau Docker donne accès aux services.
- Les healthchecks fonctionnent. Ils utilisaient `curl`, absent des deux images :
  le backend restait éternellement `unhealthy` et le frontend, qui l'attend, ne
  démarrait jamais. Le déploiement se serait figé sans message clair.
