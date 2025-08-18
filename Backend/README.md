# Medical Adherence Monitoring System - Backend

## 📋 Overview

This directory contains the backend implementation for the Medical Adherence Monitoring System, built with Node.js, Express, and MySQL.

## 🗂️ Database Documentation

### 📚 Complete Database Documentation

We have created comprehensive database documentation to help with development, maintenance, and team collaboration:

1. **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)** - Complete schema documentation with all tables, relationships, and usage examples
2. **[ER_DIAGRAM.md](./ER_DIAGRAM.md)** - Visual Entity-Relationship diagram showing table relationships
3. **[database_optimization.sql](./database_optimization.sql)** - Performance optimization scripts and maintenance procedures
4. **[DATABASE_DOCUMENTATION_SUMMARY.md](./DATABASE_DOCUMENTATION_SUMMARY.md)** - Overview and quick reference guide

### 🎯 Quick Start for Database

1. **New to the project?** Start with [DATABASE_DOCUMENTATION_SUMMARY.md](./DATABASE_DOCUMENTATION_SUMMARY.md)
2. **Need table details?** Check [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
3. **Want to visualize relationships?** See [ER_DIAGRAM.md](./ER_DIAGRAM.md)
4. **Need performance optimization?** Use [database_optimization.sql](./database_optimization.sql)

## 🏗️ Project Structure

```
Backend/
├── controllers/          # Route controllers
├── cronJobs/            # Scheduled tasks
├── middlewares/         # Express middlewares
├── routes/              # API route definitions
├── main.sql             # Database schema
├── server.js            # Main server file
├── db.js                # Database connection
├── socket.js            # WebSocket configuration
├── twilio.js            # SMS integration
└── package.json         # Dependencies
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up database:**
   ```bash
   mysql -u your_username -p < main.sql
   ```

3. **Configure environment variables:**
   Create a `.env` file with:
   ```env
   DB_HOST=localhost
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_NAME=HealthMobi
   PORT=3000
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

## 📊 Database Schema

The system uses a MySQL database with 10 core tables:

- **Users** - User management (patients & doctors)
- **AuthTokens** - Session management
- **Courses** - Treatment course management
- **MedicineCourses** - Medicine definitions
- **MedicineIntakes** - Adherence tracking
- **MediQuotes** - Motivational content
- **QuoteOfTheDay** - Daily quote management
- **PrescriptionImages** - Image storage
- **PrescriptionVoiceNotes** - Voice note storage
- **UserNotes** - Personal user notes

For detailed schema information, see [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md).

## 🔧 API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/verify-otp` - OTP verification

### User Management
- `GET /user/profile` - Get user profile
- `PUT /user/profile` - Update user profile
- `GET /user/notes` - Get user notes

### Course Management
- `POST /courses` - Create new course
- `GET /courses` - Get user courses
- `PUT /courses/:id` - Update course
- `DELETE /courses/:id` - Delete course

### Medicine Management
- `POST /medicines` - Add medicine to course
- `GET /medicines` - Get medicines for course
- `PUT /medicines/:id` - Update medicine
- `DELETE /medicines/:id` - Remove medicine

### Adherence Tracking
- `POST /intakes` - Mark medicine as taken
- `GET /intakes` - Get intake history
- `GET /intakes/stats` - Get adherence statistics

## 🛠️ Development

### Database Operations

When working with the database:

1. **Always use parameterized queries** to prevent SQL injection
2. **Use transactions** for operations that modify multiple tables
3. **Implement proper error handling** for database operations
4. **Monitor query performance** using the provided optimization scripts

### Common Database Queries

```javascript
// Get patient's active courses
const query = `
  SELECT c.*, u.name as patient_name, d.name as doctor_name
  FROM Courses c
  JOIN Users u ON c.user_id = u.user_id
  JOIN Users d ON c.doctor_id = d.user_id
  WHERE c.status = 'Ongoing' AND c.user_id = ?
`;

// Get today's medicine schedule
const scheduleQuery = `
  SELECT mi.*, mc.medicine_name, mc.frequency
  FROM MedicineIntakes mi
  JOIN MedicineCourses mc ON mi.medicine_course_id = mc.medicine_course_id
  WHERE DATE(mi.scheduled_at) = CURDATE() AND mc.status = 'Ongoing'
`;
```

For more query examples, see [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md).

## 📈 Performance Optimization

### Database Indexes

The system includes optimized indexes for common query patterns:

- User lookup by phone number
- Course filtering by status
- Medicine intake scheduling
- Adherence tracking queries

To apply optimizations, run:
```bash
mysql -u your_username -p HealthMobi < database_optimization.sql
```

### Monitoring

Use the provided monitoring queries in [database_optimization.sql](./database_optimization.sql) to:

- Track table sizes and growth
- Monitor index usage
- Identify slow queries
- Check data integrity

## 🔒 Security

### Database Security

1. **Use environment variables** for database credentials
2. **Implement proper input validation** on all endpoints
3. **Use parameterized queries** to prevent SQL injection
4. **Regular security audits** of database access

### Authentication

- JWT-based authentication
- OTP verification for sensitive operations
- Session management with automatic cleanup

## 📝 Maintenance

### Daily Tasks
- Monitor system statistics
- Check for orphaned records
- Review slow queries

### Weekly Tasks
- Analyze table statistics
- Review adherence reports
- Clean up old auth tokens

### Monthly Tasks
- Optimize tables
- Archive completed courses
- Review and update indexes

For detailed maintenance procedures, see [database_optimization.sql](./database_optimization.sql).

## 🤝 Contributing

When contributing to the backend:

1. **Follow the existing code style**
2. **Add proper error handling** for database operations
3. **Use transactions** for multi-table operations
4. **Update documentation** when schema changes
5. **Test thoroughly** before submitting changes

## 📞 Support

For database-related questions:

1. **Check the documentation** in the files listed above
2. **Review the schema** in [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
3. **Use the ER diagram** in [ER_DIAGRAM.md](./ER_DIAGRAM.md)
4. **Run optimization scripts** from [database_optimization.sql](./database_optimization.sql)

## 📚 Additional Resources

- [MySQL Documentation](https://dev.mysql.com/doc/)
- [Node.js MySQL2](https://github.com/sidorares/node-mysql2)
- [Express.js](https://expressjs.com/)
- [JWT Authentication](https://jwt.io/)

---

**Note:** This backend is part of the Medical Adherence Monitoring System. For complete system documentation, see the main project README.
