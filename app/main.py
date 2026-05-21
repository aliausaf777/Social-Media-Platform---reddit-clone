from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base
from . import models

from .routers import (
    auth,
    community,
    post,
    comment,
    vote
)

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(community.router)
app.include_router(post.router)
app.include_router(comment.router)
app.include_router(vote.router)

@app.get("/")
def home():
    return {
        "message": "Reddit Clone API Running"
    }