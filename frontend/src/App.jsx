import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import LoadingSpinner from './components/LoadingSpinner'
import SignUp from './pages/SignUp'
import Login from './pages/Login'
import EmailVerification from './pages/EmailVerification'
import { useEffect } from "react";
import { useAuthStore } from "./store/authStore";
import HomePage from './pages/HomePage'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

// PROTECT Routes that require authentication
const ProtectRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore()

  if(!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if(!user.isVerified) {
    return <Navigate to="/verify-email" replace />
  }

  return children;
}

// REDIRECT Authenticated Users to Home Page
const RedirectAuthenticatedUsers = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore()

  if(isAuthenticated && user.isVerified) {
    return <Navigate to="/" replace />
  }

  return children;
}


function App() {

  const { isCheckingAuth, checkAuth } = useAuthStore();

	useEffect(() => {
		checkAuth();
	}, [checkAuth]);

  if(isCheckingAuth) return <LoadingSpinner />

  return (
    
     
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={
              <ProtectRoute>
                <HomePage />
              </ProtectRoute>
            } />

            <Route path="/signup" element={ 
              <RedirectAuthenticatedUsers>
                <SignUp />
              </RedirectAuthenticatedUsers>
            } />

            <Route path="/login" element={
              <RedirectAuthenticatedUsers>
                <Login />
              </RedirectAuthenticatedUsers>
            } />
            
            
            <Route path="/verify-email" element={ 
              <RedirectAuthenticatedUsers>
                  <EmailVerification />
              </RedirectAuthenticatedUsers>
            } />

            <Route path='/forgot-password' element={ 
              <RedirectAuthenticatedUsers>
                <ForgotPassword />
              </RedirectAuthenticatedUsers> 
            } />

            <Route path='/reset-password/:token' element={ 
              <RedirectAuthenticatedUsers>
                <ResetPassword /> 
              </RedirectAuthenticatedUsers>
            } />

            {/* catch all routes */}
				    <Route path='*' element={<Navigate to='/' replace />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
      
  )
}

export default App
