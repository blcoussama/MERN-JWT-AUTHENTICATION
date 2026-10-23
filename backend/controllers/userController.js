import { toPublicUser, User } from '../models/userModel.js';

const PAGE_SIZE = 50;

/** GET /api/users?page=1 (admin only): paginated list of accounts, without any secret field. */
export const listUsers = async (req, res) => {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const [users, total] = await Promise.all([
        User.find().sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE),
        User.countDocuments(),
    ]);

    return res.status(200).json({
        success: true,
        users: users.map(toPublicUser),
        page,
        pageSize: PAGE_SIZE,
        total,
    });
};
