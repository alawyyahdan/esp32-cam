#!/bin/bash

# ESP32-CAM PM2 Stop Script
# Quick script to stop the application

set -e

echo "🛑 Stopping ESP32-CAM..."

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed"
    exit 1
fi

# Check if process exists
if pm2 describe esp32-cam-streaming &> /dev/null; then
    pm2 stop esp32-cam-streaming
    echo "✅ Application stopped"
    
    # Ask if user wants to delete the process
    read -p "Delete process from PM2? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        pm2 delete esp32-cam-streaming
        pm2 save
        echo "✅ Process deleted from PM2"
    fi
else
    echo "⚠️  Process not found in PM2"
fi

pm2 status
