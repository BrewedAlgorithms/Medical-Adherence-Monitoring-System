import json
from langchain_google_genai import ChatGoogleGenerativeAI
from config import GEMINI_API_KEY
import re
from datetime import datetime

def classify_time_from_hour(hour: int) -> str:
    """
    Classify time into morning, afternoon, evening, or night based on hour.
    """
    if 5 <= hour < 12:
        return "morning_time"
    elif 12 <= hour < 17:
        return "afternoon_time"
    elif 17 <= hour < 21:
        return "evening_time"
    elif 21 <= hour or hour < 5:
        return "night_time"
    return None

def classify_timing(user_message: str) -> str:
    """
    Extract and classify timing (morning, afternoon, evening, night) from a user message.
    """
    # Convert message to lowercase for easier comparison
    user_message = user_message.lower()

    # Check for explicit mentions of morning, afternoon, evening, or night
    if "morning" in user_message:
        return "morning_time"
    elif "afternoon" in user_message:
        return "afternoon_time"
    elif "evening" in user_message:
        return "evening_time"
    elif "night" in user_message:
        return "night_time"

    # Fallback: Check for specific times (e.g., 8 am, 9 pm)
    time_match = re.search(r"(\d{1,2})\s?(am|pm)", user_message)
    if time_match:
        hour = int(time_match.group(1))
        period = time_match.group(2)

        # Convert 12-hour format to 24-hour format
        if period == "pm" and hour != 12:
            hour += 12
        elif period == "am" and hour == 12:
            hour = 0

        # Classify based on hour
        return classify_time_from_hour(hour)

    # If no timing information is found
    return None


# Initialize LLM with Gemini API Key
llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash-exp",
    temperature=0.3,
    api_key=GEMINI_API_KEY
)

def classify_intent(user_message: str) -> str:
    """
    Classify the user's intent as 'Query' or 'Update' using the Gemini LLM.
    
    Args:
        user_message (str): The user's input message.
    
    Returns:
        str: The classified intent ('Query' or 'Update').
    """
    prompt = f"""
    You are an intent classifier. Analyze the following message and classify it as either "Query" or "Update".
    
    Message: "{user_message}"
    
    Respond with only one word: "Query" or "Update".
    """
    response = llm.invoke(prompt).content
    intent = response.strip()
    
    if intent in {"Query", "Update"}:
        return intent
    else:
        raise ValueError(f"Unexpected intent classification: {intent}")


def extract_entities(user_message: str) -> dict:
    """
    Extract entities such as medicine name, action, period, and timing from the user's message.
    
    Args:
        user_message (str): The user's input message.
    
    Returns:
        dict: A dictionary containing extracted entities like "medicine_name", "action", "period", and "timing".
    """
    prompt = f"""
    You are an entity extractor for a medication management system. Extract key information from the following message related to medication.

    Message: "{user_message}"

    IMPORTANT: You must respond ONLY with a valid JSON object in the following format, and nothing else:
    {{
        "medicine_name": "extracted name or null",
        "action": " if change ,edit, modify then mention update or accordingly add , delete , insert",
        "period": " if 5:0:0 <= hour < 12:0:0:
        return 'morning_time'
        elif 12 <= hour < 17:
            return 'afternoon_time'
        elif 17 <= hour < 21:
            return 'evening_time'
        elif 21 <= hour or hour < 5:
            return 'night_time'
        ",
        "timing": "exact time to change (e.g., (08:00 AM) to 08:00:00 or null) at set to "
    }}
    
    Make sure:
    1. Your entire response is valid JSON
    2. Do not add any explanations outside the JSON
    3. Use null (not the string "null") when information is not present
    4. Make sure to use double quotes for keys and string values
    5. entries should be vaild for make changes in mysql (make sure it should work in mysql)
    """

    try:
        # Invoke the LLM with the prompt
        response = llm.invoke(prompt).content
        
        # Debug: Print the raw response
        print(f"Raw LLM response: {response}")
        
        # Try to extract JSON from the response
        import re
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
        else:
            json_str = response
        
        # Parse the JSON
        entities = json.loads(json_str)
        
        return {
            "medicine_name": entities.get("medicine_name"),
            "action": entities.get("action"),
            "period": entities.get("period"),
            "timing": entities.get("timing")
        }
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON response: {e}")
        print(f"Attempted to parse: {response}")
        
        # Fallback: Try to manually extract entities if JSON parsing fails
        medicine_match = re.search(r'"medicine_name":\s*"([^"]*)"', response)
        action_match = re.search(r'"action":\s*"([^"]*)"', response)
        period_match = re.search(r'"period":\s*"([^"]*)"', response)
        timing_match = re.search(r'"timing":\s*"([^"]*)"', response)
        
        return {
            "medicine_name": medicine_match.group(1) if medicine_match else None,
            "action": action_match.group(1) if action_match else None,
            "period": period_match.group(1) if period_match else None,
            "timing": timing_match.group(1) if timing_match else None
        }
    except Exception as e:
        print(f"Error processing entities: {e}")
        return {"medicine_name": None, "action": None, "period": None, "timing": None}

# if __name__ == "__main__":


# # Test the functions with demo sentences
# # if __name__ == "__main__":
#     # Test cases for intent classification

#     test_messages = [
#         "Change my morning time to 8 AM",
#         "Remind me to take medicine at 9 PM",
#         "Set my evening schedule to 7 PM",
#         "I want to adjust the afternoon timing to 1 PM"
#     ]
    
#     for msg in test_messages:
#         print(f"Message: {msg}")
#         print(f"Classified Timing: {classify_timing(msg)}")
#         print("-" * 30)
#     query_examples = [
#         "When should I take my aspirin?",
#         "What time is my Lipitor scheduled for?",
#         "Show me my medication schedule"
#     ]
    
#     update_examples = [
#         "Add Tylenol to my medicine list for 8 PM",
#         "Change my aspirin timing to morning instead of evening",
#         "Remove Advil from my medication schedule"
#     ]
    
#     print("===== TESTING INTENT CLASSIFICATION =====")
#     for example in query_examples:
#         intent = classify_intent(example)
#         print(f"Message: '{example}'\nClassified Intent: {intent}\n")
    
#     for example in update_examples:
#         intent = classify_intent(example)
#         print(f"Message: '{example}'\nClassified Intent: {intent}\n")
    
#     print("\n===== TESTING ENTITY EXTRACTION =====")
#     entity_examples = [
#         "Add Tylenol to my schedule for 9 PM",
#         "Change my Lisinopril timing from morning to evening",
#         "When do I need to take my Metformin?",
#         "Remove Advil from my medication list"
#     ]
    
#     for example in entity_examples:
#         print(f"\nMessage: '{example}'")
#         entities = extract_entities(example)
#         print(f"Extracted Entities:")
#         print(f"  Medicine: {entities['medicine_name']}")
#         print(f"  Action: {entities['action']}")
#         print(f"  period: {entities['period']}")
#         print(f"  Timing: {entities['timing']}")