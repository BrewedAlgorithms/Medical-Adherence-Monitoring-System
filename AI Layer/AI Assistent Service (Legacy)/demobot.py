import os
import mysql.connector
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database Configuration
DATABASE_CONFIG = {
    "host": "durgershsql.mysql.database.azure.com",  # Replace with your database host
    "user": "durgesh",  # Replace with your database username
    "password": "Abcd@123",  # Replace with your database password
    "database": "HealthMobi",  # Replace with your database name
}

# Test connection and query
try:
    # Establish the connection
    connection = mysql.connector.connect(
        host=DATABASE_CONFIG["host"],
        user=DATABASE_CONFIG["user"],
        password=DATABASE_CONFIG["password"],
        database=DATABASE_CONFIG["database"],
    )
    if connection.is_connected():
        print("Database connection successful!")

        # Create a cursor
        cursor = connection.cursor()

        # Test query: Check the current database
        test_query = "SELECT DATABASE();"  # Simple query to get the current database name
        cursor.execute(test_query)
        result = cursor.fetchone()
        print(f"Connected to database: {result[0]}")

        # Execute another sample query: List all tables
        sample_query = "SHOW TABLES;"
        cursor.execute(sample_query)
        tables = cursor.fetchall()
        print("Tables in the database:")
        for table in tables:
            print(f" - {table[0]}")

        # Execute your UPDATE query
        update_query = """
            UPDATE medicationtimes
            SET morning_time = '10:00:00'
            WHERE user_id = 1 AND medicine_name = Omega7;
        """
        cursor.execute(update_query)
        connection.commit()  # Commit the changes
        print("UPDATE query executed successfully.")
        
        # Close the cursor
        cursor.close()
    else:
        print("Failed to connect to the database.")
except mysql.connector.Error as e:
    print(f"Error connecting to the database: {e}")
finally:
    # Close the connection
    if 'connection' in locals() and connection.is_connected():
        connection.close()
        print("Database connection closed.")








# from fastapi import FastAPI, HTTPException
# from langchain.text_splitter import RecursiveCharacterTextSplitter
# from langchain_huggingface import HuggingFaceEmbeddings
# from langchain_community.vectorstores import Chroma
# from langchain_google_genai import ChatGoogleGenerativeAI
# from langchain.chains import create_retrieval_chain
# from langchain.chains.combine_documents import create_stuff_documents_chain
# from langchain_core.prompts import ChatPromptTemplate
# import mysql.connector
# import os
# from langchain.schema import Document

# # Load environment variables if needed
# from dotenv import load_dotenv
# load_dotenv()
# llm = ChatGoogleGenerativeAI(
#     model="gemini-2.0-flash-exp",
#     temperature=0.7,
#     max_tokens=8192,
#     timeout=None,
#     api_key=os.getenv("GEMINI_API_KEY")  # Load key from environment variable
# )

# app = FastAPI()

# # Connect to MySQL database
# def fetch_data_from_db():
#     conn = mysql.connector.connect(
#         host="localhost",
#         user="root",
#         password="paras@123",
#         database="HealthMobi",
#     )
#     cursor = conn.cursor(dictionary=True)
#     cursor.execute("SELECT * FROM MedicineCourses")
#     data = cursor.fetchall()
#     conn.close()
#     return data




# def preprocess_data(data):
#     docs = [
#         Document(
#             page_content=(
#                 f"Medicine Name: {row.get('medicine_name', 'Unknown')}, "
#                 f"Status: {row.get('status', 'Unknown')}, "
#                 f"Start Date: {row.get('start_date', 'Unknown')}, "
#                 f"End Date: {row.get('end_date', 'Unknown')}, "
#                 f"Frequency: {row.get('frequency', 'Unknown')}, "
#                 f"Type: {row.get('medtype', 'Unknown')}"
#             ),
#             metadata={"medicine_course_id": row.get("medicine_course_id")}
#         )
#         for row in data
#     ]
#     return docs



# # Load and process database data
# data = fetch_data_from_db()
# text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000)
# docs = [{"content": doc} for doc in preprocess_data(data)]  # Wrap content as dict for compatibility

# # Preprocess the data into Document objects
# docs = preprocess_data(data)

# # Initialize HuggingFace embeddings
# embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-mpnet-base-v2")

# # Create Chroma vector store
# vectorstore = Chroma.from_documents(documents=docs, embedding=embeddings)

# print("Vector store initialized with HuggingFace embeddings!")

# # Set up retriever
# retriever = vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": 10})


# # Set up the chain
# system_prompt = (
#     """ 
#     **Role**
# You are an expert medical transcriptionist specializing in deciphering and accurately transcribing medical prescriptions. Your role is to meticulously analyze the provided prescription images and extract all relevant information with the highest degree of precision

# ---

# **Task**

# Provide medication schedule information and assist users in updating their schedules in the medication adherence system.

# Follow this step-by-step process to provides a seamless and helpful user experience:

# 1. **Greet the User Warmly**:
    
#     Begin the interaction with a friendly message and ask how you can assist them.
    
# 2. **Identify the User’s Needs**:
    
#     Ask the user what information they are looking for:
    
