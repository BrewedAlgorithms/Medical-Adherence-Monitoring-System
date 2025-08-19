# Entity-Relationship Diagram - HealthMobi Database

## 📊 Visual Database Schema

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    HEALTHMOBI DATABASE SCHEMA                                    │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│     USERS       │         │   AUTHTOKENS    │         │   USERNOTES     │
├─────────────────┤         ├─────────────────┤         ├─────────────────┤
│ PK user_id (INT)│◄────────┤ PK token_id     │         │ PK note_id      │
│ name (VARCHAR)  │         │ FK user_id      │         │ FK user_id (UQ) │
│ phone (BIGINT)  │         │ auth_token      │         │ note (VARCHAR)  │
│ email (VARCHAR) │         └─────────────────┘         │ created_at      │
│ address (VARCHAR)│                                   │ updated_at      │
│ otp (VARCHAR)   │                                   └─────────────────┘
│ language (ENUM) │
│ role (ENUM)     │
│ isprofilecomplete│
└─────────────────┘
         │
         │ 1:N (as patient)
         ▼
┌─────────────────┐
│     COURSES     │
├─────────────────┤
│ PK course_id    │
│ FK user_id      │◄────────┐
│ FK doctor_id    │◄────────┤
│ status (ENUM)   │         │
│ start_date      │         │
│ end_date        │         │
│ created_at      │         │
│ updated_at      │         │
└─────────────────┘         │
         │                  │
         │ 1:N              │ 1:N (as doctor)
         ▼                  │
┌─────────────────┐         │
│ MEDICINECOURSES │         │
├─────────────────┤         │
│ PK medicine_    │         │
│   course_id     │         │
│ FK course_id    │         │
│ medicine_name   │         │
│ status (ENUM)   │         │
│ start_date      │         │
│ end_date        │         │
│ frequency (CHAR)│         │
│ medtype (CHAR)  │         │
│ created_at      │         │
│ updated_at      │         │
└─────────────────┘         │
         │                  │
         │ 1:N              │
         ▼                  │
┌─────────────────┐         │
│ MEDICINEINTAKES │         │
├─────────────────┤         │
│ PK intake_id    │         │
│ FK medicine_    │         │
│   course_id     │         │
│ scheduled_at    │         │
│ beforeafter     │         │
│ taken_at        │         │
│ created_at      │         │
│ updated_at      │         │
└─────────────────┘         │
                            │
                            │ 1:N
                            ▼
┌─────────────────┐    ┌─────────────────┐
│PRESCRIPTIONIMAGES│    │PRESCRIPTIONVOICE│
├─────────────────┤    │     NOTES       │
│ PK image_id     │    ├─────────────────┤
│ FK course_id    │    │ PK voice_id     │
│ image_url       │    │ FK course_id    │
│ created_at      │    │ voice_url       │
└─────────────────┘    │ created_at      │
                       └─────────────────┘

┌─────────────────┐         ┌─────────────────┐
│   MEDIQUOTES    │         │ QUOTEOFTHEDAY   │
├─────────────────┤         ├─────────────────┤
│ PK medi_quote_id│◄────────┤ PK qotd_id      │
│ quote (VARCHAR) │         │ FK medi_quote_id│
│ language (ENUM) │         │ language (ENUM) │
└─────────────────┘         │ last_updated    │
                            └─────────────────┘
