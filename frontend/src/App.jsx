import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import HomePage from './pages/HomePage'
import SignUp from './pages/SignUp'
import Login from './pages/Login'
import EmailVerification from './pages/EmailVerification'

function App() {

  return (
    
     
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={ <HomePage /> } />
            <Route path="/signup" element={ <SignUp /> } />
            <Route path="/login" element={ <Login /> } />
            <Route path="/email-verification" element={ <EmailVerification /> } />
          </Routes>
        </AppLayout>
      </BrowserRouter>
      
  )
}

export default App
