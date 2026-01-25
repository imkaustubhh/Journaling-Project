# Real News Filter - News Aggregation & Filtering Website

A full-stack web application that aggregates news from multiple sources and uses multi-layer filtering (keyword-based, source credibility, AI analysis, and manual curation) to deliver credible news.

## Tech Stack

- **Frontend:** React 18 + Vite + React Router
- **Backend:** Node.js + Express
- **Database:** MongoDB
- **Authentication:** JWT (JSON Web Tokens)

## Project Structure

```
Journaling Project/
├── client/          # React frontend
├── server/          # Node.js backend
└── README.md
```

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

## Installation

### 1. Clone and Setup

```bash
cd "Journaling Project"
```

### 2. Backend Setup

```bash
cd server
npm install
```

Create a `.env` file in the `server` directory:

```bash
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/news-filter
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:5173
```

### 3. Frontend Setup

```bash
cd client
npm install
```

Create a `.env` file in the `client` directory:

```bash
VITE_API_URL=http://localhost:5000/api
```

## Running the Application

### Start MongoDB

If using local MongoDB:

```bash
mongod
```

Or use MongoDB Atlas cloud database.

### Start Backend Server

```bash
cd server
npm run dev
```

Backend will run on `http://localhost:5000`

### Start Frontend Development Server

```bash
cd client
npm run dev
```

Frontend will run on `http://localhost:5173`

## Features Implemented (Phase 1)

- ✅ User registration and authentication
- ✅ Login/logout functionality
- ✅ Protected routes
- ✅ JWT token-based authentication
- ✅ Secure password hashing with bcrypt
- ✅ User dashboard

## Upcoming Features

### Phase 2: News Aggregation
- Automated news fetching from NewsAPI.org
- Article storage and deduplication
- Background jobs for periodic updates

### Phase 3: Filtering System
- Keyword-based filtering (clickbait detection)
- Source credibility ratings
- AI-powered content analysis
- Multi-layer scoring system

### Phase 4: Admin Panel
- Manual article curation
- Source management
- Category management

### Phase 5: User Preferences
- Customizable filters
- Source preferences
- Category subscriptions

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)
- `POST /api/auth/logout` - Logout user (protected)

### Health Check
- `GET /health` - Server health status

## Testing

### Register a New User

1. Go to `http://localhost:5173`
2. Click "Register here"
3. Fill in name, email, and password
4. Submit to create account

### Login

1. Go to `http://localhost:5173/login`
2. Enter your email and password
3. Access the protected dashboard

### Testing with API Client (Postman/cURL)

#### Register:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

#### Login:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

## Security Features

- Password hashing with bcrypt (10 salt rounds)
- JWT token authentication
- Protected routes requiring valid tokens
- Helmet.js for security headers
- CORS configuration
- Input validation

## Environment Variables

### Backend (.env)
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT signing
- `JWT_EXPIRE` - Token expiration time
- `FRONTEND_URL` - Frontend URL for CORS

### Frontend (.env)
- `VITE_API_URL` - Backend API URL

## Development

### Backend Scripts
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server

### Frontend Scripts
- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running locally or check MongoDB Atlas connection string
- Verify `MONGODB_URI` in `.env` file

### CORS Errors
- Check `FRONTEND_URL` in backend `.env` matches your frontend URL
- Verify backend is running on port 5000

### Token Expired
- Tokens expire after 7 days by default
- Login again to get a new token

## License

MIT

## Author

Built with Claude Code
