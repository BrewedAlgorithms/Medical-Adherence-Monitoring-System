import os
from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from .auth import get_current_user
from .graph import app_graph

# Initialize FastAPI app
app = FastAPI()

# Request model for chat messages
class ChatRequest(BaseModel):
    message: str

# Chat endpoint powered by LangGraph
@app.post("/chat")
async def chat_endpoint(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    try:
        user_id = current_user["user_id"]
        user_message = request.message
        
        # Configure the graph to use the user_id as the memory thread
        config = {"configurable": {"thread_id": str(user_id)}}
        
        # Define initial state. LangGraph's add_messages reducer automatically 
        # appends this new message to the existing history stored in memory.
        initial_state = {
            "user_id": user_id,
            "user_message": user_message,
            "messages": [("user", user_message)]
        }
        
        # Execute LangGraph
        final_state = app_graph.invoke(initial_state, config=config)
        
        return {"response": final_state.get("response", "Something went wrong.")}
            
    except Exception as e:
        print(f"General error in chat endpoint: {str(e)}")
        return {"response": "Something went wrong. Please try again later."}

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 3003))
    uvicorn.run(app, host="0.0.0.0", port=port)