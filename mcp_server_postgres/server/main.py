from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from modelcontextprotocol.server import McpServer, Tool, ContextManager # Ensure Tool is imported if you plan to define tools soon
from modelcontextprotocol.types import ToolDef, InvokeToolRequest, InvokeToolResponse, GetCapabilitiesResponse, ContextToken

# Assuming database.py and models.py are in the same directory (server)
from .database import SessionLocal, engine, get_db, create_tables # Added create_tables for potential initialization
from .models import McpContext, Base # Ensure Base is imported if create_tables uses it directly

# Create tables if they don't exist (e.g., on startup)
# In a production scenario, you'd likely use Alembic for migrations.
# For simplicity here, we can call create_tables.
# Base.metadata.create_all(bind=engine) # This line should be called cautiously.
                                        # Better to have a separate script or Alembic.
                                        # For now, let's assume tables are created by a separate process/script.

class PostgresContextManager(ContextManager):
    def __init__(self, db_session_factory):
        self._get_db = db_session_factory

    async def create_context(self, parent_context_token: ContextToken | None = None) -> ContextToken:
        db: Session = next(self._get_db())
        try:
            new_context = McpContext(parent_context_token=parent_context_token)
            db.add(new_context)
            db.commit()
            db.refresh(new_context)
            return new_context.context_token
        finally:
            db.close()

    async def delete_context(self, context_token: ContextToken) -> None:
        db: Session = next(self._get_db())
        try:
            context_to_delete = db.query(McpContext).filter(McpContext.context_token == context_token).first()
            if context_to_delete:
                # Handle deletion of child contexts or other cleanup if necessary
                # For now, simple deletion.
                db.delete(context_to_delete)
                db.commit()
            # else:
            #     Handle case where context_token is not found, maybe raise error or log
        finally:
            db.close()

app = FastAPI(title="MCP Server with PostgreSQL")

# Initialize PostgresContextManager
# The dependency `get_db` will be injected by FastAPI when needed by the manager,
# but the manager itself needs a way to get a db session.
# We pass the session factory `get_db` directly.
context_manager = PostgresContextManager(db_session_factory=get_db)


# Initialize MCP Server
# We'll add actual tools later
mcp_server = McpServer(tools=[], context_manager=context_manager)

@app.post("/.well-known/mcp", response_model=GetCapabilitiesResponse)
async def get_capabilities():
    return mcp_server.get_capabilities()

@app.post("/.well-known/mcp/invoke_tool", response_model=InvokeToolResponse)
async def invoke_tool_endpoint(request: InvokeToolRequest):
    # Note: MCP server's invoke_tool is an async method
    return await mcp_server.invoke_tool(request)

# Example of how to run create_tables (e.g. for local dev, not for production deploy)
@app.on_event("startup")
async def startup_event():
    # This is a simple way to ensure tables are created.
    # For production, use Alembic migrations.
    # Also, this create_all might need to be async if the engine setup is async.
    # For now, assuming synchronous engine for create_all.
    Base.metadata.create_all(bind=engine)
    print("Database tables checked/created.")

# if __name__ == "__main__":
#     import uvicorn
#     # Ensure models are imported so Base knows about them before create_all is called
#     from . import models
#     # models.Base.metadata.create_all(bind=engine) # Alternative placement for create_all
#     uvicorn.run(app, host="0.0.0.0", port=8000)
