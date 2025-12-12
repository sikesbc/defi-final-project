#!/bin/bash

# Crypto Attack Tracker - Setup Script
# This script sets up the development environment

set -e  # Exit on error

echo "Setting up Crypto Attack Tracker..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}[ERROR] Python 3 is not installed${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js is not installed${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}[ERROR] npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}[OK] Prerequisites check passed${NC}"
echo ""

# Setup Backend
echo -e "${BLUE}Setting up backend...${NC}"
cd api

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo -e "${RED}[WARNING] Please update api/.env with your Supabase credentials${NC}"
fi

cd ..
echo -e "${GREEN}[OK] Backend setup complete${NC}"
echo ""

# Setup Frontend
echo -e "${BLUE}Setting up frontend...${NC}"
cd frontend

# Install dependencies
echo "Installing Node.js dependencies..."
npm install

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo -e "${RED}[WARNING] Please update frontend/.env with your configuration${NC}"
fi

cd ..
echo -e "${GREEN}[OK] Frontend setup complete${NC}"
echo ""

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Setup Complete${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Update environment variables:"
echo "   - api/.env"
echo "   - frontend/.env"
echo ""
echo "2. Set up Supabase database:"
echo "   - Run the SQL in supabase/migrations/001_initial_schema.sql"
echo ""
echo "3. Start the backend:"
echo "   cd api"
echo "   source venv/bin/activate"
echo "   uvicorn app.main:app --reload"
echo ""
echo "4. In a new terminal, start the frontend:"
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo "5. Load initial data:"
echo "   cd api"
echo "   source venv/bin/activate"
echo "   python scripts/manual_refresh.py"
echo ""
echo "6. Open http://localhost:5173 in your browser"
echo ""
echo "For detailed instructions, see QUICKSTART.md"
echo ""

