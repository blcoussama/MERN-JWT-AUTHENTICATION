import express from 'express';
import dotenv from 'dotenv';
import { connectDB } from './db/connectDB.js';
import AuthRoute from './routes/authRoutes.js';
import UserRoute from './routes/userRoutes.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const __dirname = path.resolve();

// Validate required environment variables
if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
    console.error("Missing required environment variables!");
    process.exit(1);
}

// Middleware
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json()); // Parse JSON requests
app.use(cookieParser()); // Parse incoming cookies

// Routes
app.use("/api/auth", AuthRoute);
app.use("/api/users", UserRoute);

// Serve frontend in production
if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "/frontend/dist")));

    app.get("*", (req, res) => {
        res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
    });
}

// Start the server only after connecting to the database
connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on PORT ${PORT}.`);
        });
    })
    .catch((err) => {
        console.error("Database connection failed!", err);
        process.exit(1);
    });
