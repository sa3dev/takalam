# Checklist de mise en production — Freemium & Paywall

État au 30 juillet 2026, branche `feat/freemium-paywall` (non poussée).

Ce document liste ce qui reste à faire autour de la fonctionnalité freemium : le
quota journalier de parole, le mur payant et la mesure d'intention. Il est classé
par urgence, pas par difficulté. Les cases cochées sont faites et vérifiées.

---

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

---

## 2. Avant d'ouvrir aux utilisateurs

### [ ] Le micro reste actif après le mur

L'utilisateur ferme la modale, reparle, le serveur refuse, la modale revient.
Le bouton devrait être désactivé avec la raison affichée, plutôt que de tendre
un piège. C'est le seul endroit où l'app punit une action qu'elle a autorisée.

### [ ] « Recharge à minuit » est faux

Le quota est indexé sur la date **UTC** : le rechargement a lieu à 2h du matin
à Paris l'été, 1h l'hiver. Deux options : corriger le texte (« à minuit UTC »),
ou passer la clé Redis sur le fuseau de l'utilisateur — plus juste, mais il faut
alors stocker ce fuseau.

### [ ] L'écran de remerciement promet une notification

« On te préviendra dès que c'est prêt » — aucun mécanisme d'envoi n'existe. Les
adresses sont récupérables en base pour un envoi manuel, mais la promesse est
prise auprès de l'utilisateur. Soit adoucir le texte, soit prévoir l'envoi.

### [ ] Pas de limite de débit sur `POST /sessions/{id}/analyze`

Chaque appel déclenche une analyse LLM. C'est le seul chemin payant que le
quota freemium ne couvre pas, et rien ne le throttle. Antérieur au freemium,
mais c'est un trou de coût réel.

### [ ] Le quota se contourne en recréant un compte

Aucune vérification d'email à l'inscription : un utilisateur qui tape le mur
crée un second compte et repart pour 10 minutes. Arbitrage produit à assumer
consciemment — sans quoi les chiffres de conversion mesureront surtout la
patience des gens.

---

## 3. Rapidement après la mise en production

### [ ] Aucun test automatisé

`find backend -name "test_*.py"` ne renvoie rien. Le code qui décide qui paie
et combien il consomme n'a aucune couverture. Par ordre de valeur :

1. `consume_spoken_seconds` / `has_quota_left` (dont le cas Pro)
2. Le passage de jour UTC (la clé change, le compteur repart)
3. La déduplication du `wall_hit` (une seule ligne par utilisateur et par jour)
4. La suppression RGPD d'un compte ayant des `paywall_events`

### [ ] Débit non atomique entre onglets

Le quota est vérifié avant le tour et débité après. Plusieurs onglets ouverts
passent donc tous le contrôle avant que le premier ne débite. Le plafond de
taille audio (~1 Mo) borne les dégâts, mais un dépassement reste possible.
Correctif propre : pré-débiter une estimation basée sur la taille du chunk,
puis réconcilier avec la durée réelle après transcription.

### [ ] Observabilité

Rien n'alerte sur une consommation Groq anormale. Au minimum, surveiller le
volume quotidien de `wall_hit` et la consommation cumulée.

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
- [x] Le mur tombe **avant** tout appel provider — vérifié, `quota_exceeded`
      immédiat, aucun appel Groq facturé.
- [x] Déduplication du `wall_hit` — vérifié, deux tours murés ne produisent
      qu'une ligne.
- [x] Reconnexion WebSocket au rechargement de page (`2d27f74`).

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

### Forcer le mur pour tester

```bash
docker compose exec redis redis-cli set "quota:spoken:<user_id>:$(date -u +%F)" 600
docker compose exec redis redis-cli del "quota:spoken:<user_id>:$(date -u +%F)"   # annuler
```
