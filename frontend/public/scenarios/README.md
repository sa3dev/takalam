# Images des situations

Une image par situation (listées dans l'ordre d'affichage), dans ce dossier, nommée comme l'identifiant de la situation :

| Fichier (sans extension) | Situation |
|---|---|
| `introduce` | Se présenter |
| `restaurant` | Au restaurant |
| `taxi` | Dans un taxi |
| `hotel` | À l'hôtel |
| `market` | Au marché |
| `family` | Dîner en famille |

Formats acceptés, essayés dans cet ordre : `.webp`, `.jpg`, `.png`.
Exemple : `public/scenarios/restaurant.webp`.

Conseils :
- format paysage 3:2, par exemple 600 × 400 px (affichée en 3:2, recadrée au centre si le format diffère) ;
- moins de 100 Ko par image (WebP si possible) ;
- le sujet bien centré, lisible même petit.

Tant qu'une image est absente, l'illustration dessinée dans `components/ScenarioArt.tsx` s'affiche à la place.
Pour ajouter une situation : son identifiant vient de `backend/app/services/scenarios.py`.
