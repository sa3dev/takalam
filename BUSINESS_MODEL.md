# Business Model — Takalam (تكلم)

## Positionnement

**Marché cible :** ~400 millions d'arabophones + des dizaines de millions d'apprenants non-natifs.

**Problème résolu :** La "barrière de la honte" — personne ne veut parler mal devant un prof, un locuteur natif, ou même une app qui corrige à chaque faute. Takalam est le seul interlocuteur qui ne juge jamais.

**Différenciateur clé :** Pas de correction intrusive. L'IA maintient le flux conversationnel et analyse en arrière-plan (Shadow Feedback). L'apprenant parle librement, progresse naturellement.

---

## Modèle Freemium

> Mis à jour le 4 août 2026 pour refléter ce qui tourne réellement. La version
> précédente annonçait 5 sessions/mois et un Pro à 9 € — ni l'un ni l'autre n'a
> jamais existé dans le code.

| Tier | Prix | Contenu | État |
|---|---|---|---|
| **Gratuit** | 0 € | 10 min de parole/jour · conversation complète · dashboard inclus | **en production** |
| **Pro** | 12,99 €/mois ou 129 €/an | Parole illimitée · historique complet · suivi détaillé | **affiché, non facturé** |
| **Famille** | — | 4 comptes Pro · suivi parental | piste, aucun code |
| **École** | — | 30 élèves · dashboard enseignant | piste, aucun code |

**Le quota se compte en secondes *parlées*, pas en sessions ni en temps
d'écran.** Un apprenant qui hésite trente secondes avant de se lancer ne perd
rien : l'hésitation est précisément ce que ce produit existe pour rendre sans
risque. Une allocation en sessions punirait la prudence.

**Le dashboard est donné au gratuit.** Il n'a de valeur qu'après plusieurs
conversations, donc le retenir empêcherait de le découvrir. Ce que Pro lève,
c'est le mur de temps de parole — la seule limite que l'apprenant ressent.

**Rien n'est encaissé aujourd'hui.** Le paywall affiche les prix et enregistre
l'intention (`paywall_events`), sans intégration de paiement. On mesure la
demande à ces prix avant d'écrire le moindre code de facturation. L'annuel à
129 € revient à 10,75 €/mois : c'est la répartition mensuel/annuel qui décidera
du revenu moyen réel, et c'est exactement ce que la table mesure.

---

## Structure de Coûts

### Coûts par utilisateur actif (par mois)

| Service | Coût | Notes |
|---|---|---|
| Groq (LLM + STT) | **0 €** | Free tier : 14 400 req/jour |
| Edge TTS | **0 €** | Gratuit, sans limite |
| Hetzner (infra) | ~0,05 € | Mutualisé sur N utilisateurs |
| **Total** | **~0,05 €/mois** | |

### Seuil de rentabilité

Avec un serveur Hetzner à ~20 €/mois :
- **2 abonnés Pro mensuels** couvrent l'infrastructure (25,98 €)
- Tout le reste = marge brute

---

## Projections

Au tarif mensuel plein (12,99 €). Un abonné annuel rapporte 10,75 €/mois
équivalent, donc le mélange des deux formules tire ces chiffres vers le bas —
d'où l'intérêt de savoir laquelle les gens choisissent avant d'ouvrir la caisse.

| Scénario | Abonnés Pro | MRR | ARR |
|---|---|---|---|
| Lancement | 50 | 650 € | 7 800 € |
| Traction | 500 | 6 500 € | 78 000 € |
| Scale | 5 000 | 65 000 € | 780 000 € |

> À 5 000 abonnés Pro, les coûts Groq dépassent le free tier → prévoir ~500 €/mois en API payante, marge reste >98%.

---

## Canaux d'Acquisition

### B2C — Particuliers

**1. Diaspora arabe (priorité #1)**
- Arabophones en Europe, Amérique du Nord, Australie
- Veulent maintenir la langue pour leurs enfants
- Fort pouvoir d'achat, prêts à payer pour un outil sérieux
- Canaux : Facebook Groups, Instagram, TikTok

**2. Content TikTok / YouTube Shorts**
- Format : "J'apprends à parler arabe avec une IA — résultats après 30 jours"
- Potentiel viral élevé (niche sous-exploitée)
- Coût : 0 € si contenu organique

**3. Communautés d'apprenants**
- Reddit (r/learn_arabic, r/languagelearning)
- Discord servers d'apprentissage des langues
- Positionnement : alternative "sans jugement" à Duolingo

### B2B — Institutions

**4. Écoles arabes du week-end**
- ~2 000 écoles en Europe (cours d'arabe le samedi/dimanche)
- Vente par classe : 49 €/mois · cycle de vente court
- Accès direct via associations islamiques et culturelles

**5. Universités et instituts de langue**
- Département d'études arabes
- Outil de pratique orale complémentaire aux cours
- Ticket moyen : 200-500 €/mois par département

---

## Roadmap Produit & Monétisation

### V1 — MVP (maintenant)
- [x] Conversation vocale temps réel
- [x] Tashkeel dans les réponses
- [x] Shadow Feedback dashboard — corrections grammaticales et vocabulaire
      nouveau. Les scores de fluidité et de confiance ont été retirés : ils
      étaient déduits d'une transcription dont Whisper avait déjà effacé les
      hésitations et le ton, donc invendables et indéfendables.
- [x] Authentification + suppression de compte RGPD
- [x] Traduction en direct des réponses (6 langues d'interface sur 7)
- [x] Quota gratuit, paywall et mesure d'intention

### V2 — Rétention (3-6 mois)
- [ ] Système de niveaux (A1 → C1)
- [ ] Thèmes de conversation (voyage, famille, travail...)
- [ ] Streak quotidien + rappels
- [ ] Dialectes (Marocain, Égyptien, Levantin...)

### V3 — Monétisation avancée (6-12 mois)
- [ ] Paiement Stripe (abonnement mensuel/annuel)
- [ ] Dashboard enseignant (B2B)
- [ ] API pour intégration tiers
- [ ] App mobile (React Native)

---

## Risques & Mitigation

| Risque | Probabilité | Mitigation |
|---|---|---|
| Groq passe en payant | Moyenne | Modèle swappable (GroqLLM abstrait) → Mistral, Gemini |
| Microsoft coupe Edge TTS | Faible | Fallback ElevenLabs déjà câblé dans le code |
| Duolingo lance produit vocal arabe | Moyenne | Différenciateur "no shame" difficile à copier culturellement |
| Coût infra explose à l'échelle | Faible | Architecture Docker → Kubernetes si besoin |

---

## Métriques Clés à Suivre

- **DAU/MAU** — ratio d'engagement (cible : >40%)
- **Sessions/utilisateur/semaine** — proxy de valeur perçue
- **Churn mensuel** — cible : <5% sur Pro
- **CAC vs LTV** — cible : LTV > 3x CAC
- **Durée moyenne de session** — proxy de qualité de l'expérience
