# Project Context: Takalam (تكلم) - Assistant Vocal Bienveillant

## 1. Vision & Philosophie
*Takalam* (arabe pour "Parle") est une application d'apprentissage de la langue arabe par la voix. 
•⁠  ⁠*Le problème :* La "barrière de la honte" et la peur du jugement bloquent l'apprentissage oral.
•⁠  ⁠*La solution :* Un "confident" IA bienveillant qui écoute sans juger.
•⁠  ⁠*L'innovation :* L'IA ne coupe pas l'utilisateur pour le corriger. Elle maintient le flux ("Flow") et effectue une analyse pédagogique en arrière-plan (Shadow Feedback) pour alimenter un dashboard de progression.

## 2. Stack Technique (Architecture Multi-Containers)
L'application doit être entièrement dockerisée pour un setup ⁠ docker-compose up ⁠ immédiat.

•⁠  ⁠*Frontend (Next.js - App Router):*
    * Interface minimaliste et apaisante.
    * Gestion de l'audio via Web API (MediaRecorder).
    * Dashboard de stats (consommation des API routes pour la sécurité).
•⁠  ⁠*Backend (FastAPI - Python):*
    * Gestion des WebSockets pour le streaming audio temps réel.
    * Orchestration asynchrone (BackgroundTasks) pour l'analyse des sessions.
•⁠  ⁠*Pipeline IA (Low Latency):*
    * *STT :* Whisper Large v3 via Groq (faible latence, précision arabe). Focus sur la précision en langue arabe.
    * *LLM :* Llama 3.3 70B via Groq (mentor bienveillant, même compte que le STT).
    * *TTS :* ElevenLabs (voix arabe naturelle) ou OpenAI TTS en fallback.
•⁠  ⁠*Data & Cache:*
    * *PostgreSQL :* Stockage des utilisateurs, des transcriptions et des métriques de progression.
    * *Redis :* Gestion du contexte de session et mise en cache.

## 3. Schéma de Données & Analyse (Shadow Feedback)
Chaque échange doit être analysé pour extraire ces données JSON :
•⁠  ⁠⁠ grammar_corrections ⁠: List[{ "input": str, "output": str, "explanation": str }]
•⁠  ⁠⁠ vocabulary_new ⁠: List[str] (nouveaux mots utilisés par l'utilisateur)
•⁠  ⁠⁠ fluency_score ⁠: int (calculé sur la longueur des phrases et le délai de réponse)
•⁠  ⁠⁠ confidence_level ⁠: int (basé sur le ton ou les hésitations si possible)

## 4. Instructions pour Claude Code (MVP Priorities)
1.  *Infrastructure :* Créer le ⁠ docker-compose.yml ⁠ incluant les services (app-front, app-back, db, redis).
2.  *Communication :* Établir le boilerplate WebSocket entre le client Next.js et le serveur FastAPI pour l'envoi de chunks audio.
3.  *Modularité :* Créer une classe ⁠ SpeechManager ⁠ côté backend capable de switcher facilement entre les providers (OpenAI, Groq, ElevenLabs).
4.  *Prompt Engineering :* Préparer le "System Prompt" pour l'IA : "Tu es un ami patient nommé Takalam, ton but est d'encourager l'utilisateur à parler arabe. Ne le corrige pas de manière intrusive, mais aide-le à progresser."

## 5. Contraintes de Développement
•⁠  ⁠Utilisation de TypeScript côté Frontend.
•⁠  ⁠Code Python typé (Pydantic).
•⁠  ⁠Dossiers structurés par service : ⁠ /frontend ⁠ et ⁠ /backend ⁠.
