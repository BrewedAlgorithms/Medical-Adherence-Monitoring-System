from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from auth import get_current_user
from update_model import classify_intent, extract_entities, classify_timing
from chains import create_user_direct_chain 
from datetime import datetime
from db import update_medicine_schedule, fetch_user_medications

# Initialize FastAPI app
app = FastAPI()

# Request model for chat messages
class ChatRequest(BaseModel):
    message: str

# Chat endpoint with intent classification
@app.post("/chat")
async def chat_endpoint(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    try:
        # Extract user input
        user_message = request.message
        user_id = current_user["user_id"]
        
        # Step 1: Classify intent - add specific error handling
        try:
            intent = classify_intent(user_message)
        except Exception as intent_error:
            print(f"Intent classification error: {str(intent_error)}")
            return {"response": "I'm having trouble understanding your request. Could you rephrase it?"}
        
        # Step 2: Process based on intent
        if intent == "Query":
            try:
                # Handle Query Intent: Use direct chain instead of RAG
                direct_chain = create_user_direct_chain(user_id)
                
                # Invoke the direct chain
                direct_response = direct_chain({
                    "input": user_message
                })
                
                # Safe access to the answer
                if isinstance(direct_response, dict) and "text" in direct_response:
                    return {"response": direct_response["text"]}
                else:
                    print(f"Unexpected direct chain response format: {direct_response}")
                    return {"response": "I found some information but couldn't format it properly. Please try again."}
            except Exception as chain_error:
                print(f"Direct chain error: {str(chain_error)}")
                return {"response": "I'm having trouble retrieving that information right now. Please try again later."}
                
        elif intent == "Update":
            try:
                # Extract entities
                entities = extract_entities(user_message)
                
                # Assign extracted values
                medication_name = entities.get("medicine_name")
                action = entities.get("action")
                requested_period = entities.get("period")
                timing = entities.get("timing")
                
                if not medication_name:
                    return {"response": "I couldn't identify the medication. Please provide its name."}
                
                if not requested_period:
                    return {"response": "I couldn't determine the time period. Please clarify the timing."}
                
                # Fetch current medications for the user
                current_schedule = fetch_user_medications(user_id)
                
                # Find the specific medication in the schedule
                medication_schedule = next(
                    (med for med in current_schedule if med.get("medicine_name", "").lower() == medication_name.lower()),
                    None
                )
                
                if not medication_schedule:
                    return {"response": f"I couldn't find {medication_name} in your schedule. Please check and try again."}
                
                current_period = medication_schedule.get("assigned_periods", ["unspecified"])
                if isinstance(current_period, list) and current_period:
                    current_period = current_period[0]  # Extract the first element
                print(f"Current medication period is: {current_period}")
                if current_period != requested_period:
                    return {
                        "response": f"You are  requesting to change {medication_name} to {requested_period}, but it is currently scheduled {current_period} slot. According to the doctor, it is not advisable to make this change."
                    }
                
                # Update medication schedule in database
                update_status = update_medicine_schedule(
                    user_id=user_id,
                    medicine_name=medication_name,
                    action=action,
                    timing=timing,
                    period=requested_period
                )
                
                if update_status:
                    return {"response": f"The schedule for {medication_name} has been updated successfully."}
                else:
                    return {"response": "Failed to update the schedule. Please try again later."}
            except Exception as update_error:
                print(f"Update processing error: {update_error}")
                return {"response": "An error occurred while updating your schedule. Please try again later."}

        else:
            return {"response": "I'm not sure if you're asking a question or updating your schedule. Could you clarify?"}
            
    except Exception as e:
        print(f"General error in chat endpoint: {str(e)}")
        return {"response": "Something went wrong. Please try again later."}

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Entry point for running the server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
