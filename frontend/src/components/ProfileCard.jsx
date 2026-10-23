import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import { FormatDate } from '../utils/Date';

const Card = ({ title, delay, children }) => (
    <motion.div
        className="p-4 bg-gray-800/50 rounded-lg border border-gray-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
    >
        <h3 className="text-xl font-semibold text-green-400 mb-3">{title}</h3>
        {children}
    </motion.div>
);

/** Profile + account activity + logout button, shared by both dashboards. */
const ProfileCard = ({ title = 'Dashboard', children }) => {
    const dispatch = useDispatch();
    const { user, isLoading } = useSelector((state) => state.auth);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full mx-auto mt-10 p-8 bg-gray-900/80 backdrop-blur-lg rounded-xl shadow-2xl border border-gray-800"
        >
            <h2 className="text-3xl font-bold mb-6 text-center bg-linear-to-r from-green-400 to-emerald-600 text-transparent bg-clip-text">
                {title}
            </h2>

            <div className="space-y-6">
                <Card title="Profile Information" delay={0.2}>
                    <p className="text-gray-300">Name: {user?.username || 'N/A'}</p>
                    <p className="text-gray-300">Email: {user?.email || 'N/A'}</p>
                    <p className="text-gray-300">Role: {user?.role || 'N/A'}</p>
                </Card>

                <Card title="Account Activity" delay={0.4}>
                    <p className="text-gray-300">
                        <span className="font-bold">Joined: </span>
                        {user?.createdAt
                            ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                            : 'N/A'}
                    </p>
                    <p className="text-gray-300">
                        <span className="font-bold">Last Login: </span>
                        {user?.lastLogin ? FormatDate(user.lastLogin) : 'N/A'}
                    </p>
                </Card>

                {children}
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-4">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => dispatch(logout())}
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-linear-to-r from-green-500 to-emerald-600 text-white
                    font-bold rounded-lg shadow-lg hover:from-green-600 hover:to-emerald-700
                    focus:outline-hidden focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                >
                    Logout
                </motion.button>
            </motion.div>
        </motion.div>
    );
};

export { Card };
export default ProfileCard;