#     - Medication schedule for a specific medicine.
#     - Assistance in updating their schedule.
# 3. **Gather Detailed Information**:
    
#     If the user is asking for medication details:
    
#     - Request the name of the medicine they want information about.If the user wants to update their schedule:
#     - Ask them for the medicine name and the new schedule they wish to set.
# 4. **Fetch or Update Data**:
#     - Use the stored information in the database to retrieve the current schedule for the requested medicine.
#     - For updates, validate the input and modify the database accordingly.
# 5. **Provide Information or Confirm Updates**:
#     - If fetching a schedule, display the medicine name, dosage, and timing.
#     - If updating a schedule, confirm the new timings with the user before saving the changes.
# 6. **Explain or Confirm Changes**:
#     - Explain the retrieved schedule in a clear, concise way.
#     - For updates, inform the user that the new schedule has been successfully updated in the system.
# 7. **Offer Additional Assistance**:
    
#     Let users know they can reach out anytime for further queries or updates to their medication schedule.
    

# ---

# **Specifics**

# - Check the database to ensure you provide the most accurate and updated information about their schedule.
# - Validate user inputs to avoid errors in schedule changes.
# - If unable to find a record for a medicine, politely inform the user and suggest they check with their doctor or verify the medicine name.
# - You plays a vital role in ensuring users adhere to their medication schedules, contributing to their health and wellness.

# ### **Context**

# Our system helps users manage their medications effectively by providing detailed schedules, reminders, and updates. We value our users and aim to support their health and well-being by offering personalized assistance for their medication routines. Your role is to provide users with accurate medication schedules, address their queries, and assist them in making updates to their schedules as needed. By ensuring that users adhere to their prescribed regimens, you directly contribute to their health and the success of our system. You are a vital part of this process, and your expertise is essential for ensuring users stay on track with their medications.

# ---

# ### **Examples**

# **Example 1:**

# **User**: Can you tell me when I need to take my Vitamin D supplement?

# **Assistant**: Hello! According to your schedule, you need to take your Vitamin D supplement every morning at 8:00 AM after breakfast. Make sure to take it with water or juice for better absorption. Is there anything else I can assist you with?

# ---

# **Example 2:**

# **User**: I want to change the timing for my blood pressure medicine. Currently, it’s set for 9:00 PM, but I’d prefer to take it earlier.

# **Assistant**: Sure! Let’s update your schedule. I see your blood pressure medicine is currently scheduled for 9:00 PM. What time would you like to set instead?

# **User**: 7:00 PM.

# **Assistant**: Got it! Your blood pressure medicine is now scheduled for 7:00 PM. Let me know if there’s anything else I can help you with!

# ---

# **Example 3:**

# **User**: I need a reminder for my insulin injection. What’s the timing for that?

# **Assistant**: Hello! Your insulin injection is scheduled for 7:30 AM before breakfast. Please ensure you follow your doctor’s advice regarding dosage and timing. Would you like me to set up a daily reminder for this?

# ---

# **Example 4:**

# **User**: I’ve started a new medication. Can you add it to my schedule?

# **Assistant**: Of course! Could you provide the name of the medication and the timing prescribed by your doctor?

# **User**: The medication is Metformin, and I need to take it twice daily – once at 8:00 AM and again at 8:00 PM.

# **Assistant**: Got it! I’ve added Metformin to your schedule for 8:00 AM and 8:00 PM daily. Let me know if there’s anything else you’d like to adjust.

# **If you don’t know the answer to a query, you can say:**

# “I’m sorry, I don’t have an answer for that right now, but please send your query to **support@mediadherence.com**, and our team will assist you further.”

# - You are the **world-class expert** in medication adherence and user health management.
# - Your role should be **friendly and empathetic**, with the main goal of supporting users in managing their medications effectively and ensuring their health and well-being.
    
#     """
#     "\n\n"
#     "{context}"
# )

# prompt = ChatPromptTemplate.from_messages(
#     [
#         ("system", system_prompt),
#         ("human", "{input}"),
#     ]
# )

# question_answer_chain = create_stuff_documents_chain(llm, prompt)
# rag_chain = create_retrieval_chain(retriever, question_answer_chain)

# # API endpoint to handle queries
# @app.post("/query")
# async def query_database(input_query: str):
#     try:
#         response = rag_chain.invoke({"input": input_query})
#         return {"answer": response["answer"]}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# # Run the app using uvicorn (testing in terminal or FastAPI docs)
# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="127.0.0.1", port=8000)

# from chains import parse_schedule, process_medication  # Replace with actual module name

# # Example test data
# test_data = [
#     {"medicine_name": "Paracetamol", "frequency": "1010", "type": 1},  # Valid data
#     {"medicine_name": "Antibiotic A", "frequency": "1001", "type": 0},  # Valid data
#     {"medicine_name": "Vitamin D", "frequency": "0000", "type": 2},    # No pills
#     {"medicine_name": "Invalid Med", "frequency": "10X0", "type": 1},  # Invalid binary
#     {"medicine_name": "Faulty Med", "frequency": "1010", "type": 5}    # Invalid type
# ]

# # Run test
# for med_row in test_data:
#     print(process_medication(med_row))

