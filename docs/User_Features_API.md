API Documentation for User Features
This service handles user-specific data like personal notes and profiles.

1. Create or Update User Note
Creates or updates a personal note for the authenticated user.

Endpoint: /note

Method: POST

Description: Saves a text note associated with the user. If a note already exists for the user, it's updated. If not, a new one is created.

Authentication: Requires a valid authToken.

Request Body:



{
  "user_id": 1,
  "note": "Remember to ask the doctor about side effects."
}
Success Responses:

201 Created: When a new note is created.



{
  "message": "Note created successfully"
}
200 OK: When an existing note is updated.



{
  "message": "Note updated successfully"
}
Error Responses:

400 Bad Request: If user_id or note is missing.



{
  "error": "user_id and note are required"
}
500 Internal Server Error: If there is a database error.



{
  "error": "Failed to update note"
}
2. Get User Note
Retrieves the personal note for the authenticated user.

Endpoint: /note

Method: GET

Description: Fetches the text note associated with the user.

Authentication: Requires a valid authToken.

Request Body:



{
  "user_id": 1
}
Success Response (200 OK):



{
  "note": "Remember to ask the doctor about side effects."
}
Error Responses:

400 Bad Request: If user_id is missing.



{
  "error": "user_id is required"
}
404 Not Found: If no note exists for the user.



{
  "error": "Note not found"
}
3. Get User Profile
Retrieves the profile information for the authenticated user.

Endpoint: /profile

Method: GET

Description: Fetches public profile details for the user, such as name, email, and phone number.

Authentication: Requires a valid authToken.

Request Body:



{
  "user_id": 1
}
Success Response (200 OK):



{
  "name": "John Doe",
  "phone": "1234567890",
  "email": "user@example.com",
  "address": "123 Main St",
  "language": "English",
  "role": "patient"
}
Error Responses:

400 Bad Request: If user_id is missing.



{
  "error": "user_id is required"
}
404 Not Found: If the user does not exist.



{
  "error": "User not found"
}