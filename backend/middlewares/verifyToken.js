import jwt from "jsonwebtoken"

export const VerifyToken = (req, res, next) => {
    const token = req.cookies.JWTtoken
    if(!token) return res.status(401).json({success: false, message: "Unauthorized - No token provided!"})

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)       
        if(!decoded) return res.status(401).json({success: false, message: "Unauthorized - Invalid Token!"})

        req.userId = decoded.userId
        next()
    } catch (error) {
        console.error(`Error verifying the token!`, error);
        return res.status(501).json({success: false, message: "Server Error!"})
    }
} 