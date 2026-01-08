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
- **STT** : Whisper (OpenAI ou Groq)
- **LLM** : GPT-4o (mentor bienveillant)
- **TTS** : OpenAI TTS ou ElevenLabs

## Démarrage Rapide

### 1. Prérequis
- Docker & Docker Compose
- Clés API : OpenAI (obligatoire), Groq et ElevenLabs (optionnels)

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
- Réponse IA bienveillante (GPT-4o)
- Synthèse vocale naturelle (TTS)

### 2. Shadow Feedback (Analyse Non-Intrusive)
L'IA ne coupe jamais l'utilisateur. À la fin de la session :
- **Corrections grammaticales** avec explications
- **Vocabulaire nouveau** utilisé
- **Score de fluidité** (0-100)
- **Score de confiance** (0-100)

### 3. Dashboard de Progression
- Historique des sessions
- Visualisation des scores
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

### 5. Architecture Modulaire

**SpeechManager** - Providers interchangeables :
```python
# Backend permet de choisir facilement les providers
speech_manager = SpeechManager(
    stt_provider="groq",        # Groq (rapide) ou OpenAI (précis)
    tts_provider="elevenlabs"   # ElevenLabs (naturel) ou OpenAI
)
```

## Flow Complet

```
[Utilisateur]
    ↓ Enregistre audio (MediaRecorder)
    ↓ Envoie chunk audio (WebSocket)

[Backend]
    ↓ STT : Audio → Texte (Whisper)
    ↓ LLM : Génère réponse bienveillante (GPT-4o)
    ↓ TTS : Texte → Audio (OpenAI/ElevenLabs)
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

**IA Providers** :
```bash
DEFAULT_STT_PROVIDER=openai      # "openai" ou "groq"
DEFAULT_TTS_PROVIDER=openai      # "openai" ou "elevenlabs"
DEFAULT_LLM_MODEL=gpt-4o
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

**Frontend** :
```bash
cd frontend
npm install
npm run dev
```

## Documentation

- [Docker Setup](DOCKER_SETUP.md) - Guide Docker complet
- [Backend README](backend/README.md) - Documentation backend
- [Frontend README](frontend/README.md) - Documentation frontend
- [CONTEXT.md](CONTEXT.md) - Contexte et vision du projet

## API Documentation

Une fois l'application lancée :
- **Swagger UI** : http://localhost:8000/docs
- **ReDoc** : http://localhost:8000/redoc

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

- [ ] Ajouter authentification JWT
- [ ] Valider toutes les entrées utilisateur
- [ ] Rate limiting sur l'API
- [ ] HTTPS en production
- [ ] Secrets management (vault)

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

### V1.0
- [ ] Authentification utilisateur
- [ ] Multi-utilisateurs
- [ ] Historique complet des sessions
- [ ] Export des données (PDF, CSV)
- [ ] Tests unitaires et d'intégration

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
