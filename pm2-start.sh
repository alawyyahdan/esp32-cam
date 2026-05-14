#!/bin/bash

# ESP32-CAM PM2 Start Script
# Quick script to start the application with PM2

set -e

echo "🚀 Starting ESP32-CAM with PM2..."

# Load environment variables from .env if exists
if [ -f ".env" ]; then
    echo "📋 Loading environment from .env..."
    export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed"
    echo "Install with: npm install -g pm2"
    exit 1
fi

# Stop existing process if running
if pm2 describe esp32-cam-streaming &> /dev/null; then
    echo "🔄 Restarting existing process..."
    pm2 restart esp32-cam-streaming
else
    echo "▶️  Starting new process..."
    pm2 start ecosystem.config.js --env production
fi

# Save PM2 process list
pm2 save

echo "✅ Application started!"
echo ""
echo "Useful commands:"
echo "  pm2 logs esp32-cam-streaming  - View logs"
echo "  pm2 monit                     - Monitor"
echo "  pm2 status                    - Check status"
echo ""

pm2 status
