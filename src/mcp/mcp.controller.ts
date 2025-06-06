import { Controller, Post, Get, Delete, Req, Res, OnModuleInit, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpService } from './mcp.service';

@Controller('mcp') // Route prefix for this controller
export class McpController implements OnModuleInit {
  private readonly logger = new Logger(McpController.name); // Standardized logger
  private transport: StreamableHTTPServerTransport;
  private mcpServer: McpServer;

  constructor(private readonly mcpService: McpService) {}

  async onModuleInit() {
    this.logger.log('McpController: Initializing...');
    this.mcpServer = this.mcpService.getMcpServer();
    if (!this.mcpServer) {
      this.logger.error('McpController: McpServer instance not found from McpService. MCP Controller will not function.');
      return; // Prevent further initialization if McpServer is not available
    }

    this.logger.log('McpController: Initializing StreamableHTTPServerTransport...');
    this.transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined // Stateless server
    });

    this.transport.onclose = () => {
      // This event is triggered if the transport closes for any reason.
      this.logger.log('McpController: StreamableHTTPServerTransport underlying connection closed.');
    };

    try {
      await this.mcpServer.connect(this.transport);
      this.logger.log('McpController: MCP Server successfully connected to StreamableHTTPServerTransport.');
    } catch (error) {
      this.logger.error('McpController: Failed to connect MCP Server to StreamableHTTPServerTransport.', (error instanceof Error ? error.stack : String(error)));
      // Depending on the application's needs, you might want to throw this error further
      // or implement a retry mechanism. For now, logging the error is crucial.
    }
    this.logger.log('McpController: Initialization complete.');
  }

  @Post() // Handles POST requests to /mcp
  async handlePost(@Req() req: Request, @Res() res: Response) {
    this.logger.log(`McpController: Received POST request on /mcp. Body preview: ${JSON.stringify(req.body).substring(0,100)}...`);
    if (!this.transport) {
      this.logger.error('McpController: Transport not initialized. Cannot handle POST request.');
      return res.status(503).send({ error: 'MCP transport service unavailable.' }); // 503 Service Unavailable
    }
    try {
      // req.body is assumed to be parsed by NestJS (e.g., using express.json middleware)
      await this.transport.handleRequest(req, res, req.body);
    } catch (error) {
      this.logger.error(`McpController: Error during POST /mcp this.transport.handleRequest. Error: ${error instanceof Error ? error.message : String(error)}`, (error instanceof Error ? error.stack : String(error)));
      // This catch block might only catch synchronous errors if handleRequest itself throws.
      // Most errors within the MCP flow are handled by the transport and sent as JSON-RPC error responses.
      if (!res.headersSent) {
        res.status(500).send({ error: 'Internal server error processing MCP request.' });
      }
    }
  }

  @Get() // Handles GET requests to /mcp
  async handleGet(@Req() req: Request, @Res() res: Response) {
    this.logger.log('McpController: Received GET request on /mcp.');
    if (!this.transport) {
      this.logger.error('McpController: Transport not initialized. Cannot handle GET request.');
      return res.status(503).send({ error: 'MCP transport service unavailable.' });
    }
    try {
      await this.transport.handleRequest(req, res);
    } catch (error) {
      this.logger.error(`McpController: Error during GET /mcp this.transport.handleRequest. Error: ${error instanceof Error ? error.message : String(error)}`, (error instanceof Error ? error.stack : String(error)));
      if (!res.headersSent) {
        res.status(500).send({ error: 'Internal server error processing MCP request.' });
      }
    }
  }

  @Delete() // Handles DELETE requests to /mcp
  async handleDelete(@Req() req: Request, @Res() res: Response) {
    this.logger.log('McpController: Received DELETE request on /mcp.');
    if (!this.transport) {
      this.logger.error('McpController: Transport not initialized. Cannot handle DELETE request.');
      return res.status(503).send({ error: 'MCP transport service unavailable.' });
    }
    try {
      await this.transport.handleRequest(req, res);
    } catch (error) {
      this.logger.error(`McpController: Error during DELETE /mcp this.transport.handleRequest. Error: ${error instanceof Error ? error.message : String(error)}`, (error instanceof Error ? error.stack : String(error)));
      if (!res.headersSent) {
        res.status(500).send({ error: 'Internal server error processing MCP request.' });
      }
    }
  }

  // Optional: Graceful shutdown
  async onModuleDestroy() {
    this.logger.log('McpController: Initiating shutdown due to module destruction.');
    if (this.transport) {
      // The SDK's transport might not have a dedicated close method,
      // but the McpServer's disconnect can handle cleanup.
    }
    if (this.mcpServer) {
      // McpServer.disconnect() might be called here if it exists and is necessary,
      // or rely on onclose event of the transport.
      // For now, SDK examples suggest transport.onclose is the primary event.
    }
  }
}
