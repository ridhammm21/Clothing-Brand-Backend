# Clothing Brand Backend API

A RESTful API for a clothing brand e-commerce website built with Node.js, Express.js, and MySQL.

## Features

- User authentication (register/login)
- JWT-based authorization
- User profile management
- MySQL database integration
- Input validation
- CORS support for frontend integration
- Admin user support

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your environment variables by updating the `.env` file:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_USER=your_mysql_username
   DB_PASSWORD=your_mysql_password
   DB_NAME=clothing_store
   DB_PORT=3306
   JWT_SECRET=your_very_secure_jwt_secret
   FRONTEND_URL=http://localhost:3000
   ```

4. Create the MySQL database and users table:
   ```sql
   CREATE DATABASE clothing_store;
   USE clothing_store;

   CREATE TABLE users (
     id INT PRIMARY KEY AUTO_INCREMENT,
     name VARCHAR(100) NOT NULL,
     email VARCHAR(100) UNIQUE NOT NULL,
     password_hash TEXT NOT NULL,
     phone VARCHAR(15),
     is_admin BOOLEAN DEFAULT FALSE,
     status ENUM('active','inactive','banned') DEFAULT 'active',
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     INDEX idx_email (email)
   );
   ```

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

The server will start on `http://localhost:5000` (or your specified PORT).

## API Endpoints

### Authentication
- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Login user
- `GET /api/users/profile` - Get user profile (requires authentication)
- `PUT /api/users/profile` - Update user profile (requires authentication)

### General
- `GET /` - API information
- `GET /health` - Health check

## Frontend Integration

To connect with your frontend:

1. Make sure your frontend is running on `http://localhost:3000` (or update FRONTEND_URL in .env)
2. Use the following base URL for API calls: `http://localhost:5000/api`
3. Include the JWT token in the Authorization header: `Bearer <token>`

### Example Frontend API calls:

```javascript
// Register
const response = await fetch('http://localhost:5000/api/users/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
    phone: '+1234567890'
  })
});

// Login
const loginResponse = await fetch('http://localhost:5000/api/users/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'john@example.com',
    password: 'password123'
  })
});

// Get profile (with token)
const profileResponse = await fetch('http://localhost:5000/api/users/profile', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
});
```

## Project Structure

```
clothing-brand-backend/
├── config/
│   └── database.js          # Database configuration
├── middleware/
│   └── auth.js              # Authentication middleware
├── routes/
│   └── users.js             # User routes
├── .env                     # Environment variables
├── .gitignore              # Git ignore file
├── package.json            # Project dependencies
├── README.md               # This file
└── server.js               # Main server file
```

## Security Features

- Password hashing with bcryptjs
- JWT token authentication
- Input validation with express-validator
- CORS configuration
- SQL injection prevention with prepared statements

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request