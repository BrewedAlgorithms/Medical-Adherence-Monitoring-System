import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration details
# DATABASE_CONFIG = {
#     "host": "durgershsql.mysql.database.azure.com",  # Replace with your database host
#     "user": "durgesh",  # Replace with your database username
#     "password": "Abcd@123",  # Replace with your database password
#     "database": "HealthMobi",  # Replace with your database name
# }

DATABASE_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", 3306)),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", "rootpassword"),
    "database": os.getenv("DB_NAME", "HealthMobi")
}

# DATABASE_CONFIG = {
#     "host": "localhost",  # Replace with your database host
#     "user": "root",  # Replace with your database username
#     "password": "paras@123",  # Replace with your database password
#     "database": "HealthMobi",  # Replace with your database name
# }
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# # Print the configuration to the console
# print("Database Configuration:")
# print(f"Host: {DATABASE_CONFIG['host']}")
# print(f"User: {DATABASE_CONFIG['user']}")
# print(f"Password: {DATABASE_CONFIG['password']}")  # Be cautious with printing sensitive data!
# print(f"Database: {DATABASE_CONFIG['database']}")

# print("\nGemini API Key:")
# print(f"Key: {GEMINI_API_KEY}")
