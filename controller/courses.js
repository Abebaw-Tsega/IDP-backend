// university/controller/courses.js
const { body, param, validationResult } = require('express-validator');
const dbConnection = require('../config/db');

// Validation middleware for creating/updating courses
const validateCourse = [
  body('course_name').notEmpty().withMessage('Course name is required'),
  body('course_code').notEmpty().withMessage('Course code is required'),
  body('semester_id').optional().isInt().withMessage('Invalid semester ID'),
  body('department_id').optional().isInt().withMessage('Invalid department ID'),
  body('credits').isInt({ min: 1 }).withMessage('Credits must be a positive integer')
];

// Create a course (admin-only)
const createCourse = [
  ...validateCourse,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { course_name, course_code, department_id, semester_id, credits } = req.body;
    console.log('Creating course:', { course_name, course_code, department_id, semester_id, credits });

    try {
      const [existing] = await dbConnection.query('SELECT course_code FROM Courses WHERE course_code = ?', [course_code]);
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Course code already exists' });
      }

      if (department_id) {
        const [dept] = await dbConnection.query('SELECT department_id FROM Departments WHERE department_id = ?', [department_id]);
        if (dept.length === 0) {
          return res.status(400).json({ error: 'Invalid department ID' });
        }
      }

      if (semester_id) {
        const [sem] = await dbConnection.query('SELECT semester_id FROM Semesters WHERE semester_id = ?', [semester_id]);
        if (sem.length === 0) {
          return res.status(400).json({ error: 'Invalid semester ID' });
        }
      }

      const [result] = await dbConnection.query(
        'INSERT INTO Courses (course_name, course_code, department_id, semester_id, credits) VALUES (?, ?, ?, ?, ?)',
        [course_name, course_code, department_id || null, semester_id || null, credits]
      );
      console.log('Course created, ID:', result.insertId);
      res.status(201).json({ course_id: result.insertId, message: 'Course created' });
    } catch (error) {
      console.error('Create course error:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  }
];

// Get all courses (public)
// university/controller/course.js
const getAllCourses = async (req, res) => {
  try {
    const [courses] = await dbConnection.query(
      'SELECT c.course_id, c.course_name, c.course_code, c.department_id, c.credits, d.department_name ' +
      'FROM Courses c JOIN Departments d ON c.department_id = d.department_id'
    );
    res.json(courses);
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
};

// Get course by ID (public)
const getCourseById = [
  param('id').isInt().withMessage('Invalid course ID'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    try {
      const [courses] = await dbConnection.query('SELECT course_id, course_name, course_code, department_id, credits, created_at FROM Courses WHERE course_id = ?', [id]);
      if (courses.length === 0) {
        return res.status(404).json({ error: 'Course not found' });
      }
      res.json(courses[0]);
    } catch (error) {
      console.error('Get course by ID error:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  }
];

// Update a course (admin-only)
const updateCourse = [
  param('id').isInt().withMessage('Invalid course ID'),
  ...validateCourse,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { course_name, course_code, department_id, semester_id, credits } = req.body;

    try {
      const [existing] = await dbConnection.query('SELECT course_id FROM Courses WHERE course_id = ?', [id]);
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Course not found' });
      }

      const [codeExists] = await dbConnection.query('SELECT course_code FROM Courses WHERE course_code = ? AND course_id != ?', [course_code, id]);
      if (codeExists.length > 0) {
        return res.status(400).json({ error: 'Course code already exists' });
      }

      if (department_id) {
        const [dept] = await dbConnection.query('SELECT department_id FROM Departments WHERE department_id = ?', [department_id]);
        if (dept.length === 0) {
          return res.status(400).json({ error: 'Invalid department ID' });
        }
      }

      if (semester_id) {
        const [sem] = await dbConnection.query('SELECT semester_id FROM Semesters WHERE semester_id = ?', [semester_id]);
        if (sem.length === 0) {
          return res.status(400).json({ error: 'Invalid semester ID' });
        }
      }

      await dbConnection.query(
        'UPDATE Courses SET course_name = ?, course_code = ?, department_id = ?, semester_id = ?, credits = ? WHERE course_id = ?',
        [course_name, course_code, department_id || null, semester_id || null, credits, id]
      );
      res.json({ message: 'Course updated' });
    } catch (error) {
      console.error('Update course error:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  }
];

// Delete a course (admin-only)
const deleteCourse = [
  param('id').isInt().withMessage('Invalid course ID'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    try {
      const [existing] = await dbConnection.query('SELECT course_id FROM Courses WHERE course_id = ?', [id]);
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Course not found' });
      }

      await dbConnection.query('DELETE FROM Courses WHERE course_id = ?', [id]);
      res.json({ message: 'Course deleted' });
    } catch (error) {
      console.error('Delete course error:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  }
];

module.exports = {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse
};