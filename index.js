require('dotenv').config();

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();

// ===============================
// MIDDLEWARE
// ===============================

app.use(cors());
app.use(express.json());

// ===============================
// ENVIRONMENT VARIABLES
// ===============================

const uri = process.env.MONGO_URI;
const jwtSecret = process.env.JWT_SECRET;

if (!uri) {
    throw new Error('MONGO_URI is not defined');
}

if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined');
}

// ===============================
// MONGODB CLIENT
// ===============================

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true
    }
});

// MongoDB collections
let users;
let bookings;
let contact;

// ===============================
// CONNECT TO MONGODB
// ===============================

async function connectDB() {

    // If already connected, don't connect again
    if (users && bookings && contact) {
        return {
            users,
            bookings,
            contact
        };
    }

    await client.connect();

    console.log('MongoDB connected successfully');

    const db = client.db('Travelgo');

    users = db.collection('users');
    bookings = db.collection('bookings');
    contact = db.collection('contact');

    return {
        users,
        bookings,
        contact
    };
}

// ===============================
// TEST ROUTE
// ===============================

app.get('/', async (req, res) => {

    try {

        await connectDB();

        res.json({
            message: 'TravelGo backend is running'
        });

    } catch (error) {

        console.error('Database connection error:', error);

        res.status(500).json({
            message: 'Database connection failed'
        });
    }
});

// ===============================
// REGISTER
// ===============================

app.post('/register', async (req, res) => {

    try {

        const { users } = await connectDB();

        const { username, password } = req.body;

        // Check required fields
        if (!username || !password) {

            return res.status(400).json({
                message: 'Username and password are required'
            });
        }

        // Check if user already exists
        const existingUser = await users.findOne({
            username
        });

        if (existingUser) {

            return res.status(400).json({
                message: 'Username already exists'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(
            password,
            10
        );

        // Save user
        await users.insertOne({
            username,
            password: hashedPassword,
            createdAt: new Date()
        });

        res.status(201).json({
            message: 'Registration successful'
        });

    } catch (error) {

        console.error('Register error:', error);

        res.status(500).json({
            message: 'Registration failed'
        });
    }
});

// ===============================
// LOGIN
// ===============================

app.post('/login', async (req, res) => {

    try {

        const { users } = await connectDB();

        const { username, password } = req.body;

        // Check required fields
        if (!username || !password) {

            return res.status(400).json({
                message: 'Username and password are required'
            });
        }

        // Find user
        const user = await users.findOne({
            username
        });

        if (!user) {

            return res.status(401).json({
                message: 'Invalid username or password'
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

        // Create JWT token
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

        res.json({
            message: 'Login successful',
            token
        });

    } catch (error) {

        console.error('Login error:', error);

        res.status(500).json({
            message: 'Login failed'
        });
    }
});

// ===============================
// BOOKINGS
// ===============================

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

        // Validate required fields
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

        // Save booking
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

        res.status(201).json({
            message: 'Booking created successfully'
        });

    } catch (error) {

        console.error('Booking error:', error);

        res.status(500).json({
            message: 'Failed to create booking'
        });
    }
});

// ===============================
// CONTACT
// ===============================

app.post('/contact', async (req, res) => {

    try {

        const { contact } = await connectDB();

        const {
            name,
            email,
            message
        } = req.body;

        // Validate required fields
        if (!name || !email || !message) {

            return res.status(400).json({
                message: 'Name, email and message are required'
            });
        }

        // Save contact message
        await contact.insertOne({
            name,
            email,
            message,
            createdAt: new Date()
        });

        res.status(201).json({
            message: 'Message sent successfully'
        });

    } catch (error) {

        console.error('Contact error:', error);

        res.status(500).json({
            message: 'Failed to save contact message'
        });
    }
});

// ===============================
// EXPORT APP
// ===============================

module.exports = app;