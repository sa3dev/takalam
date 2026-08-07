# Checklist de mise en production — Freemium & Paywall

État au 30 juillet 2026, branche `feat/freemium-paywall` (non poussée).

Ce document liste ce qui reste à faire autour de la fonctionnalité freemium : le
quota journalier de parole, le mur payant et la mesure d'intention. Il est classé
par urgence, pas par difficulté. Les cases cochées sont faites et vérifiées.

---

> Pour la marche à suivre complète (domaine, DNS, configuration Dokploy),
> voir [DEPLOYMENT.md](DEPLOYMENT.md). Cette section reste la liste des
> contrôles ; le guide donne l'ordre des opérations.

## 1. Bloquant — à contrôler avant tout déploiement

### [ ] État d'Alembic sur la base de production

`init_db()` lance `alembic upgrade head` au démarrage, **sans rattrapage
d'erreur**. La migration initiale `622eb7bc76e4` était un `pass` autogénéré
contre une base déjà peuplée ; elle crée désormais réellement les 4 tables.

Si la base de prod possède ses tables mais n'est pas tamponnée à cette révision,
le déploiement plante au boot sur `CREATE TABLE users` → *already exists*, et
l'API ne démarre pas.

```sql
SELECT * FROM alembic_version;   -- doit contenir 622eb7bc76e4
```

- Ligne présente → rien à faire, `upgrade head` appliquera juste `8f3c21a7d9e4`.
- Table vide ou absente → `alembic stamp 622eb7bc76e4` **avant** de déployer.

### [ ] `TRUSTED_PROXY_COUNT` cohérent avec la prod

Les limites de débit HTTP sont indexées sur l'IP client, extraite du
`X-Forwarded-For` selon `TRUSTED_PROXY_COUNT` (défaut : 1). Si la prod a un
reverse proxy de plus (Cloudflare + nginx, par exemple), toutes les requêtes
seront vues avec la **même** IP : la limite de 10/heure sur
`upgrade-interest` deviendrait globale au lieu d'être par utilisateur, et le
premier curieux bloquerait tous les autres.

### [ ] Persistance Redis

Les compteurs de quota vivent uniquement en Redis (clé datée en UTC, TTL 48 h).
Un Redis vidé = tous les quotas du jour remis à zéro, donc de la consommation
gratuite. Vérifier que le volume est bien monté en prod et que la persistance
est active. Ce n'est pas critique pour l'intégrité — juste pour le coût.

### [ ] Variables d'environnement

| Variable | Défaut | Remarque |
|---|---|---|
| `FREE_DAILY_SPOKEN_SECONDS` | 600 | Le mur se déplace sans redéploiement |
| `PRO_PRICE_MONTHLY_EUR` | 12.99 | Affiché sur le paywall |
| `PRO_PRICE_ANNUAL_EUR` | 129.0 | Affiché sur le paywall |
| `DAILY_SPOKEN_SECONDS_ALERT` | 36000 | Seuil d'alerte dans les logs (10 h/jour, tous utilisateurs) ; 0 désactive |

---

## 2. Avant d'ouvrir aux utilisateurs

Tous les points de cette section sont traités (voir §5), sauf l'arbitrage
ci-dessous, assumé sciemment.

### [~] Le quota se contourne en recréant un compte — assumé, à surveiller

Aucune vérification d'email à l'inscription : un utilisateur qui tape le mur
crée un second compte et repart pour 10 minutes.

**Décision (31 juillet 2026) : on ne corrige pas maintenant.** Pendant une phase
de mesure, la vérification d'email ajoute de la friction à l'inscription, donc
en haut de l'entonnoir que le paywall cherche précisément à mesurer. Le remède
fausserait la mesure autant que le mal.

Signaux qui doivent déclencher la vérification d'email :

- une part notable des comptes créés le même jour qu'un `wall_hit` provenant
  d'une autre adresse — c'est la signature de la recréation de compte ;
- plusieurs comptes partageant un même préfixe d'adresse (`sam+1@`, `sam+2@`) ;
- une consommation Groq qui décroche du nombre de comptes actifs.

Requête de détection à lancer périodiquement :

