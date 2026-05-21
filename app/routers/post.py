from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)

from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas

router = APIRouter(
    prefix="/posts",
    tags=["Posts"]
)

@router.post(
    "/",
    response_model=schemas.PostResponse
)
def create_post(
    post: schemas.PostCreate,
    db: Session = Depends(get_db)
):

    community = db.query(models.Community).filter(
        models.Community.id == post.community_id
    ).first()

    if not community:

        raise HTTPException(
            status_code=404,
            detail="Community not found"
        )

    new_post = models.Post(
        title=post.title,
        content=post.content,
        community_id=post.community_id,
        author_id=1
    )

    db.add(new_post)

    db.commit()

    db.refresh(new_post)

    return new_post

@router.get(
    "/",
    response_model=list[schemas.PostResponse]
)
def get_posts(
    db: Session = Depends(get_db)
):

    posts = db.query(
        models.Post
    ).order_by(
        models.Post.created_at.desc()
    ).all()

    return posts

@router.get(
    "/community/{community_id}",
    response_model=list[schemas.PostResponse]
)
def get_community_posts(
    community_id: int,
    db: Session = Depends(get_db)
):

    posts = db.query(models.Post).filter(
        models.Post.community_id == community_id
    ).order_by(
        models.Post.created_at.desc()
    ).all()

    return posts

@router.get("/top")
def top_posts(
    db: Session = Depends(get_db)
):

    posts = db.query(models.Post).all()

    result = []

    for post in posts:

        votes = db.query(models.Vote).filter(
            models.Vote.post_id == post.id
        ).all()

        score = len([
            v for v in votes
            if v.vote_type == "upvote"
        ]) - len([
            v for v in votes
            if v.vote_type == "downvote"
        ])

        result.append({
            "id": post.id,
            "title": post.title,
            "content": post.content,
            "score": score
        })

    result.sort(
        key=lambda x: x["score"],
        reverse=True
    )

    return result