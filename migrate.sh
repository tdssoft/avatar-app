#!/bin/bash

# =====================================================
# Database Migration Script
# =====================================================
# This script applies the complete database schema
# to your PostgreSQL/Supabase database
# =====================================================

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database connection details from .env
DB_URL="postgresql://supabase_admin:eukqdx2zx6u6n1o4b8qhr6sglkvg8hm1rb9580xoe6t1wxsx3ek9tpia5jgf5p7q@trolley.proxy.rlwy.net:31136/postgres"

echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Database Migration Tool                   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Check if migration file exists
MIGRATION_FILE="supabase/migrations/20260208000000_complete_database_schema.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}Error: Migration file not found at $MIGRATION_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}Migration file found: $MIGRATION_FILE${NC}"
echo ""

# Function to run migration using Docker
run_migration_docker() {
    echo -e "${GREEN}Running migration using Docker...${NC}"
    docker run --rm -i postgres:15 psql "$DB_URL" < "$MIGRATION_FILE"
}

# Function to run migration using psql (if installed)
run_migration_psql() {
    echo -e "${GREEN}Running migration using psql...${NC}"
    PGPASSWORD="eukqdx2zx6u6n1o4b8qhr6sglkvg8hm1rb9580xoe6t1wxsx3ek9tpia5jgf5p7q" \
    psql -h trolley.proxy.rlwy.net -p 31136 -U supabase_admin -d postgres -f "$MIGRATION_FILE"
}

# Function to run migration using Node.js
run_migration_node() {
    echo -e "${GREEN}Running migration using Node.js...${NC}"
    node -e "
    import pkg from 'pg';
    import { readFileSync } from 'fs';
    const { Client } = pkg;

    const client = new Client({
      connectionString: '$DB_URL'
    });

    async function migrate() {
      try {
        await client.connect();
        console.log('Connected to database');

        const sql = readFileSync('$MIGRATION_FILE', 'utf8');
        await client.query(sql);

        console.log('Migration completed successfully!');
      } catch (err) {
        console.error('Migration error:', err);
        process.exit(1);
      } finally {
        await client.end();
      }
    }

    migrate();
    "
}

# Ask user which method to use
echo -e "${YELLOW}Choose migration method:${NC}"
echo "1) Using Docker (recommended if Docker is running)"
echo "2) Using psql (if PostgreSQL client is installed)"
echo "3) Using Node.js (uses pg package)"
echo "4) Exit"
echo ""
read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        run_migration_docker
        ;;
    2)
        run_migration_psql
        ;;
    3)
        run_migration_node
        ;;
    4)
        echo -e "${YELLOW}Migration cancelled.${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid choice. Exiting.${NC}"
        exit 1
        ;;
esac

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   Migration completed successfully! ✓         ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
else
    echo ""
    echo -e "${RED}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║   Migration failed! ✗                         ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════╝${NC}"
    exit 1
fi
