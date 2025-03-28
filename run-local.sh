#!/bin/bash

# Text formatting
BOLD="\033[1m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
RESET="\033[0m"

echo -e "${BOLD}Setting up Adspirer for local development...${RESET}"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: PostgreSQL is not installed.${RESET}"
    echo -e "You can install it with:"
    echo -e "  - ${BOLD}macOS:${RESET} brew install postgresql && brew services start postgresql"
    echo -e "  - ${BOLD}Ubuntu:${RESET} sudo apt install postgresql postgresql-contrib"
    echo -e "  - ${BOLD}Windows:${RESET} Download from https://www.postgresql.org/download/windows/"
    exit 1
fi

echo -e "${GREEN}PostgreSQL is installed.${RESET}"

# Check if the database exists
echo -e "Checking PostgreSQL database..."
DB_EXISTS=$(psql -U postgres -c "SELECT 1 FROM pg_database WHERE datname = 'adspirer'" -t | grep -c 1 || echo "0")

if [ "$DB_EXISTS" -eq "0" ]; then
    echo -e "${YELLOW}Database 'adspirer' does not exist. Creating it now...${RESET}"
    psql -U postgres -c "CREATE DATABASE adspirer;"
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to create database. Make sure PostgreSQL is running and 'postgres' user exists.${RESET}"
        echo -e "You may need to run: ${BOLD}createuser -s postgres${RESET}"
        exit 1
    fi
    echo -e "${GREEN}Database 'adspirer' created successfully.${RESET}"
else
    echo -e "${GREEN}Database 'adspirer' already exists.${RESET}"
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing NPM dependencies...${RESET}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to install dependencies.${RESET}"
        exit 1
    fi
    echo -e "${GREEN}Dependencies installed successfully.${RESET}"
else
    echo -e "${GREEN}Dependencies already installed.${RESET}"
fi

# Apply database migrations
echo -e "${YELLOW}Applying database migrations to set up schema...${RESET}"
npm run db:push

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to apply migrations. Check database connection and permissions.${RESET}"
    echo -e "Make sure your .env file has the correct DATABASE_URL."
    exit 1
fi
echo -e "${GREEN}Database schema set up successfully.${RESET}"

# Check for OPENAI_API_KEY in .env file
if grep -q "OPENAI_API_KEY" .env; then
    echo -e "${GREEN}OpenAI API key found in .env file.${RESET}"
else
    echo -e "${YELLOW}Warning: No OpenAI API key found in .env file.${RESET}"
    echo -e "The chat functionality requires an OpenAI API key."
    echo -e "Please add your key to the .env file: ${BOLD}OPENAI_API_KEY=your_key_here${RESET}"
fi

# Run the application
echo -e "${GREEN}Starting Adspirer application in development mode...${RESET}"
echo -e "The application will be available at: ${BOLD}http://localhost:5000${RESET}"
npm run dev