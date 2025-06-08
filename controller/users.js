// university/controller/users.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const dbConnection = require('../config/db');

const validateStudent = [
  body('email').isEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('id_number').matches(/^ETS\d{4}\/\d{2}$/).withMessage('Invalid ID number format. Must be ETS{4 digits}/{2 digits}'),
  body('first_name').notEmpty().withMessage('First name is required'),
  body('last_name').notEmpty().withMessage('Last name is required'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  body('department_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Invalid department ID').bail(),
];

const validateInstructor = [
  body('email').isEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('first_name').notEmpty().withMessage('First name is required'),
  body('last_name').notEmpty().withMessage('Last name is required'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  body('department_id').isInt().withMessage('Department ID is required')
];

const validateAdmin = [
  body('email').isEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('first_name').notEmpty().withMessage('First name is required'),
  body('last_name').notEmpty().withMessage('Last name is required')
];
//register students
const registerStudent = [
  ...validateStudent,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors for registerStudent:', errors.array()); // Add logging
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, id_number, first_name, last_name, phone, department_id } = req.body;

    try {
      const [existing] = await dbConnection.query('SELECT email, id_number FROM Users WHERE email = ? OR id_number = ?', [email, id_number]);
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Email or ID number already exists' });
      }

      const password_hash = await bcrypt.hash(password, 10);
      const [result] = await dbConnection.query(
        'INSERT INTO Users (email, password_hash, role, id_number, first_name, last_name, phone, department_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [email, password_hash, 'student', id_number, first_name, last_name, phone || null, department_id || null]
      );

      res.status(201).json({ user_id: result.insertId, id_number, message: 'Student registered' });
    } catch (error) {
      console.error('Register student error:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  }
];
//register instructor
const registerInstructor = [
  ...validateInstructor,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, first_name, last_name, phone, department_id } = req.body;

    try {
      const [existing] = await dbConnection.query('SELECT email FROM Users WHERE email = ?', [email]);
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Email already exists' });
      }

      const password_hash = await bcrypt.hash(password, 10);
      const [result] = await dbConnection.query(
        'INSERT INTO Users (email, password_hash, role, first_name, last_name, phone, department_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [email, password_hash, 'instructor', first_name, last_name, phone, department_id]
      );

      res.status(201).json({ user_id: result.insertId, message: 'Instructor registered' });
    } catch (error) {
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  }
];

//register admin
const registerAdmin = [
  ...validateAdmin,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, first_name, last_name } = req.body;

    try {
      const [existing] = await dbConnection.query('SELECT email FROM Users WHERE email = ?', [email]);
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Email already exists' });
      }

      const password_hash = await bcrypt.hash(password, 10);
      const [result] = await dbConnection.query(
        'INSERT INTO Users (email, password_hash, role, first_name, last_name) VALUES (?, ?, ?, ?, ?)',
        [email, password_hash, 'admin', first_name, last_name]
      );

      res.status(201).json({ user_id: result.insertId, message: 'Admin registered' });
    } catch (error) {
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  }
];

//login
const login = [
  body('email').isEmail().withMessage('Invalid email'),
  body('password').notEmpty().withMessage('Password is required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const [users] = await dbConnection.query('SELECT * FROM Users WHERE email = ?', [email]);
      if (users.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = users[0];
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { user_id: user.user_id, role: user.role, first_name: user.first_name },
        process.env.JWT_SECRET,
        { expiresIn: '7D' }
      );
      res.json({ token, role: user.role });
    } catch (error) {
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  }
];
//get users list
const getUserList = async (req, res) => {
  console.log('getUserList called by user:', req.user);
  try {
    const [users] = await dbConnection.query('SELECT user_id, id_number, first_name, last_name, role FROM Users WHERE role IN (?, ?)', ['student', 'instructor']);
    console.log('Users retrieved:', users);
    res.json(users);
  } catch (error) {
    console.error('Get user list error:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
};


//register users
const registerUser = [
  body('email').isEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['student', 'instructor', 'admin']).withMessage('Invalid role'),
  body('id_number').if(body('role').equals('student')).notEmpty().withMessage('ID number is required for students'),
  body('first_name').notEmpty().withMessage('First name is required'),
  body('last_name').notEmpty().withMessage('Last name is required'),
  body('phone').notEmpty().withMessage('Phone is required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, role, id_number, first_name, last_name, phone } = req.body;

    try {
      const [existing] = await dbConnection.query('SELECT user_id FROM Users WHERE email = ?', [email]);
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Email already exists' });
      }

      await dbConnection.query(
        'INSERT INTO Users (email, password, role, id_number, first_name, last_name, phone) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [email, password, role, id_number || null, first_name, last_name, phone]
      );
      res.status(201).json({ message: `${role} registered successfully` });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  }
];
//get users
const getUsers = async (req, res) => {
  try {
    const [users] = await dbConnection.query('SELECT user_id, email, role, id_number, first_name, last_name, phone FROM Users ORDER BY role, user_id');
    console.log('Fetched users:', users);
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};
//update users
const updateUser = [
  body('email').optional().isEmail().withMessage('Invalid email'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['student', 'instructor', 'admin']).withMessage('Invalid role'),
  body('id_number').if(body('role').equals('student')).optional().notEmpty().withMessage('ID number is required for students'),
  body('first_name').optional().notEmpty().withMessage('First name is required'),
  body('last_name').optional().notEmpty().withMessage('Last name is required'),
  body('phone').optional().notEmpty().withMessage('Phone is required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { email, password, role, id_number, first_name, last_name, phone } = req.body;

    try {
      const [existing] = await dbConnection.query('SELECT user_id FROM Users WHERE user_id = ?', [id]);
      if (existing.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const updates = {};
      if (email) updates.email = email;
      if (password) updates.password = password;
      if (role) updates.role = role;
      if (id_number !== undefined) updates.id_number = id_number || null;
      if (first_name) updates.first_name = first_name;
      if (last_name) updates.last_name = last_name;
      if (phone) updates.phone = phone;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      await dbConnection.query(
        'UPDATE Users SET ? WHERE user_id = ?',
        [updates, id]
      );
      res.json({ message: 'User updated successfully' });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ error: 'Database error: ' + error.message });
    }
  }
];
//delete users
const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const [existing] = await dbConnection.query('SELECT user_id FROM Users WHERE user_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await dbConnection.query('DELETE FROM Users WHERE user_id = ?', [id]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
};

//get users by id
const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const [users] = await dbConnection.query('SELECT user_id, email, role, id_number, first_name, last_name, phone, department_id, status, created_at FROM Users WHERE user_id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    if (req.user.role !== 'admin' && req.user.user_id !== user.user_id) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
}; const getAllCourseAssignments = async (req, res) => {
  try {
    const [assignments] = await dbConnection.query(
      `SELECT 
        ca.assignment_id,
        u.first_name AS instructor_name,
        u.last_name AS instructor_last_name,
        c.course_name,
        ca.created_at
       FROM CourseAssignments ca
       JOIN Users u ON ca.instructor_id = u.user_id
       JOIN Courses c ON ca.course_id = c.course_id`
    );
    res.status(200).json(assignments);
  } catch (error) {
    console.error('Error fetching all course assignments:', error);
    res.status(500).json({ error: 'Failed to fetch course assignments' });
  }
};

module.exports = {
  registerStudent,
  registerInstructor,
  registerAdmin,
  login,
  getUserById,
  getUserList,
  registerUser,
  getUsers,
  updateUser,
  deleteUser,
  getAllCourseAssignments,
};