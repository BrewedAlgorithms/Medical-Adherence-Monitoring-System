const connection = require('../db.js');

const deleteAllCourses = (req, res) => {
  connection.query('DELETE FROM Courses', (err, result) => {
    if (err) {
      console.error('Error deleting courses:', err);
      return res.status(500).json({ error: err.message });
    }
    const deletedCount = result.affectedRows;
    console.log(`[DEV] Deleted ${deletedCount} course(s) and cascade-deleted related records`);
    res.json({
      message: 'All courses deleted',
      courses_deleted: deletedCount
    });
  });
};

module.exports = { deleteAllCourses };
