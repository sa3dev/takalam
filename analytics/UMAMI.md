# Umami : événements, entonnoirs et lecture

Deux sources, deux rôles :
- **Umami** voit des visites anonymes : d'où elles viennent, où elles décrochent.
- **La base de données** (`analytics/queries.sql`) voit des comptes : combien de temps ils parlent, s'ils reviennent.

Aucun identifiant d'utilisateur n'est envoyé à Umami (la politique de confidentialité dit que l'outil n'identifie pas les visiteurs).

## Dictionnaire des événements

| Événement | Quand | Propriétés |
|---|---|---|
| `landing-hero-signup`, `landing-hero-login`, `landing-end-signup`, `landing-end-login` | clic sur un bouton de la landing (haut / bas de page) | |
| `landing-plan-free`, `landing-plan-pro` | clic sur un plan de la landing | |
| `landing-nav-*`, `landing-footer-*`, `landing-faq-open` | menu, pied de page, ouverture d'une question | `question` pour la FAQ |
| `signup-success`, `login-success` | formulaire de `/login` réussi | |
| `scenario-start` | clic sur une situation ou « Parler librement » | `scenario` (`free` si conversation libre) |
| `session-started` | la session vocale démarre | `scenario` |
| **`first-voice-played`** | une réponse à ce que l'apprenant a dit est **entendue** (le vrai « waouh ») | `scenario` |
| `spoken-2min`, `spoken-5min`, `spoken-10min` | le total parlé du jour franchit le seuil | `scenario` |
| `replay-click` | clic sur « Réécouter » | `scenario` |
| `session-ended` | « Terminer la session » confirmé | `scenario`, `turns` (phrases dites), `duration` (`<2min`, `2-5min`, `5-10min`, `10min+`) |
| `session-cancel`, `session-restart` | annuler / recommencer | `scenario`, `spoke` (`yes` si l'apprenant avait déjà parlé) |
| `paywall-shown` | l'écran de limite s'affiche | |
| `paywall-plan-select` | clic sur mensuel ou annuel | `plan` |
| `paywall-plan-confirm` | intérêt enregistré par le serveur | `plan` |
| `mic-denied`, `mic-error` | micro refusé ou en échec | `error` |
| `audio-play-failed` | le navigateur refuse de jouer la voix | `error` |
| `contact-sent` | message du formulaire de contact envoyé | `topic` |

## Entonnoirs à créer (Umami → Funnels)

**A. Acquisition → première parole** (le plus important)
1. page vue `/` (landing)
2. `landing-hero-signup`
3. `signup-success`
4. `scenario-start`
5. `session-started`
6. `first-voice-played`

Le pourcentage perdu entre deux marches dit où les gens décrochent :
- 2→3 : le formulaire d'inscription fait fuir.
- 4→5 : problème de connexion ou de micro (voir `mic-denied`).
- 5→6 : l'apprenant n'a pas parlé, ou la voix n'est pas arrivée (voir `audio-play-failed`).

**B. De la parole au paywall**
1. `first-voice-played`
2. `spoken-2min`
3. `spoken-5min`
4. `spoken-10min`
5. `paywall-shown`
6. `paywall-plan-select`
7. `paywall-plan-confirm`

**C. Par source** : refaire A avec le filtre `utm_source` (tiktok, instagram, youtube…) pour savoir quelle plateforme amène des gens qui **parlent**, pas seulement qui visitent.

Les liens publiés doivent porter `?utm_source=...` (voir `MARKETING_SCRIPTS.md`).

## Règles de lecture pour les décisions

**Limite gratuite : 10 ou 5 minutes ?** Avec `analytics/queries.sql`, requêtes 1 à 3 :
- Si très peu de jours-utilisateur dépassent 5 min (requête 2, « au moins 5 min » faible), passer à 5 min change presque rien : peu de gens y sont.
- Si beaucoup de jours se situent entre 5 et 10 min **sans mur** (requête 2, première colonne), ils s'arrêtaient d'eux-mêmes ; à 5 min ils verraient le paywall plus tôt. C'est le gain possible, et le risque d'en perdre qui n'auraient pas payé de toute façon.
- Regarder le ratio `paywall-plan-confirm` / `paywall-shown` : s'il est très faible, le paywall n'est pas le problème, c'est l'envie de payer.
- Pour trancher vraiment : un test A/B (moitié 5 min, moitié 10 min) en ajoutant la propriété `variant` aux événements. À faire quand il y aura assez de monde.

**Le « waouh » arrive-t-il avant la coupure ?** Part des inscrits qui atteignent `first-voice-played`, puis `spoken-2min`.

**Quelle situation fidélise ?** Requête 6 (durée, phrases dites) croisée avec `scenario-start` par situation.

## Précautions
- **Les petits chiffres mentent** : en dessous de quelques dizaines de personnes par étape, un pourcentage ne veut presque rien dire.
- **Les bloqueurs de publicité** retirent une partie des mesures : lire les chiffres comme des minimums.
- **Un événement n'est pas une personne** : `scenario-start` compte des clics. Pour compter des visiteurs, utiliser les entonnoirs.
- **Vérifier les noms** dans l'onglet Events après chaque déploiement : une faute crée un événement à part.
- `daily_usage` ne se remplit qu'à partir du déploiement de la table ; avant, il n'y a pas d'historique du temps parlé.
