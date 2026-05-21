from pydantic import BaseModel, EmailStr
from datetime import datetime

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class CommunityCreate(BaseModel):
    name: str
    description: str

class CommunityResponse(BaseModel):

    id: int
    name: str
    description: str
    creator_id: int

    class Config:
        from_attributes = True
        
class PostCreate(BaseModel):
    title: str
    content: str
    community_id: int

class PostResponse(BaseModel):

    id: int
    title: str
    content: str
    community_id: int
    author_id: int
    created_at: datetime

    class Config:
        from_attributes = True
        
class CommentCreate(BaseModel):
    content: str
    post_id: int

class CommentResponse(BaseModel):

    id: int
    content: str
    post_id: int
    author_id: int

    class Config:
        from_attributes = True
        
class VoteCreate(BaseModel):
    vote_type: str
    post_id: int

class VoteResponse(BaseModel):

    id: int
    vote_type: str
    user_id: int
    post_id: int

    class Config:
        from_attributes = True