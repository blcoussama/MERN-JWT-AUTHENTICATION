// Utility function for standardized error responses
const sendErrorResponse = (res, statusCode, message, debugInfo = null) => {
    console.error(`Error: ${message}`, debugInfo || "");
    res.status(statusCode).json({
        success: false,
        message,
    });
};

// Admin Dashboard Handler
export const adminDashboard = async (req, res) => {
    try {
        // Add logic for admin dashboard here
        res.status(200).json({
            success: true,
            message: "Welcome to the Admin Dashboard!",
        });
    } catch (error) {
        sendErrorResponse(res, 500, "An error occurred while accessing the Admin Dashboard.", error.stack);
    }
};

// Client Dashboard Handler
export const clientDashboard = async (req, res) => {
    try {
        // Add logic for client dashboard here
        res.status(200).json({
            success: true,
            message: "Welcome to the Client Dashboard!",
        });
    } catch (error) {
        sendErrorResponse(res, 500, "An error occurred while accessing the Client Dashboard.", error.stack);
    }
};
