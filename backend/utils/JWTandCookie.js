import jwt from 'jsonwebtoken'

export const GenerateAccessTokenAndSetCookie = (res, user) => {
    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: "30s"
    })

    res.cookie("AccessToken", token, {
        httpOnly: true, // prevents XSS Attacks
        secure: process.env.NODE_ENV === "production", // works only in production
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict", // prevents CSRF Attacks
        maxAge: 30 * 1000 // 30 Secondes
    })

    return token
}

export const GenerateRefreshTokenAndSetCookie = (res, user) => {
    const refreshToken = jwt.sign({ userId: user._id }, process.env.REFRESH_SECRET, {
        expiresIn: "5m", 
    });

    res.cookie("RefreshToken", refreshToken, {
        httpOnly: true, // Prevent XSS attacks
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict", // Prevent CSRF attacks
        maxAge: 5 * 60 * 1000, // 5 Minutes
    });

    return refreshToken;
};