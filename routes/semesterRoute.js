// university/routes/semesterRoute.js
const express = require('express');
const router = express.Router();
const { createSemester, getAllSemesters, getSemesterById, updateSemester, deleteSemester } = require('../controller/semesters');
const { authenticate, restrictTo } = require('../middleware/auth');

router.post('/', authenticate, restrictTo('admin'), createSemester);
router.get('/', getAllSemesters);
router.get('/:id', getSemesterById);
router.put('/:id', authenticate, restrictTo('admin'), updateSemester);
router.delete('/:id', authenticate, restrictTo('admin'), deleteSemester);

// console.log('Semester routes registered:', router.stack.map(layer => layer.route?.path).filter(Boolean));

module.exports = router;