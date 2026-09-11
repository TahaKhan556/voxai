#!/bin/bash
# VoxAI - Deployment Script
# Run this script on the VPS to deploy updates

set -e

echo "=== VoxAI Deployment ==="
echo "Started at: $(date)"

# Configuration
APP_DIR="/home/projects/voxai"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
VENV_DIR="$BACKEND_DIR/venv"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Step 1: Pull latest code
log_info "Step 1: Pulling latest code..."
cd "$APP_DIR"
git pull origin main || git pull origin master

# Step 2: Backend deployment
log_info "Step 2: Deploying backend..."
cd "$BACKEND_DIR"

# Create venv if it doesn't exist
if [ ! -d "$VENV_DIR" ]; then
    log_info "Creating Python virtual environment..."
    python3 -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"

# Install/update dependencies
log_info "Installing Python dependencies..."
pip install -r requirements.txt --quiet

# Step 3: Frontend deployment
log_info "Step 3: Deploying frontend..."
cd "$FRONTEND_DIR"

# Install dependencies
log_info "Installing Node.js dependencies..."
npm ci --silent

# Build frontend
log_info "Building frontend..."
npm run build

# Step 4: Restart services
log_info "Step 4: Restarting services..."

# Restart backend with PM2
pm2 restart voxai-backend 2>/dev/null || pm2 start "$BACKEND_DIR/run.py" --name voxai-backend --interpreter python3 -- --port 8000

# Restart frontend with PM2
pm2 restart voxai-frontend 2>/dev/null || pm2 start npm --name voxai-frontend --prefix "$FRONTEND_DIR" -- start

# Reload Nginx
sudo nginx -t && sudo systemctl reload nginx 2>/dev/null || true

# Step 5: Health check
log_info "Step 5: Running health check..."
sleep 5

HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health 2>/dev/null || echo "000")

if [ "$HEALTH_RESPONSE" = "200" ]; then
    log_info "Backend health check: OK"
else
    log_error "Backend health check failed (HTTP $HEALTH_RESPONSE)"
    log_info "Checking PM2 logs..."
    pm2 logs voxai-backend --lines 20 --nostream
    exit 1
fi

# Step 6: Save PM2 process list
pm2 save

echo ""
echo "=== Deployment Complete ==="
echo "Completed at: $(date)"
echo ""
echo "Services:"
echo "  - Backend: http://localhost:8000"
echo "  - Frontend: http://localhost:3000"
echo ""
echo "Useful commands:"
echo "  - View backend logs: pm2 logs voxai-backend"
echo "  - Monitor processes: pm2 monit"
echo "  - Restart backend: pm2 restart voxai-backend"
