import mysql.connector
from .config import DATABASE_CONFIG
from typing import List, Dict, Tuple
from .utils import find_best_medicine_match
from datetime import datetime

FUZZY_MATCH_THRESHOLD = 0.6
SUGGESTION_THRESHOLD = 0.3

def derive_periods(frequency: str) -> List[str]:
    """Derive periods based on the frequency string. """
    period_mapping = ["morning_time", "afternoon_time", "evening_time", "night_time"]
    periods = [period_mapping[i] for i, digit in enumerate(frequency) if digit == "1"]
    return periods


def fetch_today_intakes(user_id: int) -> List[Dict]:
    """Fetch today's actual scheduled intakes from MedicineIntakes table."""
    conn = None
    try:
        conn = mysql.connector.connect(**DATABASE_CONFIG)
        cursor = conn.cursor(dictionary=True)
        
        today = datetime.now().strftime("%Y-%m-%d")
        
        query = """
            SELECT 
                mi.intake_id,
                mi.medicine_course_id,
                mc.medicine_name,
                mc.medtype,
                mi.scheduled_at,
                TIME(mi.scheduled_at) as scheduled_time,
                mi.taken_at
            FROM MedicineIntakes mi
            JOIN MedicineCourses mc ON mi.medicine_course_id = mc.medicine_course_id
            JOIN Courses c ON mc.course_id = c.course_id
            WHERE c.user_id = %s 
            AND DATE(mi.scheduled_at) = %s
            AND mc.status = 'Ongoing'
            ORDER BY mi.scheduled_at
        """
        
        cursor.execute(query, (user_id, today))
        intakes = cursor.fetchall()
        
        print(f"[DEBUG] Found {len(intakes)} intakes for user {user_id} on {today}")
        for intake in intakes:
            print(f"  - {intake['medicine_name']} at {intake['scheduled_time']}")
        
        return intakes
        
    except Exception as e:
        print(f"[ERROR] fetch_today_intakes: {e}")
        return []
    
    finally:
        if conn and conn.is_connected():
            conn.close()


def fetch_user_medications(user_id: int) -> List[Dict]:
    try:
        conn = mysql.connector.connect(**DATABASE_CONFIG)
        cursor = conn.cursor(dictionary=True)

        query = """
            SELECT
                mc.medicine_course_id,
                mc.medicine_name,
                mc.status,
                mc.start_date,
                mc.end_date,
                mc.frequency,
                mc.medtype,
                mt.morning_time,
                mt.afternoon_time,
                mt.evening_time,
                mt.night_time
            FROM medicinecourses mc
            LEFT JOIN courses c ON mc.course_id = c.course_id
            LEFT JOIN medicationtimes mt ON c.user_id = mt.user_id
            WHERE c.user_id = %s AND mc.status = 'Ongoing'
        """

        cursor.execute(query, (user_id,))
        medications = cursor.fetchall()

        for med in medications:
            med["assigned_periods"] = derive_periods(med["frequency"])

        return medications

    except Exception as e:
        print(f"[ERROR] fetch_user_medications: {e}")
        return []

    finally:
        if conn and conn.is_connected():
            conn.close()


