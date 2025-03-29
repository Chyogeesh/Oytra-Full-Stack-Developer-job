from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models import User, ScrapeRule
from auth import get_current_user, create_access_token
from celery_tasks import scrape_website
import crud

app = FastAPI()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class ScrapeRequest(BaseModel):
    url: str
    rule: str

@app.post("/scrape/")
def scrape_data(request: ScrapeRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    scrape_rule = crud.create_scrape_rule(db, request.url, request.rule, current_user.id)
    scrape_website.delay(scrape_rule.id)  # Async scraping
    return {"message": "Scraping initiated", "task_id": scrape_rule.id}

@app.get("/scrape/results/")
def get_scrape_results(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    results = crud.get_user_scrape_results(db, user.id)
    return results
