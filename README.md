# Takalam (تكلم) - Assistant Vocal Bienveillant

Application d'apprentissage de la langue arabe par la voix, sans jugement ni interruption.

## Vision

**Le problème** : La "barrière de la honte" et la peur du jugement bloquent l'apprentissage oral.

**La solution** : Un "confident" IA bienveillant qui écoute sans juger.

**L'innovation** : L'IA ne coupe jamais l'utilisateur pour le corriger. Elle maintient le flux ("Flow") et effectue une analyse pédagogique en arrière-plan (Shadow Feedback) pour alimenter un dashboard de progression.

## Architecture

```
takalam/
├── backend/              # FastAPI + Python
│   ├── app/
│   │   ├── main.py              # Point d'entrée FastAPI
│   │   ├── config/              # Configuration
│   │   ├── models/              # Modèles SQLAlchemy
│   │   ├── schemas/             # Schémas Pydantic
│   │   ├── services/
│   │   │   ├── speech_manager.py    # STT/LLM/TTS modulaire
│   │   │   └── shadow_feedback.py   # Analyseur pédagogique
│   │   ├── websocket/           # Gestionnaire WebSocket
│   │   └── routes/              # API REST + WebSocket
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/             # Next.js + TypeScript
│   ├── app/
│   │   ├── page.tsx             # Page de conversation
│   │   └── dashboard/
│   │       └── page.tsx         # Dashboard analytics
│   ├── components/              # Composants UI
│   ├── hooks/
│   │   ├── useWebSocket.ts      # Hook WebSocket
│   │   └── useAudioRecorder.ts  # Hook MediaRecorder
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.yml    # Orchestration
├── .env.example          # Template variables d'environnement
└── README.md             # Ce fichier
```

## Stack Technique

### Backend
- **FastAPI** : API REST + WebSocket
- **PostgreSQL** : Base de données
- **Redis** : Cache et sessions
- **SQLAlchemy** : ORM
- **Pydantic** : Validation de données

### Frontend
- **Next.js 16** : App Router avec Turbopack
- **React 19** : Dernière version
- **TypeScript** : Type safety
- **Tailwind CSS** : Styling
- **MediaRecorder API** : Enregistrement audio
- **WebSocket** : Communication temps réel
- **i18n** : Interface multi-langue (7 langues)

### IA Pipeline
- **STT** : Whisper Large v3 via Groq
- **LLM** : Llama 3.3 70B via Groq (mentor bienveillant)
- **TTS** : Microsoft Edge TTS — gratuit, aucune clé requise

## Démarrage Rapide

### 1. Prérequis
- Docker & Docker Compose
- Une clé API Groq — la seule obligatoire (LLM + STT). Edge TTS ne demande rien.

### 2. Configuration

```bash
# Copier le fichier d'environnement
cp .env.example .env

# Éditer .env et ajouter vos clés API
# Minimum requis : OPENAI_API_KEY
nano .env
```

### 3. Lancer l'application

```bash
# Démarrer tous les services
docker-compose up

# Ou en arrière-plan
docker-compose up -d
```

**Services disponibles** :
- Frontend : http://localhost:3000
- Backend API : http://localhost:8000
- API Docs : http://localhost:8000/docs
- PostgreSQL : localhost:5433
- Redis : localhost:6379

### 4. Utilisation

1. Ouvrir http://localhost:3000
2. Cliquer sur le bouton micro
3. Parler en arabe
4. Écouter la réponse
5. Terminer la session
6. Consulter le dashboard pour voir vos progrès

## Fonctionnalités Principales

### 1. Conversation Temps Réel
- Enregistrement audio via navigateur
- Streaming WebSocket bidirectionnel
- Transcription instantanée (Whisper)
- Réponse IA bienveillante (Llama 3.3 70B)
- Synthèse vocale naturelle (TTS)

### 2. Shadow Feedback (Analyse Non-Intrusive)
L'IA ne coupe jamais l'utilisateur. À la fin de la session :
- **Corrections grammaticales** avec explications
- **Vocabulaire nouveau** utilisé

