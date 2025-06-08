// university/routes/userRoute.js
const express = require('express');
const router = express.Router();
const { registerStudent, registerInstructor, registerAdmin, login, getUserById, getUserList, getUsers, updateUser, deleteUser, getAllCourseAssignments } = require('../controller/users');
const { authenticate, restrictTo } = require('../middleware/auth');

router.put('/users/:id', authenticate, restrictTo('admin'), updateUser);
router.delete('/users/:id', authenticate, restrictTo('admin'), deleteUser);


router.post('/register/student', registerStudent); // Added authentication
router.post('/register/instructor', authenticate, restrictTo('admin'), registerInstructor);
router.post('/register/admin', authenticate, restrictTo('admin'), registerAdmin);
router.post('/login', login);
// router.get('/users/list', authenticate, restrictTo('admin'), getUserList);


// Define /users/list before /users/:id to prevent :id matching 'list'
router.get('/users/list', (req, res, next) => {
  console.log('GET /users/list route hit');
  next();
}, authenticate, restrictTo('admin'), getUserList);
router.get('/users', getUsers); // Define the /users route

router.get('/course-assignments', authenticate, restrictTo('admin'), getAllCourseAssignments); // New endpoint

router.get('/users/:id', authenticate, getUserById);


module.exports = router;