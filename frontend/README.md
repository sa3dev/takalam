# Takalam Frontend - Next.js

Interface utilisateur pour Takalam, l'assistant vocal bienveillant pour l'apprentissage de l'arabe.

## Architecture

```
frontend/
├── app/
│   ├── layout.tsx              # Layout racine avec header/footer
│   ├── page.tsx                # Page de conversation principale
│   ├── globals.css             # Styles globaux Tailwind
│   └── dashboard/
│       └── page.tsx            # Dashboard analytics
├── components/
│   ├── RecordButton.tsx        # Bouton d'enregistrement animé
│   ├── TranscriptItem.tsx      # Item de transcription (bulle de chat)
│   ├── ConnectionStatus.tsx    # Indicateur de statut WebSocket
│   └── Card.tsx                # Composant carte réutilisable
├── hooks/
│   ├── useWebSocket.ts         # Hook WebSocket client
│   └── useAudioRecorder.ts     # Hook MediaRecorder API
├── lib/                        # Utilitaires
├── public/                     # Assets statiques
└── styles/                     # Styles additionnels
```

## Fonctionnalités

### 1. Page de Conversation (`/`)

**Interface minimaliste et apaisante** :
- Bouton d'enregistrement central avec animation
- Zone de transcription en temps réel
- Indicateur de statut de connexion
- Timer d'enregistrement
- Lecture automatique des réponses audio

**Flow utilisateur** :
1. L'utilisateur clique sur le bouton micro
2. L'audio est enregistré (MediaRecorder)
3. Au stop, l'audio est envoyé au backend via WebSocket
4. Le backend renvoie la transcription + réponse IA (texte + audio)
5. L'interface affiche les transcriptions et joue l'audio

### 2. Dashboard Analytics (`/dashboard`)

**Visualisation de la progression** :
- Liste des sessions précédentes
- Scores de fluidité et confiance (0-100)
- Nombre de mots prononcés
- Liste des nouveaux mots utilisés
- Corrections grammaticales avec explications

**Shadow Feedback** :
- L'analyse se fait en arrière-plan (pas d'interruption pendant la conversation)
- Les données sont affichées après la session

### 3. Hooks Personnalisés

**`useWebSocket`** :
- Gestion de la connexion WebSocket
- Reconnexion automatique
- Handlers pour transcriptions et audio
- Méthodes : `sendAudioChunk()`, `startSession()`, `endSession()`

**`useAudioRecorder`** :
- Interface pour MediaRecorder API
- Gestion du recording (start, stop, pause, resume)
- Timer de recording
- Conversion Blob → Base64

### 4. Composants UI

**`RecordButton`** :
- Animation pulse pendant l'enregistrement
- États : normal / recording / disabled
- Icône micro / stop

**`TranscriptItem`** :
- Bulles de chat style iMessage
- Différenciation visuelle user/assistant
- Direction RTL pour l'arabe
- Animation d'apparition

**`ConnectionStatus`** :
- Indicateur vert/jaune/rouge
- Affichage des erreurs

## Styling

**Tailwind CSS** avec thème personnalisé :
- Palette `calm` pour une interface apaisante
- Animations douces
- Direction RTL pour l'arabe
- Classes utilitaires personnalisées

## Développement Local

### Prérequis
- Node.js 20+
- npm 10+

### Installation

```bash
cd frontend

# Installer les dépendances
npm install

# Copier les variables d'environnement
cp ../.env.example ../.env

# Lancer le serveur de développement
npm run dev
```

Application disponible sur http://localhost:3000

### Scripts

```bash
# Développement
npm run dev

# Build production
npm run build

# Démarrer en production
npm start

# Linter
npm run lint

# Type checking
npm run type-check
```

## Configuration

Variables d'environnement (`.env`) :

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NODE_ENV=development
```

## API WebSocket

**Endpoint** : `ws://localhost:8000/ws/{session_id}`

**Messages envoyés** :
```typescript
// Démarrer une session
{ type: "start_session", user_id: 1 }

// Envoyer un chunk audio
{ type: "audio_chunk", audio_data: "base64..." }

// Terminer la session
{ type: "end_session" }
```

**Messages reçus** :
```typescript
// Transcription
{
  type: "transcription",
  speaker: "user" | "assistant",
  text: "...",
  is_final: true
}

// Réponse audio
{
  type: "audio_response",
  audio_data: "base64...",
  format: "mp3"
}

// Erreur
{
  type: "error",
  message: "..."
}
```

## API REST

**Sessions** :
- `GET /api/users/{userId}/sessions` - Liste des sessions
- `GET /api/sessions/{sessionId}` - Détails d'une session

**Analytics** :
- `GET /api/sessions/{sessionId}/analytics` - Obtenir les analytics
- `POST /api/sessions/{sessionId}/analyze` - Déclencher l'analyse

## Permissions Browser

L'application nécessite l'accès au microphone :
```javascript
navigator.mediaDevices.getUserMedia({ audio: true })
```

Le navigateur demandera la permission au premier usage.

## Optimisations

- **Standalone output** pour Docker
- **Code splitting** automatique (Next.js)
- **Streaming audio** pour latence minimale
- **Auto-reconnect WebSocket**

## Prochaines Améliorations

- [ ] Authentification utilisateur
- [ ] Sauvegarde locale des transcriptions (offline)
- [ ] Visualiseur audio en temps réel
- [ ] Support de plusieurs langues
- [ ] Mode sombre
- [ ] Progressive Web App (PWA)

## Build Docker

Le frontend est déjà configuré pour Docker (voir `Dockerfile` multi-stage).

```bash
# Development
docker-compose up frontend

# Production
NODE_ENV=production docker-compose up frontend
```
