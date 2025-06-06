import unittest
import asyncio
from sqlalchemy.orm import sessionmaker

from server.models import Base, McpContext
from server.main import PostgresContextManager
from server.database import reconfigure_engine, create_tables, drop_tables

TEST_DATABASE_URL = "sqlite:///:memory:"

class TestContextManagement(unittest.IsolatedAsyncioTestCase): # Use IsolatedAsyncioTestCase for async tests

    @classmethod
    def setUpClass(cls):
        cls.engine = reconfigure_engine(TEST_DATABASE_URL)
        create_tables(custom_engine=cls.engine)
        cls.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)

    @classmethod
    def tearDownClass(cls):
        drop_tables(custom_engine=cls.engine)
        # Optionally reconfigure to original DB URL if needed, though test process usually exits.

    def setUp(self):
        def get_test_db():
            db = self.SessionLocal()
            try:
                yield db
            finally:
                db.close()
        self.context_manager = PostgresContextManager(db_session_factory=get_test_db)
        # For direct DB assertions
        self.db = self.SessionLocal()

    def tearDown(self):
        # Clean up database records
        self.db.query(McpContext).delete()
        self.db.commit()
        self.db.close()

    async def test_create_context_no_parent(self):
        context_token = await self.context_manager.create_context()
        self.assertIsNotNone(context_token)
        db_context = self.db.query(McpContext).filter(McpContext.context_token == context_token).first()
        self.assertIsNotNone(db_context)
        self.assertEqual(db_context.context_token, context_token)
        self.assertIsNone(db_context.parent_context_token)

    async def test_create_context_with_parent(self):
        parent_context_token = await self.context_manager.create_context()
        self.assertIsNotNone(parent_context_token)
        child_context_token = await self.context_manager.create_context(parent_context_token=parent_context_token)
        self.assertIsNotNone(child_context_token)
        self.assertNotEqual(child_context_token, parent_context_token)
        db_child_context = self.db.query(McpContext).filter(McpContext.context_token == child_context_token).first()
        self.assertIsNotNone(db_child_context)
        self.assertEqual(db_child_context.parent_context_token, parent_context_token)

    async def test_delete_context(self):
        context_token = await self.context_manager.create_context()
        self.assertIsNotNone(context_token)
        db_context_before_delete = self.db.query(McpContext).filter(McpContext.context_token == context_token).first()
        self.assertIsNotNone(db_context_before_delete)
        await self.context_manager.delete_context(context_token)
        db_context_after_delete = self.db.query(McpContext).filter(McpContext.context_token == context_token).first()
        self.assertIsNone(db_context_after_delete)

    async def test_delete_nonexistent_context(self):
        await self.context_manager.delete_context("non_existent_token_123")
        # No error expected with current implementation

if __name__ == '__main__':
    unittest.main()
