# Architecture — Takalam (تكلم)

État au 4 août 2026. Établi en lisant le code, pas l'intention : ce qui figure
ici existe réellement dans le dépôt.

## Vue d'ensemble

```mermaid
flowchart TB
    User["👤 Apprenant<br/>navigateur + micro"]

    subgraph Front["Frontend — Next.js 16 (port 3000)"]
        direction TB
        Pages["Pages<br/>/app conversation · /dashboard · /login · /privacy"]
        Hooks["Hooks<br/>useWebSocket · useAudioRecorder · useQuota"]
        Ctx["Contextes<br/>AuthContext · LanguageContext (7 langues)"]
        Proxy["Proxy /api/*<br/>réécriture vers le backend"]
        Pages --- Hooks
        Pages --- Ctx
        Pages --- Proxy
    end

    subgraph Back["Backend — FastAPI (port 8000)"]
        direction TB

        subgraph Routes["Routeurs"]
            AuthR["auth.py — /api/auth<br/>inscription · connexion · session<br/>suppression RGPD"]
            ApiR["api.py — /api<br/>sessions · transcriptions · analytics<br/>quota · intérêt Pro · ticket WS"]
            WsR["websocket.py — /ws/:session_id<br/>boucle de conversation<br/>réserve et règle le quota"]
        end

        subgraph Core["Noyau"]
            Auth["auth_deps + security<br/>JWT en cookie HttpOnly · bcrypt<br/>tickets WS à usage unique"]
            RL["rate_limit<br/>limites par IP · plafond de tours<br/>quota freemium · compteur d'usage"]
        end

        subgraph Svc["Services"]
            Speech["speech_manager<br/>orchestre STT → LLM → TTS<br/>+ traduction en parallèle"]
            Shadow["shadow_feedback<br/>analyse différée d'une session"]
            Pay["paywall<br/>mesure murs et intentions"]
        end

        WsMgr["websocket/manager<br/>connexions vives · état de session<br/>persistance en fin de session"]

        Routes --> Core
        WsR --> WsMgr
        WsMgr --> Speech
        ApiR --> Shadow
        WsR --> Pay
        ApiR --> Pay
    end

    subgraph Data["Données"]
        PG[("PostgreSQL 16<br/>users · sessions · transcriptions<br/>session_analytics · paywall_events")]
        RD[("Redis 7<br/>tickets · historique de conversation<br/>compteurs de quota et d'usage")]
    end

    subgraph Ext["Dépendances externes"]
        Groq["Groq API<br/>whisper-large-v3 (STT)<br/>llama-3.3-70b (LLM)"]
        Edge["Microsoft Edge TTS<br/>synthèse vocale · sans clé"]
    end

    User -->|"HTTPS — pages"| Pages
    User -->|"WebSocket JSON — audio base64"| WsR
    Proxy -->|"REST · cookie de session"| Routes

    Auth -->|"tickets WS"| RD
    RL -->|"compteurs"| RD
    Routes -->|"SQL"| PG
    WsMgr -->|"historique"| RD
    WsMgr -->|"SQL en fin de session"| PG
    Pay -->|"SQL + déduplication"| PG
    Pay -->|"déduplication du jour"| RD
    Shadow -->|"HTTPS"| Groq
    Speech -->|"HTTPS"| Groq
    Speech -->|"HTTPS"| Edge

    classDef ext fill:#fde8dc,stroke:#c2410c,color:#7c2d12
    classDef store fill:#e8f0e4,stroke:#4d7c3f,color:#1f3d17
    class Groq,Edge ext
    class PG,RD store
```

**Le point d'entrée utilisateur est unique** : le navigateur, sur `/app`. Deux
canaux en partent — le REST passe par le proxy Next, le WebSocket attaque le
backend directement (il ne peut pas être proxifié, la CSP l'autorise
explicitement).

## Un tour de conversation

C'est le chemin critique : tout ce qui coûte de l'argent s'y trouve.

