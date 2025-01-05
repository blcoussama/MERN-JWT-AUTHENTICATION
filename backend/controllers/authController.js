import { User } from "../models/userModel.js"
import bcrypt from 'bcryptjs'
import { GenerateVerificationToken } from "../utils/VerificationToken.js"
import { GenerateJwtTtokenAndSetCookie } from "../utils/JWTandCookie.js"
import { SendVerificationEmail, SendWelcomeEmail } from "../mailtrap/emails.js"

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
    
}

export const Logout = async(req, res) => {
    res.clearCookie("JWTtoken")
    res.status(200).json({success: true, message: "Logged Out Successfully."})
}