#!/bin/bash

echo "Creating local PostgreSQL database for Adspirer development..."

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "Error: PostgreSQL is not installed. Please install PostgreSQL first."
    exit 1
fi

# Check if database already exists
DB_EXISTS=$(psql -U postgres -c "SELECT 1 FROM pg_database WHERE datname = 'adspirer'" -t | grep -c 1 || echo "0")

if [ "$DB_EXISTS" -eq "1" ]; then
    echo "Database 'adspirer' already exists."
    
    read -p "Do you want to drop and recreate the database? (y/N): " CONFIRM
    if [[ $CONFIRM =~ ^[Yy]$ ]]; then
        echo "Dropping database 'adspirer'..."
        psql -U postgres -c "DROP DATABASE adspirer;"
        echo "Creating new database 'adspirer'..."
        psql -U postgres -c "CREATE DATABASE adspirer;"
    else
        echo "Using existing database."
    fi
else
    echo "Creating database 'adspirer'..."
    psql -U postgres -c "CREATE DATABASE adspirer;"
fi

# Apply migrations
echo "Applying database migrations..."
npm run db:push

if [ $? -eq 0 ]; then
    echo "Database setup completed successfully!"
    echo "You can now run the application with: npm run dev"
else
    echo "Error applying migrations. Please check the error messages above."
    exit 1
fi