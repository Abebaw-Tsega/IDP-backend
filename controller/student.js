// university/controller/student.js
const db = require('../config/db');
const jwt = require('jsonwebtoken');

const getStudentGrades = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Authentication token required' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'student') {
      return res.status(403).json({ error: 'Access restricted to students' });
    }

    // Fetch grades with course and semester details
    const [rows] = await db.query(
      `SELECT 
        s.semester_id,
        s.semester_name,
        c.course_code,
        c.course_name,
        c.credits,
        e.grade
      FROM Enrollments e
      JOIN Courses c ON e.course_id = c.course_id
      JOIN Semesters s ON c.semester_id = s.semester_id
      WHERE e.user_id = ? AND e.status = 'completed' AND e.grade IS NOT NULL
      ORDER BY s.semester_id, c.course_code`,
      [decoded.user_id]
    );

    // Grade points mapping
    const gradePoints = {
      'A': 4.0,
      'A-': 3.75,
      'B+': 3.5,
      'B': 3.0,
      'B-': 2.75,
      'C+': 2.5,
      'C': 2.0,
      'C-': 1.75,
      'D+': 1.5,
      'D': 1.0,
      'F': 0.0,
    };

    // Group by semester and calculate GPA
    const semesters = rows.reduce((acc, row) => {
      const semesterKey = `semester${row.semester_id}`;
      if (!acc[semesterKey]) {
        acc[semesterKey] = {
          name: row.semester_name,
          courses: [],
          creditsCompleted: 0,
          gradePointsTotal: 0,
          creditsTotal: 0,
        };
      }
      acc[semesterKey].courses.push({
        code: row.course_code,
        name: row.course_name,
        credits: row.credits,
        grade: row.grade,
      });
      acc[semesterKey].creditsCompleted += row.credits;
      const points = gradePoints[row.grade] || 0;
      acc[semesterKey].gradePointsTotal += points * row.credits;
      acc[semesterKey].creditsTotal += row.credits;
      return acc;
    }, {});

    // Calculate GPA
    Object.keys(semesters).forEach((key) => {
      const semester = semesters[key];
      semester.gpa =
        semester.creditsTotal > 0
          ? (semester.gradePointsTotal / semester.creditsTotal).toFixed(1)
          : 0;
      delete semester.gradePointsTotal;
      delete semester.creditsTotal;
    });

    res.status(200).json(semesters);
  } catch (error) {
    console.error('Error fetching student grades:', error);
    res.status(500).json({ error: 'Failed to retrieve grades' });
  }
};

module.exports = { getStudentGrades };