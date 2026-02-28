# from langchain.schema import Document

# def preprocess_data(data):
#     documents = [
#         Document(
#             page_content=(
#                 f"Medicine Name: {row.get('medicine_name', 'Unknown')}, "
#                 f"Status: {row.get('status', 'Unknown')}, "
#                 f"Start Date: {row.get('start_date', 'Unknown')}, "
#                 f"End Date: {row.get('end_date', 'Unknown')}, "
#                 f"Frequency: {row.get('frequency', 'Unknown')}, "
#                 f"Type: {row.get('medtype', 'Unknown')}"
#             ),
#             metadata={"medicine_course_id": row.get("medicine_course_id")},
#         )
#         for row in data
#     ]
#     print(f"Processed documents: {documents}")  # Debug statement
#     return documents

from langchain.schema import Document
from typing import List
from datetime import datetime, timedelta, date


def parse_schedule(binary_code: str, timing_type: int, time_values: dict) -> str:
    """Convert binary schedule code, timing type, and times to human-readable format."""
    times_of_day = ["morning", "afternoon", "evening", "night"]
    timing_descriptions = ["before meals", "after meals", "anytime"]

    pills = [int(digit) for digit in binary_code]  # Convert binary to list of integers
    timing_type = int(timing_type)
    meal_timing = timing_descriptions[timing_type]

    response = []
    for i, count in enumerate(pills):
        if count > 0:  # Only include times specified in the frequency
            time_label = times_of_day[i]
            if time_label in time_values:  # Ensure the time is provided
                time_str = time_values[time_label].strftime("%I:%M %p")
                response.append(
                    f"{count} pill{'s' if count > 1 else ''} in the {time_label} {meal_timing} at {time_str}"
                )
    
    return "Take " + " and ".join(response) if response else "No scheduled medications"


def preprocess_user_data(data: List[dict], user_id: int) -> List[Document]:
    """Convert DB rows to documents with natural language descriptions."""
    print(f"preprocess_user_data called with user_id={user_id}")
    documents = []

    for row in data:
        print(f"Processing row: {row}")

        # Extract medication times as a dictionary
        time_values = {}
        for time_label, time_key in [
            ("morning", "morning_time"),
            ("afternoon", "afternoon_time"),
            ("evening", "evening_time"),
            ("night", "night_time")
        ]:
            time_value = row.get(time_key)
            if isinstance(time_value, timedelta):
                time_values[time_label] = datetime.min + time_value  # Convert timedelta to datetime

        try:
            # Parse the schedule into a human-readable format
            schedule = parse_schedule(
                binary_code=row.get('frequency', '0000'),  # Default to '0000' if missing
                timing_type=row.get('medtype', 2),  # Default to 'anytime' if missing
                time_values=time_values  # Pass time values for precise schedule
            )
            print(f"Parsed schedule: {schedule}")
        except ValueError:
            schedule = "No scheduled times available"
            print("Failed to parse schedule, defaulting to: No scheduled times available")

        # Parse start date
        start_date = ""
        if row.get('start_date'):
            start_date_value = row['start_date']
            print(f"start_date raw value: {start_date_value}")
            if isinstance(start_date_value, date):  # Date object
                start_date = start_date_value.strftime("starting from %B %d, %Y")
            else:
                start_date = "with an invalid start date"
                print(f"Invalid start_date format: {start_date_value}")

        # Parse end date
        end_date = ""
        if row.get('end_date'):
            end_date_value = row['end_date']
            print(f"end_date raw value: {end_date_value}")
            if isinstance(end_date_value, date):  # Date object
                end_date = end_date_value.strftime("until %B %d, %Y")
            else:
                end_date = "with an invalid end date"
                print(f"Invalid end_date format: {end_date_value}")

        # Determine medication status
        status = "Currently taking" if row.get('status') == 'Ongoing' else "Previously took"
        print(f"Medication status: {status}")

        # Build the document content
        doc_content = (
            f"{row.get('medicine_name', 'Unknown medication')}: "
            f"{schedule.lower()}. "
            f"{status} {start_date} {end_date}."
        ).strip()
        print(f"Document content: {doc_content}")

        # Append the document with metadata
        documents.append(Document(
            page_content=doc_content,
            metadata={
                "user_id": user_id,
                "medicine_id": row.get("medicine_course_id"),
            }
        ))

    print(f"Generated {len(documents)} documents.")
    return documents



# [
#     Document(
#         page_content="Paracetamol: take 1 pill in the morning before meals and 1 pill in the evening before meals. Currently taking starting from January 2025 until March 2025",
#         metadata={
#             "user_id": 123,
#             "medicine_id": 1,
#             "status": "Ongoing"
#         }
#     )
# ]
