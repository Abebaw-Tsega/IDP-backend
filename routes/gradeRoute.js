// university/routes/gradeRoute.js
const express = require('express');
const router = express.Router();
const { submitGrade, getGradesByEnrollment } = require('../controller/grades');
const { authenticate, restrictTo } = require('../middleware/auth');

router.get('/enrollment/:enrollmentId', authenticate, restrictTo('instructor'), getGradesByEnrollment); // Updated path
router.post('/', authenticate, restrictTo('instructor'), submitGrade);

console.log('Grade routes registered:', router.stack.map(layer => layer.route?.path).filter(Boolean));

module.exports = router;