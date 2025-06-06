import { Test, TestingModule } from '@nestjs/testing';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import { RagService } from '../rag.service';
import { Logger } from '@nestjs/common';

// Mock services
const mockMcpService = {
  getMcpServer: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(undefined), // Mock for mcpServer.connect in onModuleInit
  })),
  // Add other methods if McpController calls them directly
};

const mockRagService = {
  // Mock methods of RagService if McpService (and by extension McpController if it used RagService directly) would need them
};

const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  setContext: jest.fn(),
};


describe('McpController', () => {
  let controller: McpController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [McpController],
      providers: [
        { provide: McpService, useValue: mockMcpService },
        { provide: RagService, useValue: mockRagService }, // Needed if McpService requires it and is not fully mocked
        { provide: Logger, useValue: mockLogger }, // Provide logger for controller if it injects it
      ],
    }).compile();

    controller = module.get<McpController>(McpController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
