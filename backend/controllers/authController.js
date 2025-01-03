import { User } from "../models/userModel.js"
import bcrypt from 'bcryptjs'
import { GenerateVerificationToken } from "../utils/VerificationToken.js"
import { GenerateJwtTtokenAndSetCookie } from "../utils/JWTandCookie.js"

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