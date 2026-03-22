#!/bin/bash
# SilkWeb VPS Initial Setup
# Run ONCE on fresh VPS: sudo bash setup-vps.sh
#
# This installs Python 3.12, PostgreSQL 16, Redis 7
# alongside your existing services on the VPS

set -euo pipefail

echo "=== SilkWeb VPS Setup ==="
echo "This will install Python 3.12, PostgreSQL 16, Redis 7"
echo "Your existing Express server on :3001 will NOT be affected."
echo ""

# Update system
apt-get update && apt-get upgrade -y

# ── Python 3.12 ──
echo "Installing Python 3.12..."
apt-get install -y software-properties-common
add-apt-repository -y ppa:deadsnakes/ppa
apt-get update
apt-get install -y python3.12 python3.12-venv python3.12-dev

# ── PostgreSQL 16 ──
echo "Installing PostgreSQL 16..."
apt-get install -y postgresql-16 postgresql-client-16

# Create SilkWeb database and user
sudo -u postgres psql <<SQL
CREATE USER silkweb WITH PASSWORD 'CHANGE_THIS_PASSWORD';
CREATE DATABASE silkweb OWNER silkweb;
GRANT ALL PRIVILEGES ON DATABASE silkweb TO silkweb;
SQL

# ── Redis 7 ──
echo "Installing Redis 7..."
apt-get install -y redis-server

# Configure Redis: bind to localhost only, set max memory
sed -i 's/^bind .*/bind 127.0.0.1 ::1/' /etc/redis/redis.conf
sed -i 's/^# maxmemory .*/maxmemory 128mb/' /etc/redis/redis.conf
sed -i 's/^# maxmemory-policy .*/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf
systemctl restart redis-server

# ── Nginx (if not already installed) ──
apt-get install -y nginx certbot python3-certbot-nginx

# ── Create silkweb system user ──
useradd -r -m -d /opt/silkweb -s /bin/bash silkweb

# ── Create directories ──
mkdir -p /var/www/silkweb
mkdir -p /var/www/certbot
mkdir -p /opt/silkweb/logs

# ── Firewall ──
echo "Configuring firewall..."
ufw allow 80/tcp    # HTTP (redirects to HTTPS)
ufw allow 443/tcp   # HTTPS
# Port 3001 should already be open for your Express server
# Port 8000 stays internal (Nginx proxies to it)

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Update PostgreSQL password in this script (line 34)"
echo "2. Get SSL cert: sudo certbot certonly --webroot -w /var/www/certbot -d silkweb.io -d api.silkweb.io"
echo "3. Create .env at /opt/silkweb/.env (use .env.example as template)"
echo "4. Run deploy.sh"
echo ""
echo "Your Express server on :3001 is untouched."
