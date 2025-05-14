// university/routes/courseAssignmentRoute.js
const express = require('express');
const router = express.Router();
const { createCourseAssignment, getAllCourseAssignments, deleteCourseAssignment } = require('../controller/courseAssignments');
const { authenticate, restrictTo } = require('../middleware/auth');

router.post('/', authenticate, restrictTo('admin'), createCourseAssignment);
router.get('/', authenticate, restrictTo('admin'), getAllCourseAssignments);
router.delete('/:id', authenticate, restrictTo('admin'), deleteCourseAssignment);

console.log('Course assignment routes registered:', router.stack.map(layer => layer.route?.path).filter(Boolean));

module.exports = router;