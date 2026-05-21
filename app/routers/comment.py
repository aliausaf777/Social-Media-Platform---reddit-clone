from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)

from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas

router = APIRouter(
    prefix="/comments",
    tags=["Comments"]
)

@router.post(
    "/",
    response_model=schemas.CommentResponse
)
def create_comment(
    comment: schemas.CommentCreate,
    db: Session = Depends(get_db)
):

    post = db.query(models.Post).filter(
        models.Post.id == comment.post_id
    ).first()

    if not post:

        raise HTTPException(
            status_code=404,
            detail="Post not found"
        )

    new_comment = models.Comment(
        content=comment.content,
        post_id=comment.post_id,
        author_id=1
    )

    db.add(new_comment)

    db.commit()

    db.refresh(new_comment)

    return new_comment

@router.get(
    "/post/{post_id}",
    response_model=list[schemas.CommentResponse]
)
def get_comments(
    post_id: int,
    db: Session = Depends(get_db)
):

    comments = db.query(models.Comment).filter(
        models.Comment.post_id == post_id
    ).all()

    return comments