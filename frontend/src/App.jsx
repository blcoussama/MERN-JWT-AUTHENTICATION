import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import LoadingSpinner from './components/LoadingSpinner';
import AdminDashboard from './pages/AdminDashboard';
import ClientDashboard from './pages/ClientDashboard';
import EmailVerification from './pages/EmailVerification';
import ForgotPassword from './pages/ForgotPassword';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import SignUp from './pages/SignUp';
import { checkAuth } from './store/authSlice';

const homeFor = (user) => (user?.role === 'admin' ? '/admin-dashboard' : '/client-dashboard');

// Client-side guard for navigation only: the real authorisation is done by the API.
const ProtectRoute = ({ children, allowedRoles }) => {
    const { isAuthenticated, user } = useSelector((state) => state.auth);

    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to={homeFor(user)} replace />;

    return children;
};

// Pages reserved to visitors (login, sign-up...): a logged-in user goes to his dashboard.
const RedirectAuthenticatedUsers = ({ children }) => {
    const { isAuthenticated, user } = useSelector((state) => state.auth);
    if (isAuthenticated) return <Navigate to={homeFor(user)} replace />;
    return children;
};

const Home = () => {
    const { isAuthenticated, user } = useSelector((state) => state.auth);
    return <Navigate to={isAuthenticated ? homeFor(user) : '/login'} replace />;
};

function App() {
    const dispatch = useDispatch();
    const { isCheckingAuth } = useSelector((state) => state.auth);

    useEffect(() => {
        // An expired access token is refreshed transparently by the axios interceptor.
        dispatch(checkAuth());
    }, [dispatch]);

    if (isCheckingAuth) return <LoadingSpinner />;

    const guest = (page) => <RedirectAuthenticatedUsers>{page}</RedirectAuthenticatedUsers>;

    return (
        <BrowserRouter>
            <AppLayout>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/signup" element={guest(<SignUp />)} />
                    <Route path="/login" element={guest(<Login />)} />
                    <Route path="/verify-email" element={guest(<EmailVerification />)} />
                    <Route path="/forgot-password" element={guest(<ForgotPassword />)} />
                    <Route path="/reset-password/:token" element={guest(<ResetPassword />)} />
                    <Route
                        path="/admin-dashboard"
                        element={
                            <ProtectRoute allowedRoles={['admin']}>
                                <AdminDashboard />
                            </ProtectRoute>
                        }
                    />
                    <Route
                        path="/client-dashboard"
                        element={
                            <ProtectRoute allowedRoles={['client']}>
                                <ClientDashboard />
                            </ProtectRoute>
                        }
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </AppLayout>
        </BrowserRouter>
    );
}

export default App;
