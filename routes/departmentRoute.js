// university/routes/departmentRoute.js
const express = require('express');
const router = express.Router();
const { createDepartment, getAllDepartments, getDepartmentById, updateDepartment, deleteDepartment } = require('../controller/departments');
const { authenticate, restrictTo } = require('../middleware/auth');

router.post('/', authenticate, restrictTo('admin'), createDepartment);
router.get('/', getAllDepartments);
router.get('/:id', getDepartmentById);
router.put('/:id', authenticate, restrictTo('admin'), updateDepartment);
router.delete('/:id', authenticate, restrictTo('admin'), deleteDepartment);

// console.log('Department routes registered:', router.stack.map(layer => layer.route?.path).filter(Boolean));

module.exports = router;