from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate
from db import fetch_user_medications
from utils import preprocess_user_data


from config import GEMINI_API_KEY

from datetime import datetime



def get_current_time_date_year():
    """Returns the current time, date, and year."""
    now = datetime.now()
    return {
        "time": now.strftime("%H:%M:%S"),  # Format: Hour:Minute:Second
        "date": now.strftime("%Y-%m-%d"),  # Format: Year-Month-Day
        "year": now.year
    }

embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-mpnet-base-v2"
)

def create_user_rag_chain(user_id: int):
    """Create RAG chain for specific user"""
    # 1. Get user-specific data
    medications = fetch_user_medications(user_id)
    

    documents = preprocess_user_data(medications, user_id)

    
    
def create_user_rag_chain(user_id: int):
    """Create or update RAG chain for a specific user."""
    # 1. Get user-specific data
    medications = fetch_user_medications(user_id)
    documents = preprocess_user_data(medications, user_id)
    
    # 2. Define vector store path
    collection_name = f"user_{user_id}"
    persist_directory = f"./chroma_db/{collection_name}"
    
    # 3. Check if vector store exists
    try:
        # Load existing vector store if it exists
        vectorstore = Chroma.load(
            collection_name=collection_name,
            persist_directory=persist_directory,
            embedding=embeddings
        )
        # If it exists, delete the existing data
        vectorstore.delete_collection()
        print(f"Existing vector store for user {user_id} cleared.")
    except Exception as e:
        # If it doesn't exist, log the error and proceed
        print(f"No existing vector store found for user {user_id}. Creating a new one.")

    # 4. Create a new vector store with updated data
    vectorstore = Chroma.from_documents(
        documents=documents,
        embedding=embeddings,
        collection_name=collection_name,
        persist_directory=persist_directory
    )
    print(f"Vector store for user {user_id} created/updated successfully.")
    
    # 3. Create retriever with user filter
    try:
        retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
    except Exception as e:
        print(f"Error: {e}")
        return "I'm sorry, I couldn't fetch your data right now. Please try again later."
   

    
    # 4. LLM initialization
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash-exp",
        temperature=0.3,
        api_key=GEMINI_API_KEY
    )
#     Today's date is {date}, and the time is {time}
# The current year is {year}
    
    # 5. Prompt template (simplified)
    prompt = ChatPromptTemplate.from_template("""

You are a friendly and empathetic medical assistant of user with user id ={user_id},
specializing in medication adherence. Your role is to provide clear,
 concise, and user-friendly information to help users manage their medication schedules effectively.
When answering users, ensure your responses are:

Direct and Simple: Avoid technical jargon or overly detailed explanations unless the user specifically requests them.
Empathetic and Supportive: Use friendly and approachable language to make users feel cared for.
Actionable and Specific: Provide the exact information the user is looking for, with minimal ambiguity.
Examples:
User: When should I take my Paracetamol?
Assistant: You need to take 1 pill of Paracetamol in the morning.

User: Can you update my blood pressure medicine timing to 7:00 PM?
Assistant: Sure! I've updated your blood pressure medicine to 7:00 PM. Let me know if there's anything else I can assist you with.

User: I'm taking a new medicine. Can you add it to my schedule?
Assistant: if it is schedule by doctor syre you can add it but still reconfirm it 
                                              
Guidelines for Your Responses:

Greet the user warmly, but keep it brief.
Provide the requested information or perform the requested update quickly.
Avoid unnecessary details unless the user asks for clarification.
Summarize schedules in plain language, like "You need to take [medicine name] at [time]."
Offer additional help at the end of your response.
If you don't know the answer, respond with:
“I'm sorry, I don't have that information right now, but you can email support@medadherence.com, and our team will assist you.”

Your goal is to provide users with the exact information they need in a helpful and friendly tone.
    {context}
    Question: {input}
    """)
    
    # 6. Create chain
    question_answer_chain = create_stuff_documents_chain(llm, prompt)

    current_info = get_current_time_date_year()

    # rag_chain = create_retrieval_chain(
    #     retriever=retriever,
    #     chain=question_answer_chain,
    #     input_variables={
    #         "date": current_info['date'],
    #         "time": current_info['time'],
    #         "year": current_info['year'],
    #         "user_id": user_id,
    #     }
    # )
    # return rag_chain

    return create_retrieval_chain(retriever, question_answer_chain)
