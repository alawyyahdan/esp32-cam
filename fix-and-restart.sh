#!/bin/bash

# ESP32-CAM Quick Fix & Restart Script
# Fix port configuration and restart PM2

set -e

echo "🔧 ESP32-CAM Quick Fix & Restart"
echo "================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Load .env
if [ -f ".env" ]; then
    print_status "Loading .env file..."
    export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
    print_success "PORT set to: $PORT"
else
    print_error ".env file not found!"
    exit 1
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    print_error "PM2 not installed!"
    print_status "Installing PM2..."
    npm install -g pm2
fi

# Stop existing process
print_status "Stopping existing process..."
pm2 stop esp32-cam-streaming 2>/dev/null || true
pm2 delete esp32-cam-streaming 2>/dev/null || true

# Start with correct port
print_status "Starting with PORT=$PORT..."
pm2 start ecosystem.config.js --env production

# Save PM2 list
pm2 save

print_success "Application restarted!"
echo ""
echo "================================="
echo "📊 Status"
echo "================================="
pm2 status
echo ""
echo "================================="
echo "🔍 Check if port is listening"
echo "================================="
sleep 2
if netstat -tlnp 2>/dev/null | grep ":$PORT" || ss -tlnp 2>/dev/null | grep ":$PORT"; then
    print_success "Port $PORT is listening!"
else
    print_error "Port $PORT is NOT listening!"
    echo ""
    print_status "Checking logs..."
    pm2 logs esp32-cam-streaming --lines 20 --nostream
fi
echo ""
echo "================================="
echo "📝 Useful Commands"
echo "================================="
echo "View logs:    pm2 logs esp32-cam-streaming"
echo "Monitor:      pm2 monit"
echo "Restart:      pm2 restart esp32-cam-streaming"
echo "================================="
