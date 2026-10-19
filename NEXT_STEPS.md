# Prochaines étapes — mesure, puis croissance

Objectif: avoir des données utilisateurs avant de décider de passer le quota gratuit de 10 min à 5 min, puis attirer des visiteurs et convertir.

## 1. Brancher Umami (analytics)

- [ ] Dans le dashboard Umami existant: **Settings → Websites → Add website** (domaine de Takalam)
- [ ] Copier le **Website ID** (UUID) et noter l'URL de l'instance
- [ ] Ajouter le script dans `frontend/app/layout.tsx` (`<head>`), URL et ID dans des variables d'environnement
- [ ] Vérifier la CSP / les en-têtes de sécurité du frontend si l'instance est sur un autre domaine
- [ ] Tester en prod (en `localhost`, Umami ignore les hits sauf `data-domains="localhost"`)
- [ ] Prévoir les adblockers: renommer le script via `TRACKER_SCRIPT_NAME` côté Umami si besoin

### Événements à suivre (entonnoir)
- [ ] visite landing
- [ ] clic "essayer" / inscription
- [ ] première session démarrée
- [ ] seuils de parole atteints: 2 min, 5 min, 10 min
- [ ] paywall affiché
- [ ] clic sur un plan (mensuel / annuel)

## 2. Analyser les données existantes (sans changer le code)

La limite est dans `backend/app/config/settings.py:77`: `FREE_DAILY_SPOKEN_SECONDS = 600`. Elle est quotidienne, comptée en secondes parlées, et modifiable par variable d'environnement.

- [ ] Requête SQL: répartition des secondes parlées par utilisateur et par jour (moins de 2 min / 2-5 / 5-10 / plus de 10), à partir de `transcriptions`
- [ ] Compter les `wall_hit` et les `interest` dans `paywall_events`
- [ ] Optionnel: table `daily_usage` (user, jour, secondes) pour garder l'historique, car le compteur actuel est dans Redis (éphémère)

## 3. Décider: 10 min ou 5 min gratuites

- [ ] Attendre 1 à 2 semaines de données
- [ ] Si peu d'utilisateurs dépassent 5 min: passer à 5 min ne coûte presque rien en conversions
- [ ] Si beaucoup s'arrêtent entre 5 et 10 min: risque de perdre des conversions
- [ ] Idéalement tester en A/B (moitié 5 min, moitié 10 min) et comparer la conversion vers le payant
- [ ] S'assurer que le premier moment "waouh" arrive avant la coupure

## 4. Marketing (plan 30 jours)

Cible: francophones d'origine arabe qui n'osent pas parler, convertis, expatriés et étudiants. Argument: *osez parler arabe, sans jugement, sans public*.

- [ ] Semaine 1: Umami en place et événements de conversion
- [ ] Semaines 1 à 4: 15 à 20 vidéos courtes (TikTok / Reels / Shorts), 3 à 5 par semaine
- [ ] Semaines 1 à 4: 3 à 5 messages utiles par semaine dans les communautés (Facebook, Reddit, Discord, Telegram)
- [ ] Semaine 2: contacter 10 micro-influenceurs (5k à 50k abonnés), accès Pro gratuit contre une vidéo honnête
- [ ] Commencer 2 à 3 pages SEO ("apprendre l'arabe à l'oral", "s'entraîner à parler darija", "phrases arabe pour voyager")
- [ ] Lancement ponctuel: Product Hunt / Indie Hackers
- [ ] Semaine 4: lire les chiffres (sources de trafic, inscriptions, limite atteinte), garder ce qui marche

## 5. Conversion et monétisation

- [ ] Tester une démo de 1 à 2 min sans compte (moins de friction avant l'inscription)
- [ ] Paywall qui rappelle la progression ("8 min parlées, 14 mots nouveaux")
- [ ] Mettre l'annuel (129 €) en avant, offre de lancement limitée (ex. -30 % pour les 100 premiers)
- [ ] Brancher Stripe quand le taux d'intérêt (`interest` / `wall_hit`) est satisfaisant

## Infos à fournir
- URL de l'instance Umami: _à compléter_
- Website ID Takalam: _à compléter_
