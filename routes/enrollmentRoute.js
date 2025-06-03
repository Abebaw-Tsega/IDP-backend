// university/routes/enrollmentRoute.js
const express = require('express');
const router = express.Router();
const { createEnrollment, getAllEnrollments, getEnrollmentById, updateEnrollment, deleteEnrollment, getEnrollmentsByCourse } = require('../controller/enrollments');
const { authenticate, restrictTo } = require('../middleware/auth');

router.post('/', authenticate, createEnrollment);
router.get('/', authenticate, getAllEnrollments);
router.get('/:id', authenticate, getEnrollmentById);
router.put('/:id', authenticate, updateEnrollment);
router.delete('/:id', authenticate, deleteEnrollment);

router.get('/enrollments/course/:courseId', authenticate, restrictTo('instructor'), getEnrollmentsByCourse);


// console.log('Enrollment routes registered:', router.stack.map(layer => layer.route?.path).filter(Boolean));

module.exports = router;