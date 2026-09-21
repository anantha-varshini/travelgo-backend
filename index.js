require('dotenv').config();

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();

app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI;
const jwtSecret = process.env.JWT_SECRET;

if (!uri) {
    throw new Error('MONGO_URI is not defined');
}

if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined');
}

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let users;

// Connect to MongoDB once
async function connectDB() {
    if (users) {
        return users;
    }

    await client.connect();

    console.log('MongoDB connected successfully');

    const db = client.db('Travelgo');
    users = db.collection('users');

    return users;
}

// TEST ROUTE
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

// REGISTER
app.post('/register', async (req, res) => {
    try {
        const users = await connectDB();

        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: 'Username and password are required'
            });
        }

        const existingUser = await users.findOne({ username });

        if (existingUser) {
            return res.status(400).json({
                message: 'Username already exists'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await users.insertOne({
            username,
            password: hashedPassword
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

// LOGIN
app.post('/login', async (req, res) => {
    try {
        const users = await connectDB();

        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: 'Username and password are required'
            });
        }

        const user = await users.findOne({ username });

        if (!user) {
            return res.status(401).json({
                message: 'Invalid username or password'
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: 'Invalid username or password'
            });
        }

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

module.exports = app;