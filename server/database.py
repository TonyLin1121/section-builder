"""
資料庫連線模組
NOTE: 使用 psycopg2 連接 PostgreSQL 資料庫
"""
import os
from contextlib import contextmanager
from typing import Generator

import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

# 資料庫連線參數
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "5432")),
    "database": os.getenv("DB_NAME", "postgres"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", ""),
}


def get_connection():
    """
    建立資料庫連線
    """
    return psycopg2.connect(**DB_CONFIG)


@contextmanager
def get_cursor() -> Generator[RealDictCursor, None, None]:
    """
    取得資料庫游標（使用 context manager 自動管理連線）
    """
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            yield cursor
            conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()
