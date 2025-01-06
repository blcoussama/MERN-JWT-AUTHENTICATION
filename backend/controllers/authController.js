import { User } from "../models/userModel.js"

import { GenerateVerificationToken } from "../utils/VerificationToken.js"
import { GenerateJwtTtokenAndSetCookie } from "../utils/JWTandCookie.js"

import { SendVerificationEmail, SendWelcomeEmail, SendPasswordResetEmail, SendPasswordResetSuccessEmail } from "../mailtrap/emails.js"

import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export const SignUp = async(req, res) => {
    const { email, password, name } = req.body

    try {
        if(!email || !password || !name) {
            throw new Error("All Fields are required!")
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
            name,
            verificationToken,
            verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 Hours
        })

        await user.save()

        //JWT TOKEN
        GenerateJwtTtokenAndSetCookie(res, user._id)

        await SendVerificationEmail(user.email, verificationToken)

        res.status(201).json({
            success: true, 
            message: "User Created Successfully.",
            user: {
                ...user._doc,
                password: undefined
            }
        })

    } catch (error) {
        res.status(404).json({success: false, message: error.message})
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

        user.isVerified = true,
        user.verificationToken = undefined,
        user.verificationTokenExpiresAt = undefined

        await user.save()
        await SendWelcomeEmail(user.email, user.name)

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
        const user = await User.findOne({ email })
        if(!user) {
            return res.status(400).json({success: false, message: "Invalid Credentials!"})
        }
        const isPasswordValid  = await bcrypt.compare(password, user.password)
        if(!isPasswordValid) {
            return res.status(400).json({success: false, message: "Invalid Credentials!"})
        }

        GenerateJwtTtokenAndSetCookie(res, user._id)

        user.lasLogin = new Date()
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
        res.status(400).json({success: false, message: error.message})
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
        const user = await User.findById(req.userId)
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