> Un score de fluidité et un niveau de confiance existaient ici. Ils ont été
> retirés en V1 : l'analyseur ne voit que la transcription, et Whisper en a déjà
> retiré les hésitations, les silences et le ton que ces deux scores prétendaient
> mesurer. Ne reste que ce qui repose sur une observation réelle.

### 3. Dashboard de Progression
- Historique des sessions
- Mots prononcés, durée, vocabulaire nouveau
- Liste des mots appris
- Corrections grammaticales détaillées

### 4. Interface Multi-langue
L'interface utilisateur est disponible en 7 langues (les conversations restent en arabe) :
- 🇸🇦 **Arabe** (par défaut)
- 🇫🇷 **Français**
- 🇬🇧 **Anglais**
- 🇪🇸 **Espagnol**
- 🇮🇹 **Italien**
- 🇷🇺 **Russe**
- 🇨🇳 **Chinois**

Changement de langue via le sélecteur en haut à droite de l'interface.

Les réponses arabes de l'IA sont **traduites en direct** dans la langue choisie
(les 6 langues autres que l'arabe, qui est la langue source).

### 5. Temps de parole quotidien et Pro

Le forfait gratuit donne **10 minutes de parole par jour**, comptées en secondes
réellement parlées — la durée que Whisper rapporte, pas le temps passé à l'écran.
Une hésitation avant de parler ne coûte donc rien, ce qui est précisément le
comportement que ce produit existe pour rendre sans risque.

Une jauge suit la consommation en direct. À l'épuisement, un écran présente Takalam
Pro (12,99 €/mois ou 129 €/an) et **enregistre l'intention sans rien facturer** :
il n'y a pas encore d'intégration de paiement, on mesure d'abord la demande.

Réglable sans redéploiement via `FREE_DAILY_SPOKEN_SECONDS`.

### 6. Architecture Modulaire

**SpeechManager** - Providers derrière des interfaces abstraites
(`STTProvider`, `LLMProvider`, `TTSProvider`), ce qui permet d'en changer sans
toucher au reste. Le choix est fixé à la construction :

```python
# app/services/speech_manager.py
class SpeechManager:
    def __init__(self):
        self.stt = GroqSTT()      # Whisper Large v3
        self.llm = GroqLLM()      # Llama 3.3 70B
        self.tts = EdgeTTS()      # gratuit, sans clé
```

## Flow Complet

```
[Utilisateur]
    ↓ Enregistre audio (MediaRecorder)
    ↓ Envoie chunk audio (WebSocket)

[Backend]
    ↓ STT : Audio → Texte (Whisper Large v3, Groq)
    ↓ LLM : Génère réponse bienveillante (Llama 3.3 70B, Groq)
    ↓ TTS : Texte → Audio (Edge TTS)
    ↓ Renvoie transcription + audio

[Frontend]
    ↓ Affiche transcriptions
    ↓ Joue audio réponse

[Fin de session]
    ↓ Sauvegarde en DB
    ↓ Déclenche analyse Shadow Feedback (async)

[Dashboard]
    ↓ Affiche métriques de progression
```

## Configuration Avancée

### Variables d'Environnement

**IA** :
```bash
GROQ_API_KEY=gsk_...               # la seule clé nécessaire
DEFAULT_LLM_MODEL=llama-3.3-70b-versatile
EDGE_TTS_VOICE=ar-SA-HamedNeural   # masculine ; ar-SA-ZariyahNeural pour féminine
```

**Freemium** (déplaçables sans redéploiement) :
```bash
FREE_DAILY_SPOKEN_SECONDS=600      # 10 min/jour, remise à zéro à minuit UTC
PRO_PRICE_MONTHLY_EUR=12.99
PRO_PRICE_ANNUAL_EUR=129.0
```

**Ports** :
```bash
FRONTEND_PORT=3000
BACKEND_PORT=8000
POSTGRES_PORT=5433
REDIS_PORT=6379
```

### Développement Local (sans Docker)

**Backend** :
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Tests** (en local, hors Docker) :
```bash
cd backend
pip install -r requirements-dev.txt
python -m pytest
```

Les tests n'ont besoin ni de PostgreSQL ni de Redis : SQLite en mémoire et un
Redis simulé. Avec Docker, `docker compose exec backend python -m pytest` suffit.

**Frontend** :
```bash
cd frontend
npm install
npm run dev
```

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - Carte du système, flux et stockage
- [DEPLOYMENT.md](DEPLOYMENT.md) - Mise en ligne sur Dokploy, étape par étape
- [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) - Contrôles avant et après déploiement
- [SERVICES.md](SERVICES.md) - Services tiers et comptes à créer
- [BUSINESS_MODEL.md](BUSINESS_MODEL.md) - Modèle économique et tarifs
- [DOCKER_SETUP.md](DOCKER_SETUP.md) - Guide Docker complet
- [Backend README](backend/README.md) - Documentation backend
- [Frontend README](frontend/README.md) - Documentation frontend
- [CONTEXT.md](CONTEXT.md) - Contexte et vision du projet

## API Documentation

Une fois l'application lancée :
- **Swagger UI** : http://localhost:8000/docs
- **ReDoc** : http://localhost:8000/redoc

> Ces deux pages sont **désactivées quand `ENVIRONMENT=production`** : inutile
> d'exposer la carte de l'API à qui n'en a pas besoin.

## Commandes Utiles

```bash
# Voir les logs
docker-compose logs -f

# Rebuild
docker-compose build --no-cache

# Reset complet (supprime les données)
docker-compose down -v
docker system prune -a

# Exécuter des commandes
docker-compose exec backend bash
docker-compose exec frontend sh

# Accéder à PostgreSQL
docker-compose exec db psql -U takalam_user -d takalam
```

## Sécurité

En place :
- [x] Authentification JWT en cookie HttpOnly, mots de passe bcrypt
- [x] Tickets WebSocket à usage unique (60 s) — pas de jeton dans l'URL
- [x] Sessions WebSocket cloisonnées par utilisateur
- [x] Limites de débit par IP (HTTP) et par utilisateur (tours de conversation)
- [x] Validation des entrées via Pydantic
- [x] Garde anti-injection sur la parole transcrite, détection de fuite d'identité
- [x] En-têtes CSP, cookies `Secure` en production
- [x] Suppression de compte RGPD effaçant réellement toutes les données

À faire :
- [ ] HTTPS en production — via Let's Encrypt dans Dokploy, voir [DEPLOYMENT.md](DEPLOYMENT.md)
- [ ] Gestion des secrets par coffre-fort (aujourd'hui : variables Dokploy)
- [ ] Sauvegardes PostgreSQL planifiées

## Roadmap

### MVP (Actuel)
- [x] Infrastructure Docker
- [x] Backend FastAPI + WebSocket
- [x] SpeechManager modulaire
- [x] Shadow Feedback analyzer
- [x] Frontend Next.js 16 avec Turbopack
- [x] Page de conversation
- [x] Dashboard analytics
- [x] Interface multi-langue (7 langues)
- [x] Authentification + suppression de compte RGPD
- [x] Traduction en direct des réponses
- [x] Quota gratuit, paywall et mesure d'intention
- [x] Tests backend (quota, paywall, RGPD)

### V1.0
- [ ] Mise en ligne sur takalamapp.com
- [ ] Paiement réel (Stripe) — si la mesure d'intention le justifie
- [ ] Historique complet des sessions
- [ ] Export des données (PDF, CSV)

### V2.0
- [ ] Application mobile (React Native)
- [ ] Mode hors ligne
- [ ] Gamification (badges, niveaux)
- [ ] Communauté d'apprentissage
- [ ] Support dialectes arabes (égyptien, marocain, etc.)

## Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## Licence

Ce projet est sous licence MIT.

## Contact

Pour toute question ou suggestion, ouvrir une issue GitHub.

---

**تكلم - Parle sans crainte, apprends avec confiance**
