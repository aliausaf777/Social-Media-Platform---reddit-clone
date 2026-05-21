from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)

from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas

router = APIRouter(
    prefix="/communities",
    tags=["Communities"]
)

@router.post(
    "/",
    response_model=schemas.CommunityResponse
)
def create_community(
    community: schemas.CommunityCreate,
    db: Session = Depends(get_db)
):

    existing = db.query(models.Community).filter(
        models.Community.name == community.name
    ).first()

    if existing:

        raise HTTPException(
            status_code=400,
            detail="Community already exists"
        )

    new_community = models.Community(
        name=community.name,
        description=community.description,
        creator_id=1
    )

    db.add(new_community)

    db.commit()

    db.refresh(new_community)

    return new_community

@router.get(
    "/",
    response_model=list[schemas.CommunityResponse]
)
def get_communities(
    db: Session = Depends(get_db)
):

    communities = db.query(
        models.Community
    ).all()

    return communities