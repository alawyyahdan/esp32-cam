#!/bin/bash

# ESP32-CAM Production Deployment Script
# This script deploys the application in production mode with proper configuration

set -e  # Exit on any error

echo "🚀 ESP32-CAM Production Deployment"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Load environment variables from .env if exists
if [ -f ".env" ]; then
    print_status "Loading environment variables from .env file..."
    export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
    print_success "Environment variables loaded"
else
    print_warning ".env file not found, using system environment variables"
fi

# Set production environment
export NODE_ENV=production
print_status "Environment set to: $NODE_ENV"

# Set PORT from .env or use default
if [ -z "$PORT" ]; then
    export PORT=3000
    print_warning "PORT not set in .env, using default: $PORT"
else
    print_success "PORT set to: $PORT"
fi

# Validate required environment variables
print_status "Validating required environment variables..."

MISSING_VARS=()

if [ -z "$SUPABASE_URL" ]; then
    MISSING_VARS+=("SUPABASE_URL")
fi

if [ -z "$SUPABASE_ANON_KEY" ]; then
    MISSING_VARS+=("SUPABASE_ANON_KEY")
fi

if [ -z "$SUPABASE_SERVICE_KEY" ]; then
    MISSING_VARS+=("SUPABASE_SERVICE_KEY")
fi

if [ -z "$JWT_SECRET" ]; then
    MISSING_VARS+=("JWT_SECRET")
fi

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    print_error "Missing required environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    echo ""
    echo "Please set these variables in your .env file or environment"
    exit 1
fi

print_success "All required environment variables are set"

# Set ADDRESS if not provided
if [ -z "$ADDRESS" ]; then
    export ADDRESS="http://localhost:$PORT"
    print_warning "ADDRESS not set, using: $ADDRESS"
else
    print_success "ADDRESS set to: $ADDRESS"
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 16 or higher."
    exit 1
fi

NODE_VERSION=$(node --version)
print_success "Node.js version: $NODE_VERSION"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm."
    exit 1
fi

NPM_VERSION=$(npm --version)
print_success "npm version: $NPM_VERSION"

# Install dependencies
print_status "Installing production dependencies..."
if [ -f "package-lock.json" ]; then
    npm ci --only=production
else
    npm install --only=production
fi
print_success "Dependencies installed"

# Setup database
print_status "Setting up Supabase database..."
npm run setup
print_success "Database setup completed"

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p logs uploads data
print_success "Directories created"

# Check if port is available
print_status "Checking if port $PORT is available..."
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_error "Port $PORT is already in use!"
    print_error "Please stop the service using this port or change PORT in .env"
    exit 1
else
    print_success "Port $PORT is available"
fi

# Display deployment info
echo ""
echo "======================================"
echo "📊 Deployment Configuration"
echo "======================================"
echo "Environment: $NODE_ENV"
echo "Port: $PORT"
echo "Address: $ADDRESS"
echo "Supabase URL: ${SUPABASE_URL:0:30}..."
echo "======================================"
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    print_warning "PM2 is not installed globally"
    print_status "Installing PM2..."
    npm install -g pm2
    print_success "PM2 installed successfully"
else
    PM2_VERSION=$(pm2 --version)
    print_success "PM2 is installed: v$PM2_VERSION"
fi

# Stop existing PM2 process if running
print_status "Checking for existing PM2 processes..."
if pm2 describe esp32-cam-streaming &> /dev/null; then
    print_status "Stopping existing process..."
    pm2 stop esp32-cam-streaming
    pm2 delete esp32-cam-streaming
    print_success "Existing process stopped"
fi

# Start the server with PM2
print_success "Starting production server with PM2..."
echo ""
print_status "Server will start on port $PORT"
print_status "Access the application at: $ADDRESS"
echo ""

# Start with PM2 using ecosystem file
pm2 start ecosystem.config.js --env production

# Save PM2 process list
pm2 save

print_success "Application started successfully!"
echo ""
echo "======================================"
echo "📊 PM2 Management Commands"
echo "======================================"
echo "View logs:      pm2 logs esp32-cam-streaming"
echo "Monitor:        pm2 monit"
echo "Status:         pm2 status"
echo "Restart:        pm2 restart esp32-cam-streaming"
echo "Stop:           pm2 stop esp32-cam-streaming"
echo "Delete:         pm2 delete esp32-cam-streaming"
echo "======================================"
echo ""

# Show PM2 status
pm2 status
