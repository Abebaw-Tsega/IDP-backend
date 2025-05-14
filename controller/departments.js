// university/controller/department.js
const { body, param, validationResult } = require('express-validator');
const dbConnection = require('../config/db');

// Validation middleware for creating/updating departments
const validateDepartment = [
  body('department_name').notEmpty().withMessage('Department name is required'),
  body('department_code').notEmpty().withMessage('Department code is required')
];

// Create a department (admin-only)
const createDepartment = [
  ...validateDepartment,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { department_name, department_code } = req.body;

    try {
      const [existing] = await dbConnection.query('SELECT department_code FROM Departments WHERE department_code = ?', [department_code]);
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Department code already exists' });
      }

      const [result] = await dbConnection.query(
        'INSERT INTO Departments (department_name, department_code) VALUES (?, ?)',
        [department_name, department_code]
      );
      res.status(201).json({ department_id: result.insertId, message: 'Department created' });
    } catch (error) {
      console.error('Create department error:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  }
];

// Get all departments (public)
const getAllDepartments = async (req, res) => {
  try {
    const [departments] = await dbConnection.query('SELECT department_id, department_name, department_code, created_at FROM Departments');
    res.json(departments);
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
};

// Get department by ID (public)
const getDepartmentById = [
  param('id').isInt().withMessage('Invalid department ID'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    try {
      const [departments] = await dbConnection.query('SELECT department_id, department_name, department_code, created_at FROM Departments WHERE department_id = ?', [id]);
      if (departments.length === 0) {
        return res.status(404).json({ error: 'Department not found' });
      }
      res.json(departments[0]);
    } catch (error) {
      // console.error('Get department by ID error:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  }
];

// Update a department (admin-only)
const updateDepartment = [
  param('id').isInt().withMessage('Invalid department ID'),
  ...validateDepartment,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { department_name, department_code } = req.body;

    try {
      const [existing] = await dbConnection.query('SELECT department_id FROM Departments WHERE department_id = ?', [id]);
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Department not found' });
      }

      const [codeExists] = await dbConnection.query('SELECT department_code FROM Departments WHERE department_code = ? AND department_id != ?', [department_code, id]);
      if (codeExists.length > 0) {
        return res.status(400).json({ error: 'Department code already exists' });
      }

      await dbConnection.query(
        'UPDATE Departments SET department_name = ?, department_code = ? WHERE department_id = ?',
        [department_name, department_code, id]
      );
      res.json({ message: 'Department updated' });
    } catch (error) {
      console.error('Update department error:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  }
];

// Delete a department (admin-only)
const deleteDepartment = [
  param('id').isInt().withMessage('Invalid department ID'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    try {
      const [existing] = await dbConnection.query('SELECT department_id FROM Departments WHERE department_id = ?', [id]);
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Department not found' });
      }

      await dbConnection.query('DELETE FROM Departments WHERE department_id = ?', [id]);
      res.json({ message: 'Department deleted' });
    } catch (error) {
      console.error('Delete department error:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  }
];

module.exports = {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment
};