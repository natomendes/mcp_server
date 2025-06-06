import { Injectable, Logger, Inject } from '@nestjs/common'; // Added Inject
import { Pool } from 'pg';

@Injectable()
export class RagService {
  private pool: Pool;

  // Inject the Logger
  constructor(
    @Inject(Logger) private readonly logger: Logger,
  ) {
    // this.logger.setContext(RagService.name); // Temporarily removed to bypass TS error
    // The logger will still function, but context might not be automatically prefixed in all testing scenarios.
    // For now, use placeholder connection details.
    // These should be configurable in a real application (e.g., via environment variables).
    this.pool = new Pool({
      user: 'postgres', // Replace with your PostgreSQL username if different
      host: 'localhost', // Replace with your PostgreSQL host if different
      database: 'mcp_rag_db', // Replace with your database name
      password: 'password', // Replace with your PostgreSQL password
      port: 5432, // Replace with your PostgreSQL port if different
    });

    this.pool.on('connect', () => {
      this.logger.log('Database pool connected.');
    });

    this.pool.on('error', (err, client) => {
      this.logger.error(`Unexpected error on idle client. Client: ${client}, Error: ${err.message}`, err.stack);
      // Consider a more graceful shutdown or reconnection strategy depending on the error.
    });
  }

  async getDocuments(query: string): Promise<any[]> {
    // The query parameter is not used in this initial version for selecting documents,
    // but it's logged for context.
    this.logger.log(`Attempting to retrieve documents for query (currently unused for filtering): "${query}"`);

    let client; // Declare client outside try to ensure it's accessible in finally
    try {
      client = await this.pool.connect();
      this.logger.debug('Database client checked out from pool.');
      const result = await client.query('SELECT * FROM documents');

      if (result.rows.length === 0) {
        this.logger.log('No documents found in the database.');
      } else {
        this.logger.log(`Retrieved ${result.rows.length} documents from the database.`);
      }
      return result.rows;
    } catch (err) {
      this.logger.error(`Error executing 'SELECT * FROM documents'. Query: "${query}". Error: ${err.message}`, err.stack);
      throw err; // Re-throw the error to be handled by the caller or NestJS global error handling
    } finally {
      if (client) {
        client.release();
        this.logger.debug('Database client released back to pool.');
      } else {
        this.logger.warn('Attempted to release client, but client was not initialized. This might indicate an error during pool.connect().');
      }
    }
  }

  // It's good practice to provide a way to gracefully close the pool when the application shuts down.
  async onModuleDestroy() {
    this.logger.log('Closing database connection pool due to module destruction.');
    await this.pool.end();
  }
}
