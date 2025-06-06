import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
// Using 'any' for 'extra' as direct import of RequestHandlerExtra and its generics is problematic
import { z } from 'zod';
import { RagService } from '../rag.service';

import { Inject } from '@nestjs/common'; // Import Inject

@Injectable()
export class McpService implements OnModuleInit {
  private readonly mcpServer: McpServer;

  constructor(
    private readonly ragService: RagService,
    @Inject(Logger) private readonly logger: Logger, // Inject Logger
  ) {
    // this.logger.setContext(McpService.name); // Temporarily comment out if it causes TS issues
    this.mcpServer = new McpServer({
      name: 'mcp-rag-server',
      version: '0.0.1',
      logger: this.logger, // Use the injected logger for McpServer
    });
  }

  async onModuleInit() {
    this.logger.log('MCPService: Initializing MCP resources and tools...');
    try {
      this.defineResources();
      this.defineTools();
      this.logger.log('MCPService: MCP resources and tools defined successfully.');
    } catch (error) {
      this.logger.error('MCPService: Error during definition of MCP resources or tools.', error.stack);
    }
  }

  private defineResources() {
    this.logger.debug("MCPService: Defining 'rag_context' resource...");

    const ragContextHandler = async (uri: URL, extra: any): Promise<any> => { // Changed extra type to any
      // Safely access queryString from templateParams, assuming 'extra' has this structure at runtime
      const queryString = (extra && extra.templateParams && typeof extra.templateParams.queryString === 'string')
                          ? extra.templateParams.queryString
                          : '';
      this.logger.log(`MCP Resource 'rag_context' invoked. URI: "${uri.toString()}", QueryString: "${queryString}"`);
      try {
        const documents = await this.ragService.getDocuments(queryString);

        const resourceContents = {
          uri: uri.toString(), // McpServer might expect string URI here
          content: documents.map(doc => ({
            type: 'application/json',
            text: JSON.stringify(doc),
          })),
        };
        this.logger.log(`MCP Resource 'rag_context': Returning ${documents.length} documents for queryString: "${queryString}".`);
        return resourceContents;
      } catch (error) {
        this.logger.error(`MCP Resource 'rag_context': Error calling ragService.getDocuments() for queryString: "${queryString}". Error: ${error.message}`, error.stack);
        throw error;
      }
    };

    this.mcpServer.resource(
      'rag_context',
      'rag://query/{queryString}',
      ragContextHandler
    );
    this.logger.log(`MCPService: MCP Resource 'rag_context' defined successfully.`);
  }

  private defineTools() {
    this.logger.debug("MCPService: Defining 'get_rag_prompt' tool...");

    const getRagPromptHandler = async (input: { query: string }): Promise<any> => {
      this.logger.log(`MCP Tool 'get_rag_prompt' invoked. Query: "${input.query}"`);
      try {
        const documents = await this.ragService.getDocuments(input.query);

        const documentsContent = documents
          .map(doc => (typeof doc.content === 'string' ? doc.content : JSON.stringify(doc.content)))
          .join('\n\n---\n\n');

        const promptString = `Context:\n${documentsContent}\n\nQuery: ${input.query}`;

        this.logger.log(`MCP Tool 'get_rag_prompt': Constructed prompt for query: "${input.query}". Prompt length: ${promptString.length}`);
        this.logger.debug(`MCP Tool 'get_rag_prompt': Prompt preview: "${promptString.substring(0, 100)}..."`);

        return {
          content: [{ type: 'text', text: promptString }],
        };
      } catch (error) {
        this.logger.error(`MCP Tool 'get_rag_prompt': Error calling ragService.getDocuments() for query: "${input.query}". Error: ${error.message}`, error.stack);
        throw error;
      }
    };

    this.mcpServer.tool(
      'get_rag_prompt',
      {
        query: z.string().describe('The user query to search for relevant documents and include in the prompt.'),
      },
      getRagPromptHandler
    );
    this.logger.log(`MCPService: MCP Tool 'get_rag_prompt' defined successfully.`);
  }

  getMcpServer(): McpServer {
    return this.mcpServer;
  }
}
