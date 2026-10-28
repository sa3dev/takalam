# Scripts vidéo sans visage — 10 vidéos de 20 secondes (CapCut)

Aucun visage, aucune voix obligatoire : texte à l'écran, captures de l'application et images des situations. Une voix off est possible plus tard, rien ne change dans le montage.

---

## CapCut en pratique (à faire une seule fois)

Les noms de menus peuvent varier un peu selon la version.

**1. Créer un modèle de projet**
1. Nouveau projet → format **9:16** (vertical).
2. Fond : ajouter un fond uni crème `#F7EFE2` (ou terracotta `#C8603A` pour les accroches fortes).
3. Écrire un premier texte avec la police et la taille voulues, puis **enregistrer le style** (ou le dupliquer) pour retrouver le même rendu partout. Police avec l'arabe pris en charge : tester avant de monter.
4. Enregistrer ce projet comme modèle, puis **dupliquer le projet** pour chaque vidéo et ne changer que les textes.

**2. Monter une vidéo (5 étapes)**
1. Poser le **visuel** sur la piste (fond uni, capture d'écran ou image de situation).
2. Ajouter un **texte** par bloc de 2 à 3 secondes. Règle de lecture : environ 3 mots par seconde, donc 6 à 8 mots par écran.
3. Appliquer une **animation d'entrée** simple (apparition ou léger glissement), toujours la même pour garder un style reconnaissable.
4. Ajouter une **musique** calme en dessous. Comme c'est une publicité, choisir un son marqué « utilisation commerciale » : la musique libre sur TikTok n'est pas toujours autorisée pour les annonces.
5. Exporter en **1080p, 30 images/s**, MP4.

**3. Ne pas dépasser 20 secondes** : 6 à 8 écrans de texte, pas plus.

**Sous-titres automatiques** : utiles seulement si vous ajoutez une voix. Sans voix, saisissez les textes à la main (plus de contrôle).

---

## Enregistrer l'application

- **Sur téléphone**, c'est le plus simple : l'enregistreur d'écran intégré capte aussi **la voix de l'IA** (microphone désactivé). Ouvrir takalamapp.com dans le navigateur, lancer une situation, enregistrer.
- **Sur Mac**, l'enregistrement d'écran natif (`Cmd + Maj + 5`) **ne capte pas le son de l'ordinateur**, donc pas la voix de l'IA. Il faut un outil en plus, ou simplement utiliser le téléphone.
- Faire 2 ou 3 conversations propres (« Se présenter », « Au restaurant ») et les **réutiliser** dans plusieurs vidéos en les découpant.
- Cacher les notifications et mettre le téléphone en mode avion + Wi-Fi.
- Les images des situations sont dans `frontend/public/scenarios/` (versions légères) et dans `takalam-originaux/scenarios/` (originaux).

---

## Les 10 scripts

Format de chaque scène : **durée · visuel · texte à l'écran**.

### 1. La peur de parler
Fond terracotta, texte crème.
- 0-3 s · fond uni · « Tu comprends l'arabe… »
- 3-6 s · fond uni · « …mais tu n'oses pas parler ? »
- 6-11 s · fond crème · « Ce n'est pas le vocabulaire. C'est la peur du regard des autres. »
- 11-16 s · capture de l'application · « Ici, personne ne t'écoute. Juste toi et la langue. »
- 16-20 s · logo ou écran d'accueil · « Takalam · 10 min gratuites par jour · Lien en bio »

### 2. La démo : le moment waouh
- 0-3 s · capture : l'écran des situations · « Je parle arabe à une IA. »
- 3-7 s · capture : on choisit « Se présenter », l'IA ouvre la scène avec sa voix · (voix de l'IA + texte de la réponse)
- 7-15 s · capture : vous répondez, l'IA réagit · traduction en sous-titre
- 15-20 s · écran d'accueil · « Essaie gratuitement · Lien en bio »

### 3. Au restaurant
- 0-3 s · image « Au restaurant » · « Commander en arabe sans bafouiller »
- 3-6 s · fond crème · « أريد قهوة » / « Je veux un café »
- 6-9 s · fond crème · « كم الحساب؟ » / « C'est combien ? »
- 9-12 s · fond crème · « شكرا جزيلا » / « Merci beaucoup »
- 12-16 s · capture : situation « Au restaurant » en cours · « Entraîne-toi à voix haute avant le voyage. »
- 16-20 s · écran d'accueil · « Lien en bio »

