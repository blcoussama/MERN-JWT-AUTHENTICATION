import mongoose from 'mongoose'

const userSchema = mongoose.Schema({
    role: {
        type: String,
        required: true,
        enum: ["admin", "client"]
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    username: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    lastLogin: {
        type: Date,
        default: Date.now
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: String,
    verificationTokenExpiresAt: Date,
    resetPasswordToken: String,
    resetPasswordExpiresAt: Date,

}, {timestamps: true}) 

export const User = mongoose.model("User", userSchema)