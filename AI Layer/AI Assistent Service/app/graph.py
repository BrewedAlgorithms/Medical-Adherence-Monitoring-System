from typing import TypedDict, Optional, Annotated
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph.message import add_messages
from .update_model import classify_and_extract, classify_timing
from .chains import create_user_direct_chain
from .db import update_all_schedule, update_single_intake, fetch_user_medications
from openai import OpenAI
from .config import OPENAI_API_KEY

# OpenAI client for general queries
_client = OpenAI(api_key=OPENAI_API_KEY)

# 1. Define the State
class ChatState(TypedDict):
    user_id: int
    user_message: str
    messages: Annotated[list, add_messages] # Automatically appends new messages
    intent: Optional[str]
    entities: Optional[dict]  # Extracted entities from combined LLM call
    response: Optional[str]

# 2. Define Nodes
def classify_node(state: ChatState):
    """Combined intent classification and entity extraction in one LLM call."""
    try:
        result = classify_and_extract(state["user_message"])
        return {
            "intent": result["intent"],
            "entities": result["entities"]
        }
    except Exception as e:
        print(f"Classification error: {e}")
        return {
            "intent": "Error",
            "entities": {"medicine_name": None, "action": None, "period": None, "timing": None}
        }

def general_query_node(state: ChatState):
    """Handle general queries (greetings, thanks, etc.) WITHOUT database calls."""
    try:
        response = _client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": """You are a friendly medical assistant chatbot. 
