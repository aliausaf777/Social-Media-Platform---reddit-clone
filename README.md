# Readit — Full Stack Reddit Clone

A modern full-stack Reddit-inspired social discussion platform built with **FastAPI**, **React**, and **PostgreSQL**.

Readit allows users to create communities, publish posts, vote, comment, and interact through a responsive real-time social platform with JWT authentication.

---

# Features

## Authentication
- User Signup
- User Login
- JWT Authentication
- Persistent Sessions
- Protected Routes

## Communities
- Create communities
- Browse community feeds
- Community-specific discussions

## Posts
- Create posts
- Dynamic post feed
- Sort by Hot / New / Top / Rising
- Real-time refresh
- Expand/collapse long content

## Comments
- Add comments
- View discussions
- Real-time updates
- Optimistic UI rendering

## Voting System
- Upvote posts
- Downvote posts
- Live score updates
- Optimistic vote handling

## UI / UX
- Modern Reddit-style interface
- Dark mode design
- Responsive layout
- Smooth animations
- Search functionality
- Trending sidebar
- Community navigation

---

# Tech Stack

## Frontend
- React
- Vite
- Axios
- Tailwind CSS

## Backend
- FastAPI
- SQLAlchemy
- Pydantic
- JWT Authentication

## Database
- PostgreSQL

---

# Project Structure

```bash
readit-fullstack/
│
├── app/
│   ├── routers/
│   ├── auth.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   └── main.py
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── requirements.txt
├── README.md
└── .gitignore
Installation
Clone Repository
git clone https://github.com/aliausaf777/Social-Media-Platform---reddit-clone.git
cd Social-Media-Platform---reddit-clone
Backend Setup
Install Dependencies
pip install -r requirements.txt
Configure Environment Variables

Create a .env file:

DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/reddit_clone_db
SECRET_KEY=your_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
Run FastAPI Server
python -m uvicorn app.main:app --reload

Backend runs on:

http://127.0.0.1:8000

Swagger API Documentation:

http://127.0.0.1:8000/docs
Frontend Setup
Move to Frontend Folder
cd frontend
Install Dependencies
npm install
Run Frontend
npm run dev

Frontend runs on:

http://localhost:5173
API Endpoints
Authentication
Method	Endpoint	Description
POST	/auth/signup	Register user
POST	/auth/login	Login user
GET	/auth/me	Get current user
Communities
Method	Endpoint	Description
POST	/communities/	Create community
GET	/communities/	Get communities
Posts
Method	Endpoint	Description
GET	/posts/	Get all posts
POST	/posts/	Create post
GET	/posts/top	Get top posts
GET	/posts/community/{id}	Get community posts
Comments
Method	Endpoint	Description
POST	/comments/	Create comment
GET	/comments/post/{post_id}	Get post comments
Votes
Method	Endpoint	Description
POST	/votes/	Vote on post
GET	/votes/post/{post_id}	Get vote score
Screenshots
Home Feed

<img width="1366" height="644" alt="image" src="https://github.com/user-attachments/assets/f22fa86a-551b-4240-ba33-1c5e935085b5" />


Comments Section

<img width="1325" height="646" alt="image" src="https://github.com/user-attachments/assets/3372355f-398c-4fda-90cc-f9038ce7c638" />

Voting System

(Add screenshot here)

Learning Outcomes

This project helped me strengthen my understanding of:

Full-stack web development
REST API architecture
JWT authentication
PostgreSQL integration
React state management
Backend/frontend communication
Optimistic UI updates
Real-time data handling
Modern responsive UI design
Future Improvements
User profiles
Image uploads
Notifications
WebSocket real-time updates
Infinite scrolling
Mobile-first optimization
Bookmarking posts
Markdown support
Admin dashboard
Cloud deployment
Author
Ali

Student Full Stack Developer

GitHub:
https://github.com/aliausaf777

License

This project is licensed under the MIT License.
