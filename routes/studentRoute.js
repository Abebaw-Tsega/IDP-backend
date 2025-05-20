// university/routes/studentRoute.js
const express = require('express');
const router = express.Router();
const { getStudentGrades } = require('../controller/student');

router.get('/grades', getStudentGrades);

module.exports = router;