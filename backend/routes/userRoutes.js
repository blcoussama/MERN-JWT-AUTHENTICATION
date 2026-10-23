import express from 'express';
import { listUsers } from '../controllers/userController.js';
import { authorizedRoles } from '../middlewares/verifyRole.js';
import { VerifyToken } from '../middlewares/verifyToken.js';

const router = express.Router();

// Admin only: the role is checked on the server, from the database.
router.get('/', VerifyToken, authorizedRoles('admin'), listUsers);

export default router;
