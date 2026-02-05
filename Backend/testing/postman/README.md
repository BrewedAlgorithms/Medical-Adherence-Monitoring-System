# Postman Collection - Medical Adherence Monitoring System

This directory contains the Postman collection for testing all API endpoints of the Medical Adherence Monitoring System backend.

## Collection File

- **File**: `Medical-Adherence-Monitoring-System.postman_collection.json`
- **Format**: Postman Collection v2.1.0

## Import Instructions

1. Open Postman
2. Click **Import** button (top left)
3. Select **File** tab
4. Choose `Medical-Adherence-Monitoring-System.postman_collection.json`
5. Click **Import**

## Configuration

### Base URL

The collection uses a configurable `base_url` variable. To change it:

1. Select the collection in Postman
2. Go to **Variables** tab
3. Update the `base_url` value (default: `http://localhost:3001`)
4. The variable will be used across all requests

### Collection Variables

The collection automatically manages these variables:

- **`base_url`**: Base API URL (configurable, default: `http://localhost:3001`)
- **`authToken`**: Authentication token (auto-stored from login response)
- **`userId`**: User ID (auto-stored from login response)
- **`course_id`**: Course ID (auto-stored from course creation or medication courses response)

## API Endpoints Coverage

### ✅ Authentication (`/auth`)
- [x] POST `/auth/initializelogin` - Initialize login (send OTP)
- [x] POST `/auth/login` - Login with phone and OTP (stores `authToken` and `userId`)
- [x] POST `/auth/complete-registration` - Complete user registration
- [x] GET `/auth/validate` - Validate authentication token
- [x] GET `/auth/logout` - Logout and invalidate token

### ✅ Course Management (`/course`)
- [x] POST `/course/new` - Create new course with medicines
- [x] POST `/course/addMedicineCourse` - Add medicine to existing course
- [x] GET `/course/medication-courses` - Get all medication courses (stores `course_id` if available)
- [x] GET `/course/todays-schedule` - Get today's medication schedule
- [x] GET `/course/last-7-day-matrix` - Get adherence matrix for last 7 days
- [x] GET `/course/lifetime-matrix` - Get lifetime adherence matrix
- [x] POST `/course/take-medicine` - Mark medicine as taken
- [x] POST `/course/today-intake/sync` - Sync multiple medicine intakes
- [x] DELETE `/course/:course_id` - Delete a course

### ✅ User Features (`/user-feature`)
- [x] GET `/user-feature/profile` - Get user profile (stores `userId` if available)
- [x] GET `/user-feature/note` - Get user notes
- [x] POST `/user-feature/note` - Update user notes

### ✅ General (`/general`)
- [x] GET `/` - Root endpoint (welcome message)
- [x] POST `/broadcast` - Broadcast message via WebSocket
- [x] GET `/general/quote` - Get quote of the day

### ✅ Special Features (`/special`)
- [x] GET `/special/dashboard` - Get dashboard data

### ✅ Media (`/media`)
- [x] POST `/media/uploadPrescription` - Upload prescription image (stores `course_id` from response)
- [x] POST `/media/uploadVoiceNote/:course_id` - Upload voice note for a course

## Variable Management

### Automatic Variable Storage

The collection automatically extracts and stores variables from API responses:

1. **Login Response** (`POST /auth/login`):
   - Extracts `authToken` → stored in `{{authToken}}`
   - Extracts `userId` → stored in `{{userId}}`

2. **Upload Prescription Response** (`POST /media/uploadPrescription`):
   - Extracts `course_id` → stored in `{{course_id}}`

3. **Get Medication Courses Response** (`GET /course/medication-courses`):
   - Extracts first `course_id` from array → stored in `{{course_id}}` (if not already set)

4. **Get User Profile Response** (`GET /user-feature/profile`):
   - Extracts `user_id` → stored in `{{userId}}` (if available)

5. **Validate Token Response** (`GET /auth/validate`):
   - Extracts `user_id` → stored in `{{userId}}`

### Variable Usage

Variables are automatically used in requests:

- **Authentication**: All protected endpoints use `{{authToken}}` in Bearer token header
- **User ID**: Used in request bodies where `user_id` is required
- **Course ID**: Used in URL parameters and request bodies where `course_id` is needed

## Testing Workflow

### Recommended Testing Order

1. **Authentication Flow**:
   ```
   POST /auth/initializelogin → POST /auth/login → POST /auth/complete-registration
   ```

2. **Course Management**:
   ```
   POST /course/new → GET /course/medication-courses → GET /course/todays-schedule
   ```

3. **Medicine Intake**:
   ```
   POST /course/take-medicine → GET /course/last-7-day-matrix
   ```

4. **User Features**:
   ```
   GET /user-feature/profile → GET /user-feature/note → POST /user-feature/note
   ```

5. **Media Upload**:
   ```
   POST /media/uploadPrescription → POST /media/uploadVoiceNote/:course_id
   ```

## Request Examples

### Authentication

**Login Request:**
```json
POST {{base_url}}/auth/login
Content-Type: application/json

{
    "phone": "9876543210",
    "otp": "0000"
}
```

**Response (auto-stores variables):**
```json
{
    "userId": 1,
    "authToken": "abc123def456..."
}
```

### Course Creation

**Create Course Request:**
```json
POST {{base_url}}/course/new
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
    "user_id": {{userId}},
    "doctor_id": 1,
    "start_date": "2026-02-01",
    "end_date": "2026-02-28",
    "medicineCourses": [
        {
            "medicine_name": "Paracetamol",
            "start_date": "2026-02-01",
            "end_date": "2026-02-28",
            "frequency": ["1", "0", "1", "0"],
            "medtype": "tablet"
        }
    ]
}
```

## Notes

- **OTP**: In development mode, the backend uses hardcoded OTP `"0000"` for all phone numbers
- **Authentication**: Most endpoints require Bearer token authentication (except `/auth/login`, `/auth/initializelogin`, and `/media/uploadVoiceNote`)
- **File Uploads**: 
  - Prescription upload requires `multipart/form-data` with `prescription` file field and `user_id` text field
  - Voice note upload requires `multipart/form-data` with `voiceNote` file field
- **Variable Persistence**: Variables persist across requests within a Postman session. To reset, manually clear variables or restart Postman.

## Verification Checklist

- ✅ All routes from `routes/` directory are included
- ✅ Base URL is configurable via collection variable
- ✅ Authentication token is automatically stored and used
- ✅ User ID is automatically stored and used
- ✅ Course ID is automatically stored and used where applicable
- ✅ All protected endpoints include Bearer token authentication
- ✅ Test scripts validate response status codes
- ✅ Variable extraction scripts are included for relevant endpoints

## Troubleshooting

### Variables Not Updating

If variables aren't updating:
1. Check that test scripts are enabled in Postman settings
2. Verify the response structure matches expected format
3. Check Postman console for script execution errors

### Authentication Errors

If getting 401/403 errors:
1. Ensure you've run the Login request first
2. Check that `{{authToken}}` variable is set
3. Verify token hasn't expired (logout and login again)

### Base URL Issues

If requests fail:
1. Verify `base_url` variable is set correctly
2. Ensure server is running on the specified port
3. Check for CORS issues if testing from browser

## Additional Resources

- Backend Documentation: `../../README.md`
- API Documentation: `../../doc.md`
- Database Schema: `../../DATABASE_SCHEMA.md`
