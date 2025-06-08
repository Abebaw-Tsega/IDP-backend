// university/controller/enrollments.js
const { body, param, validationResult } = require('express-validator');
const dbConnection = require('../config/db');

// Validation middleware for creating enrollments
const validateEnrollment = [
  body('user_id').isInt().withMessage('Invalid user ID'),
  body('course_id').isInt().withMessage('Invalid course ID'),
  body('enrollment_date').isISO8601().withMessage('Enrollment date must be a valid date (YYYY-MM-DD)')
];

// Validation middleware for updating enrollments
const validateEnrollmentUpdate = [
  body('status').optional().isIn(['enrolled', 'completed', 'dropped']).withMessage('Invalid status'),
  body('grade').optional().isLength({ max: 2 }).withMessage('Grade must be 2 characters or less')
    .matches(/^[A-F][+]?$/).withMessage('Grade must be a letter A-F, optionally with a + (e.g., A, B+)')
];

// Create an enrollment (student or admin)
const createEnrollment = [
  ...validateEnrollment,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { user_id, course_id, enrollment_date } = req.body;
    const user = req.user; // From auth middleware

    // Students can only enroll themselves
    if (user.role === 'student' && user.user_id !== user_id) {
      return res.status(403).json({ error: 'Students can only enroll themselves' });
    }

    console.log('Creating enrollment:', { user_id, course_id, enrollment_date, user_role: user.role });

    try {
      // Validate student
      const [student] = await dbConnection.query('SELECT user_id, role FROM Users WHERE user_id = ? AND role = ?', [user_id, 'student']);
      if (student.length === 0) {
        return res.status(400).json({ error: 'Invalid student ID' });
      }

      // Validate course
      const [course] = await dbConnection.query('SELECT course_id FROM Courses WHERE course_id = ?', [course_id]);
      if (course.length === 0) {
        return res.status(400).json({ error: 'Invalid course ID' });
      }

      // Check for duplicate enrollment
      const [existing] = await dbConnection.query(
        'SELECT enrollment_id FROM Enrollments WHERE user_id = ? AND course_id = ?',
        [user_id, course_id]
      );
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Student already enrolled in this course' });
      }

      const [result] = await dbConnection.query(
        'INSERT INTO Enrollments (user_id, course_id, enrollment_date, status) VALUES (?, ?, ?, ?)',
        [user_id, course_id, enrollment_date, 'enrolled']
      );
      console.log('Enrollment created, ID:', result.insertId);
      res.status(201).json({ enrollment_id: result.insertId, message: 'Enrollment created' });
    } catch (error) {
      console.error('Create enrollment error:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  }
];

// Get all enrollments (admin) or user's enrollments (student)
const getAllEnrollments = async (req, res) => {
  const user = req.user;

  try {
    let query = 'SELECT e.enrollment_id, e.user_id, e.course_id, e.enrollment_date, e.status, e.grade, ' +
      'c.course_name, c.course_code, CONCAT(u.first_name, " ", u.last_name) AS student_name ' +
      'FROM Enrollments e ' +
      'JOIN Courses c ON e.course_id = c.course_id ' +
      'JOIN Users u ON e.user_id = u.user_id';
    let params = [];

    if (user.role === 'student') {
      query += ' WHERE e.user_id = ?';
      params.push(user.user_id);
    }

    const [enrollments] = await dbConnection.query(query, params);
    res.json(enrollments);
  } catch (error) {
    console.error('Get enrollments error:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
};

// Get enrollment by ID (admin or owning student)
const getEnrollmentById = [
  param('id').isInt().withMessage('Invalid enrollment ID'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const user = req.user;

    try {
      const [enrollments] = await dbConnection.query(
        'SELECT enrollment_id, user_id, course_id, enrollment_date, status, grade FROM Enrollments WHERE enrollment_id = ?',
        [id]
      );
      if (enrollments.length === 0) {
        return res.status(404).json({ error: 'Enrollment not found' });
      }

      const enrollment = enrollments[0];
      if (user.role === 'student' && user.user_id !== enrollment.user_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json(enrollment);
    } catch (error) {
      console.error('Get enrollment by ID error:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  }
];

// Update an enrollment (status: student/admin, grade: instructor/admin)
const updateEnrollment = [
  param('id').isInt().withMessage('Invalid enrollment ID'),
  ...validateEnrollmentUpdate,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status, grade } = req.body;
    const user = req.user;

    try {
      const [enrollments] = await dbConnection.query(
        'SELECT enrollment_id, user_id, course_id FROM Enrollments WHERE enrollment_id = ?',
        [id]
      );
      if (enrollments.length === 0) {
        return res.status(404).json({ error: 'Enrollment not found' });
      }

      const enrollment = enrollments[0];

      // Check grade update permissions
      if (grade !== undefined) {
        if (user.role !== 'admin') {
          // Check if user is the instructor for the course
          const [assignment] = await dbConnection.query(
            'SELECT assignment_id FROM CourseAssignments WHERE instructor_id = ? AND course_id = ?',
            [user.user_id, enrollment.course_id]
          );
          if (assignment.length === 0) {
            return res.status(403).json({ error: 'Only instructors assigned to the course or admins can update grades' });
          }
        }
      }

      // Check status update permissions
      if (status !== undefined && user.role === 'student' && user.user_id !== enrollment.user_id) {
        return res.status(403).json({ error: 'Students can only update their own enrollment status' });
      }

      const updates = {};
      if (status !== undefined) updates.status = status;
      if (grade !== undefined) updates.grade = grade || null;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid fields provided for update' });
      }

      await dbConnection.query(
        'UPDATE Enrollments SET status = ?, grade = ? WHERE enrollment_id = ?',
        [updates.status || enrollment.status, updates.grade || enrollment.grade, id]
      );
      res.json({ message: 'Enrollment updated' });
    } catch (error) {
      console.error('Update enrollment error:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  }
];

// Delete an enrollment (admin or owning student)
const deleteEnrollment = [
  param('id').isInt().withMessage('Invalid enrollment ID'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const user = req.user;

    try {
      const [enrollments] = await dbConnection.query('SELECT enrollment_id, user_id FROM Enrollments WHERE enrollment_id = ?', [id]);
      if (enrollments.length === 0) {
        return res.status(404).json({ error: 'Enrollment not found' });
      }

      const enrollment = enrollments[0];
      if (user.role === 'student' && user.user_id !== enrollment.user_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await dbConnection.query('DELETE FROM Enrollments WHERE enrollment_id = ?', [id]);
      res.json({ message: 'Enrollment deleted' });
    } catch (error) {
      console.error('Delete enrollment error:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  }
];

const getEnrollmentsByCourse = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const [enrollments] = await dbConnection.query(
      'SELECT e.enrollment_id, e.user_id, u.first_name, u.last_name, u.email ' +
      'FROM Enrollments e ' +
      'JOIN Users u ON e.user_id = u.user_id ' +
      'WHERE e.course_id = ? AND u.role = ?',
      [courseId, 'student']
    );
    res.status(200).json(enrollments);
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
};



module.exports = {
  createEnrollment,
  getAllEnrollments,
  getEnrollmentById,
  updateEnrollment,
  deleteEnrollment,
  getEnrollmentsByCourse
};