import express from 'express'
import { SignUp, VerifyEmail, Login, Logout, ForgotPassword, ResetPassword } from '../controllers/authController.js'

const router = express.Router()

router.post("/signup", SignUp)
router.post("/verify-email", VerifyEmail)
router.post("/login", Login)
router.post("/logout", Logout)
router.post("/forgot-password", ForgotPassword)
router.post("/reset-password/:token", ResetPassword)

export default router 