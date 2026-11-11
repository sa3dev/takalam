-- Requêtes d'analyse de Takalam (PostgreSQL).
--
-- Lancer en local :
--   docker compose exec -T db psql -U takalam_user -d takalam -f /dev/stdin < analytics/queries.sql
-- En production : ouvrir un terminal sur le conteneur de la base (Dokploy) et coller
-- une requête à la fois dans `psql`.
--
-- Les jours sont en UTC, comme le quota. Les comptes de test sont à exclure à la main
-- (ajouter `AND u.email NOT LIKE '%@example.com'` là où il y a une jointure sur users).
-- `daily_usage` ne commence à se remplir qu'à partir du déploiement de la table :
-- avant, le temps parlé n'était gardé que dans Redis, qui expire.

-- ============================================================================
-- 1. Combien de temps parlent les gens ? (la donnée pour décider 10 ou 5 minutes)
-- ============================================================================
-- Une ligne = un compte un jour où il a parlé. Tranches du temps parlé ce jour-là,
-- pour le plan gratuit seulement.
SELECT
  CASE
    WHEN spoken_seconds < 120 THEN 'a) moins de 2 min'
    WHEN spoken_seconds < 300 THEN 'b) 2 à 5 min'
    WHEN spoken_seconds < 600 THEN 'c) 5 à 10 min'
    ELSE                           'd) 10 min et plus'
  END                                                   AS tranche,
  count(*)                                              AS jours_utilisateur,
  round(100.0 * count(*) / sum(count(*)) OVER (), 1)    AS pourcent
FROM daily_usage
WHERE plan = 'free'
GROUP BY 1
ORDER BY 1;

-- ============================================================================
-- 2. Ceux qui s'arrêtent avant le mur
-- ============================================================================
-- Jours où un compte gratuit a parlé 5 à 10 min SANS voir l'écran de limite.
-- Si cette part est grande, abaisser à 5 min les ferait buter sur le mur,
-- et ils verraient le paywall plus tôt : c'est le gain ET le risque.
SELECT
  count(*) FILTER (WHERE d.spoken_seconds >= 300 AND d.spoken_seconds < 600
                   AND NOT EXISTS (
                     SELECT 1 FROM paywall_events p
                     WHERE p.user_id = d.user_id AND p.event = 'wall_hit'
                       AND p.created_at::date = d.day))     AS entre_5_et_10_sans_mur,
  count(*) FILTER (WHERE d.spoken_seconds >= 300)           AS au_moins_5_min,
  count(*) FILTER (WHERE d.spoken_seconds >= 600)           AS au_moins_10_min,
  count(*)                                                  AS jours_utilisateur
FROM daily_usage d
WHERE d.plan = 'free';

-- ============================================================================
-- 3. Le paywall : combien le voient, combien cliquent
-- ============================================================================
SELECT
  count(DISTINCT user_id) FILTER (WHERE event = 'wall_hit')   AS comptes_ayant_vu_le_mur,
  count(DISTINCT user_id) FILTER (WHERE event = 'interest')   AS comptes_interesses,
  count(*)               FILTER (WHERE plan_choice = 'monthly') AS choix_mensuel,
  count(*)               FILTER (WHERE plan_choice = 'annual')  AS choix_annuel
FROM paywall_events;

-- ============================================================================
-- 4. Activation : les inscrits parlent-ils vraiment ?
-- ============================================================================
-- Par semaine d'inscription : combien ont dit au moins une phrase, combien sont revenus.
WITH inscrits AS (
  SELECT u.id, date_trunc('week', u.created_at)::date AS semaine
  FROM users u
),
activite AS (
  SELECT i.id,
         count(DISTINCT s.id)                                              AS conversations,
         count(DISTINCT s.started_at::date)                                AS jours_actifs,
         bool_or(t.speaker = 'user')                                       AS a_parle
  FROM inscrits i
  LEFT JOIN sessions s        ON s.user_id = i.id
  LEFT JOIN transcriptions t  ON t.session_id = s.id
  GROUP BY i.id
)
SELECT i.semaine,
       count(*)                                                    AS inscrits,
       count(*) FILTER (WHERE a.a_parle)                           AS ont_parle,
       count(*) FILTER (WHERE a.jours_actifs >= 2)                 AS revenus_un_autre_jour,
       round(100.0 * count(*) FILTER (WHERE a.a_parle) / count(*), 1)           AS pct_ont_parle,
       round(100.0 * count(*) FILTER (WHERE a.jours_actifs >= 2) / count(*), 1) AS pct_revenus
FROM inscrits i
JOIN activite a USING (id)
GROUP BY i.semaine
ORDER BY i.semaine DESC;

-- ============================================================================
-- 5. Rétention : reviennent-ils le lendemain, une semaine plus tard ?
-- ============================================================================
-- Part des inscrits (par jour d'inscription) qui ont une conversation exactement
-- 1 jour, et 7 jours, après leur inscription.
WITH inscrits AS (
  SELECT id, created_at::date AS jour_inscription FROM users
),
retour AS (
  SELECT i.id, i.jour_inscription,
         bool_or(s.started_at::date = i.jour_inscription + 1) AS j1,
         bool_or(s.started_at::date = i.jour_inscription + 7) AS j7
  FROM inscrits i
  LEFT JOIN sessions s ON s.user_id = i.id
  GROUP BY i.id, i.jour_inscription
)
SELECT jour_inscription,
       count(*)                                         AS inscrits,
       count(*) FILTER (WHERE j1)                       AS revenus_j1,
       count(*) FILTER (WHERE j7)                       AS revenus_j7
FROM retour
-- Un jour trop récent n'a pas encore eu le temps de revenir.
WHERE jour_inscription <= current_date - 7
GROUP BY jour_inscription
ORDER BY jour_inscription DESC;

-- ============================================================================
-- 6. Quelles situations fonctionnent ?
-- ============================================================================
-- 'libre' = conversation libre. La durée est celle de la session (horloge, pauses
-- comprises), pas le temps parlé : pour le temps parlé, voir `daily_usage` (requête 1).
SELECT
  coalesce(s.scenario_id, 'libre')                                        AS situation,
  count(*)                                                                AS conversations,
  round(avg(s.duration_seconds) / 60.0, 1)                                AS duree_moyenne_min,
  round(avg(p.phrases)::numeric, 1)                                       AS phrases_apprenant_moyennes,
  count(*) FILTER (WHERE s.ended_at IS NOT NULL)                          AS terminees_proprement
FROM sessions s
LEFT JOIN LATERAL (
  SELECT count(*) AS phrases
  FROM transcriptions t
  WHERE t.session_id = s.id AND t.speaker = 'user'
) p ON true
GROUP BY 1
ORDER BY conversations DESC;

-- ============================================================================
-- 7. Inscriptions par jour
-- ============================================================================
SELECT created_at::date AS jour, count(*) AS inscriptions
FROM users
GROUP BY 1
ORDER BY 1 DESC
LIMIT 30;

-- ============================================================================
-- 8. Retours des utilisateurs (formulaire de contact)
-- ============================================================================
SELECT topic AS motif, count(*) AS messages,
       count(*) FILTER (WHERE NOT notified) AS non_notifies_par_email
FROM contact_messages
GROUP BY topic
ORDER BY messages DESC;
