API Documentation for General Endpoints
This service provides general-purpose endpoints for the application.

1. Get Quote of the Day
Retrieves the quote of the day in the user's preferred language.

Endpoint: /quote

Method: GET

Description: Fetches the current quote of the day from the database, translated into the language specified in the user's profile.

Authentication: Requires a valid authToken.

Request Body: The code shows this endpoint expects a user_id in the request body. While this is unusual for a GET request, we will document it as the code is written.



{
  "user_id": 1
}
Success Response (200 OK):



{
  "quote": "This is the quote of the day."
}
Error Responses:

400 Bad Request: If the user_id is not provided in the request body.



{
  "message": "User ID is required"
}
404 Not Found: If the user or a quote for the day cannot be found.



{
  "message": "User not found"
}
or



{
  "message": "No quote found for the day"
}
500 Internal Server Error: If there is a database problem.



{
  "message": "Database error"
}