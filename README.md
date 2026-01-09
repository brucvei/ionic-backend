# Workout Management API

A complete RESTful API backend for a gym workout tracking application built with Node.js, Express, and PostgreSQL.

## Features

- **User Authentication**: Registration, login, JWT-based authentication
- **Exercise Management**: Create, read, update, delete exercises with image upload
- **Workout Management**: Create and manage workout routines
- **Routine Management**: Organize workouts into training routines  
- **Workout Sessions**: Track workout sessions with sets, reps, and progress
- **Progress Tracking**: Monitor exercise progress over time
- **Calendar Integration**: View workout history in calendar format
- **Image Upload**: Support for exercise, workout, and routine images

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up PostgreSQL database using the schema in `console.sql`

4. Create environment file:
   ```bash
   cp .env.example .env
   ```
   Update the database and JWT configurations in `.env`

5. Start the server:
   ```bash
   npm start
   ```

## API Endpoints

| PUT | `/api/auth/profile` | Update user profile | Yes |
| POST | `/api/auth/change-password` | Change password | Yes |

### Exercises

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/exercises` | Get all user exercises | Yes |
| GET | `/api/exercises/:id` | Get exercise by ID | Yes |
| POST | `/api/exercises` | Create new exercise | Yes |
| PUT | `/api/exercises/:id` | Update exercise | Yes |
| DELETE | `/api/exercises/:id` | Delete exercise | Yes |
| GET | `/api/exercises/muscle-groups/list` | Get muscle groups | Yes |

### Workouts

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/workouts` | Get all user workouts | Yes |
| GET | `/api/workouts/:id` | Get workout with exercises | Yes |
| POST | `/api/workouts` | Create new workout | Yes |
| PUT | `/api/workouts/:id` | Update workout | Yes |
| DELETE | `/api/workouts/:id` | Delete workout | Yes |
| POST | `/api/workouts/:id/exercises` | Add exercise to workout | Yes |
| DELETE | `/api/workouts/:workoutId/exercises/:exerciseId` | Remove exercise from workout | Yes |
| PUT | `/api/workouts/:workoutId/exercises/:exerciseId/order` | Update exercise order | Yes |

### Routines

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/routines` | Get all user routines | Yes |
| GET | `/api/routines/:id` | Get routine with workouts | Yes |
| POST | `/api/routines` | Create new routine | Yes |
| PUT | `/api/routines/:id` | Update routine | Yes |
| DELETE | `/api/routines/:id` | Delete routine | Yes |
| POST | `/api/routines/:id/workouts` | Add workout to routine | Yes |
| DELETE | `/api/routines/:routineId/workouts/:workoutId` | Remove workout from routine | Yes |
| PUT | `/api/routines/:routineId/workouts/:workoutId/order` | Update workout order | Yes |

### Workout Sessions

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/workout-sessions` | Get user workout sessions | Yes |
| GET | `/api/workout-sessions/:id` | Get session with exercises and sets | Yes |
| POST | `/api/workout-sessions` | Start new workout session | Yes |
| PUT | `/api/workout-sessions/:id` | Update workout session | Yes |
| POST | `/api/workout-sessions/:id/end` | End workout session | Yes |
| POST | `/api/workout-sessions/:id/exercises` | Add exercise to session | Yes |
| POST | `/api/workout-sessions/:id/sets` | Add set to session | Yes |
| PUT | `/api/workout-sessions/sets/:setId` | Update set | Yes |
| GET | `/api/workout-sessions/progress/:exerciseId` | Get exercise progress | Yes |
| GET | `/api/workout-sessions/calendar/:year/:month` | Get calendar data | Yes |

## Request Examples

### Register User
```json
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword"
  "exercise_id": 1,
  "number_of_set": 1,
  "sets": 3,
  "series_type": 2,
  "weight": 80,
  "reps": 10
}
```

## Series Types

- 0: Aquecimento (Warm-up)
- 1: Preparatória (Preparatory)
- 2: Working set
- 3: Back off set

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## Database Schema

The application uses PostgreSQL with the following main tables:
- `users`: User accounts
- `exercises`: Exercise definitions
- `workout`: Workout templates
- `routine`: Training routines
- `workout_sessions`: Actual workout sessions
- `workout_session_set`: Individual sets performed

See `console.sql` for the complete database schema.

## API Documentation

### Swagger/OpenAPI
- **File**: `swagger.yaml`
- **Description**: Complete OpenAPI 3.0 specification with all endpoints, schemas, and examples
- **Usage**: Import this file into Swagger UI, Swagger Editor, or any OpenAPI-compatible tool

### Postman Collection
- **File**: `postman-collection.json`
- **Description**: Ready-to-use Postman collection with all API endpoints and examples
- **Features**:
  - Automatic token management (login saves token for subsequent requests)
  - Environment variables for base URL and token
  - Pre-configured request examples with sample data
- **Usage**: Import this file into Postman and set the `baseUrl` variable to your server URL

### How to Import

**Swagger:**
1. Open Swagger Editor (https://editor.swagger.io/)
2. File → Import File → Select `swagger.yaml`

**Postman:**
1. Open Postman
2. Import → Upload Files → Select `postman-collection.json`
3. Set environment variable `baseUrl` to `http://localhost:3000` (or your server URL)

