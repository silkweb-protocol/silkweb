#!/bin/bash
# SilkWeb Deployment Script
# Run on VPS: bash deploy.sh
#
# Prerequisites:
#   - Python 3.12, PostgreSQL 16, Redis 7 installed
#   - silkweb user created: sudo useradd -r -m -d /opt/silkweb silkweb
#   - PostgreSQL database created: createdb silkweb
#   - .env file configured at /opt/silkweb/.env
#   - Nginx installed with silkweb.conf in sites-enabled
#   - SSL cert via: sudo certbot certonly --webroot -w /var/www/certbot -d silkweb.io -d api.silkweb.io

set -euo pipefail

APP_DIR="/opt/silkweb"
REPO="https://github.com/silkweb-protocol/silkweb.git"
BRANCH="main"

echo "=== SilkWeb Deploy ==="
echo "$(date)"

# Pull latest code
if [ -d "$APP_DIR/.git" ]; then
    echo "Pulling latest..."
    cd "$APP_DIR"
    git fetch origin
    git reset --hard "origin/$BRANCH"
else
    echo "Cloning repo..."
    git clone --branch "$BRANCH" "$REPO" "$APP_DIR"
    cd "$APP_DIR"
fi

# Set up virtual environment
if [ ! -d "$APP_DIR/.venv" ]; then
    echo "Creating virtual environment..."
    python3.12 -m venv "$APP_DIR/.venv"
fi

echo "Installing dependencies..."
"$APP_DIR/.venv/bin/pip" install --quiet --upgrade pip
"$APP_DIR/.venv/bin/pip" install --quiet -r requirements.txt

# Run database migrations
echo "Running migrations..."
"$APP_DIR/.venv/bin/alembic" upgrade head

# Copy landing page to web root
echo "Deploying landing page..."
sudo mkdir -p /var/www/silkweb
sudo cp -r "$APP_DIR/silkweb-landing/"* /var/www/silkweb/
sudo chown -R www-data:www-data /var/www/silkweb

# Copy Nginx config
echo "Updating Nginx config..."
sudo cp "$APP_DIR/deploy/nginx/silkweb.conf" /etc/nginx/sites-available/silkweb
sudo cp "$APP_DIR/deploy/nginx/proxy-params.conf" /etc/nginx/snippets/proxy-params.conf
sudo ln -sf /etc/nginx/sites-available/silkweb /etc/nginx/sites-enabled/silkweb
sudo nginx -t

# Copy and reload systemd service
echo "Updating systemd service..."
sudo cp "$APP_DIR/deploy/silkweb-api.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable silkweb-api
sudo systemctl restart silkweb-api

# Reload Nginx
sudo systemctl reload nginx

# Health check (wait for startup)
echo "Waiting for API to start..."
sleep 3
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/health || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo ""
    echo "=== DEPLOY SUCCESS ==="
    echo "API:     https://api.silkweb.io/health"
    echo "Landing: https://silkweb.io"
    echo "Status:  sudo systemctl status silkweb-api"
    echo "Logs:    journalctl -u silkweb-api -f"
else
    echo ""
    echo "=== DEPLOY WARNING ==="
    echo "API health check returned: $HTTP_CODE"
    echo "Check logs: journalctl -u silkweb-api -n 50"
    exit 1
fi