def update_all_schedule(
    user_id: int,
    medicine_name: str,  # Can be None to update ALL medicines in this period
    period: str,
    timing: str
) -> bool:
    """
    UpdateAll: Update the default time slot in MedicationTimes table
    AND update all future MedicineIntakes.scheduled_at for this period.
    
    If medicine_name is None: updates slot for ALL medicines in that period.
    If medicine_name is provided: updates only that specific medicine's intakes.
    """
    conn = None
    cursor = None

    try:
        medicine_course_id = None
        
        # If a specific medicine is provided, do fuzzy matching
        if medicine_name:
            all_medications = fetch_user_medications(user_id)

            best_match, match_ratio = find_best_medicine_match(
                medicine_name,
                all_medications
            )

            if match_ratio < FUZZY_MATCH_THRESHOLD:
                similar_meds = [
                    med["medicine_name"]
                    for med in all_medications
                    if find_best_medicine_match(medicine_name, [med])[1] > SUGGESTION_THRESHOLD
                ]
                suggestion_text = (
                    f"Did you mean one of these: {', '.join(similar_meds)}"
                    if similar_meds else
                    "No similar medications found"
                )
                raise ValueError(f"Medicine not found. {suggestion_text}")

            medicine_course_id = best_match["medicine_course_id"]
            exact_medicine_name = best_match["medicine_name"]

            print(
                f"[DEBUG] Fuzzy matched '{medicine_name}' "
                f"to '{exact_medicine_name}' "
                f"(confidence={match_ratio})"
            )
        else:
            print(f"[DEBUG] Updating ALL medicines for period {period}")

        # Validate period
        period_column_map = {
            "morning_time": "morning_time",
            "afternoon_time": "afternoon_time",
            "evening_time": "evening_time",
            "night_time": "night_time"
        }

        if period not in period_column_map:
            raise ValueError("Invalid period specified")

        # Validate timing format (HH:MM:SS)
        if timing:
            try:
                datetime.strptime(timing, "%H:%M:%S")
            except ValueError:
                raise ValueError("Invalid timing format. Expected HH:MM:SS")

        # Get period time ranges for updating intakes
        period_ranges = {
            "morning_time": ("05:00:00", "11:59:59"),
            "afternoon_time": ("12:00:00", "16:59:59"),
            "evening_time": ("17:00:00", "20:59:59"),
            "night_time": ("21:00:00", "04:59:59")
        }

        conn = mysql.connector.connect(**DATABASE_CONFIG)
        cursor = conn.cursor()

        # Update MedicationTimes table (default slot time) - always do this
        update_times_query = f"""
            UPDATE MedicationTimes
            SET {period_column_map[period]} = %s
            WHERE user_id = %s
        """
        cursor.execute(update_times_query, (timing, user_id))
        print(f"[DEBUG] Updated MedicationTimes: {cursor.rowcount} rows")

        # Update future MedicineIntakes for this period
        start_time, end_time = period_ranges[period]
        
        # Handle night time spanning midnight
        if period == "night_time":
            update_intakes_query = """
                UPDATE MedicineIntakes mi
                JOIN MedicineCourses mc ON mi.medicine_course_id = mc.medicine_course_id
                JOIN Courses c ON mc.course_id = c.course_id
                SET mi.scheduled_at = CONCAT(DATE(mi.scheduled_at), ' ', %s)
                WHERE c.user_id = %s
                AND mi.scheduled_at >= NOW()
                AND (TIME(mi.scheduled_at) >= %s OR TIME(mi.scheduled_at) <= '04:59:59')
            """
            cursor.execute(update_intakes_query, (timing, user_id, start_time))
        else:
            update_intakes_query = """
                UPDATE MedicineIntakes mi
                JOIN MedicineCourses mc ON mi.medicine_course_id = mc.medicine_course_id
                JOIN Courses c ON mc.course_id = c.course_id
                SET mi.scheduled_at = CONCAT(DATE(mi.scheduled_at), ' ', %s)
                WHERE c.user_id = %s
                AND mi.scheduled_at >= NOW()
                AND TIME(mi.scheduled_at) BETWEEN %s AND %s
            """
            cursor.execute(update_intakes_query, (timing, user_id, start_time, end_time))
        
        print(f"[DEBUG] Updated MedicineIntakes: {cursor.rowcount} rows")

        conn.commit()
        return True

    except mysql.connector.Error as err:
        print(f"[ERROR] MySQL error: {err}")
        return False

    except Exception as e:
        print(f"[ERROR] {e}")
        return False

    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


