# Chatbot Backend

This is the backend for the Chatbot application.

## Setup

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file in the `backend` directory and add the following:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   ```

4. Run the server:
   - Development mode: `npm run dev`
   - Production mode: `npm start`

## API Endpoints

- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login and get JWT token
- `POST /chat/message` - Send a message and get AI response
- `GET /chat/conversations` - Get all conversations (legacy)
- `GET /chat/:conversationId` - Get messages (legacy)
- `POST /avatars` - Save a new avatar URL
- `GET /avatars/:userId` - List all avatars for a specific user
- `DELETE /avatars/:avatarId` - Delete an avatar
- `PUT /avatars/set-active` - Set an avatar as active for the user
- `POST /reminders` - Create a new reminder
- `GET /reminders/:userId` - Get all reminders for a user
- `DELETE /reminders/:id` - Delete a reminder
- `GET /doctors/nearby` - Find doctors near a location (lat, lng, radius)
- `GET /doctors/:id` - Get doctor details
- `POST /appointments` - Book an appointment
- `GET /appointments/:userId` - Get user's appointments
