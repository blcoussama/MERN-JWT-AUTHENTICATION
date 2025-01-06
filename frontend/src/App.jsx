import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import SignUp from './pages/SignUp'
import Login from './pages/Login'
import EmailVerification from './pages/EmailVerification'
import { useEffect } from "react";
import { useAuthStore } from "./store/authStore";
import HomePage from './pages/HomePage'

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

  return children
}

function App() {

  const { isCheckingAuth, checkAuth, isAuthenticated, user } = useAuthStore();

	useEffect(() => {
		checkAuth();
	}, [checkAuth]);

  console.log("is authenticated",isAuthenticated);
  console.log("user:", user);



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
            
            <Route path="/verify-email" element={ <EmailVerification /> } />
          </Routes>
        </AppLayout>
      </BrowserRouter>
      
  )
}

export default App
