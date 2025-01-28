import { User } from "../models/userModel.js"

import { GenerateVerificationToken } from "../utils/VerificationToken.js"
import { GenerateAccessTokenAndSetCookie } from "../utils/JWTandCookie.js"

import { SendVerificationEmail, SendWelcomeEmail, SendPasswordResetEmail, SendPasswordResetSuccessEmail } from "../mails/emails.js"

import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export const SignUp = async(req, res) => {
    const { email, password, username, role } = req.body

    try {
        if(!email || !password || !username || !role) {
            return res.status(400).json({ success: false, message: "All fields are required!"})
        }

        if (!["admin", "client"].includes(role)) {
            return res.status(400).json({ success: false, message: "Invalid role provided!"})
        }

        const userAlreadyExists = await User.findOne({ email })
        if(userAlreadyExists) {
            return res.status(400).json({ success: false, message: "User already exists!"})
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
        GenerateAccessTokenAndSetCookie(res, user)

        try {
            await SendVerificationEmail(user.email, verificationToken);
        } catch (emailError) {
            console.error("Failed to send verification email:", emailError.message);
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
        return res.status(500).json({ success: false, message: "An error occurred during sign up!"})
    }
}

export const VerifyEmail = async(req, res) => {
    const {email, code} = req.body

    try {

        // First, check if the user is already verified
        const existingUser = await User.findOne({ email })
        if (existingUser && existingUser.isVerified) {
            return res.status(400).json({ success: false, message: "Email is already verified!"})
        }
        
        const user = await User.findOne({
            verificationToken: code,
            verificationTokenExpiresAt: { $gt: Date.now() }
        })

        if(!user) {
            return res.status(400).json({ success: false, message: "Invalid or expired verification code!"})
        }

        user.isVerified = true,
        user.verificationToken = undefined,
        user.verificationTokenExpiresAt = undefined

        await user.save()

        try {
            await SendWelcomeEmail(user.email, user.username);
        } catch (emailError) {
            console.error("Failed to send welcome email:", emailError.message);
        }

        res.status(200).json({success: true, message: "Email verified successfully.", 
            user: {
                ...user._doc,
                password: undefined
            }
        })

    } catch (error) {
        return res.status(500).json({ success: false, message: "An error occurred while verifying the email"});
    }
}

export const Login = async(req, res) => {
    const { email, password} = req.body

    try {
        // Input validation
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required!"});
        }

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() })
        if(!user) {
            return res.status(400).json({ success: false, message: "Invalid credentials!"})
        }

        // Check if the user's email is verified
        if (!user.isVerified) {
            return res.status(400).json({ success: false, message: "Please verify your email before logging in!"})
        }

        // Verify password
        const isPasswordValid  = await bcrypt.compare(password, user.password)
        if(!isPasswordValid) {
            return res.status(400).json({ success: false, message: "Invalid credentials!"})
        }

        // Generate JWT and set cookie

        GenerateAccessTokenAndSetCookie(res, user)

        // Update last login timestamp
        user.lastLogin = new Date()

        await user.save()

        res.status(200).json({
            success: true,
            message: "Logged in Successfully.",
            user: {
                ...user._doc,
                password: undefined
            }
        })
    } catch (error) {
        return res.status(500).json({ success: false, message: "An error occurred during login."})
    }
}

export const Logout = async(req, res) => {
    res.clearCookie("JWTtoken") 
    res.status(200).json({success: true, message: "Logged Out Successfully."})
}

export const ForgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        // Validate email
        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required!"})
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: "User not found!"})
        }

        // Generate Reset Token
        const resetToken = crypto.randomBytes(20).toString("hex");
        const resetTokenExpiresAt = Date.now() + 1 * 60 * 60 * 1000; // 1 Hour

        user.resetPasswordToken = resetToken;
        user.resetPasswordExpiresAt = resetTokenExpiresAt;

        await user.save();

        // Send reset email
        try {
            await SendPasswordResetEmail(
                user.email,
                `${process.env.CLIENT_URL}/reset-password/${resetToken}`
            );
        } catch (emailError) {
            console.error("Failed to send password reset email:", emailError.message);
            return res.status(500).json({ success: false, message: "Failed to send reset email. Please try again!"})
        }

        res.status(200).json({
            success: true,
            message: "Password reset link sent successfully to your email.",
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "An error occurred while processing the request!"})
    }
};

export const ResetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    try {
        // Validate inputs
        if (!password) {
            return res.status(400).json({ success: false, message: "Password is required!"})
        }

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpiresAt: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid or expired reset token!"})
        }

        // Update password
        const hashedPassword = await bcrypt.hash(password, 10);

        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpiresAt = undefined;

        await user.save();

        try {
            await SendPasswordResetSuccessEmail(user.email);
        } catch (emailError) {
            console.error("Failed to send reset success email:", emailError.message);
        }

        res.status(200).json({
            success: true,
            message: "Password has been reset successfully.",
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "An error occurred while resetting the password!"})
    }
};

export const CheckAuth = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(400).json({ success: false, message: "User not found!"})
        }

        res.status(200).json({
            success: true,
            user: {
                ...user._doc,
                password: undefined,
            },
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "An error occurred while checking authenticatio!"})
    }
};