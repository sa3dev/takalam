# Docker Setup - Takalam

## Démarrage rapide

### 1. Configuration des variables d'environnement

Copier le fichier d'exemple et remplir vos clés API :

```bash
cp .env.example .env
```

Éditer `.env` et ajouter vos clés API :
- `OPENAI_API_KEY` : Votre clé OpenAI
- `GROQ_API_KEY` : Votre clé Groq (optionnel)
- `ELEVENLABS_API_KEY` : Votre clé ElevenLabs

### 2. Lancer l'application

```bash
docker-compose up
```

L'application sera accessible sur :
- **Frontend** : http://localhost:3000
- **Backend API** : http://localhost:8000
- **API Docs** : http://localhost:8000/docs
- **PostgreSQL** : localhost:5432
- **Redis** : localhost:6379

### 3. Arrêter l'application

```bash
docker-compose down
```

Pour supprimer également les volumes (base de données) :

```bash
docker-compose down -v
```

## Commandes utiles

### Rebuild les images

```bash
docker-compose build
```

### Rebuild sans cache

```bash
docker-compose build --no-cache
```

### Voir les logs

```bash
# Tous les services
docker-compose logs -f

# Backend seulement
docker-compose logs -f backend

# Frontend seulement
docker-compose logs -f frontend
```

### Exécuter des commandes dans les containers

```bash
# Backend shell
docker-compose exec backend bash

# Frontend shell
docker-compose exec frontend sh

# Accéder à PostgreSQL
docker-compose exec db psql -U takalam_user -d takalam

# Accéder à Redis CLI
docker-compose exec redis redis-cli
```

## Mode Production

Pour lancer en mode production :

```bash
NODE_ENV=production docker-compose up -d
```

## Troubleshooting

### Les ports sont déjà utilisés

Modifier les ports dans `.env` :

```bash
FRONTEND_PORT=3001
BACKEND_PORT=8001
POSTGRES_PORT=5433
REDIS_PORT=6380
```

### Problèmes de permissions

```bash
# Donner les permissions
sudo chown -R $USER:$USER .

# Rebuild
docker-compose build --no-cache
docker-compose up
```

### Reset complet

```bash
docker-compose down -v
docker system prune -a
docker-compose up --build
```
