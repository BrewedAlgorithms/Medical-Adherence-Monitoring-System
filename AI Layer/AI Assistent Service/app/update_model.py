import json
import re
from datetime import datetime
from openai import OpenAI
from .config import OPENAI_API_KEY

# -----------------------------
# Time classification helpers
# -----------------------------

def classify_time_from_hour(hour: int) -> str:
    if 5 <= hour < 12:
        return "morning_time"
    elif 12 <= hour < 17:
        return "afternoon_time"
    elif 17 <= hour < 19:
        return "evening_time"
    elif 19 <= hour or hour < 5:
        return "night_time"
    return None


def classify_timing(user_message: str) -> str:
    user_message = user_message.lower()

    if "morning" in user_message:
        return "morning_time"
    elif "afternoon" in user_message:
        return "afternoon_time"
    elif "evening" in user_message:
        return "evening_time"
    elif "night" in user_message:
        return "night_time"

    time_match = re.search(r"(\d{1,2})\s?(am|pm)", user_message)
    if time_match:
        hour = int(time_match.group(1))
        period = time_match.group(2)

        if period == "pm" and hour != 12:
            hour += 12
        elif period == "am" and hour == 12:
            hour = 0

        return classify_time_from_hour(hour)

    return None


# -----------------------------
# OpenAI client
# -----------------------------

client = OpenAI(api_key=OPENAI_API_KEY)


# -----------------------------
# Combined Intent + Entity Extraction (Single LLM Call)
# -----------------------------

def classify_and_extract(user_message: str) -> dict:
    """
    Combined intent classification and entity extraction in a single LLM call.
    Returns: {"intent": str, "entities": {"medicine_name", "action", "period", "timing"}}
    """
    prompt = f"""Classify intent and extract entities from: "{user_message}"

Intents: GeneralQuery (greetings/thanks), Query (asking about schedule), UpdateAll (change default time), UpdateOne (change today only)
Periods: morning_time (5-12), afternoon_time (12-17), evening_time (17-21), night_time (21-5)

IMPORTANT: Convert to 24-hour format and KEEP the exact minutes! 
Examples: 9:15 AM = 09:15:00, 11:10 PM = 23:10:00, 2:30 PM = 14:30:00, 11.10 pm = 23:10:00

Return JSON: {{"intent":"...","entities":{{"medicine_name":null,"action":null,"period":null,"timing":"HH:MM:SS 24hr or null"}}}}"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=100,
            response_format={"type": "json_object"}
        )

        raw_output = response.choices[0].message.content.strip()
        print(f"[LLM] Response: {raw_output}")

        # Extract JSON from response
        json_match = re.search(r"\{.*\}", raw_output, re.DOTALL)
        json_str = json_match.group(0) if json_match else raw_output

        result = json.loads(json_str)
        
        # Validate intent
        intent = result.get("intent", "Query")
        if intent not in {"GeneralQuery", "Query", "UpdateAll", "UpdateOne"}:
            intent = "Query"
        
        # Extract entities
        entities = result.get("entities", {})
        
        return {
            "intent": intent,
            "entities": {
                "medicine_name": entities.get("medicine_name"),
                "action": entities.get("action"),
                "period": entities.get("period"),
                "timing": entities.get("timing")
            }
        }

    except json.JSONDecodeError as e:
        print(f"JSON decode error: {e}")
        # Try to extract intent at minimum
        intent = "Query"
        if "generalquery" in raw_output.lower():
            intent = "GeneralQuery"
        elif "updateall" in raw_output.lower():
            intent = "UpdateAll"
        elif "updateone" in raw_output.lower():
            intent = "UpdateOne"
        
        return {
            "intent": intent,
            "entities": {"medicine_name": None, "action": None, "period": None, "timing": None}
        }

    except Exception as e:
        print(f"Combined classification error: {e}")
        return {
            "intent": "Query",
            "entities": {"medicine_name": None, "action": None, "period": None, "timing": None}
        }


# Legacy function for backward compatibility
def classify_intent(user_message: str) -> str:
    result = classify_and_extract(user_message)
    return result["intent"]


# -----------------------------
# Legacy Entity extraction (for backward compatibility)
# -----------------------------

def extract_entities(user_message: str) -> dict:
    """Legacy function - now uses combined classify_and_extract internally."""
    result = classify_and_extract(user_message)
    return result["entities"]
