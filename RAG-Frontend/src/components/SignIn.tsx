import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Divider,
  Fade,
  CircularProgress,
  Stack,
  InputAdornment,
  IconButton,
  createTheme,
  ThemeProvider,
  CssBaseline
} from '@mui/material';
import {
  GitHub,
  Visibility,
  VisibilityOff,
  Login,
  DarkMode,
  LightMode,
  CheckCircle,
  Cancel
} from '@mui/icons-material';
import axios from 'axios';
import { toast } from 'react-toastify';

// Custom Google Logo Component with colorful design
const GoogleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" style={{ marginRight: '8px' }}>
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />d
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const SignIn = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  // State types
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  // Create dynamic theme based on dark mode state
  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: darkMode ? '#90caf9' : '#1976d2',
      },
      background: {
        default: darkMode ? '#121212' : '#f5f5f5',
        paper: darkMode ? '#1e1e1e' : '#ffffff',
      },
    },
    components: {
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
          },
        },
      },
    },
  });

  // Validation functions
  const validateEmail = (email: string): string => {
    if (!email) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return '';
  };

  const validatePassword = (password: string): string => {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/(?=.*[a-z])/.test(password)) return 'Password must contain at least one lowercase letter';
    if (!/(?=.*[A-Z])/.test(password)) return 'Password must contain at least one uppercase letter';
    if (!/(?=.*\d)/.test(password)) return 'Password must contain at least one number';
    if (!/(?=.*[@$!%*?&])/.test(password)) return 'Password must contain at least one special character (@$!%*?&)';
    return '';
  };

  // Handle field changes with validation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (touched.email) {
      const error = validateEmail(value);
      setErrors(prev => ({ ...prev, email: error }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (touched.password) {
      const error = validatePassword(value);
      setErrors(prev => ({ ...prev, password: error }));
    }
  };

  // Handle field blur (when user leaves the field)
  const handleBlur = (field: 'email' | 'password') => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    let error = '';
    switch (field) {
      case 'email':
        error = validateEmail(email);
        break;
      case 'password':
        error = validatePassword(password);
        break;
      default:
        break;
    }
    
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);

  const newErrors = {
    email: emailError,
    password: passwordError
  };

  setErrors(newErrors);
  setTouched({ email: true, password: true });

  if (emailError || passwordError) {
    toast.error('Please fix the validation errors');
    return;
  }

  setIsLoading(true);

  try {
    const res = await axios.post('http://localhost:3000/auth/signin', {
      email,
      password,
      auth_type: 'Credentials',
      credentials: 'include',
    }, {
  withCredentials: true
});

if (res.data.message) {
  setMessage(res.data.message);
  
  // Optionally clear after 3 seconds
  setTimeout(() => setMessage(''), 3000);
}



if (res.data.redirectUrl) {
  window.location.href = res.data.redirectUrl;
}

    toast.success(res.data.message || 'Login successful!');
    console.log(res.data.jwtToken);
    localStorage.setItem('token', res.data.jwtToken); // Store the token
    setEmail('');
    setPassword('');
    setErrors({});
    setTouched({});
    
    // Check if user has admin role and redirect accordingly
    if (res.data.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/chat'); // Or wherever your protected page is
    }
  } catch (err) {
    if (axios.isAxiosError(err)) {
      setMessage(err.response?.data?.message || 'Something went wrong.');
    } else {
      setMessage('Something went wrong.');
    }
    setTimeout(() => setMessage(''), 3000);
  } finally {
    setIsLoading(false);
  }
};


  const handleSocialLogin = (provider: 'Google' | 'GitHub') => {
  let backendURL = 'http://localhost:3000/auth'; // change this to your backend base if deployed

  if (provider === 'Google') {
    const googleClientId = '388750826958-f5jq3orpap06ejo8rg42olos6trnrr4g.apps.googleusercontent.com';
    const redirectUri = 'http://localhost:3000/auth/google/callback';
    const scope = 'profile email';
    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=794186765503-qvhanhrou67qu77mg1q23gd51t35dnlk.apps.googleusercontent.com&redirect_uri=http://localhost:3000/auth/google/callback&response_type=code&scope=openid%20email%20profile&access_type=offline&prompt=consent`
    window.location.href = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=794186765503-qvhanhrou67qu77mg1q23gd51t35dnlk.apps.googleusercontent.com&redirect_uri=http://localhost:3000/auth/google/callback&response_type=code&scope=openid%20email%20profile&access_type=offline&prompt=consent';
  } 
  else if (provider === 'GitHub') {
    window.location.href = `${backendURL}/github`;
  }
};

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {message && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50">
          {message}
        </div>
      )}
      <Box
        sx={{
          minHeight: '100vh',
          background: darkMode 
            ? 'radial-gradient(circle at center, #1a1a1a 0%, #0d1117 100%)'
            : 'radial-gradient(circle at center, #f2f2f2 0%, #dcdcdc 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
          position: 'relative'
        }}
      >
        {/* Dark Mode Toggle Button */}
        <IconButton
          onClick={() => setDarkMode(!darkMode)}
          sx={{
            position: 'absolute',
            top: 20,
            right: 20,
            backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            backdropFilter: 'blur(10px)',
            '&:hover': {
              backgroundColor: darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
            },
          }}
        >
          {darkMode ? <LightMode /> : <DarkMode />}
        </IconButton>

        <Fade in timeout={500}>
          <Paper
            elevation={10}
            sx={{
              p: 4,
              maxWidth: 420,
              width: '100%',
              background: darkMode 
                ? 'rgba(30, 30, 30, 0.8)' 
                : 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: 4,
              boxShadow: darkMode 
                ? '0 8px 32px rgba(0, 0, 0, 0.4)' 
                : '0 8px 32px rgba(0, 0, 0, 0.1)',
              border: darkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
            }}
          >
            <Box textAlign="center" mb={4}>
              <Typography variant="h4" fontWeight="bold" mb={1}>
                Welcome Back
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sign in to continue
              </Typography>
            </Box>

            {/* Login Form */}
            <Box component="form" onSubmit={handleSubmit} sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                variant="outlined"
                value={email}
                onChange={handleEmailChange}
                onBlur={() => handleBlur('email')}
                error={touched.email && !!errors.email}
                helperText={touched.email && errors.email}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                variant="outlined"
                value={password}
                onChange={handlePasswordChange}
                onBlur={() => handleBlur('password')}
                error={touched.password && !!errors.password}
                helperText={touched.password && errors.password}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{ mb: 3 }}
              />

              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={isLoading}
                startIcon={!isLoading && <Login />}
                sx={{ 
                  py: 1.5, 
                  borderRadius: '12px', 
                  fontWeight: 'bold',
                  background: darkMode 
                    ? 'linear-gradient(45deg, #90caf9 30%, #64b5f6 90%)'
                    : 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                }}
              >
                {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
              </Button>
            </Box>

            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mb: 3 }}>
              Don't have an account?{' '}
              <Link 
                to="/signup" 
                style={{ 
                  fontWeight: 'bold', 
                  textDecoration: 'none',
                  color: darkMode ? '#90caf9' : '#1976d2'
                }}
              >
                Sign up
              </Link>
            </Typography>

            <Divider sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" px={2}>OR</Typography>
            </Divider>

            <Stack spacing={2}>
              <Button
                onClick={() => handleSocialLogin('Google')}
                variant="outlined"
                fullWidth
                sx={{ 
                  py: 1.5, 
                  borderRadius: '12px',
                  borderColor: darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.23)',
                  '&:hover': {
                    borderColor: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
                    backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'
                  }
                }}
              >
                <GoogleLogo />
                Continue with Google
              </Button>
              <Button
                onClick={() => handleSocialLogin('GitHub')}
                variant="outlined"
                fullWidth
                startIcon={<GitHub />}
                sx={{ 
                  py: 1.5, 
                  borderRadius: '12px',
                  borderColor: darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.23)',
                  '&:hover': {
                    borderColor: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
                    backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'
                  }
                }}
              >
                Continue with GitHub
              </Button>
            </Stack>

            <Box textAlign="center" mt={4}>
              <Typography variant="caption" color="text.secondary">
                <Link 
                  to="/terms" 
                  style={{ 
                    color: 'inherit', 
                    textDecoration: 'none',
                    opacity: 0.7
                  }}
                >
                  Terms
                </Link> |{' '}
                <Link 
                  to="/privacy" 
                  style={{ 
                    color: 'inherit', 
                    textDecoration: 'none',
                    opacity: 0.7
                  }}
                >
                  Privacy
                </Link>
              </Typography>
            </Box>
          </Paper>
        </Fade>
      </Box>
    </ThemeProvider>
  );
};

export default SignIn;