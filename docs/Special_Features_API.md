API Documentation for Special Features
This service provides complex, aggregated data for special application features like the user dashboard.

1. Get Dashboard Data
Retrieves all the necessary data to populate the user's main dashboard, including a 7-day adherence matrix, the schedule for a specific day, and the quote of the day.

Endpoint: /dashboard

Method: GET

Description: Fetches and aggregates user-specific data for the dashboard. It calculates a 7-day medication adherence percentage and provides a detailed list of medication intakes for the requested date.

Authentication: Requires a valid authToken.

Request Parameters:

Query Parameter (Optional): You can specify a date to view a past schedule. If omitted, it defaults to the current day.

?date=YYYY-MM-DD (e.g., ?date=2025-08-30)

Request Body: The code shows this endpoint expects a user_id in the request body.



{
  "user_id": 1
}
Success Response (200 OK):



{
  "adherence": {
    "adherenceMatrix": {
      "day1": 100,
      "day2": 75,
      "day3": 100,
      "day4": 50,
      "day5": 100,
      "day6": 100,
      "day7": 0
    },
    "detailedMatrix": {
      "day1": { "date": "2025-08-24", "total": 4, "taken": 4, "percentage": 100 },
      "day2": { "date": "2025-08-25", "total": 4, "taken": 3, "percentage": 75 },
      "day3": { "date": "2025-08-26", "total": 4, "taken": 4, "percentage": 100 },
      "day4": { "date": "2025-08-27", "total": 4, "taken": 2, "percentage": 50 },
      "day5": { "date": "2025-08-28", "total": 4, "taken": 4, "percentage": 100 },
      "day6": { "date": "2025-08-29", "total": 4, "taken": 4, "percentage": 100 },
      "day7": { "date": "2025-08-30", "total": 4, "taken": 0, "percentage": 0 }
    }
  },
  "todaySchedule": {
    "date": "2025-08-30",
    "total_intakes": 4,
    "taken_intakes": 0,
    "missed_intakes": 1,
    "upcoming_intakes": 3,
    "schedule": [
      {
        "intake_id": 101,
        "medicine_name": "Aspirin",
        "scheduled_at": "2025-08-30T08:00:00.000Z",
        "taken_at": null,
        "status": "Missed",
        "timing": "Before meal",
        "medtype": "Pill",
        "pillcount": 1
      }
    ]
  },
  "quoteOfTheDay": "Health is a state of complete harmony of the body, mind, and spirit."
}
Error Responses:

400 Bad Request: If the user_id is not provided in the request body.



{
  "message": "User ID is required"
}
500 Internal Server Error: If there is an error fetching data from the database.



{
  "message": "Error fetching dashboard data"
}