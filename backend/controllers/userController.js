import { User } from "../models/userModel.js";

// Admin Dashboard Handler
export const adminDashboard = async (req, res) => {
    const { email } = req.body;

    try {
        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required!" });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found!" });
        }

        if (!user.isVerified) {
            return res.status(403).json({ success: false, message: "User email is not verified!" });
        }

        if (user.role !== "admin") {
            return res.status(403).json({ success: false, message: "Access denied. User is not an admin!" });
        }

        res.status(200).json({
            success: true,
            message: "Welcome to the Admin Dashboard!",
        });
    } catch (error) {
        console.error("Error accessing Admin Dashboard:", error.message);
        return res.status(500).json({
            success: false,
            message: "An error occurred while accessing the Admin Dashboard.",
        });
    }
};

// Client Dashboard Handler
export const clientDashboard = async (req, res) => {
    const { email } = req.body;

    try {
        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required!" });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found!" });
        }

        if (!user.isVerified) {
            return res.status(403).json({ success: false, message: "User email is not verified!" });
        }

        if (user.role !== "client") {
            return res.status(403).json({ success: false, message: "Access denied. User is not a client!" });
        }

        res.status(200).json({
            success: true,
            message: "Welcome to the Client Dashboard!",
        });
    } catch (error) {
        console.error("Error accessing Client Dashboard:", error.message);
        return res.status(500).json({
            success: false,
            message: "An error occurred while accessing the Client Dashboard.",
        });
    }
};
