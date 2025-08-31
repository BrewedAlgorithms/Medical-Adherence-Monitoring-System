API Documentation for Media Endpoints
This service handles media uploads, including prescription images and voice notes.

1. Upload Prescription Image
Uploads a prescription image, sends it to the AI service for extraction, and creates a new medication course based on the results.

Endpoint: /uploadPrescription

Method: POST

Description: This is a multi-part form data endpoint. It accepts an image file, uploads it to Cloudinary, then sends the image URL to the AI service for data extraction. The extracted information is used to populate the database with a new medication course and intake schedule.

Authentication: Requires a valid authToken.

Request Body: multipart/form-data

user_id: The ID of the user uploading the prescription.

prescription: The image file of the prescription.

Success Response (201 Created):



{
  "message": "Prescription uploaded and processed successfully",
  "course_id": 1,
  "medicines_created": 3,
  "intakes_created": 42,
  "prescription_image": "http://res.cloudinary.com/..."
}
Error Responses:

400 Bad Request: If user_id or the image file is missing, or if the AI service returns an error.



{
  "error": "Missing required user_id"
}
500 Internal Server Error: If the AI service is unavailable, the Cloudinary upload fails, the extraction times out, or a database transaction error occurs.



{
  "error": "Prescription extraction ai service is unavailable"
}
2. Upload Voice Note
Uploads a voice note associated with a specific medication course.

Endpoint: /uploadVoiceNote/:course_id

Method: POST

Description: This is a multi-part form data endpoint. It accepts a voice note file (e.g., .mp3, .wav) and a course_id from the URL path. The file is uploaded to Cloudinary and the resulting URL is linked to the specified course.

URL Parameters:

course_id: The ID of the course to which the voice note should be attached.

Request Body: multipart/form-data

voiceNote: The audio file of the voice note.

Success Response (200 OK):



{
  "message": "Voice note uploaded successfully",
  "file": {
    "url": "http://res.cloudinary.com/...",
    "filename": "note.mp3",
    "size": 123456,
    "mimetype": "audio/mpeg"
  }
}
Error Responses:

400 Bad Request: If no file is uploaded.



{
  "error": "No file uploaded."
}
500 Internal Server Error: If the Cloudinary upload or database save fails.



{
  "error": "Failed to upload voice note: ..."
}