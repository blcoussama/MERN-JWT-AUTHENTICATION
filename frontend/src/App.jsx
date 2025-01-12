import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import LoadingSpinner from './components/LoadingSpinner';
import SignUp from './pages/SignUp';
import Login from './pages/Login';
import EmailVerification from './pages/EmailVerification';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux'; // Redux hooks
import { checkAuth } from './store/authSlice'; // Redux thunk
import HomePage from './pages/HomePage';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AdminDashboard from './pages/AdminDashboard';
import ClientDashboard from './pages/ClientDashboard';

// PROTECT Routes that require authentication
const ProtectRoute = ({ children, allowedRoles }) => {
    const { isAuthenticated, user } = useSelector((state) => state.auth); // Redux state

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (!user.isVerified) {
        return <Navigate to="/verify-email" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/" replace />; // Redirect to a default page if unauthorized
    }

    return children; // Render the child components if all conditions are met
};

// REDIRECT Authenticated Users to Home Page
const RedirectAuthenticatedUsers = ({ children }) => {
    const { isAuthenticated, user } = useSelector((state) => state.auth); // Redux state

    if (isAuthenticated && user.isVerified) {
        // Redirect to respective dashboards based on user role
        switch (user.role) {
            case 'admin':
                return <Navigate to="/admin-dashboard" replace />;
            case 'client':
                return <Navigate to="/client-dashboard" replace />;
            default:
                return <Navigate to="/" replace />; // Fallback to homepage or a default page
        }
    }

    return children; // Render the child components if not authenticated or not verified
};

function App() {
    const dispatch = useDispatch(); // Redux dispatch
    const { isCheckingAuth } = useSelector((state) => state.auth); // Access Redux state

    useEffect(() => {
        dispatch(checkAuth()); // Dispatch the checkAuth thunk
    }, [dispatch]);

    if (isCheckingAuth) return <LoadingSpinner />;

    return (
        <BrowserRouter>
            <AppLayout>
                <Routes>
                    <Route
                        path="/"
                        element={
                            <ProtectRoute>
                                <HomePage />
                            </ProtectRoute>
                        }
                    />

                    <Route
                        path="/signup"
                        element={
                            <RedirectAuthenticatedUsers>
                                <SignUp />
                            </RedirectAuthenticatedUsers>
                        }
                    />

                    <Route
                        path="/login"
                        element={
                            <RedirectAuthenticatedUsers>
                                <Login />
                            </RedirectAuthenticatedUsers>
                        }
                    />

                    <Route
                        path="/verify-email"
                        element={
                            <RedirectAuthenticatedUsers>
                                <EmailVerification />
                            </RedirectAuthenticatedUsers>
                        }
                    />

                    <Route
                        path="/forgot-password"
                        element={
                            <RedirectAuthenticatedUsers>
                                <ForgotPassword />
                            </RedirectAuthenticatedUsers>
                        }
                    />

                    <Route
                        path="/reset-password/:token"
                        element={
                            <RedirectAuthenticatedUsers>
                                <ResetPassword />
                            </RedirectAuthenticatedUsers>
                        }
                    />

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

                    {/* Catch all routes */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </AppLayout>
        </BrowserRouter>
    );
}

export default App;
