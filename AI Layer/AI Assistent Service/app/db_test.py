import mysql.connector
from .config import DATABASE_CONFIG
from typing import List, Dict
from .utils import find_best_medicine_match
from datetime import datetime, time

FUZZY_MATCH_THRESHOLD = 0.6
SUGGESTION_THRESHOLD = 0.3


def get_period_range(period: str):
    if period == "morning_time":
        return time(5, 0, 0), time(12, 0, 0)
    if period == "afternoon_time":
        return time(12, 0, 0), time(17, 0, 0)
    if period == "evening_time":
        return time(17, 0, 0), time(21, 0, 0)
    if period == "night_time":
        return time(21, 0, 0), time(23, 59, 59)
    raise ValueError("Invalid period")


def fetch_user_medications(user_id: int) -> List[Dict]:
    """Fetch all active medicine courses for a user."""
    conn = mysql.connector.connect(**DATABASE_CONFIG)
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT mc.medicine_course_id, mc.medicine_name
        FROM MedicineCourses mc
        JOIN Courses c ON mc.course_id = c.course_id
        WHERE c.user_id = %s
    """, (user_id,))
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return data


def update_medicine_schedule(
    user_id: int,
    medicine_name: str,
    action: str,
    period: str,
    timing: str
) -> bool:

    conn = None
    cursor = None

    try:
        # 1️⃣ Fetch meds
        all_medications = fetch_user_medications(user_id)

        best_match, ratio = find_best_medicine_match(
            medicine_name, all_medications
        )

        if ratio < FUZZY_MATCH_THRESHOLD:
            raise ValueError("Medicine not found")

        medicine_course_id = best_match["medicine_course_id"]

        if action.lower() != "update":
            raise ValueError("Unsupported action")

        # 2️⃣ Parse new time
        new_time_obj = datetime.strptime(timing, "%H:%M:%S").time()

        conn = mysql.connector.connect(**DATABASE_CONFIG)
        cursor = conn.cursor()

        # -----------------------
        # A️⃣ Update template time
        # -----------------------
        template_query = f"""
            UPDATE MedicationTimes
            SET {period} = %s
            WHERE user_id = %s
        """
        cursor.execute(template_query, (timing, user_id))

        # -----------------------
        # B️⃣ Update future intakes
        # -----------------------
        start_t, end_t = get_period_range(period)

        intake_query = """
            UPDATE MedicineIntakes
            SET scheduled_at =
                TIMESTAMP(DATE(scheduled_at), %s)
            WHERE medicine_course_id = %s
              AND TIME(scheduled_at) BETWEEN %s AND %s
              AND scheduled_at >= NOW()
        """

        cursor.execute(
            intake_query,
            (
                new_time_obj,
                medicine_course_id,
                start_t,
                end_t
            )
        )

        conn.commit()
        return True

    except Exception as e:
        print(f"[ERROR] update_medicine_schedule: {e}")
        return False

    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


def fetch_upcoming_intakes(user_id: int, days: int = 7) -> List[Dict]:
    """Fetch upcoming medicine intakes for the next N days."""
    conn = mysql.connector.connect(**DATABASE_CONFIG)
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT mi.intake_id, mi.medicine_course_id, mi.scheduled_at,
               mc.medicine_name
        FROM MedicineIntakes mi
        JOIN MedicineCourses mc ON mi.medicine_course_id = mc.medicine_course_id
        JOIN Courses c ON mc.course_id = c.course_id
        WHERE c.user_id = %s
          AND mi.scheduled_at >= NOW()
          AND mi.scheduled_at <= DATE_ADD(NOW(), INTERVAL %s DAY)
        ORDER BY mi.scheduled_at
    """, (user_id, days))
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return data


def fetch_summary_view(user_id: int) -> List[Dict]:
    """Fetch user medicine schedule summary view."""
    conn = mysql.connector.connect(**DATABASE_CONFIG)
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT * FROM user_medicine_schedule
        WHERE user_id = %s
    """, (user_id,))
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return data


def fetch_medication_times(user_id: int) -> Dict:
    """Fetch configured slot times for the user from MedicationTimes."""
    conn = mysql.connector.connect(**DATABASE_CONFIG)
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT morning_time, afternoon_time, evening_time, night_time
        FROM MedicationTimes
        WHERE user_id = %s
        LIMIT 1
    """, (user_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return row or {}