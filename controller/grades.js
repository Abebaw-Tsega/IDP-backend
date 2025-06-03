// controller/grades.js
const dbConnection = require('../config/db');

const submitGrade = async (req, res) => {
  try {
    const { enrollmentId, grade } = req.body;
    const instructorId = req.user.user_id;

    // Verify the enrollment exists and is for a course the instructor is assigned to
    const [enrollment] = await dbConnection.query(
      'SELECT e.enrollment_id, ca.instructor_id ' +
      'FROM Enrollments e ' +
      'JOIN CourseAssignments ca ON e.course_id = ca.course_id ' +
      'WHERE e.enrollment_id = ? AND ca.instructor_id = ?',
      [enrollmentId, instructorId]
    );

    if (enrollment.length === 0) {
      return res.status(403).json({ error: 'Unauthorized or enrollment not found' });
    }

    // Check if a grade already exists
    const [existingGrade] = await dbConnection.query(
      'SELECT grade_id FROM Grades WHERE enrollment_id = ?',
      [enrollmentId]
    );

    if (existingGrade.length > 0) {
      // Update existing grade
      await dbConnection.query(
        'UPDATE Grades SET grade = ?, updated_at = NOW() WHERE enrollment_id = ?',
        [grade, enrollmentId]
      );
    } else {
      // Insert new grade
      await dbConnection.query(
        'INSERT INTO Grades (enrollment_id, grade, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
        [enrollmentId, grade]
      );
    }

    res.status(200).json({ message: 'Grade submitted successfully' });
  } catch (error) {
    console.error('Error submitting grade:', error);
    res.status(500).json({ error: 'Failed to submit grade' });
  }
};

const getGradesByEnrollment = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const [grades] = await dbConnection.query(
      'SELECT grade FROM Grades WHERE enrollment_id = ?',
      [enrollmentId]
    );
    res.status(200).json(grades[0] || {});
  } catch (error) {
    console.error('Error fetching grade:', error);
    res.status(500).json({ error: 'Failed to fetch grade' });
  }
};

module.exports = { submitGrade, getGradesByEnrollment };