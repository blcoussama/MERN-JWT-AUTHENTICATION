import express from 'express'
import dotenv from 'dotenv'
import { connectDB } from './db/connectDB.js'
import AuthRoute from './routes/authRoutes.js'
import UserRoute from './routes/userRoutes.js'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import path from 'path'

dotenv.config()

const app = express()

const PORT = process.env.PORT || 5000

const __dirname = path.resolve()

app.use(cors({ origin: "http://localhost:5173", credentials: true}))

app.use(express.json()) // to parse JSON requests
app.use(cookieParser()) // to parse incoming cookies

app.use("/api/auth", AuthRoute)
app.use("/api/users", UserRoute)

if(process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "/frontend/dist")));

    app.get("*", (req, res) => {
        res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
    })
}

app.listen(PORT, () => {
    connectDB()
    console.log(`Server running on PORT ${PORT}.`)
})