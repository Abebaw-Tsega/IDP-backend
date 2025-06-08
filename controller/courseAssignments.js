// university/controller/courseAssignments.js
const { body, param, validationResult } = require('express-validator');
const dbConnection = require('../config/db');

// Validation middleware for creating assignments
const validateAssignment = [
  body('instructor_id').isInt().withMessage('Invalid instructor ID'),
  body('course_id').isInt().withMessage('Invalid course ID')
];

// Create a course assignment (admin-only)
const createCourseAssignment = [
  ...validateAssignment,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { instructor_id, course_id } = req.body;
    console.log('Creating course assignment:', { instructor_id, course_id });

    try {
      // Validate instructor
      const [instructor] = await dbConnection.query('SELECT user_id, role FROM Users WHERE user_id = ? AND role = ?', [instructor_id, 'instructor']);
      if (instructor.length === 0) {
        return res.status(400).json({ error: 'Invalid instructor ID' });
      }

      // Validate course
      const [course] = await dbConnection.query('SELECT course_id FROM Courses WHERE course_id = ?', [course_id]);
      if (course.length === 0) {
        return res.status(400).json({ error: 'Invalid course ID' });
      }

      // Check for duplicate assignment
      const [existing] = await dbConnection.query(
        'SELECT assignment_id FROM CourseAssignments WHERE instructor_id = ? AND course_id = ?',
        [instructor_id, course_id]
      );
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Instructor already assigned to this course' });
      }

      const [result] = await dbConnection.query(
        'INSERT INTO CourseAssignments (instructor_id, course_id) VALUES (?, ?)',
        [instructor_id, course_id]
      );
      console.log('Course assignment created, ID:', result.insertId);
      res.status(201).json({ assignment_id: result.insertId, message: 'Course assignment created' });
    } catch (error) {
      console.error('Create course assignment error:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  }
];

// Get all course assignments (admin-only)
const getAllCourseAssignments = async (req, res) => {
  try {
    const [assignments] = await dbConnection.query(
      'SELECT ca.assignment_id, ca.instructor_id, c.course_id, c.course_code, c.course_name, u.first_name, u.last_name ' +
      'FROM CourseAssignments ca ' +
      'JOIN Courses c ON ca.course_id = c.course_id ' +
      'JOIN Users u ON ca.instructor_id = u.user_id'
    );
    res.status(200).json(assignments);
  } catch (error) {
    console.error('Error fetching all assignments:', error);
    res.status(500).json({ error: 'Failed to fetch all assignments' });
  }
};

// Delete a course assignment (admin-only)
const deleteCourseAssignment = [
  param('id').isInt().withMessage('Invalid assignment ID'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    try {
      const [existing] = await dbConnection.query('SELECT assignment_id FROM CourseAssignments WHERE assignment_id = ?', [id]);
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Course assignment not found' });
      }

      await dbConnection.query('DELETE FROM CourseAssignments WHERE assignment_id = ?', [id]);
      res.json({ message: 'Course assignment deleted' });
    } catch (error) {
      console.error('Delete course assignment error:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  }
];

const getCourseAssignments = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const role = req.user.role;

    let query = 'SELECT ca.assignment_id, ca.instructor_id, c.course_id, c.course_code, c.course_name, u.first_name, u.last_name ' +
      'FROM CourseAssignments ca ' +
      'JOIN Courses c ON ca.course_id = c.course_id ' +
      'JOIN Users u ON ca.instructor_id = u.user_id ';
    let params = [];

    if (role === 'instructor') {
      query += 'WHERE ca.instructor_id = ?';
      params.push(userId);
    } // Admins see all assignments without a WHERE clause

    const [assignments] = await dbConnection.query(query, params);
    res.status(200).json(assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
};
module.exports = {
  createCourseAssignment,
  getAllCourseAssignments,
  deleteCourseAssignment,
  getCourseAssignments
};