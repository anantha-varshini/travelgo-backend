
require('dotenv').config();

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();

// MIDDLEWARE
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ENVIRONMENT VARIABLES
const uri = process.env.MONGO_URI;
const jwtSecret = process.env.JWT_SECRET;

if (!uri) {
    throw new Error('MONGO_URI is not defined');
}

if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined');
}

// MONGODB CLIENT
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true
    }
});

// DATABASE COLLECTIONS
let users;
let bookings;
let contact;

let dbConnection;

// CONNECT TO MONGODB
async function connectDB() {
    if (users && bookings && contact) {
        return { users, bookings, contact };
    }

    if (!dbConnection) {
        dbConnection = (async () => {
            await client.connect();

            console.log('MongoDB connected successfully');

            const db = client.db('Travelgo');

            users = db.collection('users');
            bookings = db.collection('bookings');
            contact = db.collection('contact');

            return { users, bookings, contact };
        })().catch(error => {
            dbConnection = null;
            throw error;
        });
    }

    return dbConnection;
}

// HEALTH CHECK
app.get('/', async (req, res) => {
    try {
        await connectDB();

        res.status(200).json({
            message: 'TravelGo backend is running',
            database: 'MongoDB connected'
        });

    } catch (error) {
        console.error('Database connection error:', error);

        res.status(500).json({
            message: 'Database connection failed'
        });
    }
});

// REGISTER
app.post('/register', async (req, res) => {
    try {
        const { users } = await connectDB();

        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: 'Username and password are required'
            });
        }

        const cleanUsername = username.trim();

        if (!cleanUsername) {
            return res.status(400).json({
                message: 'Username cannot be empty'
            });
        }

        // Check existing username
        const existingUser = await users.findOne({
            username: cleanUsername
        });

        if (existingUser) {
            return res.status(400).json({
                message: 'Username already exists'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        await users.insertOne({
            username: cleanUsername,
            password: hashedPassword,
            createdAt: new Date()
        });

        return res.status(201).json({
            message: 'Registration successful'
        });

    } catch (error) {
        console.error('Register error:', error);

        return res.status(500).json({
            message: 'Registration failed'
        });
    }
});

// LOGIN
app.post('/login', async (req, res) => {
    try {
        const { users } = await connectDB();

        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: 'Username and password are required'
            });
        }

        const cleanUsername = username.trim();

        // Find user
        const user = await users.findOne({
            username: cleanUsername
        });

        if (!user) {
            return res.status(401).json({
                message: 'Invalid username or password'
            });
        }

        console.log('Login user found:', user.username);
        console.log('Password field exists:', !!user.password);
        console.log('Password field type:', typeof user.password);

        // Validate stored password
        if (
            typeof user.password !== 'string' ||
            !user.password.startsWith('$2')
        ) {
            console.error('Invalid bcrypt password hash');

            return res.status(500).json({
                message: 'Stored password format is invalid'
            });
        }

        // Compare password
        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: 'Invalid username or password'
            });
        }

        // Generate JWT
        const token = jwt.sign(
            {
                id: user._id.toString(),
                username: user.username
            },
            jwtSecret,
            {
                expiresIn: '1d'
            }
        );

        return res.status(200).json({
            message: 'Login successful',
            token
        });

    } catch (error) {
        console.error('Login error:', error);

        return res.status(500).json({
            message: 'Login failed'
        });
    }
});

// BOOKINGS
app.post('/bookings', async (req, res) => {
    try {
        const { bookings } = await connectDB();

        const {
            name,
            email,
            phone,
            destination,
            date,
            travellers,
            requests
        } = req.body;

        if (
            !name ||
            !email ||
            !phone ||
            !destination ||
            !date ||
            !travellers
        ) {
            return res.status(400).json({
                message: 'Please fill in all required fields'
            });
        }

        await bookings.insertOne({
            name,
            email,
            phone,
            destination,
            date,
            travellers: Number(travellers),
            requests: requests || '',
            createdAt: new Date()
        });

        return res.status(201).json({
            message: 'Booking created successfully'
        });

    } catch (error) {
        console.error('Booking error:', error);

        return res.status(500).json({
            message: 'Failed to create booking'
        });
    }
});

// CONTACT
app.post('/contact', async (req, res) => {
    try {
        const { contact } = await connectDB();

        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({
                message: 'Name, email and message are required'
            });
        }

        await contact.insertOne({
            name,
            email,
            message,
            createdAt: new Date()
        });

        return res.status(201).json({
            message: 'Message sent successfully'
        });

    } catch (error) {
        console.error('Contact error:', error);

        return res.status(500).json({
            message: 'Failed to save contact message'
        });
    }
});

// EXPORT FOR VERCEL
module.exports = app;
