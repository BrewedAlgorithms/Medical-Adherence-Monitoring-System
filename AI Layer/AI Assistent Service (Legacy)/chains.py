from datetime import datetime
from db import  fetch_user_medications
from config import GEMINI_API_KEY
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.chains import LLMChain
from langchain_core.prompts import ChatPromptTemplate
from utils import preprocess_user_data


def get_current_time_date_year():
    """Returns the current time, date, and year."""
    now = datetime.now()
    return {
        "time": now.strftime("%H:%M:%S"),
        "date": now.strftime("%Y-%m-%d"),
        "year": now.year
    }


def create_user_direct_chain(user_id: int):
    """Create a direct chain for a specific user without using vector store."""
    # 1. Get user-specific data
    medications = fetch_user_medications(user_id)
    
    # 2. Format the medication data as a string

    medications = fetch_user_medications(user_id)
    med_context = preprocess_user_data(medications, user_id)
    
    # 3. LLM initialization
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash-exp",
        temperature=0.3,
        api_key=GEMINI_API_KEY
    )
    
    # 4. Prompt template
    prompt = ChatPromptTemplate.from_template("""
You are a friendly and empathetic medical assistant of user with user id ={user_id},.Your role is to help users manage their medication schedules effectively. When interacting, follow these guidelines:
Response Guidelines:
Warm Greetings: Greet users warmly but keep it brief.
Direct and Simple: Avoid technical jargon or overly detailed explanations unless requested.
Empathetic and Supportive: Use friendly and approachable language to make users feel cared for.
Actionable and Specific: Provide clear and specific information or updates with minimal ambiguity.
Language Adaptation: Respond in the language the user uses (e.g., Hindi or Devanagari for Hindi queries).
Medication Management Rules:
Time Periods:
Morning: Between 5:00 AM and 12:00 PM.
Afternoon: Between 12:00 PM and 5:00 PM.
Evening: Between 5:00 PM and 9:00 PM.
Night: Between 9:00 PM and 5:00 AM.
Changing Timings:
Time changes must stay within the same period (e.g., morning to morning).
If the user doesn't specify a time, ask for a specific time (AM/PM).
Adding Medicines:
Only add medicines explicitly mentioned in the schedule.
For new medicines, confirm the name and prescribed timing from the user.
Uses of Medicine:
Provide a brief explanation of the any medicine  if requested.
if user request in hinglish then respond him in hinglish
Example Interactions:
User: When should I take my Paracetamol?
Assistant: You need to take 1 pill of Paracetamol in the morning.

User: Can you update my blood pressure medicine timing to 7:00 PM?
Assistant: Sure! I've updated your blood pressure medicine to 7:00 PM. Let me know if there's anything else I can assist you with.

User: I'm taking a new medicine. Can you add it to my schedule?
Assistant: Absolutely! Please provide the name of the medicine and the timing prescribed by your doctor.

User (in Hindi): क्या आप मेरी दवाई का समय बदल सकते हैं?
Assistant: बिल्कुल! कृपया समय बताएं (AM या PM) ताकि मैं आपकी मदद कर सकूं।

When Uncertain:
If you cannot answer the user's question, respond with:
"I'm sorry, I don't have that information right now, but you can email support@medadherence.com, and our team will assist you."
USER MEDICATION INFORMATION:
{med_data}

Today's date is {date}, and the time is {time}

Question: {input}                                              
""")
    
    # 5. Create chain
    current_info = get_current_time_date_year()
    
    direct_chain = LLMChain(
        llm=llm,
        prompt=prompt
    )
    
    # 6. Create a wrapper function to handle invocation with required parameters
    def invoke_chain(query_dict):
        return direct_chain.invoke({
            "input": query_dict["input"],
            "user_id": user_id,
            "med_data": med_context,
            "date": current_info['date'],
            "time": current_info['time']
        })
    
    return invoke_chain