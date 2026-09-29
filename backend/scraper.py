import time
import logging
import requests
from bs4 import BeautifulSoup
import schedule
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.database import get_engine
from app.models.standard import Standard
from app.core.chroma_store import get_chroma_collection
# Reuse the embedding function from seed_data.py
from seed_data import embed_texts, document_text

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

BIS_TARGET_URL = "https://www.bis.gov.in/standards/catalog"  # Mock URL

def fetch_bis_catalog():
    """Fetches and parses the BIS web catalog into standard dictionary objects."""
    logger.info(f"Fetching BIS catalog from {BIS_TARGET_URL}...")
    headers = {"User-Agent": "ProcurementBot/1.0"}
    try:
        # response = requests.get(BIS_TARGET_URL, headers=headers)
        # response.raise_for_status()
        # soup = BeautifulSoup(response.text, "html.parser")
        
        # Mocking the HTML parse result for the prototype since government pages often block bots raw
        parsed_standards = [
            {
                "is_code": "IS 1234 : 2024",
                "title": "Newly Scraped Mock Standard for Fire Safety",
                "latest_revision_year": 2024,
                "status": "ACTIVE",
                "successor_is_code": None,
                "category": "Safety",
                "scope_summary": "Scraped from the live website automatically."
            }
        ]
        return parsed_standards
    except Exception as e:
        logger.error(f"Failed to scrape BIS catalog: {e}")
        return []

def upsert_scraped_data(session: Session, new_standards: list[dict]):
    """Processes scraped data, compares against SQLite, generates embeddings, and upserts."""
    if not new_standards:
        return

    collection = get_chroma_collection()
    engine = get_engine()
    
    # Simple check for newly missing or updated
    for std_data in new_standards:
        is_code = std_data["is_code"]
        existing = session.execute(select(Standard).where(Standard.is_code == is_code)).scalar_one_or_none()
        
        if existing:
            if existing.status != std_data["status"]:
                existing.status = std_data["status"]
                logger.info(f"Updated status for {is_code}")
        else:
            logger.info(f"Found entirely new standard: {is_code}. Creating embeddings...")
            
            # Create DB entry
            new_std = Standard(
                is_code=is_code,
                title=std_data["title"],
                latest_revision_year=std_data["latest_revision_year"],
                status=std_data["status"],
                successor_is_code=std_data.get("successor_is_code"),
                category=std_data.get("category"),
                scope_summary=std_data.get("scope_summary"),
            )
            session.add(new_std)
            session.commit()
            
            # Generate and insert embedding
            text = f"{is_code}. {std_data['title']}. {std_data.get('category', '')}. {std_data.get('scope_summary', '')}"
            emb_vector = embed_texts([text])[0]
            
            collection.add(
                ids=[is_code],
                embeddings=[emb_vector],
                documents=[text],
                metadatas=[{
                    "is_code": is_code,
                    "title": std_data["title"],
                    "status": std_data["status"]
                }]
            )
            logger.info(f"Successfully upserted {is_code} locally and to ChromaDB")

def scrape_job():
    logger.info("Initializing web scraper job...")
    standards = fetch_bis_catalog()
    engine = get_engine()
    with Session(engine) as session:
        upsert_scraped_data(session, standards)
    logger.info("Web scraper job finished.")

def start_daemon():
    # Run the job immediately once on startup
    scrape_job()
    
    # Schedule it to run every week
    schedule.every().week.do(scrape_job)
    
    logger.info("Scraper daemon started. Waiting for weekly scheduled intervals...")
    while True:
        schedule.run_pending()
        time.sleep(3600)  # Check schedule loosely every hour

if __name__ == "__main__":
    start_daemon()
