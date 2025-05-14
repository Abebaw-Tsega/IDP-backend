// university/app.js
const express = require('express');
const dotenv = require('dotenv');
const dbConnection = require('./config/db');
const fs = require('fs').promises;
const path = require('path');
const userRoutes = require('./routes/userRoute');
const departmentRoutes = require('./routes/departmentRoute');
const courseRoutes = require('./routes/courseRoute');
const semesterRoutes = require('./routes/semesterRoute');
const enrollmentRoutes = require('./routes/enrollmentRoute');
const courseAssignmentRoutes = require('./routes/courseAssignmentRoute');
const cors = require('cors'); // Add cors


dotenv.config();

const app = express();

// Enable CORS for frontend origin
app.use(cors({
    origin: 'http://localhost:5173', // Allow requests from frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allowed methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
}));

// Middleware to parse JSON bodies
app.use(express.json());

// Mount user routes
app.use('/api', userRoutes);

//mount department routes
app.use('/api/departments', departmentRoutes);

//mount courses routes
app.use('/api/courses', courseRoutes);

//mount semester routes
app.use('/api/semesters', semesterRoutes);

//mount enrollment routes
app.use('/api/enrollments', enrollmentRoutes);

//mount course-assignments routes
app.use('/api/course-assignments', courseAssignmentRoutes);

// Initialize database schema
async function initializeDatabase() {
    try {
        const schemaPath = path.join(__dirname, 'config', 'schema.sql');
        const sql = await fs.readFile(schemaPath, 'utf8');
        const statements = sql.split(';').filter(stmt => stmt.trim());

        for (const statement of statements) {
            try {
                await dbConnection.query(statement);
            } catch (error) {
                if (error.code === 'ER_DUP_KEYNAME' || error.code === 'ER_DUP_ENTRY' || error.code === 'ER_TABLE_EXISTS_ERROR') {
                    console.log(`Skipped: ${error.message}`);
                    continue;
                }
                throw error;
            }
        }
        console.log('Database schema initialized successfully!');
    } catch (error) {
        console.error('Failed to initialize database schema:', error.message);
        process.exit(1);
    }
}

// Test database connection and initialize schema
async function initializeServer() {
    try {
        const connection = await dbConnection.getConnection();
        console.log('Successfully connected to the university database!');
        connection.release();
        await initializeDatabase();
    } catch (error) {
        console.error('Database connection failed:', error.message);
        process.exit(1);
    }
}

// Basic route to confirm server is running
app.get('/', (req, res) => {
    res.json({ message: 'University Student Management System API is running' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    initializeServer();

});