def update_single_intake(
    user_id: int,
    medicine_name: str,
    period: str,
    timing: str
) -> bool:
    """
    UpdateOne: Update ONLY today's specific pill scheduled_at time
    in MedicineIntakes table. Does NOT change the default MedicationTimes.
    """
    conn = None
    cursor = None

    try:
        # 1. Fetch medications for fuzzy matching
        all_medications = fetch_user_medications(user_id)

        best_match, match_ratio = find_best_medicine_match(
            medicine_name,
            all_medications
        )

        if match_ratio < FUZZY_MATCH_THRESHOLD:
            similar_meds = [
                med["medicine_name"]
                for med in all_medications
                if find_best_medicine_match(medicine_name, [med])[1] > SUGGESTION_THRESHOLD
            ]
            suggestion_text = (
                f"Did you mean one of these: {', '.join(similar_meds)}"
                if similar_meds else
                "No similar medications found"
            )
            raise ValueError(f"Medicine not found. {suggestion_text}")

        medicine_course_id = best_match["medicine_course_id"]
        exact_medicine_name = best_match["medicine_name"]

        print(
            f"[DEBUG] Fuzzy matched '{medicine_name}' "
            f"to '{exact_medicine_name}' "
            f"(confidence={match_ratio})"
        )

        # 2. Validate period
        period_ranges = {
            "morning_time": ("05:00:00", "11:59:59"),
            "afternoon_time": ("12:00:00", "16:59:59"),
            "evening_time": ("17:00:00", "20:59:59"),
            "night_time": ("21:00:00", "04:59:59")
        }

        if period not in period_ranges:
            raise ValueError("Invalid period specified")

        # 3. Validate timing format (HH:MM:SS)
        if timing:
            try:
                datetime.strptime(timing, "%H:%M:%S")
            except ValueError:
                raise ValueError("Invalid timing format. Expected HH:MM:SS")

        conn = mysql.connector.connect(**DATABASE_CONFIG)
        cursor = conn.cursor()

        # 4. Update ONLY today's intake for this medicine and period
        start_time, end_time = period_ranges[period]
        today = datetime.now().strftime("%Y-%m-%d")

        # Debug: Check what records exist for today
        debug_query = """
            SELECT intake_id, scheduled_at, TIME(scheduled_at) as time_part, taken_at 
            FROM MedicineIntakes 
            WHERE medicine_course_id = %s 
            AND DATE(scheduled_at) = %s
        """
        cursor.execute(debug_query, (medicine_course_id, today))
        debug_rows = cursor.fetchall()
        print(f"[DEBUG] Found {len(debug_rows)} intake records for {exact_medicine_name} on {today}:")
        for row in debug_rows:
            print(f"  - intake_id={row[0]}, scheduled_at={row[1]}, time={row[2]}, taken_at={row[3]}")

        # First check if a matching record exists for this period
        if period == "night_time":
            check_query = """
                SELECT intake_id, TIME(scheduled_at) as sched_time
                FROM MedicineIntakes 
                WHERE medicine_course_id = %s
                AND DATE(scheduled_at) = %s
                AND (TIME(scheduled_at) >= %s OR TIME(scheduled_at) <= '04:59:59')
                AND taken_at IS NULL
                LIMIT 1
            """
            cursor.execute(check_query, (medicine_course_id, today, start_time))
        else:
            check_query = """
                SELECT intake_id, TIME(scheduled_at) as sched_time
                FROM MedicineIntakes 
                WHERE medicine_course_id = %s
                AND DATE(scheduled_at) = %s
                AND TIME(scheduled_at) BETWEEN %s AND %s
                AND taken_at IS NULL
                LIMIT 1
            """
            cursor.execute(check_query, (medicine_course_id, today, start_time, end_time))
        
        existing_record = cursor.fetchone()
        
        # If no dose found in target period, find the NEXT untaken dose for this medicine
        if not existing_record:
            print(f"[DEBUG] No untaken intake in {period}, looking for any untaken dose...")
            fallback_query = """
                SELECT intake_id, TIME(scheduled_at) as sched_time
                FROM MedicineIntakes 
                WHERE medicine_course_id = %s
                AND DATE(scheduled_at) = %s
                AND taken_at IS NULL
                ORDER BY scheduled_at ASC
                LIMIT 1
            """
            cursor.execute(fallback_query, (medicine_course_id, today))
            existing_record = cursor.fetchone()
            
            if existing_record:
                print(f"[DEBUG] Found next untaken dose: intake_id={existing_record[0]} at {existing_record[1]}")
        
        if not existing_record:
            print(f"[WARNING] No untaken intake found for {exact_medicine_name} today")
            return False
        
        intake_id = existing_record[0]
        sched_time = str(existing_record[1])
        
        # Check if already at target time
        if sched_time == timing:
            print(f"[DEBUG] Intake {intake_id} is already scheduled at {timing}")
            return True  # Already at the requested time - success!
        
        # Update to the new time
        update_query = """
            UPDATE MedicineIntakes
            SET scheduled_at = CONCAT(%s, ' ', %s)
            WHERE intake_id = %s
        """
        cursor.execute(update_query, (today, timing, intake_id))

        print(f"[DEBUG] Updated intake {intake_id} from {sched_time} to {timing}")
        conn.commit()
        return True

    except mysql.connector.Error as err:
        print(f"[ERROR] MySQL error: {err}")
        return False

    except Exception as e:
        print(f"[ERROR] {e}")
        return False

    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


# Legacy function for backward compatibility
def update_medicine_schedule(
    user_id: int,
    medicine_name: str,
    action: str,
    period: str,
    timing: str
) -> bool:
    """Legacy wrapper - defaults to UpdateAll behavior."""
    return update_all_schedule(user_id, medicine_name, period, timing)



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