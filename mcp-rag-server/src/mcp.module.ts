import { Module } from '@nestjs/common';
import { McpService } from './mcp/mcp.service';
import { RagService } from './rag.service'; // RagService is provided by AppModule, but importing here for clarity if we decide to make RagModule later

import { McpController } from './mcp/mcp.controller';

@Module({
  controllers: [McpController], // Add McpController here
  providers: [McpService, RagService],
  exports: [McpService],
})
export class McpModule {}
