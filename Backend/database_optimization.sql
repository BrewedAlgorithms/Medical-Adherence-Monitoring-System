-- HealthMobi Database Optimization Script
-- This script contains recommended indexes, optimization queries, and maintenance procedures

USE HealthMobi;

-- ============================================================================
-- RECOMMENDED INDEXES FOR OPTIMAL PERFORMANCE
-- ============================================================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_phone ON Users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON Users(role);
CREATE INDEX IF NOT EXISTS idx_users_language ON Users(language);
CREATE INDEX IF NOT EXISTS idx_users_profile_complete ON Users(isprofilecomplete);

-- AuthTokens table indexes
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON AuthTokens(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_token ON AuthTokens(auth_token);

-- Courses table indexes
CREATE INDEX IF NOT EXISTS idx_courses_user_id ON Courses(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_doctor_id ON Courses(doctor_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON Courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_start_date ON Courses(start_date);
CREATE INDEX IF NOT EXISTS idx_courses_end_date ON Courses(end_date);
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON Courses(created_at);

-- MedicineCourses table indexes
CREATE INDEX IF NOT EXISTS idx_medicine_courses_course_id ON MedicineCourses(course_id);
CREATE INDEX IF NOT EXISTS idx_medicine_courses_status ON MedicineCourses(status);
CREATE INDEX IF NOT EXISTS idx_medicine_courses_start_date ON MedicineCourses(start_date);
CREATE INDEX IF NOT EXISTS idx_medicine_courses_end_date ON MedicineCourses(end_date);
CREATE INDEX IF NOT EXISTS idx_medicine_courses_frequency ON MedicineCourses(frequency);

-- MedicineIntakes table indexes
CREATE INDEX IF NOT EXISTS idx_medicine_intakes_medicine_course_id ON MedicineIntakes(medicine_course_id);
CREATE INDEX IF NOT EXISTS idx_medicine_intakes_scheduled_at ON MedicineIntakes(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_medicine_intakes_taken_at ON MedicineIntakes(taken_at);
CREATE INDEX IF NOT EXISTS idx_medicine_intakes_beforeafter ON MedicineIntakes(beforeafter);
CREATE INDEX IF NOT EXISTS idx_medicine_intakes_created_at ON MedicineIntakes(created_at);

-- MediQuotes table indexes
CREATE INDEX IF NOT EXISTS idx_medi_quotes_language ON MediQuotes(language);

-- QuoteOfTheDay table indexes
CREATE INDEX IF NOT EXISTS idx_quote_of_day_language ON QuoteOfTheDay(language);
CREATE INDEX IF NOT EXISTS idx_quote_of_day_last_updated ON QuoteOfTheDay(last_updated);

-- PrescriptionImages table indexes
CREATE INDEX IF NOT EXISTS idx_prescription_images_course_id ON PrescriptionImages(course_id);
CREATE INDEX IF NOT EXISTS idx_prescription_images_created_at ON PrescriptionImages(created_at);

-- PrescriptionVoiceNotes table indexes
CREATE INDEX IF NOT EXISTS idx_prescription_voice_course_id ON PrescriptionVoiceNotes(course_id);
CREATE INDEX IF NOT EXISTS idx_prescription_voice_created_at ON PrescriptionVoiceNotes(created_at);

-- UserNotes table indexes
CREATE INDEX IF NOT EXISTS idx_user_notes_user_id ON UserNotes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_updated_at ON UserNotes(updated_at);

-- ============================================================================
-- COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- ============================================================================

-- For course queries with status and date filters
CREATE INDEX IF NOT EXISTS idx_courses_status_date ON Courses(status, start_date, end_date);

-- For medicine intake queries with date ranges
CREATE INDEX IF NOT EXISTS idx_medicine_intakes_course_scheduled ON MedicineIntakes(medicine_course_id, scheduled_at);

-- For adherence tracking queries
CREATE INDEX IF NOT EXISTS idx_medicine_intakes_course_taken ON MedicineIntakes(medicine_course_id, taken_at);

-- ============================================================================
-- PERFORMANCE MONITORING QUERIES
-- ============================================================================

-- Check table sizes
SELECT 
    table_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)',
    table_rows
FROM information_schema.tables 
WHERE table_schema = 'HealthMobi'
ORDER BY (data_length + index_length) DESC;

-- Check index usage statistics
SELECT 
    table_name,
    index_name,
    cardinality,
    sub_part,
    packed,
    nullable,
    index_type
FROM information_schema.statistics 
WHERE table_schema = 'HealthMobi'
ORDER BY table_name, index_name;

-- Check slow queries (requires slow query log to be enabled)
-- SHOW VARIABLES LIKE 'slow_query_log%';
-- SHOW VARIABLES LIKE 'long_query_time';

-- ============================================================================
-- MAINTENANCE PROCEDURES
-- ============================================================================

-- Procedure to clean up old auth tokens (older than 30 days)
DELIMITER //
CREATE PROCEDURE CleanupOldAuthTokens()
BEGIN
    DELETE FROM AuthTokens 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
    
    SELECT ROW_COUNT() AS 'Deleted tokens';
END //
DELIMITER ;

-- Procedure to archive completed courses (older than 1 year)
DELIMITER //
CREATE PROCEDURE ArchiveCompletedCourses()
BEGIN
    -- Create archive table if it doesn't exist
    CREATE TABLE IF NOT EXISTS Courses_Archive LIKE Courses;
    
    -- Move completed courses older than 1 year to archive
    INSERT INTO Courses_Archive 
    SELECT * FROM Courses 
    WHERE status = 'Completed' 
    AND updated_at < DATE_SUB(NOW(), INTERVAL 1 YEAR);
    
    -- Delete from main table
    DELETE FROM Courses 
    WHERE status = 'Completed' 
    AND updated_at < DATE_SUB(NOW(), INTERVAL 1 YEAR);
    
    SELECT ROW_COUNT() AS 'Archived courses';
END //
DELIMITER ;

-- Procedure to update adherence statistics
DELIMITER //
CREATE PROCEDURE UpdateAdherenceStats(IN course_id_param INT)
BEGIN
    DECLARE total_scheduled INT;
    DECLARE total_taken INT;
    DECLARE adherence_percentage DECIMAL(5,2);
    
    -- Calculate adherence for the specified course
    SELECT 
        COUNT(*) as total_scheduled,
        COUNT(taken_at) as total_taken,
        ROUND((COUNT(taken_at) / COUNT(*)) * 100, 2) as adherence_percentage
    INTO total_scheduled, total_taken, adherence_percentage
    FROM MedicineIntakes mi
    JOIN MedicineCourses mc ON mi.medicine_course_id = mc.medicine_course_id
    WHERE mc.course_id = course_id_param;
    
    -- Return the statistics
    SELECT 
        course_id_param as course_id,
        total_scheduled,
        total_taken,
        adherence_percentage;
END //
DELIMITER ;

-- ============================================================================
-- DATA INTEGRITY CHECKS
-- ============================================================================

-- Check for orphaned records
SELECT 'Orphaned AuthTokens' as check_type, COUNT(*) as count
FROM AuthTokens a
LEFT JOIN Users u ON a.user_id = u.user_id
WHERE u.user_id IS NULL

UNION ALL

SELECT 'Orphaned MedicineCourses' as check_type, COUNT(*) as count
FROM MedicineCourses mc
LEFT JOIN Courses c ON mc.course_id = c.course_id
WHERE c.course_id IS NULL

UNION ALL

SELECT 'Orphaned MedicineIntakes' as check_type, COUNT(*) as count
FROM MedicineIntakes mi
LEFT JOIN MedicineCourses mc ON mi.medicine_course_id = mc.medicine_course_id
WHERE mc.medicine_course_id IS NULL

UNION ALL

SELECT 'Orphaned PrescriptionImages' as check_type, COUNT(*) as count
FROM PrescriptionImages pi
LEFT JOIN Courses c ON pi.course_id = c.course_id
WHERE c.course_id IS NULL

UNION ALL

SELECT 'Orphaned PrescriptionVoiceNotes' as check_type, COUNT(*) as count
FROM PrescriptionVoiceNotes pvn
LEFT JOIN Courses c ON pvn.course_id = c.course_id
WHERE c.course_id IS NULL;

-- Check for data consistency issues
SELECT 'Users without notes' as check_type, COUNT(*) as count
FROM Users u
LEFT JOIN UserNotes un ON u.user_id = un.user_id
WHERE un.user_id IS NULL

UNION ALL

SELECT 'Courses without medicines' as check_type, COUNT(*) as count
FROM Courses c
LEFT JOIN MedicineCourses mc ON c.course_id = mc.course_id
WHERE mc.course_id IS NULL;

-- ============================================================================
-- BACKUP AND RECOVERY PROCEDURES
-- ============================================================================

-- Create backup procedure (run this from command line with proper permissions)
-- mysqldump -u [username] -p HealthMobi > backup_$(date +%Y%m%d_%H%M%S).sql

-- Restore procedure (run this from command line)
-- mysql -u [username] -p HealthMobi < backup_file.sql

-- ============================================================================
-- USEFUL ADMINISTRATIVE QUERIES
-- ============================================================================

-- Get system statistics
SELECT 
    (SELECT COUNT(*) FROM Users WHERE role = 'patient') as total_patients,
    (SELECT COUNT(*) FROM Users WHERE role = 'doctor') as total_doctors,
    (SELECT COUNT(*) FROM Courses WHERE status = 'Ongoing') as active_courses,
    (SELECT COUNT(*) FROM MedicineIntakes WHERE taken_at IS NULL AND scheduled_at < NOW()) as missed_intakes,
    (SELECT COUNT(*) FROM MedicineIntakes WHERE taken_at IS NOT NULL) as completed_intakes;

-- Get user activity summary
SELECT 
    u.name,
    u.role,
    COUNT(DISTINCT c.course_id) as total_courses,
    COUNT(DISTINCT mc.medicine_course_id) as total_medicines,
    COUNT(mi.intake_id) as total_intakes,
    COUNT(mi.taken_at) as completed_intakes
FROM Users u
LEFT JOIN Courses c ON u.user_id = c.user_id OR u.user_id = c.doctor_id
LEFT JOIN MedicineCourses mc ON c.course_id = mc.course_id
LEFT JOIN MedicineIntakes mi ON mc.medicine_course_id = mi.medicine_course_id
GROUP BY u.user_id, u.name, u.role
ORDER BY total_courses DESC;

-- Get adherence statistics by course
SELECT 
    c.course_id,
    u.name as patient_name,
    d.name as doctor_name,
    COUNT(mi.intake_id) as total_scheduled,
    COUNT(mi.taken_at) as total_taken,
    ROUND((COUNT(mi.taken_at) / COUNT(mi.intake_id)) * 100, 2) as adherence_percentage
FROM Courses c
JOIN Users u ON c.user_id = u.user_id
JOIN Users d ON c.doctor_id = d.user_id
JOIN MedicineCourses mc ON c.course_id = mc.course_id
JOIN MedicineIntakes mi ON mc.medicine_course_id = mi.medicine_course_id
WHERE c.status = 'Ongoing'
GROUP BY c.course_id, u.name, d.name
ORDER BY adherence_percentage DESC;

-- ============================================================================
-- INDEX MAINTENANCE
-- ============================================================================

-- Analyze tables to update statistics
ANALYZE TABLE Users, AuthTokens, Courses, MedicineCourses, MedicineIntakes, 
             MediQuotes, QuoteOfTheDay, PrescriptionImages, PrescriptionVoiceNotes, UserNotes;

-- Optimize tables (run during low-traffic periods)
-- OPTIMIZE TABLE Users, AuthTokens, Courses, MedicineCourses, MedicineIntakes, 
--              MediQuotes, QuoteOfTheDay, PrescriptionImages, PrescriptionVoiceNotes, UserNotes;

-- ============================================================================
-- SECURITY CONSIDERATIONS
-- ============================================================================

-- Create read-only user for reporting
-- CREATE USER 'healthmobi_readonly'@'%' IDENTIFIED BY 'strong_password';
-- GRANT SELECT ON HealthMobi.* TO 'healthmobi_readonly'@'%';

-- Create application user with limited privileges
-- CREATE USER 'healthmobi_app'@'%' IDENTIFIED BY 'strong_password';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON HealthMobi.* TO 'healthmobi_app'@'%';

-- Revoke unnecessary privileges
-- REVOKE CREATE, DROP, ALTER, INDEX ON HealthMobi.* FROM 'healthmobi_app'@'%';

-- ============================================================================
-- MONITORING SETUP
-- ============================================================================

-- Enable slow query log (add to my.cnf or run as root)
-- SET GLOBAL slow_query_log = 'ON';
-- SET GLOBAL long_query_time = 2;
-- SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';

-- Enable general query log for debugging (use with caution in production)
-- SET GLOBAL general_log = 'ON';
-- SET GLOBAL general_log_file = '/var/log/mysql/general.log';

-- ============================================================================
-- NOTES FOR DEVELOPERS
-- ============================================================================

/*
IMPORTANT NOTES:

1. Always use parameterized queries to prevent SQL injection
2. Use transactions for operations that modify multiple tables
3. Implement proper error handling for database operations
4. Monitor query performance regularly
5. Keep database statistics updated
6. Implement connection pooling for better performance
7. Use appropriate data types and constraints
8. Regular backups are essential
9. Test all procedures in development before production
10. Monitor disk space and table growth

PERFORMANCE TIPS:

1. Use LIMIT clauses for large result sets
2. Avoid SELECT * - specify only needed columns
3. Use appropriate indexes for WHERE, ORDER BY, and JOIN clauses
4. Consider partitioning for large tables
5. Use EXPLAIN to analyze query performance
6. Monitor and optimize slow queries
7. Use appropriate storage engines (InnoDB for transactions)
8. Regular maintenance prevents performance degradation

SECURITY BEST PRACTICES:

1. Use least privilege principle for database users
2. Regularly update passwords and access controls
3. Encrypt sensitive data at rest and in transit
4. Implement proper input validation
5. Use prepared statements to prevent SQL injection
6. Regular security audits and monitoring
7. Keep database software updated
8. Implement proper backup encryption
*/
