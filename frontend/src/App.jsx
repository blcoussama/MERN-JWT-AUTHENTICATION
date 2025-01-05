import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import HomePage from './pages/HomePage'
import SignUp from './pages/SignUp'

function App() {

  return (
    
     
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={ <HomePage /> } />
            <Route path="/signup" element={ <SignUp /> } />
          </Routes>
        </AppLayout>
      </BrowserRouter>
      
  )
}

export default App
