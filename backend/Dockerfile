# ── Base commune ──────────────────────────────────────────────────────────────
# Pas de USER ici : chaque étage terminal le pose lui-même, sinon l'étage de dev
# ne pourrait plus installer ses dépendances.
FROM python:3.11-slim AS base

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app

# Expose port
EXPOSE 8000

# Default command (can be overridden in docker-compose)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# ── Développement ─────────────────────────────────────────────────────────────
# Ajoute pytest et le Redis simulé, pour que la suite de tests survive à un
# rebuild et puisse tourner en intégration continue.
FROM base AS dev
RUN pip install --no-cache-dir -r requirements-dev.txt
USER appuser

# ── Production ────────────────────────────────────────────────────────────────
# Dernier étage, donc celui qu'un `docker build` sans cible produit : le défaut
# doit être le plus sûr des deux, jamais l'image qui embarque les outils de test.
FROM base AS production
USER appuser
