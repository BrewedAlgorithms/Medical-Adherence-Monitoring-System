import mysql.connector
from config import DATABASE_CONFIG
from typing import List, Dict

def derive_periods(frequency: str) -> List[str]:
    """Derive periods based on the frequency string."""
    period_mapping = ["morning_time", "afternoon_time", "evening_time", "night_time"]
    periods = [period_mapping[i] for i, digit in enumerate(frequency) if digit == "1"]
    return periods

def fetch_user_medications(user_id: int) -> List[Dict]:
    """Get medications for a specific user and determine periods based on frequency."""
    try:
        print("[DEBUG] Connecting to the database...")
        conn = mysql.connector.connect(**DATABASE_CONFIG)
        cursor = conn.cursor(dictionary=True)
        print("[DEBUG] Connection successful.")

        query = """
            SELECT medicine_name, frequency, medtype, morning_time, afternoon_time, evening_time, night_time
            FROM user_medicine_schedule WHERE user_id = %s
        """
        print(f"[DEBUG] Executing query: {query} with user_id={user_id}")
        cursor.execute(query, (user_id,))

        medications = cursor.fetchall()
        print(f"[DEBUG] Fetched {len(medications)} records from the database.")

        # Add periods based on frequency
        for med in medications:
            med["assigned_periods"] = derive_periods(med["frequency"])
        
        print(f"[DEBUG] Fetched {len(medications)} records from the database.")
        return medications
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return []
    
    finally:
        if conn.is_connected():
            print("[DEBUG] Closing the database connection.")
            conn.close()

def update_medicine_schedule(user_id: int, medicine_name: str, action: str, period: str, timing: str) -> bool:
    """
    Update the medicine schedule in the MySQL database based on the period.
    """
    try:
        conn = mysql.connector.connect(**DATABASE_CONFIG)
        cursor = conn.cursor()

        # Map period to the correct column
        period_column_map = {
            "morning_time": "morning_time",
            "afternoon_time": "afternoon_time",
            "evening_time": "evening_time",
            "night_time": "night_time"
        }

        if period not in period_column_map:
            raise ValueError("Invalid period specified")

        # Validate action and update accordingly
        if action.lower() == "update":
            # Check if the medicine exists for the user
            check_query = """
                SELECT mc.medicine_course_id
                FROM medicinecourses mc
                JOIN courses c ON mc.course_id = c.course_id
                WHERE c.user_id = %s AND mc.medicine_name = %s
            """
            cursor.execute(check_query, (user_id, medicine_name))
            medicine = cursor.fetchone()

            if not medicine:
                raise ValueError("Medicine not found for the user")

            # Update the timing in the medicationtimes table
            update_query = f"""
                UPDATE medicationtimes
                SET {period_column_map[period]} = %s
                WHERE user_id = %s
            """
            cursor.execute(update_query, (timing, user_id))
            
            print(f"query is ={update_query}")
        else:
            raise ValueError("Unsupported action specified")

        conn.commit()
        return True
    except mysql.connector.Error as err:
        print(f"MySQL error: {err}")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()


# medications = fetch_user_medications(2)
# for idx, medication in enumerate(medications):
#     print(f"[DEBUG] Medication {idx + 1}: {medication}")

# [DEBUG] Medication 1: {'medicine_course_id': 1, 'medicine_name': 'Paracetemol', 'course_id': 1, 'status': 'Ongoing', 'start_date': datetime.date(2025, 2, 10), 'end_date': datetime.date(2025, 4, 15), 'frequency': '1000', 'medtype': '0', 'morning_time': datetime.timedelta(seconds=28800), 'afternoon_time': datetime.timedelta(seconds=46800), 'evening_time': datetime.timedelta(seconds=64800), 'night_time': datetime.timedelta(seconds=75600)}
# [DEBUG] Medication 2: {'medicine_course_id': 2, 'medicine_name': 'Antibiotic A', 'course_id': 1, 'status': 'Ongoing', 'start_date': datetime.date(2025, 2, 10), 'end_date': datetime.date(2025, 4, 15), 'frequency': '1000', 'medtype': '1', 'morning_time': datetime.timedelta(seconds=28800), 'afternoon_time': datetime.timedelta(seconds=46800), 'evening_time': datetime.timedelta(seconds=64800), 'night_time': datetime.timedelta(seconds=75600)}
# [
#     {
#         "medicine_course_id": 1,
#         "medicine_name": "Paracetamol",
#         "course_id": 1,
#         "status": "Ongoing",
#         "start_date": datetime.date(2025, 2, 10),
#         "end_date": datetime.date(2025, 4, 15),
#         "frequency": "1000",
#         "medtype": "0",
#         "morning_time": timedelta(hours=8),
#         "afternoon_time": timedelta(hours=13),
#         "evening_time": timedelta(hours=18),
#         "night_time": timedelta(hours=21),
#     },
#     {
#         "medicine_course_id": 2,
#         "medicine_name": "Antibiotic A",
#         "course_id": 1,
#         "status": "Ongoing",
#         "start_date": datetime.date(2025, 2, 10),
#         "end_date": datetime.date(2025, 4, 15),
#         "frequency": "1000",
#         "medtype": "1",
#         "morning_time": timedelta(hours=8),
#         "afternoon_time": timedelta(hours=13),
#         "evening_time": timedelta(hours=18),
#         "night_time": timedelta(hours=21),
#     },
# ]