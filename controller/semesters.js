// university/controller/semesters.js
const { body, param, validationResult } = require('express-validator');
const dbConnection = require('../config/db');

// Validation middleware for creating/updating semesters
const validateSemester = [
  body('semester_name').isIn(['First Semester', 'Second Semester']).withMessage('Semester name must be "First Semester" or "Second Semester"'),
  body('start_date').isISO8601().withMessage('Start date must be a valid date (YYYY-MM-DD)'),
  body('end_date').isISO8601().withMessage('End date must be a valid date (YYYY-MM-DD)')
    .custom((end_date, { req }) => {
      if (new Date(end_date) <= new Date(req.body.start_date)) {
        throw new Error('End date must be after start date');
      }
      return true;
    })
];

// Create a semester (admin-only)
const createSemester = [
  ...validateSemester,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { semester_name, start_date, end_date } = req.body;
    console.log('Creating semester:', { semester_name, start_date, end_date });

    try {
      const [result] = await dbConnection.query(
        'INSERT INTO Semesters (semester_name, start_date, end_date) VALUES (?, ?, ?)',
        [semester_name, start_date, end_date]
      );
      console.log('Semester created, ID:', result.insertId);
      res.status(201).json({ semester_id: result.insertId, message: 'Semester created' });
    } catch (error) {
      console.error('Create semester error:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  }
];

// Get all semesters (public)
const getAllSemesters = async (req, res) => {
  try {
    const [semesters] = await dbConnection.query('SELECT semester_id, semester_name, start_date, end_date, created_at FROM Semesters');
    res.json(semesters);
  } catch (error) {
    console.error('Get semesters error:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
};

// Get semester by ID (public)
const getSemesterById = [
  param('id').isInt().withMessage('Invalid semester ID'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    try {
      const [semesters] = await dbConnection.query('SELECT semester_id, semester_name, start_date, end_date, created_at FROM Semesters WHERE semester_id = ?', [id]);
      if (semesters.length === 0) {
        return res.status(404).json({ error: 'Semester not found' });
      }
      res.json(semesters[0]);
    } catch (error) {
      console.error('Get semester by ID error:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  }
];

// Update a semester (admin-only)
const updateSemester = [
  param('id').isInt().withMessage('Invalid semester ID'),
  ...validateSemester,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { semester_name, start_date, end_date } = req.body;

    try {
      const [existing] = await dbConnection.query('SELECT semester_id FROM Semesters WHERE semester_id = ?', [id]);
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Semester not found' });
      }

      await dbConnection.query(
        'UPDATE Semesters SET semester_name = ?, start_date = ?, end_date = ? WHERE semester_id = ?',
        [semester_name, start_date, end_date, id]
      );
      res.json({ message: 'Semester updated' });
    } catch (error) {
      console.error('Update semester error:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  }
];

// Delete a semester (admin-only)
const deleteSemester = [
  param('id').isInt().withMessage('Invalid semester ID'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    try {
      const [existing] = await dbConnection.query('SELECT semester_id FROM Semesters WHERE semester_id = ?', [id]);
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Semester not found' });
      }

      const [courses] = await dbConnection.query('SELECT course_id FROM Courses WHERE semester_id = ?', [id]);
      if (courses.length > 0) {
        return res.status(400).json({ error: 'Cannot delete semester with associated courses' });
      }

      await dbConnection.query('DELETE FROM Semesters WHERE semester_id = ?', [id]);
      res.json({ message: 'Semester deleted' });
    } catch (error) {
      console.error('Delete semester error:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  }
];

module.exports = {
  createSemester,
  getAllSemesters,
  getSemesterById,
  updateSemester,
  deleteSemester
};