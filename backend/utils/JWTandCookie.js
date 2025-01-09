import jwt from 'jsonwebtoken'

export const GenerateJwtTtokenAndSetCookie = (res, user) => {
    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: "7d"
    })

    res.cookie("JWTtoken", token, {
        httpOnly: true, // prevents XSS Attacks
        secure: process.env.NODE_ENV === "production", // works only in production
        samesite: "strict", // prevents CSRF Attacks
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 Days
    })

    return token
}