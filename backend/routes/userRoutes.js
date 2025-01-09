import express from 'express';
import { VerifyToken } from '../middlewares/verifyToken.js';
import { adminDashboard, clientDashboard } from '../controllers/userController.js';
import { authorizedRoles } from '../middlewares/VerifyRole.js';

const router = express.Router();

// Admin routes
router.get('/admin-dashboard', VerifyToken, authorizedRoles("admin"), adminDashboard);

// Client routes
router.get('/client-dashboard', VerifyToken, authorizedRoles("client"), clientDashboard);


export default router;