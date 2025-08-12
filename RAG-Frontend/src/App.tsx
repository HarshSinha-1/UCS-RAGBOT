import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Welcome from './components/Welcome.jsx';
import Signup from './components/SignUp.js'; 
import ChatInterface from './components/ChatInterface';
import Upload from './Upload';
import Signin from './components/SignIn.js';
import OAuthSuccess from './components/oauth-success.js';
import EmailVerification from './components/EmailVerification.js'
import AdminInterface from './components/AdminDashboard.js';
import './index.css'

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  console.log(token);
  return token ? children : <Navigate to="/signin" />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/oauth-success" element={<OAuthSuccess />} />
        <Route path='/email-verify' element={<EmailVerification />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatInterface onNewUpload={() => {}} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminInterface />
            </ProtectedRoute>
          }
        />
        <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
        <Route path="/signin" element={<Signin />} />
        <Route path="/admin" element={<AdminInterface />} />
      </Routes>
    </Router>
  );
}

export default App;