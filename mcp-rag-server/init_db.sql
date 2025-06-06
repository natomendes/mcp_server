-- init_db.sql
--
-- This script creates the database and table for the MCP RAG server.
--
-- To execute this script using psql:
-- 1. Ensure PostgreSQL is running.
-- 2. Open your terminal.
-- 3. Run the script as a PostgreSQL superuser (or a user with CREATEDB privileges)
--    to create the database:
--    psql -U postgres -f init_db.sql
--
--    You might be prompted for the password for the 'postgres' user.
--
--    Alternatively, you can connect to PostgreSQL first:
--    psql -U postgres
--    And then run the script from within the psql prompt:
--    \i /path/to/mcp-rag-server/init_db.sql
--    (Replace /path/to/ with the actual path to this file)

-- Create the database
CREATE DATABASE mcp_rag_db;

-- Note: \c command is a psql meta-command and cannot be used directly in a script file
-- that is executed with `psql -f`. You need to connect to the database manually
-- after creating it, or run the rest of the script in a separate session/file
-- connected to `mcp_rag_db`.

-- The following commands should be run AFTER connecting to the `mcp_rag_db` database.
-- For example, after creating the database, connect to it using:
-- psql -U postgres -d mcp_rag_db
-- And then you can run the table creation command.

-- Create the documents table
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    vector TEXT -- Placeholder for vector data, assuming TEXT for now.
                -- For actual vector operations, consider using PostgreSQL extensions
                -- like pgvector, which would require a specific vector type (e.g., VECTOR(dimension)).
);

-- Grant privileges if necessary (example)
-- GRANT ALL PRIVILEGES ON DATABASE mcp_rag_db TO your_user;
-- GRANT ALL PRIVILEGES ON TABLE documents TO your_user;

-- End of script
-- Remember to connect to `mcp_rag_db` before creating the table if running this script in parts.
-- If you want to run this as a single script, you might need to use a tool or a shell script
-- that handles the database connection switch. For simplicity, creating the database
-- and then connecting to it to create the table is the standard approach.
