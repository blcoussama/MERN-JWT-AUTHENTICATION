// Utility function for standardized error responses
const sendErrorResponse = (res, statusCode, message, debugInfo = null) => {
    console.error(`Error: ${message}`, debugInfo || "");
    res.status(statusCode).json({
        success: false,
        message,
    });
};

// Middleware to authorize roles
export const authorizedRoles = (...allowedRoles) => {
    return (req, res, next) => {
        try {
            // Check if the user exists and their role is allowed
            if (!req.user || !allowedRoles.includes(req.user.role)) {
                return sendErrorResponse(res, 403, "Access denied: Insufficient permissions.");
            }
            next(); // Proceed if the user has an allowed role
        } catch (error) {
            sendErrorResponse(res, 500, "An error occurred during role authorization.", error.stack);
        }
    };
};