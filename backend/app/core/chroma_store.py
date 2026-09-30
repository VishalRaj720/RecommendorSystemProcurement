import os
import chromadb



CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "/tmp/chroma_db")
os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)

def get_chroma_collection():
    """Initializes and returns the ChromaDB collection for standard embeddings."""
    client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
    # Use cosine distance to match the pgvector <-> setup
    collection = client.get_or_create_collection(
        name="standards",
        metadata={"hnsw:space": "cosine"}
    )
    return collection
