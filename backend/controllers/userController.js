// Admin Dashboard Handler
export const adminDashboard = async (req, res) => {
    try {
        // Add logic for admin dashboard here
        res.status(200).json({
            success: true,
            message: "Welcome to the Admin Dashboard!",
        });
    } catch (error) {
        return res.status(500).json({success: false, message: "An error occurred while accessing the Admin Dashboard." });
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
        return res.status(500).json({success: false, message: "An error occurred while accessing the Client Dashboard." });
    }
};
