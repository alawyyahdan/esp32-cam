#!/bin/bash

# ESP32-CAM PM2 Restart Script
# Quick script to restart the application

set -e

echo "🔄 Restarting ESP32-CAM..."

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed"
    exit 1
fi

# Check if process exists
if pm2 describe esp32-cam-streaming &> /dev/null; then
    pm2 restart esp32-cam-streaming
    echo "✅ Application restarted"
else
    echo "⚠️  Process not found. Starting new process..."
    ./pm2-start.sh
fi

pm2 status
