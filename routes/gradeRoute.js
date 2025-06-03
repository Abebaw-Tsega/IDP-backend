// routes/gradeRoute.js
const express = require('express');
const router = express.Router();
const { submitGrade, getGradesByEnrollment } = require('../controller/grades');
const { authenticate, restrictTo } = require('../middleware/auth');

router.get('/grades/enrollment/:enrollmentId', authenticate, restrictTo('instructor'), getGradesByEnrollment);
router.post('/grades', authenticate, restrictTo('instructor'), submitGrade);

module.exports = router;