```sql
SELECT date(u.created_at) AS jour,
       count(*) AS comptes_crees,
       count(*) FILTER (WHERE EXISTS (
         SELECT 1 FROM paywall_events pe
         WHERE pe.event = 'wall_hit' AND date(pe.created_at) = date(u.created_at)
       )) AS le_jour_d_un_mur
FROM users u
GROUP BY 1 ORDER BY 1 DESC LIMIT 30;
```

Le jour où le signal apparaît, le correctif est celui de tout le monde : table
de tokens, endpoint de validation, écran « vérifie ta boîte », parole bloquée
tant que le compte n'est pas vérifié — et un fournisseur d'envoi à choisir
(Resend, Postmark, SES).

---

## 3. Rapidement après la mise en production

Les trois points de cette section sont traités (voir §5). Ce qui reste à faire
vivre : lancer la suite de tests avant chaque déploiement, et regarder les
compteurs de consommation une fois par semaine (voir Procédures).

---

## 4. Dette assumée / plus tard

- **`plan_updated_at` n'est jamais écrit par le code.** Seul un `UPDATE` manuel
  le remplit (voir procédures ci-dessous). Pas d'interface d'administration pour
  octroyer Pro : c'est du SQL à la main, volontairement, tant qu'il n'y a pas de
  facturation.
- **La jauge ne se rafraîchit pas** quand un compte passe en Pro pendant la
  navigation : il faut recharger la page.
- **Rétention de `paywall_events`** : la table conserve `user_id` indéfiniment.
  La suppression de compte les efface (corrigé), mais aucune politique de purge
  ou d'anonymisation n'existe pour les comptes actifs.
- **CGV, mentions TTC/HT, droit de rétractation** : à régler avant d'encaisser,
  pas avant de mesurer.
- **Interface RTL réelle pour l'arabe** : `direction: rtl` n'est appliqué que
  par la classe `.arabic` sur du texte ponctuel. La jauge, la modale, la
  navigation et le dashboard restent en LTR.
- **Pas de configuration ESLint** : `npx eslint` échoue, le projet n'a que
  `tsc`. `next lint` a disparu avec Next 16.

---

## 5. Déjà fait et vérifié

- [x] **Suppression RGPD réparée** (`d03e8b5`) — `paywall_events` bloquait la
      suppression de compte par contrainte de clé étrangère, HTTP 500, et
      seulement pour les utilisateurs ayant vu le paywall. Vérifié : 200.
- [x] **Taille max d'un chunk audio ramenée de 14 Mo à 1,4 Mo de base64** — les
      14 Mo autorisaient près d'une heure d'audio en un seul tour, qu'un compte
      épuisé pouvait s'offrir grâce au débit *après* transcription.
- [x] **Limite de débit sur `upgrade-interest`** (10/heure) — l'endpoint était
      spammable, ce qui polluait la métrique servant à décider du prix. Vérifié :
      la 11e requête renvoie 429.
- [x] **Limite de débit sur `POST /sessions/{id}/analyze`** (20/heure) — chaque
      appel déclenche une analyse LLM, et c'est le seul chemin payant que le
      quota freemium ne couvre pas. Vérifié : la 21e requête renvoie 429.
- [x] **Le micro se désactive quand l'allocation est épuisée**, avec le motif
      affiché et un bouton pour rouvrir le paywall. Sans ce bouton le mur serait
      une impasse : la modale n'est poussée par le serveur qu'au refus d'un tour,
      et les tours ne partent plus. Le bouton « Terminer la session » reste
      accessible — un utilisateur muré doit pouvoir clore proprement.
- [x] **L'heure de rechargement est affichée dans le fuseau du lecteur.** Les
      textes annonçaient « minuit » alors que le compteur est indexé sur la date
      UTC, donc 2h du matin à Paris l'été. Les 3 clés concernées (`resets`,
      `wallBody`, `thanksBody`) portent maintenant un gabarit `{time}` dans les
      7 langues, rempli depuis `resets_at` — un instant absolu — via
      `Intl.DateTimeFormat`. Aucun fuseau à stocker côté serveur.
