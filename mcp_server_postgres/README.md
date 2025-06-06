# MCP Server with PostgreSQL Backend

This project implements a Model Context Protocol (MCP) server using Python, FastAPI, and PostgreSQL for persistent storage of context information.

## Overview

The server provides the standard MCP endpoints:
- `/.well-known/mcp`: For clients to discover server capabilities and available tools.
- `/.well-known/mcp/invoke_tool`: For clients to invoke tools exposed by the server.

Context management (creating and deleting contexts) is handled by storing context tokens and their relationships in a PostgreSQL database.

## Prerequisites

- Python 3.9+
- Docker (for containerized deployment)
- PostgreSQL server (running and accessible)
- Pip (Python package installer)

## Project Structure

```
mcp_server_postgres/
├── .env                  # Environment variables (DATABASE_URL, etc.) - DO NOT COMMIT SENSITIVE DATA
├── .gitignore            # Specifies intentionally untracked files that Git should ignore
├── .dockerignore         # Specifies files to ignore when building Docker image
├── Dockerfile            # For building the Docker container
├── README.md             # This file
├── requirements.txt      # Python dependencies
├── scripts/              # Utility scripts (if any, e.g., for DB migrations later)
│   └── (empty)
├── server/               # Main server application code
│   ├── __init__.py
│   ├── database.py       # SQLAlchemy setup, database session management
│   ├── main.py           # FastAPI application, MCP server logic, API endpoints
│   └── models.py         # SQLAlchemy database models (e.g., McpContext)
└── tests/                # Unit tests
    ├── __init__.py
    └── test_context_management.py # Tests for context management
```

## Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    cd mcp_server_postgres
    ```

2.  **Create and activate a virtual environment (recommended):**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows use `venv\Scripts\activate`
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

## Database Setup

1.  **Ensure PostgreSQL is running and accessible.**

2.  **Configure the database connection:**
    -   Copy the example environment file `.env.example` (if provided, otherwise create `.env`):
        ```bash
        cp .env.example .env
        ```
        If `.env.example` doesn't exist, create `.env` manually.
    -   Edit the `.env` file and set your `DATABASE_URL`:
        ```env
        DATABASE_URL=postgresql://your_user:your_password@your_host:your_port/your_database
        ```
        Example: `DATABASE_URL=postgresql://mcpuser:mcpsupersecret@localhost:5432/mcp_db`

3.  **Database Tables:**
    The application is configured to automatically create the necessary database tables on startup (using SQLAlchemy's `Base.metadata.create_all(bind=engine)` in `server/main.py`'s startup event). For production environments, you would typically use a migration tool like Alembic for more robust schema management.

## Running the Server

### Directly with Uvicorn (for development)

Ensure your virtual environment is activated and the `.env` file is configured.

```bash
uvicorn server.main:app --reload --host 0.0.0.0 --port 8000
```
The server will be available at `http://localhost:8000`. The `--reload` flag enables auto-reloading on code changes.

### Using Docker

1.  **Build the Docker image:**
    ```bash
    docker build -t mcp-server-postgres .
    ```

2.  **Run the Docker container:**
    Make sure your `.env` file in the project root is correctly configured with the `DATABASE_URL` that the container can reach. If PostgreSQL is running on your host machine, you might need to use `host.docker.internal` or your host's IP address in the `DATABASE_URL` instead of `localhost`.

    ```bash
    docker run -d -p 8000:8000 --name mcp-server-app --env-file .env mcp-server-postgres
    ```
    - `-d`: Run in detached mode.
    - `-p 8000:8000`: Map port 8000 of the host to port 8000 of the container.
    - `--name mcp-server-app`: Assign a name to the container.
    - `--env-file .env`: Load environment variables from the `.env` file. **Note:** For production, manage secrets more securely.

    The server will be available at `http://localhost:8000`.

    To view logs:
    ```bash
    docker logs mcp-server-app
    ```

    To stop the container:
    ```bash
    docker stop mcp-server-app
    ```

    To remove the container:
    ```bash
    docker rm mcp-server-app
    ```

## Running Tests

Ensure your virtual environment is activated and development dependencies are installed. The tests use an in-memory SQLite database, so no external PostgreSQL is required for the test suite itself.

From the project root directory (`mcp_server_postgres`):
```bash
python -m unittest discover tests
```
Or, to run a specific test file:
```bash
python -m unittest tests.test_context_management
```

## Further Development

-   **Implement Tools:** Define actual tools in `server/main.py` by creating classes that inherit from `modelcontextprotocol.server.Tool` and add them to the `McpServer` instance.
-   **Database Migrations:** For production or more complex schema changes, integrate Alembic for database migrations.
-   **Enhanced Configuration:** Move more settings (e.g., server host/port, logging configuration) to environment variables or a configuration file.
-   **Security:** Implement authentication and authorization if the MCP server will handle sensitive operations or data.
```
