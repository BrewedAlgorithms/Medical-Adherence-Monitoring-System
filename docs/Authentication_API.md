API Documentation for Authentication Service
This service handles user registration, login, logout, and token validation.

1. Initialize Login
Initiates the login process by generating and sending an OTP to the user's phone. If the user doesn't exist, a new user record is created.

Endpoint: /initializelogin

Method: POST

Description: Takes a phone number, creates a user if one doesn't exist, and sends a 4-digit OTP via SMS for verification.

Request Body:



{
  "phone": "1234567890"
}
Success Responses:

201 Created: When a new user is created.



{
  "message": "User created and OTP sent"
}
200 OK: When an OTP is sent to an existing user.



{
  "message": "OTP sent"
}
Error Responses:

400 Bad Request: If the phone number is missing or invalid.



{
  "message": "Missing required fields"
}
500 Internal Server Error: If there's a database error or the OTP service fails.



{
  "message": "Error initializing login"
}
2. Login with OTP
Completes the login process by verifying the phone number and OTP.

Endpoint: /login

Method: POST

Description: Validates the user's phone and OTP. On success, it generates a unique authentication token, saves it, and returns it to the user.

Request Body:



{
  "phone": "1234567890",
  "otp": "1234"
}
Success Response (200 OK):



{
  "userId": 1,
  "authToken": "a1b2c3d4e5f6g7h8"
}
Error Responses:

401 Unauthorized: If the phone or OTP is incorrect.



{
  "message": "Invalid phone or OTP"
}
500 Internal Server Error: If there's a database error.



{
  "message": "Error logging in"
}
3. Complete User Registration
Updates a user's profile with additional details after their first login.

Endpoint: /complete-registration

Method: POST

Description: Allows a newly logged-in user to add their name, email, address, and language to their profile.

Authentication: Requires a valid authToken.

Request Body:



{
  "user_id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "address": "123 Main St",
  "language": "English"
}
Success Response (200 OK):



{
  "message": "User profile completed"
}
Error Responses:

400 Bad Request: If any required fields are missing.



{
  "message": "Missing required fields"
}
404 Not Found: If the user_id does not exist.



{
  "message": "User not found"
}
4. Logout
Logs a user out by deleting their authentication token.

Endpoint: /logout

Method: GET

Description: Invalidates the user's current session by deleting the provided auth token from the database.

Authentication: Requires a valid authToken sent in the Authorization header.

Request Parameters:

Header: Authorization: Bearer <authToken>

Success Response (200 OK):



{
  "message": "Logged out successfully"
}
Error Responses:

404 Not Found: If the provided token doesn't exist.



{
  "message": "Token not found"
}
5. Validate Token
A testing endpoint to check if an authentication token is valid.

Endpoint: /validate

Method: GET

Description: Verifies if an auth token is valid and returns the corresponding user's profile data.

Authentication: Requires a valid authToken in the Authorization header.

Request Parameters:

Header: Authorization: Bearer <authToken>

Success Response (200 OK):



{
  "user_id": 1,
  "phone": "1234567890",
  "email": "user@example.com",
  "name": "John Doe",
  "address": "123 Main St",
  "language": "English",
  "isprofilecomplete": true
}
Error Responses:

401 Unauthorized: If the token is invalid.

JSON

{
  "message": "Invalid auth token"
}