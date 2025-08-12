// components/oauth-success.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const OAuthSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      localStorage.setItem('token', token);
      navigate('/chat'); // redirect to your protected route
    } else {
      navigate('/signin'); // fallback
    }
  }, []);

  return null; // or show loading spinner
};

export default OAuthSuccess;
