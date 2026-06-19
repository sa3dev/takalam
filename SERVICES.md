# Services Tiers — Takalam

## Vue d'ensemble

| Service | Rôle | Compte requis | Variable d'env |
|---|---|---|---|
| Groq | LLM (Llama 3.3 70B) + STT (Whisper) | Oui | `GROQ_API_KEY` |
| OpenAI | TTS (voix arabe) — fallback STT | Oui | `OPENAI_API_KEY` |
| ElevenLabs | TTS voix arabe naturelle | Oui | `ELEVENLABS_API_KEY` |
| GitHub | Hébergement du code source | Oui | — |
| Hetzner | Serveur VPS | Oui (déjà fait) | — |
| Dokploy | PaaS auto-hébergé | Oui (déjà fait) | — |

---

## 1. Groq ⭐ Principal

**Rôle dans Takalam :** deux usages sur un seul compte
- **Llama 3.3 70B** → le "cerveau" de Takalam, génère les réponses bienveillantes en arabe
- **Whisper Large v3** → transcription audio arabe en texte (STT)

Groq fait tourner ces modèles sur du hardware dédié (LPU) → latence très faible, idéal pour une app vocale temps réel.

**Configuration**
1. Créer un compte sur [console.groq.com](https://console.groq.com)
2. Aller dans **API Keys** → **Create API Key**
3. Coller la clé dans Dokploy : `GROQ_API_KEY=gsk_...`

**Modèles utilisés**
- LLM : `llama-3.3-70b-versatile`
- STT : `whisper-large-v3`

**Coût estimé**
- Llama 3.3 70B : ~$0.59 / 1M tokens input, ~$0.79 / 1M tokens output
- Whisper : ~$0.111 / heure audio
- Free tier généreux pour démarrer (14 400 requêtes/jour)

---

## 2. OpenAI

**Rôle dans Takalam :** TTS uniquement (voix arabe via `tts-1`)  
Optionnel si ElevenLabs suffit — utile comme fallback ou alternative moins chère.

**Configuration**
1. Créer un compte sur [platform.openai.com](https://platform.openai.com)
2. Aller dans **API Keys** → **Create new secret key**
3. Ajouter du crédit dans **Billing** (pas de free tier en prod)
4. Coller la clé dans Dokploy : `OPENAI_API_KEY=sk-...`

**Modèle utilisé**
- TTS : `tts-1` (voix `nova` ou `alloy`)

**Coût estimé**
- TTS : $15 / 1M caractères

---

## 3. ElevenLabs

**Rôle dans Takalam :** TTS — convertit les réponses texte de l'IA en voix arabe naturelle.

**Configuration**
1. Créer un compte sur [elevenlabs.io](https://elevenlabs.io)
2. Aller dans **Profile** → **API Key**
3. Choisir une voix arabe dans la **Voice Library** (rechercher "Arabic")
4. Noter l'ID de la voix choisie (utilisé dans le code)
5. Coller la clé dans Dokploy : `ELEVENLABS_API_KEY=...`

**Coût**
- Free tier : 10 000 caractères/mois
- Starter ($5/mois) : 30 000 caractères
- Pour une app en prod : plan Creator ($22/mois) recommandé

**Alternative** : OpenAI TTS (`tts-1` avec voix `alloy` ou `nova`) si ElevenLabs est trop cher — qualité légèrement inférieure en arabe.

---

## 4. GitHub

**Rôle dans Takalam :** hébergement du repo, source pour les déploiements Dokploy (pull automatique à chaque push).

**Configuration**
1. Créer un repo sur [github.com](https://github.com) (public ou privé)
2. Dans Dokploy → connecter ton compte GitHub via OAuth
3. Sélectionner le repo `takalam` dans Dokploy

**Commandes pour pousser**
```bash
git remote add origin https://github.com/<ton-compte>/takalam.git
git push -u origin master
```

---

## 5. Hetzner (déjà configuré)

**Rôle :** VPS qui héberge Dokploy et tous les containers Docker.

**Vérifier que les ports sont ouverts** dans le Firewall Hetzner :
- `80` (HTTP)
- `443` (HTTPS)
- `22` (SSH)
- `3000` et `8000` peuvent rester fermés (Dokploy/Traefik gère le routing)

---

## 6. Dokploy (déjà configuré)

**Rôle :** orchestre les containers, gère SSL (via Traefik + Let's Encrypt), reverse proxy.

**Checklist de configuration pour Takalam**
- [ ] Nouveau projet créé dans Dokploy
- [ ] Service Docker Compose pointant sur le repo GitHub
- [ ] Fichier compose : `docker-compose.prod.yml`
- [ ] Variables d'environnement renseignées (voir `.env.production.example`)
- [ ] Domaine frontend configuré → port `3000`
- [ ] Domaine backend/API configuré → port `8000`
- [ ] SSL activé (Let's Encrypt auto via Dokploy)

---

## Services auto-hébergés (aucune configuration externe)

Ces services tournent dans Docker, pas besoin de compte tiers.

| Service | Image | Rôle |
|---|---|---|
| PostgreSQL | `postgres:16-alpine` | Base de données principale |
| Redis | `redis:7-alpine` | Cache de session |

Les données persistent via les volumes Docker `postgres_data` et `redis_data` définis dans `docker-compose.prod.yml`.

---

## Ordre de démarrage recommandé

1. **Groq** → créer compte + clé (LLM + STT, gratuit pour démarrer) ← priorité
2. **ElevenLabs** → créer compte + choisir voix arabe + clé
3. **OpenAI** → créer compte + crédit + clé (TTS fallback, optionnel au départ)
4. **GitHub** → créer repo + pousser le code
5. **Dokploy** → créer projet + coller les vars + déployer
