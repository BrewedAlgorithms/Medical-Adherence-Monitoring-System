1. Chat Endpoint
This endpoint serves as the main interface for users to chat with the AI assistant. It can handle general queries and requests to update medication schedules.

Endpoint: /chat

Method: POST

Description: Receives a user's message, classifies the intent ("Query" or "Update"), and provides a relevant response or performs the requested action. Authentication is required.

Request Body:



{
  "message": "Your question or update request here"
}
Success Responses:

On a successful query:



{
  "response": "The AI-generated answer to the user's question."
}
On a successful medication update:



{
  "response": "The schedule for {medication_name} has been updated successfully."
}
Error Responses:

If intent classification fails:



{
  "response": "I'm having trouble understanding your request. Could you rephrase it?"
}
If a query fails:



{
  "response": "I'm having trouble retrieving that information right now. Please try again later."
}
If an update fails or is not allowed:



{
  "response": "I couldn't identify the medication. Please provide its name."
}
(Other similar error messages exist for missing periods, missing medications, or failed database updates).

If something unexpected goes wrong:



{
  "response": "Something went wrong. Please try again later."
}
2. Health Check Endpoint
This endpoint is used to verify that the API service is running and healthy.

Endpoint: /health

Method: GET

Description: Returns a simple status message indicating the service is operational. No authentication is required.

Request Body: None.

Success Response:



{
  "status": "healthy"
}
Error Responses: None.