```mermaid
sequenceDiagram
    autonumber
    participant B as Navigateur
    participant W as Route WS
    participant R as Redis
    participant M as Manager
    participant S as SpeechManager
    participant G as Groq
    participant E as Edge TTS
    participant P as PostgreSQL

    B->>W: audio_chunk (base64, mime, langue cible)
    W->>R: plafond de tours (15/min, 300/jour)
    alt plafond dépassé
        W-->>B: rate_limited
    end
    W->>R: INCRBY réservation estimée
    alt allocation épuisée
        W->>P: paywall_event wall_hit (1×/jour)
        W-->>B: quota_exceeded
    else allocation disponible
        W->>M: handle_audio_chunk
        M->>R: GET historique de conversation
        M->>S: process_conversation_turn
        S->>G: transcription (whisper-large-v3)
        G-->>S: texte + durée réelle
        S->>G: réponse (llama-3.3-70b)
        par en parallèle
            S->>E: synthèse vocale
        and
            S->>G: traduction
        end
        S-->>M: texte, réponse, traduction, audio, durée
        M->>R: SETEX historique (TTL 1 h)
        M-->>B: transcription, audio_response
        M-->>W: durée réellement parlée
        W->>R: INCRBY (réel − estimation)
        W-->>B: quota_update
    end
```

La réservation avant transcription et le règlement après sont **au même
endroit**, dans la route : c'est ce qui garantit qu'un tour échoué, refusé ou
concurrent rend son estimation. Un tour sans réponse ne coûte rien à
l'apprenant.

## Ce qui est stocké, et où

### PostgreSQL — la vérité durable

| Table | Contenu | Notes |
|---|---|---|
| `users` | identité, mot de passe bcrypt, `plan`, `plan_updated_at` | `plan` est la seule source d'autorité pour l'accès Pro |
| `sessions` | une conversation, début, fin, durée | écrite à la fermeture de session |
| `transcriptions` | chaque réplique, locuteur, langue | |
| `session_analytics` | corrections grammaticales, vocabulaire nouveau, mots prononcés | remplie en tâche de fond après la session ; les colonnes `fluency_score` et `confidence_level` subsistent mais ne sont plus écrites |
| `paywall_events` | `wall_hit` et `interest` | numérateur et dénominateur de la conversion |
| `alembic_version` | révision de schéma | **à vérifier avant tout déploiement** (voir `PRODUCTION_CHECKLIST.md`) |

### Redis — l'éphémère et les compteurs

| Clé | Rôle | Durée de vie |
|---|---|---|
| `ws_ticket:{ticket}` | ticket WebSocket à usage unique | 60 s |
| `conv_history:{user}:{session}` | historique envoyé au LLM | 1 h, prolongée à la reconnexion |
| `ws_turns:min:{user}` · `ws_turns:day:{user}` | plafond anti-abus, tous plans confondus | 60 s · 24 h |
| `quota:spoken:{user}:{date}` | allocation quotidienne consommée | 48 h |
| `paywall:wall_hit:{user}:{date}` | déduplication du mur | 48 h |
| `usage:spoken:all:{date}` | secondes transcrites, tous utilisateurs | 48 h |
| `LIMITS:LIMITER/...` | fenêtres de slowapi, par IP | selon la règle |

**La date UTC dans la clé *est* le mécanisme de remise à zéro** : pas de tâche
planifiée, un nouveau jour est simplement une nouvelle clé.

## Dépendances externes

| Service | Usage | Clé requise | Si indisponible |
|---|---|---|---|
| **Groq** | transcription, réponse, traduction, analyse | `GROQ_API_KEY` | le tour échoue et rend sa réservation |
| **Edge TTS** | synthèse vocale | aucune | le tour échoue, aucun coût |
| OpenAI, ElevenLabs | déclarés, **non utilisés** par défaut | optionnelles | — |

## Deux précisions qui évitent des malentendus

**Il n'y a pas de file de messages.** `celery` figure dans `requirements.txt`
mais aucun code ne l'importe : l'analyse de session passe par les
`BackgroundTasks` de FastAPI, dans le processus de l'API. Une tâche perdue au
redémarrage est perdue — acceptable pour une analyse rejouable, à revoir si
d'autres traitements différés apparaissent.

**Il n'y a pas de microservices.** Un backend FastAPI, un frontend Next, deux
bases. Les « services » du diagramme sont des modules Python dans le même
processus ; les flèches entre eux sont des appels de fonction, pas du réseau.
Seuls les liens marqués REST, WebSocket, SQL ou HTTPS traversent un socket.
