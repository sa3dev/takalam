# Services Tiers — Takalam

## Vue d'ensemble

| Service | Rôle | Compte requis | Variable d'env |
|---|---|---|---|
| Groq | LLM (Llama 3.3 70B) + STT (Whisper Large v3) | **Oui** | `GROQ_API_KEY` |
| Microsoft Edge TTS | Synthèse vocale arabe | Non — aucune clé | — |
| OpenAI | ~~TTS~~ — **non utilisé** | Non | `OPENAI_API_KEY` (ignorée) |
| ElevenLabs | ~~TTS~~ — **non utilisé** | Non | `ELEVENLABS_API_KEY` (ignorée) |
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

## 2. Microsoft Edge TTS ⭐ La voix

**Rôle dans Takalam :** convertit les réponses de l'IA en voix arabe.

**Configuration : aucune.** Pas de compte, pas de clé, pas de facture — la
bibliothèque `edge-tts` appelle le service utilisé par le navigateur Edge. C'est
ce qui fait tomber le coût variable de Takalam à zéro.

**Voix configurée** : `ar-SA-HamedNeural` (masculine). Alternative féminine :
`ar-SA-ZariyahNeural`. Se change par la variable `EDGE_TTS_VOICE`, sans
redéploiement.

```bash
docker compose exec backend edge-tts --list-voices | grep ar-
```

**Coût** : 0 €.

> Risque assumé : ce service n'a pas de contrat de niveau de service. S'il
> disparaissait, il faudrait basculer sur un TTS payant — `TTSProvider` est une
> interface abstraite, précisément pour que ce jour-là ne soit pas une réécriture.

---

## 3. OpenAI et ElevenLabs — non utilisés

Ils figuraient dans la conception initiale pour le TTS. **Le code ne les appelle
pas** : `SpeechManager` construit `EdgeTTS()` en dur, qui est gratuit et donne
un arabe de bonne qualité.

Les variables `OPENAI_API_KEY` et `ELEVENLABS_API_KEY` sont encore acceptées par
la configuration, mais rien ne les lit. **Ne crée pas ces comptes** pour lancer
Takalam : tu paierais pour rien.

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

1. **Groq** → créer compte + clé (LLM + STT, gratuit pour démarrer) ← la seule clé nécessaire
2. **GitHub** → créer repo + pousser le code
3. **Registrar** → acheter `takalamapp.com` + poser les enregistrements DNS
4. **Dokploy** → créer projet + coller les vars + déployer

Marche à suivre détaillée dans [DEPLOYMENT.md](DEPLOYMENT.md).
