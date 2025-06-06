from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class McpContext(Base):
    __tablename__ = "mcp_contexts"

    context_token = Column(String, primary_key=True, index=True, default=generate_uuid)
    parent_context_token = Column(String, ForeignKey("mcp_contexts.context_token"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # Store any additional context-specific data here, if needed
    # For example, conversation history, user preferences, etc.
    metadata = Column(JSON, nullable=True)

    # Relationship to self for parent/child contexts
    parent = relationship("McpContext", remote_side=[context_token], backref="children")

# Example of how you might store tool invocation history, if desired
# class ToolInvocation(Base):
#     __tablename__ = "tool_invocations"
#
#     invocation_id = Column(String, primary_key=True, index=True, default=generate_uuid)
#     context_token = Column(String, ForeignKey("mcp_contexts.context_token"), nullable=False, index=True)
#     tool_name = Column(String, nullable=False)
#     tool_input = Column(JSON, nullable=True)
#     tool_output = Column(JSON, nullable=True)
#     invoked_at = Column(DateTime(timezone=True), server_default=func.now())
#
#     context = relationship("McpContext", backref="tool_invocations")
