// Middleware to authorize roles
export const authorizedRoles = (...allowedRoles) => {
    return (req, res, next) => {
        try {
            // Check if the user exists and their role is allowed
            if (!req.user || !allowedRoles.includes(req.user.role)) {
                return res.status(403).json({ success: false, message: "Access denied. Unsuficient permissions." });
            }
            next(); // Proceed if the user has an allowed role
        } catch (error) {
            return res.status(403).json({ success: false, message: "An error occurred during role authorization." });
        }
    };
};