### 4. Sans jugement
- 0-3 s · fond terracotta · « Se tromper devant quelqu'un… »
- 3-6 s · fond terracotta · « …le pire moment pour apprendre. »
- 6-12 s · fond crème · « Avec Takalam, tu parles seul. L'IA ne se moque jamais. »
- 12-16 s · capture : une réponse de l'IA · « Tu te trompes ? Tu recommences. »
- 16-20 s · écran d'accueil · « Sans carte bancaire · Lien en bio »

### 5. Dix minutes par jour
- 0-3 s · plan du téléphone posé dans une voiture ou tenu dans un train, sans visage · « 10 minutes par jour. »
- 3-8 s · même plan ou capture · « Pas de cours de deux heures. »
- 8-14 s · capture : conversation en cours · « Juste parler, à voix haute, tous les jours. »
- 14-20 s · écran d'accueil · « Takalam t'offre 10 min chaque jour · Lien en bio »

### 6. Les convertis
- 0-3 s · fond terracotta · « Converti, et tu galères avec l'arabe ? »
- 3-8 s · fond crème · « On t'a appris à lire. Pas à parler. »
- 8-14 s · capture de l'application · « Il te manque la pratique orale. »
- 14-20 s · écran d'accueil · « Parle dès le premier jour · Lien en bio »

### 7. Avant / après
Demande de vraies séances à enregistrer.
- 0-3 s · fond terracotta · « Ma 1re phrase vs ma 10e séance »
- 3-9 s · capture de la séance 1 · « Séance 1 »
- 9-15 s · capture de la séance 10 · « Séance 10 »
- 15-20 s · écran d'accueil · « La seule différence : oser parler · Lien en bio »

### 8. Les mots d'une grand-mère
- 0-3 s · image « Dîner en famille » · « Parler arabe avec ta grand-mère, enfin »
- 3-8 s · image · « Tu veux lui parler, mais les mots ne viennent pas. »
- 8-14 s · capture : situation « Dîner en famille » · « Entraîne-toi seul d'abord. »
- 14-20 s · écran d'accueil · « Takalam, l'échauffement avant la vraie conversation · Lien en bio »

### 9. Six situations, une conversation
Remplace « Choisis ton dialecte » : le choix de dialecte n'existe pas encore dans l'application.
- 0-3 s · capture : l'écran des situations · « 6 situations pour oser parler »
- 3-6 s · image « Au restaurant » · « Au restaurant »
- 6-8 s · image « Dans un taxi » · « En taxi »
- 8-10 s · image « À l'hôtel » · « À l'hôtel »
- 10-12 s · image « Au marché » · « Au marché »
- 12-14 s · image « Dîner en famille » · « En famille »
- 14-20 s · écran d'accueil · « Choisis ta scène · Gratuit pour commencer · Lien en bio »

### 10. Le défi
- 0-4 s · fond terracotta · « Défi : parler arabe 10 min par jour, 7 jours. »
- 4-12 s · capture d'une séance (la plus récente) · « Jour 1. »
- 12-16 s · fond crème · « Abonne-toi pour suivre la suite. »
- 16-20 s · écran d'accueil · « Et toi, tu relèves le défi ? · Lien en bio »
- Série possible : une vidéo par jour, même modèle.

---

## Diffusion
- Tester **3 accroches** (le texte des 3 premières secondes) sur la même vidéo : c'est l'accroche qui décide.
- Un lien par plateforme avec un UTM : `?utm_source=tiktok`, `instagram`, `youtube`, pour voir dans Umami ce qui rapporte.
- Cadence : 3 à 5 vidéos par semaine.
- Compte au nom du produit (« Takalam »), adresse mail du domaine, pas de visage ni de nom personnel.

## À vérifier avant de publier
1. Le lien en bio mène à la page d'accueil avec le bouton d'inscription.
2. Les affirmations sont vraies : « 10 minutes gratuites par jour » et « sans carte bancaire » correspondent à la page d'accueil.
3. Pas de fausse progression : les séances 1 et 10 du script 7 doivent être réelles.
4. Faire relire les phrases arabes (script 3) par un locuteur natif.
5. Musique autorisée pour un usage commercial.
