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

**STT (Speech-to-Text)** :
- OpenAI Whisper (précision)
- Groq Whisper (vitesse)

**LLM (Conversation)** :
- GPT-4o (configuré comme mentor bienveillant)

**TTS (Text-to-Speech)** :
- OpenAI TTS
- ElevenLabs (voix naturelles)

**Exemple d'utilisation** :
```python
# Initialiser avec providers personnalisés
speech_manager = SpeechManager(
    stt_provider="groq",        # Groq pour la vitesse
    tts_provider="elevenlabs"   # ElevenLabs pour la qualité
)

# Ou utiliser les defaults (depuis settings)
speech_manager = SpeechManager()
```

### 2. Shadow Feedback Analyzer

Analyse pédagogique non-intrusive qui s'exécute en arrière-plan :

**Données extraites** :
- `grammar_corrections` : Corrections grammaticales avec explications
- `vocabulary_new` : Nouveaux mots utilisés
- `fluency_score` : Score de fluidité (0-100)
- `confidence_level` : Niveau de confiance (0-100)

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

# AI API Keys
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...
ELEVENLABS_API_KEY=...

# AI Configuration
DEFAULT_STT_PROVIDER=openai      # "openai" ou "groq"
DEFAULT_LLM_MODEL=gpt-4o
DEFAULT_TTS_PROVIDER=openai      # "openai" ou "elevenlabs"
```

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
- `fluency_score`, `confidence_level`
- `total_words_spoken`, `average_response_time`

## Tests

```bash
# Tests unitaires (à implémenter)
pytest

# Linter
ruff check .
```

## Déploiement

Voir le fichier `docker-compose.yml` à la racine du projet pour un déploiement complet.
