import os
import chromadb

CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")

def get_chroma_collection():
    """Initializes and returns the ChromaDB collection for standard embeddings."""
    client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
    # Use cosine distance to match the pgvector <-> setup
    collection = client.get_or_create_collection(
        name="standards",
        metadata={"hnsw:space": "cosine"}
    )
    return collection
