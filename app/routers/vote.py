from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)

from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas

router = APIRouter(
    prefix="/votes",
    tags=["Votes"]
)

@router.post(
    "/",
    response_model=schemas.VoteResponse
)
def vote_post(
    vote: schemas.VoteCreate,
    db: Session = Depends(get_db)
):

    post = db.query(models.Post).filter(
        models.Post.id == vote.post_id
    ).first()

    if not post:

        raise HTTPException(
            status_code=404,
            detail="Post not found"
        )

    if vote.vote_type not in ["upvote", "downvote"]:

        raise HTTPException(
            status_code=400,
            detail="Vote must be upvote or downvote"
        )

    new_vote = models.Vote(
        vote_type=vote.vote_type,
        user_id=1,
        post_id=vote.post_id
    )

    db.add(new_vote)

    db.commit()

    db.refresh(new_vote)

    return new_vote

@router.get("/post/{post_id}")
def get_post_votes(
    post_id: int,
    db: Session = Depends(get_db)
):

    votes = db.query(models.Vote).filter(
        models.Vote.post_id == post_id
    ).all()

    upvotes = len([
        v for v in votes
        if v.vote_type == "upvote"
    ])

    downvotes = len([
        v for v in votes
        if v.vote_type == "downvote"
    ])

    return {
        "post_id": post_id,
        "upvotes": upvotes,
        "downvotes": downvotes,
        "score": upvotes - downvotes
    }