Respond briefly and warmly to greetings and general questions.
If user asks what you can do, tell them you can:
- Show their medication schedule
- Update medication times
- Answer questions about their medications
Keep responses very short (1-2 sentences max)."""},
                {"role": "user", "content": state["user_message"]}
            ],
            temperature=0.7,
            max_tokens=100
        )
        answer = response.choices[0].message.content.strip()
        return {"response": answer, "messages": [("assistant", answer)]}
    except Exception as e:
        print(f"General query error: {e}")
        return {"response": "Hello! How can I help you with your medications today?", 
                "messages": [("assistant", "Hello! How can I help you with your medications today?")]}

def query_node(state: ChatState):
    try:
        direct_chain = create_user_direct_chain(state["user_id"])
        response = direct_chain({"messages": state["messages"]})
        
        if isinstance(response, dict) and "text" in response:
            answer = response["text"]
            return {"response": answer, "messages": [("assistant", answer)]}
        else:
            err_msg = "I found some information but couldn't format it properly. Please try again."
            return {"response": err_msg, "messages": [("assistant", err_msg)]}
    except Exception as e:
        print(f"Direct chain error: {e}")
        err_msg = "I'm having trouble retrieving that information right now. Please try again later."
        return {"response": err_msg, "messages": [("assistant", err_msg)]}

def update_all_node(state: ChatState):
    """UpdateAll: Changes default time slot AND all future intakes.
    
    If medicine_name is provided: updates only that medicine's intakes.
    If medicine_name is NOT provided: updates the default slot time for ALL medicines in that period.
    """
    user_message = state["user_message"]
    user_id = state["user_id"]
    try:
        # Get entities from state (already extracted in classify_node)
        entities = state.get("entities", {})
        
        medication_name = entities.get("medicine_name")  # Can be None for global slot update
        requested_period = entities.get("period")
        timing = entities.get("timing")
        
        if not requested_period:
            requested_period = classify_timing(user_message)

        if not requested_period:
            msg = "I couldn't determine the time period. Please clarify (morning, afternoon, evening, or night)."
            return {"response": msg, "messages": [("assistant", msg)]}
        
        if not timing:
            msg = "I couldn't determine the new time. Please specify the exact time (e.g., 9 AM)."
            return {"response": msg, "messages": [("assistant", msg)]}
        
        # If a specific medicine is mentioned, validate it exists
        if medication_name:
            current_schedule = fetch_user_medications(user_id)
            medication_schedule = next(
                (med for med in current_schedule if med.get("medicine_name", "").lower() == medication_name.lower()),
                None
            )
            
            if not medication_schedule:
                msg = f"I couldn't find {medication_name} in your schedule. Please check and try again."
                return {"response": msg, "messages": [("assistant", msg)]}
            
            assigned_periods = medication_schedule.get("assigned_periods", [])
            if requested_period not in assigned_periods:
                msg = f"{medication_name} is not scheduled for {requested_period.replace('_', ' ')}. It's currently scheduled for: {', '.join(p.replace('_', ' ') for p in assigned_periods)}."
                return {"response": msg, "messages": [("assistant", msg)]}
        
        update_status = update_all_schedule(
            user_id=user_id,
            medicine_name=medication_name,  # Can be None
            period=requested_period,
            timing=timing
        )
        
        if update_status:
            period_display = requested_period.replace('_', ' ')
            if medication_name:
                msg = f"Done! I've updated {medication_name}'s {period_display} to {timing}. All future doses will now be at this time."
            else:
                msg = f"Done! I've updated your default {period_display} to {timing}. All your {period_display.replace(' time', '')} medicines will now be scheduled at this time."
            return {"response": msg, "messages": [("assistant", msg)]}
        else:
            msg = "Failed to update the schedule. Please try again later."
            return {"response": msg, "messages": [("assistant", msg)]}
            
    except Exception as e:
        print(f"UpdateAll processing error: {e}")
        msg = "An error occurred while updating your schedule. Please try again later."
        return {"response": msg, "messages": [("assistant", msg)]}


def update_one_node(state: ChatState):
    """UpdateOne: Changes ONLY today's specific pill timing."""
    user_message = state["user_message"]
    user_id = state["user_id"]
    try:
        # Get entities from state (already extracted in classify_node)
        entities = state.get("entities", {})
        
        medication_name = entities.get("medicine_name")
        requested_period = entities.get("period")
        timing = entities.get("timing")
        
        # Check if medication_name is actually a period reference like "night pill", "morning pill"
        period_keywords = {
            "morning": "morning_time", "morning pill": "morning_time", "morning pills": "morning_time",
            "afternoon": "afternoon_time", "afternoon pill": "afternoon_time", "afternoon pills": "afternoon_time", 
            "evening": "evening_time", "evening pill": "evening_time", "evening pills": "evening_time",
            "night": "night_time", "night pill": "night_time", "night pills": "night_time"
        }
        
        if medication_name and medication_name.lower() in period_keywords:
            # User said something like "night pill" - this is a period reference, not a medicine name
            requested_period = period_keywords[medication_name.lower()]
            medication_name = None  # Will update all meds in this period
        
        # Normalize period to _time format
        if requested_period and not requested_period.endswith("_time"):
            requested_period = requested_period + "_time"
        
        if not requested_period:
            requested_period = classify_timing(user_message)
            if requested_period and not requested_period.endswith("_time"):
                requested_period = requested_period + "_time"

        if not requested_period:
            msg = "I couldn't determine the time period. Please clarify the timing."
            return {"response": msg, "messages": [("assistant", msg)]}
        
        if not timing:
            msg = "I couldn't determine the new time. Please specify when you'd like to take it."
            return {"response": msg, "messages": [("assistant", msg)]}
        
        current_schedule = fetch_user_medications(user_id)
        
        # If no specific medication, update ALL medications scheduled for that period
        if not medication_name:
            meds_in_period = [med for med in current_schedule if requested_period in med.get("assigned_periods", [])]
            
            if not meds_in_period:
                msg = f"You don't have any medications scheduled for {requested_period}."
                return {"response": msg, "messages": [("assistant", msg)]}
            
            updated_meds = []
            for med in meds_in_period:
                update_status = update_single_intake(
                    user_id=user_id,
                    medicine_name=med["medicine_name"],
                    period=requested_period,
                    timing=timing
                )
                if update_status:
                    updated_meds.append(med["medicine_name"])
            
            if updated_meds:
                med_list = ", ".join(updated_meds)
                msg = f"Got it! I've rescheduled today's {requested_period} medications ({med_list}) to {timing}. Your default schedule remains unchanged."
                return {"response": msg, "messages": [("assistant", msg)]}
            else:
                msg = "I couldn't find today's doses to update. They may have already been taken."
                return {"response": msg, "messages": [("assistant", msg)]}
        
        # Specific medication name provided
        medication_schedule = next(
            (med for med in current_schedule if med.get("medicine_name", "").lower() == medication_name.lower()),
            None
        )
        
        if not medication_schedule:
            msg = f"I couldn't find {medication_name} in your schedule. Please check and try again."
            return {"response": msg, "messages": [("assistant", msg)]}
        
        assigned_periods = medication_schedule.get("assigned_periods", [])
        if requested_period not in assigned_periods:
            msg = f"{medication_name} is not scheduled for {requested_period.replace('_', ' ')}. It's currently scheduled for: {', '.join(p.replace('_', ' ') for p in assigned_periods)}."
            return {"response": msg, "messages": [("assistant", msg)]}
        
        update_status = update_single_intake(
            user_id=user_id,
            medicine_name=medication_name,
            period=requested_period,
            timing=timing
        )
        
        if update_status:
            msg = f"Got it! I've rescheduled today's {medication_name} ({requested_period.replace('_', ' ')}) to {timing}. Your default schedule remains unchanged."
            return {"response": msg, "messages": [("assistant", msg)]}
        else:
            msg = "I couldn't find today's dose to update. It may have already been taken or doesn't exist."
            return {"response": msg, "messages": [("assistant", msg)]}
            
    except Exception as e:
        print(f"UpdateOne processing error: {e}")
        msg = "An error occurred while updating today's schedule. Please try again later."
        return {"response": msg, "messages": [("assistant", msg)]}

def fallback_node(state: ChatState):
    if state.get("intent") == "Error":
        msg = "I'm having trouble understanding your request. Could you rephrase it?"
    else:
        msg = "I'm not sure if you're asking a question or updating your schedule. Could you clarify?"
    return {"response": msg, "messages": [("assistant", msg)]}

def route_intent(state: ChatState):
    intent = state.get("intent")
    if intent == "GeneralQuery":
        return "general_query"
    elif intent == "Query":
        return "query"
    elif intent == "UpdateAll":
        return "update_all"
    elif intent == "UpdateOne":
        return "update_one"
    return "fallback"

# 3. Build and Compile the Graph with Checkpointer
workflow = StateGraph(ChatState)

workflow.add_node("classify", classify_node)
workflow.add_node("general_query", general_query_node)
workflow.add_node("query", query_node)
workflow.add_node("update_all", update_all_node)
workflow.add_node("update_one", update_one_node)
workflow.add_node("fallback", fallback_node)

workflow.add_edge(START, "classify")
workflow.add_conditional_edges("classify", route_intent)
workflow.add_edge("general_query", END)
workflow.add_edge("query", END)
workflow.add_edge("update_all", END)
workflow.add_edge("update_one", END)
workflow.add_edge("fallback", END)

# Initialize memory and compile
memory = MemorySaver()
app_graph = workflow.compile(checkpointer=memory)