```

## 🔗 Relationship Details

### Primary Relationships

1. **Users → AuthTokens** (1:N)
   - One user can have multiple authentication tokens
   - Foreign Key: `AuthTokens.user_id` → `Users.user_id`

2. **Users → UserNotes** (1:1)
   - Each user has exactly one note record
   - Foreign Key: `UserNotes.user_id` → `Users.user_id` (UNIQUE)

3. **Users → Courses** (1:N) [as Patient]
   - One patient can have multiple treatment courses
   - Foreign Key: `Courses.user_id` → `Users.user_id`

4. **Users → Courses** (1:N) [as Doctor]
   - One doctor can manage multiple treatment courses
   - Foreign Key: `Courses.doctor_id` → `Users.user_id`

5. **Courses → MedicineCourses** (1:N)
   - One course can contain multiple medicines
   - Foreign Key: `MedicineCourses.course_id` → `Courses.course_id`

6. **MedicineCourses → MedicineIntakes** (1:N)
   - One medicine course can have multiple scheduled intakes
   - Foreign Key: `MedicineIntakes.medicine_course_id` → `MedicineCourses.medicine_course_id`

7. **Courses → PrescriptionImages** (1:N)
   - One course can have multiple prescription images
   - Foreign Key: `PrescriptionImages.course_id` → `Courses.course_id`

8. **Courses → PrescriptionVoiceNotes** (1:N)
   - One course can have multiple voice notes
   - Foreign Key: `PrescriptionVoiceNotes.course_id` → `Courses.course_id`

9. **MediQuotes → QuoteOfTheDay** (1:N)
   - One quote can be used in multiple daily quote records
   - Foreign Key: `QuoteOfTheDay.medi_quote_id` → `MediQuotes.medi_quote_id`

## 📋 Key Constraints

### Foreign Key Constraints
- All foreign keys use `ON DELETE CASCADE` for referential integrity
- Ensures data consistency when parent records are deleted

### Unique Constraints
- `Users.phone` - Phone numbers must be unique
- `UserNotes.user_id` - Each user can have only one note record

### Enum Constraints
- `Users.role`: 'doctor', 'patient'
- `Users.language`: 'English', 'Hindi', 'Marathi'
- `Courses.status`: 'Ongoing', 'Completed', 'Terminated'
- `MedicineCourses.status`: 'Ongoing', 'Completed', 'Terminated'
- `MediQuotes.language`: 'English', 'Hindi', 'Marathi'
- `QuoteOfTheDay.language`: 'English', 'Hindi', 'Marathi'

## 🔄 Data Flow Visualization

```
User Registration
       │
       ▼
   ┌─────────┐
   │  USERS  │
   └─────────┘
       │
       ├─── Authentication ──► AUTHTOKENS
       │
       ├─── Profile Notes ───► USERNOTES
       │
       ▼
   ┌─────────┐
   │ COURSES │ ◄─── Doctor Assignment
   └─────────┘
       │
       ├─── Medicine Assignment ──► MEDICINECOURSES
       │                              │
       │                              ▼
       │                          MEDICINEINTAKES
       │
       ├─── Prescription Images ──► PRESCRIPTIONIMAGES
       │
       └─── Voice Notes ────────► PRESCRIPTIONVOICENOTES

   ┌─────────┐
   │MEDIQUOTES│ ──► QUOTEOFTHEDAY
   └─────────┘
```

## 📊 Cardinality Summary

| Table | Primary Key | Foreign Keys | Referenced By |
|-------|-------------|--------------|---------------|
| Users | user_id | - | AuthTokens, UserNotes, Courses (2x) |
| AuthTokens | token_id | user_id | - |
| UserNotes | note_id | user_id | - |
| Courses | course_id | user_id, doctor_id | MedicineCourses, PrescriptionImages, PrescriptionVoiceNotes |
| MedicineCourses | medicine_course_id | course_id | MedicineIntakes |
| MedicineIntakes | intake_id | medicine_course_id | - |
| MediQuotes | medi_quote_id | - | QuoteOfTheDay |
| QuoteOfTheDay | qotd_id | medi_quote_id | - |
| PrescriptionImages | image_id | course_id | - |
| PrescriptionVoiceNotes | voice_id | course_id | - |

## 🎯 Business Logic Flow

1. **User Management**
   - Users register with phone number
   - Authentication tokens manage sessions
   - Users can have personal notes

2. **Treatment Management**
   - Doctors create courses for patients
   - Courses contain multiple medicines
   - Each medicine has scheduled intakes

3. **Adherence Tracking**
   - System tracks scheduled vs actual intake times
   - Provides adherence statistics
   - Supports prescription media uploads

4. **Motivational Features**
   - Daily quotes in multiple languages
   - Quote rotation system

This ER diagram provides a clear visual representation of the database structure and relationships for the Medical Adherence Monitoring System.
