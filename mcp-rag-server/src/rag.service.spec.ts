import { Test, TestingModule } from '@nestjs/testing';
import { RagService } from './rag.service';
import { Pool, PoolClient } from 'pg';
import { Logger } from '@nestjs/common';

// Mock pg Pool and PoolClient
// Captured event callbacks
let capturedConnectCallback: (() => void) | undefined;
let capturedErrorCallback: ((err: Error, client?: any) => void) | undefined;

jest.mock('pg', () => {
  const mPoolClient = {
    query: jest.fn(),
    release: jest.fn(),
  };
  const mPool = {
    connect: jest.fn(() => Promise.resolve(mPoolClient)),
    on: jest.fn((event: string, callback: any) => {
      if (event === 'connect') {
        capturedConnectCallback = callback;
      } else if (event === 'error') {
        capturedErrorCallback = callback;
      }
    }),
    end: jest.fn(() => Promise.resolve()),
  };
  return { Pool: jest.fn(() => mPool) };
});

const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  setContext: jest.fn(), // Mock setContext as it's called in constructor
};

describe('RagService', () => {
  let service: RagService;
  let poolMock: Pool;
  let clientMock: PoolClient;

  beforeEach(async () => {
    capturedConnectCallback = undefined;
    capturedErrorCallback = undefined;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagService,
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<RagService>(RagService);
    poolMock = service['pool'];

    clientMock = { query: jest.fn(), release: jest.fn() };
    (poolMock.connect as jest.Mock).mockImplementation(() => Promise.resolve(clientMock));

    jest.clearAllMocks();
    mockLogger.setContext.mockClear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDocuments', () => {
    const mockQueryString = 'test query';

    it('should return documents on successful query', async () => {
      const mockDocs = [{ id: 1, content: 'doc1' }, { id: 2, content: 'doc2' }];
      (clientMock.query as jest.Mock).mockResolvedValueOnce({ rows: mockDocs });

      const result = await service.getDocuments(mockQueryString);

      expect(result).toEqual(mockDocs);
      expect(poolMock.connect).toHaveBeenCalledTimes(1);
      expect(clientMock.query).toHaveBeenCalledWith('SELECT * FROM documents');
      expect(clientMock.release).toHaveBeenCalledTimes(1);
      expect(mockLogger.log).toHaveBeenCalledWith(`Attempting to retrieve documents for query (currently unused for filtering): "${mockQueryString}"`);
      expect(mockLogger.log).toHaveBeenCalledWith(`Retrieved ${mockDocs.length} documents from the database.`);
    });

    it('should return an empty array if no documents are found', async () => {
      (clientMock.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await service.getDocuments(mockQueryString);

      expect(result).toEqual([]);
      expect(poolMock.connect).toHaveBeenCalledTimes(1);
      expect(clientMock.query).toHaveBeenCalledWith('SELECT * FROM documents');
      expect(clientMock.release).toHaveBeenCalledTimes(1);
      expect(mockLogger.log).toHaveBeenCalledWith('No documents found in the database.');
    });

    it('should throw an error and release client if database query fails', async () => {
      const dbError = new Error('DB query failed');
      (clientMock.query as jest.Mock).mockRejectedValueOnce(dbError);

      await expect(service.getDocuments(mockQueryString)).rejects.toThrow(dbError);

      expect(poolMock.connect).toHaveBeenCalledTimes(1);
      expect(clientMock.query).toHaveBeenCalledWith('SELECT * FROM documents');
      expect(clientMock.release).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error executing 'SELECT * FROM documents'. Query: "${mockQueryString}". Error: ${dbError.message}`,
        dbError.stack,
      );
    });

    it('should release client if an error occurs after connection but before query', async () => {
        (mockLogger.debug as jest.Mock).mockImplementationOnce(() => {
            throw new Error("Synchronous error before query");
        });

        await expect(service.getDocuments(mockQueryString)).rejects.toThrow("Synchronous error before query");
        expect(poolMock.connect).toHaveBeenCalledTimes(1);
        expect(clientMock.release).toHaveBeenCalledTimes(1);
        (mockLogger.debug as jest.Mock).mockReset();
    });

  });

  describe('onModuleDestroy', () => {
    it('should call pool.end', async () => {
      await service.onModuleDestroy();
      expect(poolMock.end).toHaveBeenCalledTimes(1);
      expect(mockLogger.log).toHaveBeenCalledWith('Closing database connection pool due to module destruction.');
    });
  });

  describe('Pool Event Listeners', () => {
    it('should log when pool connects if connect callback is captured', () => {
        expect(capturedConnectCallback).toBeDefined();
        if (capturedConnectCallback) {
          capturedConnectCallback();
          expect(mockLogger.log).toHaveBeenCalledWith('Database pool connected.');
        }
    });

    it('should log error when pool emits error if error callback is captured', () => {
        expect(capturedErrorCallback).toBeDefined();
        if (capturedErrorCallback) {
          const mockError = new Error('Pool error');
          const mockPgClient = { host: 'test-host' };
          capturedErrorCallback(mockError, mockPgClient);
          expect(mockLogger.error).toHaveBeenCalledWith(
            `Unexpected error on idle client. Client: ${mockPgClient}, Error: ${mockError.message}`,
            mockError.stack
          );
        }
    });
  });
});
