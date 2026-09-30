import psycopg
from psycopg import sql

url = input("Paste External Database URL: ").strip()
url = url.replace("postgresql+psycopg://", "postgresql://", 1)
if url.startswith("postgres://"):
    url = url.replace("postgres://", "postgresql://", 1)

base, _ = url.rsplit("/", 1)          # drop the current database name
bisense_url = base + "/bisense"

with psycopg.connect(url, autocommit=True) as c:
    exists = c.execute("SELECT 1 FROM pg_database WHERE datname = 'bisense'").fetchone()
    if exists:
        print("database bisense already exists")
    else:
        c.execute(sql.SQL("CREATE DATABASE bisense"))
        print("database bisense created")

with psycopg.connect(bisense_url, autocommit=True) as c:
    c.execute("CREATE EXTENSION IF NOT EXISTS vector")
    print("pgvector enabled")