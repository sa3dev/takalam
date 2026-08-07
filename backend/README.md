# Takalam Backend - FastAPI

Backend API pour Takalam, l'assistant vocal bienveillant pour l'apprentissage de l'arabe.

## Architecture

```
backend/
├── app/
│   ├── main.py                    # Point d'entrée FastAPI
│   ├── config/
│   │   └── settings.py            # Configuration et variables d'environnement
│   ├── models/
│   │   └── database.py            # Modèles SQLAlchemy (User, Session, Transcription, Analytics)
│   ├── schemas/
│   │   └── session.py             # Schémas Pydantic pour validation
│   ├── services/
│   │   ├── speech_manager.py      # Gestionnaire STT/LLM/TTS modulaire
│   │   └── shadow_feedback.py     # Analyseur pédagogique en arrière-plan
│   ├── websocket/
│   │   └── manager.py             # Gestionnaire de connexions WebSocket
│   └── routes/
│       ├── api.py                 # Routes API REST
│       └── websocket.py           # Routes WebSocket
├── Dockerfile
├── requirements.txt
└── README.md
```

## Fonctionnalités Clés

### 1. SpeechManager (Multi-Provider)

Classe modulaire permettant de switcher facilement entre providers :

**STT (Speech-to-Text)** : Whisper Large v3 via Groq

**LLM (Conversation)** : Llama 3.3 70B via Groq, avec un prompt système
de mentor bienveillant

**TTS (Text-to-Speech)** : Microsoft Edge TTS — gratuit, aucune clé API

Chaque provider implémente une interface abstraite, donc en remplacer un ne
touche pas au reste. Le choix est fixé à la construction :

```python
class SpeechManager:
    def __init__(self):
        self.stt = GroqSTT()
        self.llm = GroqLLM()
        self.tts: TTSProvider = EdgeTTS()

# Instance partagée, importée depuis app.services.speech_manager
speech_manager = SpeechManager()
```

### 2. Shadow Feedback Analyzer

Analyse pédagogique non-intrusive qui s'exécute en arrière-plan :

**Données extraites** :
- `grammar_corrections` : Corrections grammaticales avec explications
- `vocabulary_new` : Nouveaux mots utilisés

> Un `fluency_score` et un `confidence_level` existaient. Retirés : l'analyseur ne
> voit que la transcription, dont Whisper a déjà ôté les hésitations et le ton que
> ces scores prétendaient mesurer.

**Flow** :
1. L'utilisateur converse librement (pas d'interruption)
2. À la fin de la session, l'analyse est déclenchée
3. Les métriques sont sauvegardées en DB
4. Le dashboard peut afficher la progression

### 3. WebSocket Real-Time

**Endpoint** : `ws://localhost:8000/ws/{session_id}`

**Messages client → serveur** :
```json
// Démarrer une session
{
  "type": "start_session",
  "user_id": 1
}

// Envoyer un chunk audio
{
  "type": "audio_chunk",
  "audio_data": "base64_encoded_audio..."
}

// Terminer la session
{
  "type": "end_session"
}
```

**Messages serveur → client** :
```json
// Transcription utilisateur
{
  "type": "transcription",
  "speaker": "user",
  "text": "مرحبا كيف حالك",
  "is_final": true
}

// Réponse IA (texte)
{
  "type": "transcription",
  "speaker": "assistant",
  "text": "أهلا! أنا بخير، شكراً",
  "is_final": true
}

// Réponse IA (audio)
{
  "type": "audio_response",
  "audio_data": "base64_encoded_mp3...",
  "format": "mp3"
}
```

## API REST Endpoints

### Sessions
- `POST /api/sessions` - Créer une session
- `GET /api/sessions/{session_id}` - Obtenir une session
- `GET /api/users/{user_id}/sessions` - Lister les sessions d'un utilisateur

### Transcriptions
- `GET /api/sessions/{session_id}/transcriptions` - Obtenir les transcriptions d'une session

### Analytics
- `GET /api/sessions/{session_id}/analytics` - Obtenir les analytics d'une session
- `POST /api/sessions/{session_id}/analyze` - Déclencher l'analyse Shadow Feedback

### Health
- `GET /api/health` - Health check

## Développement Local

### Prérequis
- Python 3.11+
- PostgreSQL
- Redis

### Installation

```bash
# Créer un environnement virtuel
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Installer les dépendances
pip install -r requirements.txt

# Configurer les variables d'environnement
cp ../.env.example ../.env
# Éditer .env avec vos clés API
```

### Lancer le serveur

```bash
# Avec uvicorn
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Ou directement
python -m app.main
```

API disponible sur http://localhost:8000
Documentation interactive sur http://localhost:8000/docs

## Configuration

Variables d'environnement importantes (voir `app/config/settings.py`) :

```bash
# Database
DATABASE_URL=postgresql://user:password@db:5432/takalam

# Redis
REDIS_URL=redis://redis:6379/0

# Clés API — seule GROQ_API_KEY est nécessaire
GROQ_API_KEY=gsk_...
# OPENAI_API_KEY et ELEVENLABS_API_KEY sont acceptées mais inutilisées

# Configuration IA
DEFAULT_LLM_MODEL=llama-3.3-70b-versatile
EDGE_TTS_VOICE=ar-SA-HamedNeural   # masculine ; ar-SA-ZariyahNeural pour féminine

# Freemium
FREE_DAILY_SPOKEN_SECONDS=600      # 10 min/jour, remise à zéro à minuit UTC
```

Liste complète des variables dans `.env.production.example`.

## Modèles de Données

### User
- `id`, `email`, `username`, `hashed_password`

### Session
- `id`, `user_id`, `started_at`, `ended_at`, `duration_seconds`

### Transcription
- `id`, `session_id`, `speaker`, `text`, `language`, `confidence`

### SessionAnalytics
- `id`, `session_id`
- `grammar_corrections` (JSON)
- `vocabulary_new` (JSON)
- `total_words_spoken`, `average_response_time`
- `fluency_score`, `confidence_level` — colonnes conservées mais plus écrites

## Tests

17 tests couvrant le quota freemium (réservation, règlement, cas Pro, passage de
jour UTC), la déduplication du mur payant et la suppression de compte RGPD.

```bash
docker compose exec backend python -m pytest
```

Ils ne demandent ni PostgreSQL ni Redis : SQLite en mémoire (clés étrangères
activées, sans quoi le test de suppression RGPD ne prouverait rien) et un Redis
simulé. `pytest` et `fakeredis` font partie de l'étage `dev` de l'image.

En local hors Docker :

```bash
pip install -r requirements-dev.txt
python -m pytest
```

Aucun linter n'est configuré à ce jour.

## Déploiement

Développement : `docker-compose.yml` à la racine (étage `dev` de l'image).
Production : `docker-compose.prod.yml` (étage `production`), marche à suivre
dans [DEPLOYMENT.md](../DEPLOYMENT.md).
