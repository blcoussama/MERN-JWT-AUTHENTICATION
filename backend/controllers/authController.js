import { User } from "../models/userModel.js"

import { GenerateVerificationToken } from "../utils/VerificationToken.js"
import { GenerateJwtTtokenAndSetCookie } from "../utils/JWTandCookie.js"

import { SendVerificationEmail, SendWelcomeEmail, SendPasswordResetEmail, SendPasswordResetSuccessEmail } from "../mails/emails.js"

import bcrypt from 'bcryptjs'
import crypto from 'crypto'

// Utility function for standardized error responses
const sendErrorResponse = (res, statusCode, message, debugInfo = null) => {
    console.error(`Error: ${message}`, debugInfo || "");
    res.status(statusCode).json({
        success: false,
        message,
    });
};

export const SignUp = async(req, res) => {
    const { email, password, username, role } = req.body

    try {
        if(!email || !password || !username || !role) {
            return sendErrorResponse(res, 400, "All fields are required!");
        }

        if (!["admin", "client"].includes(role)) {
            return sendErrorResponse(res, 400, "Invalid role provided!");
        }

        const userAlreadyExists = await User.findOne({ email })
        if(userAlreadyExists) {
            return sendErrorResponse(res, 400, "User already exists!");
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
        sendErrorResponse(res, 500, "An error occurred during sign up.", error.stack);
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
            return sendErrorResponse(res, 400, "Invalid or expired verification code!");
        }

        if (user.isVerified) {
            return sendErrorResponse(res, 400, "Email is already verified!");
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
        sendErrorResponse(res, 500, "An error occurred during email verification.", error.stack);
    }
}

export const Login = async(req, res) => {
    const { email, password} = req.body

    try {
        // Input validation
        if (!email || !password) {
            return sendErrorResponse(res, 400, "Email and password are required!");
        }

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() })
        if(!user) {
            return sendErrorResponse(res, 400, "Invalid credentials!");
        }

        // Check if the user's email is verified
        if (!user.isVerified) {
            return sendErrorResponse(res, 400, "Please verify your email before logging in.");
        }

        // Verify password
        const isPasswordValid  = await bcrypt.compare(password, user.password)
        if(!isPasswordValid) {
            return sendErrorResponse(res, 400, "Invalid credentials!");
        }

        // Generate JWT and set cookie

        GenerateJwtTtokenAndSetCookie(res, user)

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
        sendErrorResponse(res, 500, "An error occurred during login.", error.stack);
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
            return sendErrorResponse(res, 400, "Email is required!");
        }

        const user = await User.findOne({ email });
        if (!user) {
            return sendErrorResponse(res, 400, "User not found!");
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
            return sendErrorResponse(res, 500, "Failed to send reset email. Please try again.");
        }

        res.status(200).json({
            success: true,
            message: "Password reset link sent successfully to your email.",
        });
    } catch (error) {
        sendErrorResponse(res, 500, "An error occurred while processing the request.", error.stack);
    }
};

export const ResetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    try {
        // Validate inputs
        if (!password) {
            return sendErrorResponse(res, 400, "Password is required!");
        }

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpiresAt: { $gt: Date.now() },
        });

        if (!user) {
            return sendErrorResponse(res, 400, "Invalid or expired reset token!");
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
        sendErrorResponse(res, 500, "An error occurred while resetting the password.", error.stack);
    }
};

export const CheckAuth = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return sendErrorResponse(res, 400, "User not found!");
        }

        res.status(200).json({
            success: true,
            user: {
                ...user._doc,
                password: undefined,
            },
        });
    } catch (error) {
        sendErrorResponse(res, 500, "An error occurred while checking authentication.", error.stack);
    }
};