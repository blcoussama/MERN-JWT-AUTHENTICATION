import express from 'express'
import { SignUp, VerifyEmail } from '../controllers/authController.js'

const router = express.Router()

router.post("/signup", SignUp)
router.post("/verify-email", VerifyEmail)

export default router 