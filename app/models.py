from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    DateTime
)
from .database import Base
from datetime import datetime

class User(Base):

    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    username = Column(
        String,
        unique=True,
        index=True
    )

    email = Column(
        String,
        unique=True,
        index=True
    )

    password = Column(String)
    
class Community(Base):

    __tablename__ = "communities"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String,
        unique=True,
        index=True
    )

    description = Column(String)

    creator_id = Column(
        Integer,
        ForeignKey("users.id")
    )

    email = Column(
        String,
        unique=True,
        index=True
    )

    password = Column(String)
    
    
class Post(Base):

    __tablename__ = "posts"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    title = Column(String)

    content = Column(String)

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    community_id = Column(
        Integer,
        ForeignKey("communities.id")
    )

    author_id = Column(
        Integer,
        ForeignKey("users.id")
    )
    
class Comment(Base):

    __tablename__ = "comments"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    content = Column(String)

    post_id = Column(
        Integer,
        ForeignKey("posts.id")
    )

    author_id = Column(
        Integer,
        ForeignKey("users.id")
    )
    
class Vote(Base):

    __tablename__ = "votes"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    vote_type = Column(String)

    user_id = Column(
        Integer,
        ForeignKey("users.id")
    )

    post_id = Column(
        Integer,
        ForeignKey("posts.id")
    )