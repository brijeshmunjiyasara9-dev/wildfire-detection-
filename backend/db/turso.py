"""
Turso (LibSQL) database connection and helper functions.
All metadata is stored here - NO binary files, only paths/keys.
"""

import os
import libsql_client
from typing import Any, List, Optional

# Create a global client (lazy initialized)
_client = None


def get_client():
    global _client
    if _client is None:
        url = os.getenv("TURSO_DATABASE_URL", "")
        auth_token = os.getenv("TURSO_AUTH_TOKEN", "")
        if not url:
            raise RuntimeError("TURSO_DATABASE_URL is not set")
        _client = libsql_client.create_client(url=url, auth_token=auth_token)
    return _client


async def execute(sql: str, args: List[Any] = []) -> Any:
    """Execute a parameterized SQL statement."""
    client = get_client()
    result = await client.execute(sql, args)
    return result


async def execute_many(statements: List[dict]) -> Any:
    """Execute multiple statements in a transaction."""
    client = get_client()
    result = await client.batch(statements)
    return result


async def init_schema():
    """Initialize all database tables if they don't exist."""
    schema_sql = [
        """
        CREATE TABLE IF NOT EXISTS models (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            version TEXT NOT NULL,
            file_path TEXT NOT NULL,
            architecture TEXT DEFAULT 'MobileNetV2',
            image_size INTEGER DEFAULT 224,
            confidence_threshold REAL DEFAULT 0.6,
            accuracy REAL,
            val_loss REAL,
            trained_on INTEGER,
            is_active INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            notes TEXT
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS detection_jobs (
            id TEXT PRIMARY KEY,
            user_session TEXT,
            original_video_path TEXT NOT NULL,
            output_video_path TEXT,
            status TEXT DEFAULT 'queued',
            model_id TEXT,
            confidence_threshold REAL DEFAULT 0.6,
            total_frames INTEGER,
            wildfire_frames INTEGER,
            detection_percentage REAL,
            max_confidence REAL,
            avg_confidence REAL,
            processing_time_seconds REAL,
            error_message TEXT,
            is_demo INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            completed_at TEXT
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS training_jobs (
            id TEXT PRIMARY KEY,
            status TEXT DEFAULT 'queued',
            dataset_path TEXT NOT NULL,
            base_model_id TEXT,
            new_model_id TEXT,
            epochs INTEGER DEFAULT 15,
            batch_size INTEGER DEFAULT 32,
            learning_rate REAL DEFAULT 0.001,
            image_size INTEGER DEFAULT 224,
            train_images INTEGER,
            val_images INTEGER,
            final_accuracy REAL,
            final_val_loss REAL,
            log TEXT,
            started_at TEXT,
            completed_at TEXT,
            created_at TEXT NOT NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS dataset_uploads (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            file_path TEXT NOT NULL,
            label TEXT NOT NULL,
            image_count INTEGER,
            uploaded_by TEXT DEFAULT 'admin',
            used_in_training_job TEXT,
            created_at TEXT NOT NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS demo_videos (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            original_path TEXT NOT NULL,
            detection_path TEXT NOT NULL,
            model_id TEXT,
            detection_percentage REAL,
            max_confidence REAL,
            is_active INTEGER DEFAULT 1,
            created_at TEXT NOT NULL
        )
        """,
    ]

    client = get_client()
    for sql in schema_sql:
        await client.execute(sql.strip())

    print("Database schema initialized successfully.")
