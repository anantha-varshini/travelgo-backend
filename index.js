require('dotenv').config();
const express = require('express');
const app = express();
const bcrypt=require('bcrypt');
const jwt=require('jsonwebtoken');
const port = 5050;
const cors = require('cors'); 

app.use(cors());
app.use(express.json());   

app.get('/', (req, res) => {
    console.log("Hello Everyone");
    res.send("Hello Everyone");
});

const { MongoClient, ServerApiVersion } = require('mongodb');
const { config } = require('dotenv');

const uri = process.env.MONGO_URI;

const client = new MongoClient(uri, {
    family: 4,
    serverApi: { 
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
 
async function run() {
    try {
        await client.connect();

        // Travel database -> bookings collection

const users = client.db("Travelgo").collection("users");

const secretKey = process.env.JWT_SECRET;

app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        console.log("REGISTER DATA:", req.body);

        // Check if user already exists
        const existingUser = await users.findOne({ username });

        if (existingUser) {
            return res.status(400).json({
                message: "Username already exists"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Save user to MongoDB
        const result = await users.insertOne({
            username: username,
            password: hashedPassword
        });

        console.log("USER INSERTED:", result.insertedId);

        res.status(201).json({
            message: "User registered successfully",
            userId: result.insertedId
        });

    } catch (error) {
        console.error("REGISTER ERROR:", error);

        res.status(500).json({
            message: "Registration failed",
            error: error.message
        });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Check input
        if (!username || !password) {
            return res.status(400).json({
                message: 'Username and password are required' 
            });
        }

        // Find user
        const user = await users.findOne({ username });

        // Use the same message for user-not-found and wrong-password
        if (!user) {
            return res.status(401).json({
                message: 'Invalid username or password'
            });
        }

        // Compare entered password with hashed password
        const isValidPassword = await bcrypt.compare(
            password,
            user.password
        );

        if (!isValidPassword) {
            return res.status(401).json({
                message: 'Invalid username or password'
            });
        }

        // Create JWT
        const token = jwt.sign(
            { username: user.username },
            secretKey,
            { expiresIn: '1h' }
        );

        console.log('Login successful');

        return res.status(200).json({
            message: 'Login successful',
            token
        });

    } catch (error) {
        console.error('LOGIN ERROR:', error);

        return res.status(500).json({
            message: 'Login failed'
        });
    }
});

    const travel = client.db("Travelgo").collection("bookings");

     app.post('/bookings', async (req, res) => {
    try {
        console.log("BOOKING DATA:", req.body);
        const result = await travel.insertOne(req.body);
        console.log("INSERTED ID:", result.insertedId);
        res.status(201).json({
            message: "Booking saved successfully",
            bookingId: result.insertedId
        });

    } catch (error) {
        console.error("BOOKING ERROR:", error);
        res.status(500).json({
            message: "Failed to save booking",
            error: error.message
        });
    }
});
   const travel2 = client.db("Travelgo").collection("contact");
     app.post('/contact',async(req,res)=>{
      try{
        console.log("Contact data:",req.body);
        const result=await travel2.insertOne(req.body);
         console.log("INSERTED ID:", result.insertedId);
        res.status(201).json({
            message: "Message sent Successfully",
            contactId: result.insertedId
        });

      }catch (error) {
        console.error("CONTACT ERROR:", error);
        res.status(500).json({
            message: "Failed to send message",
            error: error.message
        });
    }
     })

        await client.db("admin").command({ ping: 1 });

        console.log("Pinged your deployment. You successfully connected to MongoDB!");

    } catch (error) {
        console.error("MongoDB connection error:", error);
    }
}

run();

app.listen(port, () => {
    console.log(`Connected to port ${port}`);
});