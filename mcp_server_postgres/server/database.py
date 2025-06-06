from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

def get_database_url():
    return os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/mcp_db")

engine = create_engine(get_database_url())
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables(custom_engine=None):
    current_engine = custom_engine if custom_engine else engine
    Base.metadata.create_all(bind=current_engine)

def drop_tables(custom_engine=None):
    current_engine = custom_engine if custom_engine else engine
    Base.metadata.drop_all(bind=current_engine)

def reconfigure_engine(db_url: str):
    global engine, SessionLocal, Base
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    # Base = declarative_base() # Re-declaring Base might cause issues with already defined models
                               # Instead, we ensure Base.metadata is associated with the new engine.
    Base.metadata.bind = engine
    return engine
