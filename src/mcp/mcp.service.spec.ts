import { Test, TestingModule } from '@nestjs/testing';
import { McpService } from './mcp.service';
import { RagService } from '../rag.service';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '@nestjs/common';
import { z } from 'zod';

// Mock RagService
jest.mock('../rag.service');

// Mock McpServer from the SDK
const mockMcpServerInstance = {
  resource: jest.fn(), // Changed from addResource
  tool: jest.fn(),     // Changed from addTool
  connect: jest.fn(),
  // Add any other McpServer methods that might be called
};
jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: jest.fn(() => mockMcpServerInstance),
  ResourceTemplate: jest.fn((templateString, _options) => ({ template: templateString, options: _options })), // Mock ResourceTemplate constructor
}));

// Mock Logger
const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

describe('McpService', () => {
  let service: McpService;
  let ragService: RagService;
  // McpServer is constructor-mocked, so we use mockMcpServerInstance for assertions

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        McpService,
        RagService, // Uses the jest.mocked version
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<McpService>(McpService);
    ragService = module.get<RagService>(RagService);

    // Clear mocks before each test, including those on the mocked McpServer instance
    // jest.clearAllMocks(); // This is too broad, clears SDK mocks.
    // Clear specific mocks:
    mockMcpServerInstance.resource.mockClear();
    mockMcpServerInstance.tool.mockClear();
    mockMcpServerInstance.connect.mockClear();
    if (ragService && ragService.getDocuments) { // ragService might not be initialized if module setup fails
        (ragService.getDocuments as jest.Mock).mockClear();
    }
    mockLogger.log.mockClear();
    mockLogger.error.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.debug.mockClear();
    // (McpServer as jest.Mock).mockClear(); // Clears constructor calls, not usually needed if instance is reused.
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should define resources and tools', async () => {
      await service.onModuleInit(); // Calls defineResources and defineTools

      expect(mockMcpServerInstance.resource).toHaveBeenCalledTimes(1);
      expect(mockMcpServerInstance.tool).toHaveBeenCalledTimes(1);

      // Check resource definition
      const resourceCallArgs = mockMcpServerInstance.resource.mock.calls[0];
      expect(resourceCallArgs[0]).toBe('rag_context');
      expect(resourceCallArgs[1]).toBe('rag://query/{queryString}');
      expect(typeof resourceCallArgs[2]).toBe('function');
      expect(mockLogger.log).toHaveBeenCalledWith("MCPService: MCP Resource 'rag_context' defined successfully.");

      // Check tool definition
      const toolCallArgs = mockMcpServerInstance.tool.mock.calls[0];
      expect(toolCallArgs[0]).toBe('get_rag_prompt');
      // Check if it's an object and if the 'query' property is a ZodString,
      // as mcp.service.ts now passes the raw Zod shape.
      expect(typeof toolCallArgs[1]).toBe('object');
      expect(toolCallArgs[1].query).toBeInstanceOf(z.ZodString);
      expect(typeof toolCallArgs[2]).toBe('function');
      expect(mockLogger.log).toHaveBeenCalledWith("MCPService: MCP Tool 'get_rag_prompt' defined successfully.");
      expect(mockLogger.log).toHaveBeenCalledWith('MCPService: MCP resources and tools defined successfully.');
    });

    it('should log an error if resource definition fails', async () => {
      const definitionError = new Error('Resource Definition failed');
      (mockMcpServerInstance.resource as jest.Mock).mockImplementationOnce(() => {
        throw definitionError;
      });

      await service.onModuleInit(); // This will now throw during defineResources

      expect(mockLogger.error).toHaveBeenCalledWith(
        'MCPService: Error during definition of MCP resources or tools.',
        definitionError.stack
      );
       // Restore default mock implementation for other tests
      (mockMcpServerInstance.resource as jest.Mock).mockImplementation(jest.fn());
    });
  });

  describe('rag_context Resource Handler', () => {
    let resourceHandler: (uri: URL, extra: any) => Promise<any>; // Changed params to extra, uri to URL

    beforeEach(async () => {
      await service.onModuleInit();
      resourceHandler = mockMcpServerInstance.resource.mock.calls[mockMcpServerInstance.resource.mock.calls.length -1][2];
    });

    it('should call ragService.getDocuments and format results', async () => {
      const mockDocs = [{ id: 1, content: 'doc1' }];
      (ragService.getDocuments as jest.Mock).mockResolvedValueOnce(mockDocs);
      const testUri = new URL('rag://query/test');
      const mockExtra = { // Simulate the 'extra' object from MCP SDK
        templateParams: { queryString: 'test' },
        // Add other properties from RequestHandlerExtra if needed by the handler
      };

      const result = await resourceHandler(testUri, mockExtra);

      expect(ragService.getDocuments).toHaveBeenCalledWith('test');
      expect(result.uri).toBe(testUri.toString());
      expect(result.content).toEqual(mockDocs.map(doc => ({ type: 'application/json', text: JSON.stringify(doc) })));
      expect(mockLogger.log).toHaveBeenCalledWith(`MCP Resource 'rag_context' invoked. URI: "${testUri.toString()}", QueryString: "${mockExtra.templateParams.queryString}"`);
      expect(mockLogger.log).toHaveBeenCalledWith(`MCP Resource 'rag_context': Returning ${mockDocs.length} documents for queryString: "${mockExtra.templateParams.queryString}".`);
    });

    it('should handle errors from ragService.getDocuments', async () => {
      const dbError = new Error('DB error');
      (ragService.getDocuments as jest.Mock).mockRejectedValueOnce(dbError);
      const testErrorUri = new URL('rag://query/error');
      const mockErrorExtra = { templateParams: { queryString: 'error' } };

      await expect(resourceHandler(testErrorUri, mockErrorExtra)).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        `MCP Resource 'rag_context': Error calling ragService.getDocuments() for queryString: "${mockErrorExtra.templateParams.queryString}". Error: ${dbError.message}`,
        dbError.stack
      );
    });
  });

  describe('get_rag_prompt Tool Handler', () => {
    let toolHandler: (input: { query: string }) => Promise<any>;

    beforeEach(async () => {
      await service.onModuleInit();
      toolHandler = mockMcpServerInstance.tool.mock.calls[mockMcpServerInstance.tool.mock.calls.length -1][2];
    });

    it('should call ragService.getDocuments and construct prompt', async () => {
      const mockDocs = [{ id: 1, content: 'Document content.' }];
      (ragService.getDocuments as jest.Mock).mockResolvedValueOnce(mockDocs);
      const input = { query: 'user query' };

      const result = await toolHandler(input);

      expect(ragService.getDocuments).toHaveBeenCalledWith('user query');
      const expectedPrompt = `Context:\n${mockDocs[0].content}\n\nQuery: ${input.query}`;
      expect(result.content).toEqual([{ type: 'text', text: expectedPrompt }]);
      expect(mockLogger.log).toHaveBeenCalledWith(`MCP Tool 'get_rag_prompt' invoked. Query: "${input.query}"`);
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining(`Constructed prompt for query: "${input.query}"`));
    });

    it('should handle errors from ragService.getDocuments in tool handler', async () => {
      const dbError = new Error('DB error for tool');
      (ragService.getDocuments as jest.Mock).mockRejectedValueOnce(dbError);
      const input = { query: 'error query' };

      await expect(toolHandler(input)).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        `MCP Tool 'get_rag_prompt': Error calling ragService.getDocuments() for query: "${input.query}". Error: ${dbError.message}`,
        dbError.stack
      );
    });
  });

  describe('getMcpServer', () => {
    it('should return the McpServer instance', () => {
      expect(service.getMcpServer()).toBe(mockMcpServerInstance);
    });
  });

});
