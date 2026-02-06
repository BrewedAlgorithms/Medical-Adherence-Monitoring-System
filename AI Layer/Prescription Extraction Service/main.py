import os
import json
import base64
import httpx
from typing import Tuple
from dotenv import load_dotenv
from openai import OpenAI
import socketio
import eventlet

# Load environment variables from .env file
load_dotenv()

# Configure OpenAI client (uses OPENAI_API_KEY from .env)
client = OpenAI(timeout=60.0)  # Set timeout to 60 seconds

# Create a Socket.IO server
sio = socketio.Server(cors_allowed_origins="*")
app = socketio.WSGIApp(sio)

# Helper Functions
# Model Configuration
MODEL_NAME = os.getenv("OPENAI_VISION_MODEL", "gpt-4o-mini")

# Image download timeout (in seconds)
IMAGE_DOWNLOAD_TIMEOUT = 30.0

def download_image_as_base64(image_url: str) -> Tuple[str, str]:
    """
    Download an image from a URL and convert it to base64.
    Returns a tuple of (base64_string, mime_type).
    """
    try:
        print(f"Downloading image from: {image_url}")
        with httpx.Client(timeout=IMAGE_DOWNLOAD_TIMEOUT) as http_client:
            response = http_client.get(image_url)
            response.raise_for_status()
            
            # Determine MIME type from Content-Type header or URL extension
            content_type = response.headers.get("content-type", "image/jpeg")
            if not content_type.startswith("image/"):
                # Fallback: try to determine from URL
                if image_url.lower().endswith((".png",)):
                    content_type = "image/png"
                elif image_url.lower().endswith((".gif",)):
                    content_type = "image/gif"
                elif image_url.lower().endswith((".webp",)):
                    content_type = "image/webp"
                else:
                    content_type = "image/jpeg"
            
            # Convert to base64
            image_base64 = base64.b64encode(response.content).decode("utf-8")
            print(f"Image downloaded successfully. Size: {len(response.content)} bytes, Type: {content_type}")
            return image_base64, content_type
    except httpx.TimeoutException:
        raise Exception(f"Timeout while downloading image from {image_url}")
    except httpx.HTTPStatusError as e:
        raise Exception(f"HTTP error {e.response.status_code} while downloading image: {e.response.text}")
    except Exception as e:
        raise Exception(f"Failed to download image: {str(e)}")

# Extraction Prompt
EXTRACTION_PROMPT = """Extract the key details about the prescribed medications from the text and structure them in JSON format. Follow these rules for extraction:

1. Medicine Name: Extract the name of the medicine accurately from the text dont add weight and no space in name eg : if CAP. ZOCLAR 500 then return ZOCLAR .

6. Start Date: 
   - Extract date from prescription
   - Add 1 day to extracted date
   - Use "YYYY-MM-DD" format
   - Return None if no date provided

7. End Date: 
   - Calculate by adding duration to start date
   - Use "YYYY-MM-DD" format
   - Return None if no start date or duration

2.  Coded Frequency (4-digits ):
   - Each bit corresponds to the number of pills for a specific time of day.
   - First Bit: Number of pills in the morning.
   - Second Bit: Number of pills in the afternoon.
   - Third Bit: Number of pills in the evening.
   - Fourth Bit: Number of pills at night.

4. Type:
   - "0" if taken before meals
   - "1" if taken after meals
   - "2" if timing is unspecified or can be taken anytime
    String

5. Dosage: Total number of pills from  frequency and number of days of each pill.


9. is_pill:
   - true if pill or capsule
   - false for other forms

keep doctor id 1 for all respponse 

Return the result as a JSON array.
for example 
{
  "doctor_id": 1,
  "start_date": "2025-03-01",
  "end_date": "2025-03-27",
  "medicineCourses": [
    {
      "medicine_name": "Omega7",
      "start_date": "2025-03-01",
      "end_date": None,
      "frequency": "1101",
      "medtype": "1",
      "is_pill": true,
      "dosage":75
    },
    {
      "medicine_name": "Aspirin",
      "start_date": "2025-03-01",
      "end_date": "2025-03-25",
      "frequency": "1101",
      "medtype": "0",
      "is_pill": true,
      "dosage":75
    }
  ]
}



note : if you are returning none somewhere send the actual none value
important: make sure you're giving correct json. python.
if the image is not prescription ten return the following json  eg "error":"error in prescription "

"""


# Event Handlers
@sio.event
def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.on("prescription_extraction")
def handle_prescription_extraction(sid, image_url):
    print(f"Received image URL from {sid}: {image_url}")

    # Generate response from the model
    try:
        # Download image and convert to base64
        image_base64, mime_type = download_image_as_base64(image_url)
        
        # Create data URL for OpenAI API
        data_url = f"data:{mime_type};base64,{image_base64}"
        
        print("Sending image to OpenAI API...")
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": EXTRACTION_PROMPT},
                        {"type": "image_url", "image_url": {"url": data_url}},
                    ],
                }
            ],
            temperature=0.2,
        )
        
        # Clean and parse the response
        cleaned_response = (response.choices[0].message.content or "").strip()
        print("Raw Model Response:", cleaned_response)

        # Attempt to parse JSON, with fallback to cleaning
        try:
            parsed_response = json.loads(cleaned_response)
        except json.JSONDecodeError:
            # Remove code block markers if present
            cleaned_response = cleaned_response.replace("```json", "").replace("```", "")
            parsed_response = json.loads(cleaned_response)

        # Emit the parsed response
        sio.emit("prescription_extracted", parsed_response, to=sid)
    except json.JSONDecodeError as e:
        print(f"JSON Parsing Error: {e}")
        error_message = "Could not parse the model's response."
        if 'cleaned_response' in locals():
            sio.emit("error", {
                "message": error_message,
                "raw_response": cleaned_response
            }, to=sid)
        else:
            sio.emit("error", {"message": error_message}, to=sid)
    except Exception as e:
        print(f"Unexpected Error: {e}")
        error_message = str(e) if str(e) else "Failed to process prescription."
        sio.emit("error", {"message": error_message}, to=sid)

@sio.event
def disconnect(sid):
    print(f"Client disconnected: {sid}")

# Run the server
if __name__ == "__main__":
    print("Socket.IO server is running on port 3002...")
    eventlet.wsgi.server(eventlet.listen(("0.0.0.0", 3002)), app)
