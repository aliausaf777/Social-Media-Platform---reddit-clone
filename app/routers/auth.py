from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas
from ..auth import (
    hash_password,
    verify_password,
    create_access_token,
    verify_access_token
)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

@router.post(
    "/signup",
    response_model=schemas.Token
)
def signup(
    user: schemas.UserCreate,
    db: Session = Depends(get_db)
):

    existing_email = db.query(models.User).filter(
        models.User.email == user.email
    ).first()

    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="Email already exists"
        )

    hashed_pw = hash_password(user.password)

    new_user = models.User(
        username=user.username,
        email=user.email,
        password=hashed_pw
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(
        data={"sub": new_user.email}
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }

@router.post(
    "/login",
    response_model=schemas.Token
)
def login(
    user: schemas.UserLogin,
    db: Session = Depends(get_db)
):

    db_user = db.query(models.User).filter(
        models.User.email == user.email
    ).first()

    if not db_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email"
        )

    if not verify_password(
        user.password,
        db_user.password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid password"
        )

    token = create_access_token(
        data={"sub": db_user.email}
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }

from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="auth/login"
)

@router.get("/me")
def get_current_user(
    authorization: str
):

    try:

        token = authorization.split(" ")[1]
        payload = verify_access_token(token)

        return {
            "message": "Protected route accessed",
            "user": payload
        }

    except Exception:

        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )