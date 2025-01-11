import { User } from "../models/userModel.js"

import { GenerateVerificationToken } from "../utils/VerificationToken.js"
import { GenerateJwtTtokenAndSetCookie } from "../utils/JWTandCookie.js"

import { SendVerificationEmail, SendWelcomeEmail, SendPasswordResetEmail, SendPasswordResetSuccessEmail } from "../mails/emails.js"

import bcrypt from 'bcryptjs'
import crypto from 'crypto'

import jwt from 'jsonwebtoken' // Added this import


export const SignUp = async(req, res) => {
    const { email, password, username, role } = req.body

    try {
        if(!email || !password || !username || !role) {
            throw new Error("All Fields are required!")
        }

        if (!["admin", "client"].includes(role)) {
            throw new Error("Invalid role provided!");
        }

        const userAlreadyExists = await User.findOne({ email })
        if(userAlreadyExists) {
            return res.status(400).json({success: false, message: "User Aleady Exists"})
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const verificationToken = GenerateVerificationToken()

        const user = new User({
            email,
            password: hashedPassword,
            username,
            role,
            verificationToken,
            verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 Hours
        })

        await user.save()

        //JWT TOKEN
        GenerateJwtTtokenAndSetCookie(res, user)

        try {
            await SendVerificationEmail(user.email, verificationToken);
        } catch (emailError) {
            console.error("Email failed to send:", emailError.message);
        }

        res.status(201).json({
            success: true, 
            message: "User Created Successfully.",
            user: {
                ...user._doc,
                password: undefined
            }
        })

    } catch (error) {
        res.status(500).json({success: false, message: error.message})
    }
}

export const VerifyEmail = async(req, res) => {
    const {code} = req.body

    try {
        const user = await User.findOne({
            verificationToken: code,
            verificationTokenExpiresAt: { $gt: Date.now() }
        })

        if(!user) {
            return res.status(400).json({success: false, message: "Invalid or Expired Verification Code!"})
        }

        if (user.isVerified) {
            return res.status(400).json({ success: false, message: "Email is already verified!" });
        }

        user.isVerified = true,
        user.verificationToken = undefined,
        user.verificationTokenExpiresAt = undefined

        await user.save()

        try {
            await SendWelcomeEmail(user.email, user.username);
        } catch (emailError) {
            console.error("Error sending welcome email:", emailError.message);
        }

        res.status(200).json({success: true, message: "Email Verified.", 
            user: {
                ...user._doc,
                password: undefined
            }
        })

    } catch (error) {
        console.log("Error in Email Verification", error.message);
        res.status(500).json({success: false, message: "Server Error"})
    }
}

export const Login = async(req, res) => {
    const { email, password} = req.body

    try {
        // Input validation
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required!" });
        }

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() })
        if(!user) {
            return res.status(400).json({
                success: false, 
                message: "Invalid credentials!"
            })
        }

        // Check if user is already logged in (has an active session)
        const existingToken = req.cookies.JWTtoken
        if (existingToken) {
            try {
                const decoded = jwt.verify(existingToken, process.env.JWT_SECRET)
                if (decoded.userId === user._id.toString()) {
                    return res.status(400).json({
                        success: false,
                        message: "You are already logged in!"
                    })
                }
            } catch (error) {
                // If token is invalid/expired, continue with login
                res.clearCookie("JWTtoken")
            }
        }

        // Check if the user's email is verified
        if (!user.isVerified) {
            return res.status(400).json({ success: false, message: "Please verify your email before logging in." });
        }

        // Verify password
        const isPasswordValid  = await bcrypt.compare(password, user.password)
        if(!isPasswordValid) {
            return res.status(400).json({success: false, message: "Invalid Credentials!"})
        }

        // Generate JWT and set cookie

        GenerateJwtTtokenAndSetCookie(res, user)

        // Update last login timestamp
        user.lastLogin = new Date()

        await user.save()

        res.status(200).json({
            success: true,
            message: "LoggedIn Successfully.",
            user: {
                ...user._doc,
                password: undefined
            }
        })
    } catch (error) {
        console.log("Error while Login!", error);
        res.status(500).json({success: false, message: error.message})
    }
}

export const Logout = async(req, res) => {
    res.clearCookie("JWTtoken") 
    res.status(200).json({success: true, message: "Logged Out Successfully."})
}

export const ForgotPassword = async(req, res) => {
    const { email } = req.body

    try {
        const user = await User.findOne({ email })
        if(!user) {
            return res.status(400).json({success: false, message: "User Not Found!"})
        }

        // Generate Reset Token
        const resetToken = crypto.randomBytes(20).toString("hex")
        const resetTokenExpiresAt = Date.now() + 1 * 60 * 60 * 1000 // 1 Hour

        user.resetPasswordToken = resetToken,
        user.resetPasswordExpiresAt = resetTokenExpiresAt

        await user.save()

        // Send EMAIL
        await SendPasswordResetEmail(user.email, `${process.env.CLIENT_URL}/reset-password/${resetToken}`)

        res.status(200).json({success: true, message: "Password Reset link sent successfully to your email."})

    } catch (error) {
        console.log("Error Sending the Password reset email!", error)
        res.status(400).json({success: false, message: error.message})
    }
}

export const ResetPassword = async(req, res) => {
    try {
        const { token } = req.params
        const { password } = req.body
        
        if(!password) {
            throw new Error("Password is required!")
        }

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpiresAt: { $gt: Date.now() }
        })

        if(!user) {
            return res.status(400).json({success: false, message: "Invalid or Expired Reset Token!"})
        }

        // Update Password
        const hashedPassword = await bcrypt.hash(password, 10)

        user.password = hashedPassword
        user.resetPasswordToken = undefined
        user.resetPasswordExpiresAt = undefined

        await user.save()

        SendPasswordResetSuccessEmail(user.email)
        res.status(200).json({success: true, message: "Password has been Reset Successfully."})

    } catch (error) {
        console.error(`Error while reseting the password!`, error);
        res.status(400).json({success: false, message: error.message})
    }
}

export const CheckAuth = async(req, res) => {
    try {
        const user = await User.findById(req.user.userId)
        if(!user) return res.status(400).json({success: false, message: "User Not Found!"})

        res.status(200).json({
            success: true,
            user: {
            ...user._doc,
            password: undefined
            }
        })
    } catch (error) {
        console.error(`Error In Checking the Authentication!`, error);
        res.status(400).json({success: false, message: error.message})
    }
}