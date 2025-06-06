# MCP RAG Server (NestJS & PostgreSQL)

This project implements a Model Context Protocol (MCP) server using the NestJS framework. It features a Retrieval Augmented Generation (RAG) system that leverages a PostgreSQL database to provide context to Large Language Models (LLMs).

The primary purpose of this server is to expose standardized ways for an LLM to utilize context retrieved from the RAG system when formulating its answers.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version `22.14.0` (as specified in `package.json`). It's recommended to use a Node version manager like `nvm` to manage Node versions.
- **Yarn**: The project uses Yarn as its package manager. Installation guide: [https://classic.yarnpkg.com/en/docs/install](https://classic.yarnpkg.com/en/docs/install)
- **PostgreSQL**: A running PostgreSQL server instance.

## Setup Instructions

1.  **Clone the Repository:**
    ```bash
    git clone <repository_url>
    cd <repository_name>
    ```

2.  **Database Setup:**
    The project includes a SQL script `init_db.sql` to set up the necessary database and table.
    -   **Create the database and table:** Execute the script against your PostgreSQL instance.
        ```bash
        # Example using psql (you might need to adjust connection parameters)
        psql -U your_postgres_user -f init_db.sql
        ```
        This script will:
        - Create a database named `mcp_rag_db`.
        - Connect to `mcp_rag_db` and create a table named `documents` with columns for `id`, `content`, and `vector`.

3.  **Environment Configuration (Database Connection):**
    The PostgreSQL connection details in `src/rag.service.ts` are currently placeholders:
    ```typescript
    // src/rag.service.ts - inside the constructor
    this.pool = new Pool({
      user: 'your_db_user', // TODO: Configure
      host: 'localhost',    // TODO: Configure
      database: 'mcp_rag_db', // TODO: Configure
      password: 'your_db_password', // TODO: Configure
      port: 5432,         // TODO: Configure
    });
    ```
    You **must** update these placeholders with your actual PostgreSQL connection details. For a production setup, it's highly recommended to use environment variables (e.g., via NestJS ConfigModule and a `.env` file) instead of hardcoding credentials.

4.  **Install Dependencies:**
    Navigate to the project root and install dependencies using Yarn:
    ```bash
    yarn install
    ```
    If you encounter issues related to Node.js engine version during installation, ensure your active Node.js version is `22.14.0`. The project is configured with `engine-strict=true`.

## Running the Application

NestJS offers several ways to run the application:

-   **Development Mode (with watch):**
    ```bash
    yarn start
    ```
    This command starts the server in development mode with file watching. Changes to your code will automatically trigger a rebuild and restart.

-   **Production Mode:**
    First, build the application:
    ```bash
    yarn build
    ```
    Then, run the production build:
    ```bash
    yarn start:prod
    ```

By default, the server will run on `http://localhost:3000`.

## MCP Server Details

-   **MCP Endpoint:** The server exposes its MCP functionalities at the following endpoint:
    `POST/GET/DELETE http://localhost:3000/mcp`

-   **Exposed Resource:**
    -   **Name:** `rag_context`
    -   **URI Template:** `rag://query/{queryString}`
    -   **Description:** This resource retrieves relevant documents from the PostgreSQL RAG based on the provided `queryString`. The current implementation fetches all documents as a placeholder for actual vector search.
    -   **Example Usage (conceptual):** An MCP client could read `rag://query/what is NestJS` to get context about NestJS.

-   **Exposed Tool:**
    -   **Name:** `get_rag_prompt`
    -   **Input Schema:** `{ "query": "string" }`
    -   **Description:** This tool takes a user's `query`, fetches relevant context from the RAG (similar to the `rag_context` resource), and then constructs a formatted prompt string ready to be sent to an LLM. The prompt combines the retrieved context with the original user query.
    -   **Example Usage (conceptual):** An MCP client could call the `get_rag_prompt` tool with `{"query": "Explain MCP in simple terms"}`. The tool would return a string like: `"Context: [Retrieved documents about MCP...]

Query: Explain MCP in simple terms"`.

## Running Tests

To run the unit tests:

```bash
yarn test
```

This command will execute all `*.spec.ts` files in the project using Jest.

## Building the Application

To create a production build of the application:

```bash
yarn build
```
This will generate a `dist` folder containing the compiled JavaScript code.

## Populating the RAG (Important Note)

The RAG system provided in this project includes the mechanism for retrieving documents from the `documents` table in PostgreSQL. However, this table will be **empty** after running `init_db.sql`.

To make the RAG useful, you will need to:
1.  **Add Documents:** Populate the `documents` table with your text data.
2.  **Implement Vectorization:** The current schema includes a `vector` column (as TEXT). For actual RAG functionality, you would typically:
    -   Generate vector embeddings for your document content using a sentence transformer model or similar.
    -   Store these vectors in the `vector` column (ideally using a specialized vector type if using PostgreSQL extensions like `pgvector`).
    -   Update the `RagService` to perform vector similarity searches instead of fetching all documents.

This project provides the foundational MCP server and RAG retrieval structure. The content ingestion and vector search implementation are considered separate concerns.