- [x] **L'écran de remerciement ne promet plus de notification.** « On te
      préviendra dès que c'est prêt » engageait un envoi qui n'existe pas. Le
      texte dit désormais que l'intérêt est enregistré et pèsera dans la
      décision, ce qui est exactement ce que fait le code. Corrigé dans les
      7 langues.
- [x] Le mur tombe **avant** tout appel provider — vérifié, `quota_exceeded`
      immédiat, aucun appel Groq facturé.
- [x] Déduplication du `wall_hit` — vérifié, deux tours murés ne produisent
      qu'une ligne.
- [x] Reconnexion WebSocket au rechargement de page (`2d27f74`).
- [x] **Suite de tests** — 17 tests sur `pytest` couvrant le quota (réservation,
      règlement, cas Pro, passage de jour UTC), la déduplication du `wall_hit` et
      la suppression RGPD. Le test de la suppression a été vérifié par mutation :
      en retirant le correctif `d03e8b5`, il échoue bien.
- [x] **Débit atomique entre onglets** — le quota est désormais *réservé* avant
      la transcription et réglé après, au lieu d'être vérifié puis débité. La
      réservation est un `INCRBY`, donc deux onglets ne peuvent plus lire le même
      total et conclure chacun qu'il reste de la place. Un tour refusé, trop
      volumineux, concurrent ou raté rend intégralement sa réservation :
      vérifié en réel, le compteur revient à son point de départ.
- [x] **Observabilité minimale** — compteur Redis de secondes transcrites par
      jour, tous utilisateurs confondus, et avertissement dans les logs (une
      seule fois par jour) au franchissement de `DAILY_SPOKEN_SECONDS_ALERT`.
      C'est le coût provider qui est suivi, puisque c'est ce qui se facture.

---

## Procédures

### Octroyer Pro à un compte

```sql
UPDATE users SET plan = 'pro', plan_updated_at = now() WHERE email = '…';
```

Renseigner `plan_updated_at` à la main : rien dans le code ne l'écrit, et c'est
la seule trace de l'octroi.

### Lire le taux de conversion

```sql
SELECT
  count(*) FILTER (WHERE event = 'wall_hit')                    AS murs,
  count(*) FILTER (WHERE event = 'interest')                    AS clics,
  count(DISTINCT user_id) FILTER (WHERE event = 'interest')     AS interesses,
  round(100.0 * count(DISTINCT user_id) FILTER (WHERE event = 'interest')
        / nullif(count(*) FILTER (WHERE event = 'wall_hit'), 0), 1) AS taux_pct
FROM paywall_events;
```

Répartition mensuel / annuel :

```sql
SELECT plan_choice, count(*)
FROM paywall_events WHERE event = 'interest'
GROUP BY plan_choice;
```

Le `wall_hit` est dédupliqué par utilisateur et par jour : c'est bien le
dénominateur, un utilisateur muré trois jours de suite compte trois fois.

### Lancer les tests

```bash
docker compose exec backend python -m pytest
```

`pytest` et `fakeredis` font partie de l'étage `dev` de l'image backend, donc
rien à installer et la suite survit à un rebuild. L'image de production, elle,
ne les embarque pas.

Les tests n'ont besoin ni de Postgres ni de Redis : SQLite en mémoire (avec les
clés étrangères activées, sans quoi le test de suppression RGPD ne prouverait
rien) et un Redis simulé. À lancer avant chaque déploiement.

### Surveiller la consommation

```bash
# Secondes transcrites aujourd'hui, tous utilisateurs confondus
docker compose exec redis redis-cli get "usage:spoken:all:$(date -u +%F)"

# Le franchissement du seuil apparaît une fois par jour dans les logs
docker compose logs backend | grep "threshold crossed"
```

```sql
-- Volume quotidien de murs : la demande refoulée, jour par jour
SELECT date(created_at) AS jour, count(*) AS murs
FROM paywall_events WHERE event = 'wall_hit'
GROUP BY 1 ORDER BY 1 DESC LIMIT 30;
```

### Forcer le mur pour tester

```bash
docker compose exec redis redis-cli set "quota:spoken:<user_id>:$(date -u +%F)" 600
docker compose exec redis redis-cli del "quota:spoken:<user_id>:$(date -u +%F)"   # annuler
```
