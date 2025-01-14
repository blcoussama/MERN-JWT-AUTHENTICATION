// Middleware to authorize roles
export const authorizedRoles = (...allowedRoles) => {
    return (req, res, next) => {
        try {
            // Check if the user exists and their role is allowed
            if (!req.user) {
                return res.status(401).json({ success: false, message: "Unauthorized. Please log in." });
            }
            next(); // Proceed if the user has an allowed role
            
        } catch (error) {
            return res.status(403).json({ success: false, message: "An error occurred during role authorization." });
        }
    };
};