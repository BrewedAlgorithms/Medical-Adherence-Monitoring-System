from datetime import datetime, timedelta
from .db import fetch_user_medications, fetch_today_intakes
from .config import OPENAI_API_KEY
from .utils import preprocess_user_data
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

def get_current_time_date_year():
    """Returns the current time, date, and year."""
    now = datetime.now()
    return {
        "time": now.strftime("%H:%M:%S"),
        "date": now.strftime("%Y-%m-%d"),
        "year": now.year
    }

def build_period_summary_from_intakes(intakes: list, medications: list) -> str:
    """Build a period-organized schedule using actual intake times from MedicineIntakes table."""
    timing_descriptions = ["before meals", "after meals", "anytime"]
    
    # Create a lookup for medicine medtype
    medtype_lookup = {med['medicine_course_id']: int(med.get('medtype', 2)) for med in medications}
    
    periods = {
        "MORNING": [],      # 5:00 AM - 11:59 AM
        "AFTERNOON": [],    # 12:00 PM - 4:59 PM
        "EVENING": [],      # 5:00 PM - 8:59 PM
        "NIGHT": []         # 9:00 PM - 4:59 AM
    }
    
    for intake in intakes:
        medicine_name = intake.get("medicine_name", "Unknown")
        scheduled_time = intake.get("scheduled_time")  # This is a timedelta from TIME()
        medicine_course_id = intake.get("medicine_course_id")
        taken_at = intake.get("taken_at")
        
        medtype = medtype_lookup.get(medicine_course_id, 2)
        meal_timing = timing_descriptions[medtype] if medtype < len(timing_descriptions) else "anytime"
        
        # Convert scheduled_time to readable format
        if isinstance(scheduled_time, timedelta):
            total_seconds = int(scheduled_time.total_seconds())
            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            
            # Determine period based on hour
            if 5 <= hours < 12:
                period_name = "MORNING"
            elif 12 <= hours < 17:
                period_name = "AFTERNOON"
            elif 17 <= hours < 21:
                period_name = "EVENING"
            else:
                period_name = "NIGHT"
            
            # Format time string
            hour_12 = hours % 12
            if hour_12 == 0:
                hour_12 = 12
            am_pm = "AM" if hours < 12 else "PM"
            time_str = f"{hour_12:02d}:{minutes:02d} {am_pm}"
        else:
            period_name = "MORNING"
            time_str = "time not set"
        
        status = " (taken)" if taken_at else ""
        entry = f"- {medicine_name}: 1 pill(s) {meal_timing} at {time_str}{status}"
        periods[period_name].append(entry)
    
    # Build the summary string
    result = []
    for period_name in ["MORNING", "AFTERNOON", "EVENING", "NIGHT"]:
        entries = periods[period_name]
        if entries:
            result.append(f"\n{period_name}:")
            result.extend(entries)
    
    return "\n".join(result) if result else "No medications scheduled for today."

def create_user_direct_chain(user_id: int):
    """
    Create a direct query-response chain for a specific user using LangChain.
    """
    # 1. Fetch user-specific medication data
    medications = fetch_user_medications(user_id)
    med_documents = preprocess_user_data(medications, user_id)
    
    # Convert Document objects to plain text for the LLM
    med_list = "\n".join([doc.page_content for doc in med_documents]) if med_documents else "No medications found."
    
    # Fetch today's actual intakes from MedicineIntakes table
    today_intakes = fetch_today_intakes(user_id)
    
    # Create period-based summary using actual intake times
    period_summary = build_period_summary_from_intakes(today_intakes, medications)
    print(f"[DEBUG] Period summary being sent to LLM:\n{period_summary}")

    # 2. Prompt template with message history placeholder
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a friendly and empathetic medical assistant of users.
Your role is to help users manage their medication schedules effectively.

Response Guidelines:
- Warm greetings but brief
- Simple and direct answers
- Empathetic and supportive tone
- Respond in the same language as the user (english / Hinglish if used)

Medication Management Rules:
- Morning: 5:00 AM – 12:00 PM
- Afternoon: 12:00 PM – 5:00 PM
- Evening: 5:00 PM – 9:00 PM
- Night: 9:00 PM – 5:00 AM

CRITICAL: When showing medication schedules, ALWAYS use ONLY the CURRENT SCHEDULE DATA below.
IGNORE any medication information from previous messages in this conversation - schedules may have changed.
Do NOT add medications to periods where they are not listed in the CURRENT schedule.

When showing schedules, use the PERIOD-BASED SCHEDULE below and list ONLY what is shown there.
Do NOT skip, combine, or omit any entries. Do NOT add entries that aren't in the current schedule.

Rules:
- Time changes must stay in the same period
- Ask for time if not specified
- Do not add medicines unless explicitly confirmed

If you cannot answer:
"I'm sorry, I don't have that information right now, but you can email support@medadherence.com."

=== CURRENT MEDICATION DATA (USE THIS, NOT CONVERSATION HISTORY) ===
{med_data}

=== CURRENT PERIOD-BASED SCHEDULE (COPY EXACTLY - DO NOT ADD/REMOVE) ===
{period_schedule}

Today's date is {date}, and the time is {time}
"""),
        MessagesPlaceholder(variable_name="messages"),
    ])

    # 3. LangChain LLM setup
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.3,
        api_key=OPENAI_API_KEY
    )

    # 4. LCEL Chain
    chain = prompt | llm

    def invoke_chain(query_dict):
        current_info = get_current_time_date_year()
        
        # Invoke the chain with the history
        response = chain.invoke({
            "med_data": med_list,
            "period_schedule": period_summary,
            "date": current_info["date"],
            "time": current_info["time"],
            "messages": query_dict["messages"]
        })
        
        return {
            "text": response.content.strip()
        }

    return invoke_chain