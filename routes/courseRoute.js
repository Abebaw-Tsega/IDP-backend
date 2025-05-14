// university/routes/courseRoute.js
const express = require('express');
const router = express.Router();
const { createCourse, getAllCourses, getCourseById, updateCourse, deleteCourse } = require('../controller/courses');
const { authenticate, restrictTo } = require('../middleware/auth');

router.post('/', authenticate, restrictTo('admin'), createCourse);
router.get('/', getAllCourses);
router.get('/:id', getCourseById);
router.put('/:id', authenticate, restrictTo('admin'), updateCourse);
router.delete('/:id', authenticate, restrictTo('admin'), deleteCourse);

// console.log('Course routes registered:', router.stack.map(layer => layer.route?.path).filter(Boolean));

module.exports = router;