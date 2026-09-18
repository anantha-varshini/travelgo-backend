require('dotenv').config();

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const port = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI;
const jwtSecret = process.env.JWT_SECRET;

if (!uri) {
    console.error('MONGO_URI is not defined');
    process.exit(1);
}

if (!jwtSecret) {
    console.error('JWT_SECRET is not defined');
    process.exit(1);
}

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function startServer() {
    try {
        await client.connect();

        console.log('MongoDB connected successfully');

        const db = client.db('Travelgo');
        const users = db.collection('users');

        // REGISTER
        app.post('/register', async (req, res) => {
            try {
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
    { id: user._id, username: user.username },
    JWT_SECRET,
    { expiresIn: '1d' }
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

        // TEST ROUTE
        app.get('/', (req, res) => {
            res.send('TravelGo backend is running');
        });

        app.listen(port, '0.0.0.0', () => {
            console.log(`Server running on port ${port}`);
        });

    } catch (error) {
        console.error('MongoDB connection failed:', error);
        process.exit(1);
    }
}

startServer();