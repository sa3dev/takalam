# Vidéos de marque (reels, TikTok, Shorts)

Génère des vidéos MP4 **1080×1920 (9:16), 30 images/s, sans son** avec la charte du site (couleurs terracotta/crème, Space Grotesk, Hanken Grotesk, Reem Kufi, Noto Naskh). Une vidéo = un petit fichier JSON.

## Première fois
```bash
cd marketing
npm install        # Chrome doit être installé (macOS : /Applications/Google Chrome.app, sinon CHROME_PATH=...)
```
Le rendu demande une connexion internet : les polices viennent de Google Fonts.

## Commandes
```bash
npm run film                                   # le film de marque (templates/brand-film.html) -> out/brand-film.mp4
npm run reels                                  # toutes les vidéos de videos/*.json -> out/*.mp4
node render.js videos/04-sans-jugement.json    # une seule vidéo
node render.js videos/04-sans-jugement.json --still 7.5   # une IMAGE à 7,5 s (out/…png), pour vérifier avant de rendre
```
Un rendu de 20 s prend 1 à 2 minutes. Les vidéos sortent dans `out/` (ignoré par git).

## Créer une nouvelle vidéo
Copiez un fichier de `videos/` et changez les textes. Une vidéo est une liste de **scènes** `from`/`to` (en secondes) ; la dernière scène fixe la durée. Chaque scène en recouvre doucement la précédente.

| `type` | Ce que ça montre | Champs |
|---|---|---|
| `text` | Texte seul, une ligne après l'autre | `lines` (texte, ou `{ "t": "…", "c": "soft\|cream\|ink\|terra" }`), `orb: true` pour l'orbe en haut |
| `word` | Un mot arabe en grand + sa traduction | `ar`, `fr` |
| `photo` | Image d'une situation plein écran, texte en bas | `image` (chemin depuis la racine du dépôt, ex. `frontend/public/scenarios/taxi.jpg`), `lines` |
| `demo` | Illustration d'un échange (bulles arabe + traduction) | `u: {ar, fr}`, `i: {ar, fr}`, `caption` |
| `end` | Écran de fin : icône, Takalam / تكلّم, accroche, bouton | `pill` (ex. « Lien en bio »), `tagline`, `note`, `url` |

`bg` : `terra` (dégradé de la landing), `cream`, `clay`. Pour une capture réelle de l'application, utilisez `photo` avec le chemin d'une capture d'écran (mettez-la dans `marketing/captures/`).

## Ce qui n'est pas couvert (à tourner avec de vrais enregistrements)
Les scripts 2 (démo), 5 (téléphone dans un train), 7 (avant/après) et 10 (défi) de `../MARKETING_SCRIPTS.md` reposent sur de **vraies** séances ou de la vraie vidéo. Les scènes `demo` des autres vidéos sont des **illustrations** : remplacez-les par une capture réelle dès que vous en avez.

## Avant de publier
Voir `PUBLICATION.md` (légendes, liens avec UTM) et la liste « À vérifier » de `../MARKETING_SCRIPTS.md` (arabe relu par un locuteur natif, musique libre pour un usage commercial).
