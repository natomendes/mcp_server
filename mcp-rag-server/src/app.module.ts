import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RagService } from './rag.service';
import { McpModule } from './mcp.module';
import { McpController } from './mcp/mcp.controller';
// McpService is provided by McpModule, so it's not needed here directly.

@Module({
  imports: [McpModule],
  controllers: [AppController, McpController],
  providers: [AppService, RagService], // McpService removed, RagService remains
})
export class AppModule {}
