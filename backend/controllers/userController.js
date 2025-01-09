export const adminDashboard = async (req, res) => {
    try {
        // Add logic for admin dashboard
        res.status(200).json({ success: true, message: 'Welcome to the Admin Dashboard!' });
    } catch (error) {
        console.error('Error in Admin Dashboard:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const clientDashboard = async (req, res) => {
    try {
        // Add logic for client dashboard
        res.status(200).json({ success: true, message: 'Welcome to the Client Dashboard!' });
    } catch (error) {
        console.error('Error in Client Dashboard:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};