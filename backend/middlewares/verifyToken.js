import jwt from "jsonwebtoken";

// Middleware to verify JWT token
export const VerifyToken = (req, res, next) => {
    try {
        // Check if token exists
        const token = req.cookies.JWTtoken;
        // if (!token) {
        //     return res.status(401).json({ success: false, message:"Unauthorized: No token provided."});
        // }

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // if (!decoded) {
        //     return res.status(401).json({ success: false, message: "Unauthorized: Invalid token."});
        // }

        // Attach user info to the request object
        req.user = { userId: decoded.userId, role: decoded.role };
        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        sendErrorResponse(res, 500, "An error occurred while verifying the token.", error.stack);
    }
};
