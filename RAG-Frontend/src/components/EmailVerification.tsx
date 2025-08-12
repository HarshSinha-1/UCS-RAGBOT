import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const EmailOtpForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChangeOtp = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move to next input
    if (value && index < 3) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email) {
      setMessage('Please enter your email address');
      setMessageType('error');
      return;
    }
    const otpString = otp.join('');
    if (otpString.length !== 4) {
      setMessage('Please enter the complete 4-digit OTP');
      setMessageType('error');
      return;
    }
    setIsLoading(true);
    setMessage('');
    try {
      const response = await fetch('http://localhost:3000/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp: otpString }),
      });

      if (response.ok) {
        console.log('verified');
        setMessage('Email verified successfully!');
        setMessageType('success');
        setTimeout(() => {
          navigate('/signin');
        }, 1500);
      } else {
        const errorData = await response.json();
        setMessage(errorData.message || 'Verification failed. Please try again.');
        setMessageType('error');
      }
    } catch (error) {
      console.log(error);
      setMessage('Network error. Please check your connection and try again.');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h2 style={styles.title}>Verify Email</h2>

        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          style={styles.input}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <input
              key={index}
              id={`otp-${index}`}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChangeOtp(index, e.target.value)}
              style={styles.otpInput}
            />
          ))}
        </div>

        {message && (
          <p
            style={{
              ...styles.message,
              color: messageType === 'error' ? '#ff6b6b' : '#32cd32',
            }}
          >
            {message}
          </p>
        )}

        <button type="submit" style={styles.button} disabled={isLoading}>
          {isLoading ? 'Verifying...' : 'Verify'}
        </button>
      </form>
    </div>
  );
};

export default EmailOtpForm;

// Styles
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    backgroundColor: '#121212',
    color: '#ffffff',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    backgroundColor: '#1e1e1e',
    padding: '2rem',
    borderRadius: '8px',
    width: '300px',
    boxShadow: '0 0 10px rgba(255,255,255,0.1)',
  },
  title: {
    textAlign: 'center',
    marginBottom: '1rem',
    fontSize: '1.5rem',
  },
  input: {
    width: '100%',
    padding: '0.6rem',
    borderRadius: '4px',
    border: '1px solid #333',
    backgroundColor: '#2b2b2b',
    color: '#fff',
    marginBottom: '1rem',
  },
  otpContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '1rem',
  },
  otpInput: {
    width: '20%',
    padding: '0.6rem',
    fontSize: '1.2rem',
    textAlign: 'center',
    borderRadius: '4px',
    border: '1px solid #333',
    backgroundColor: '#2b2b2b',
    color: '#fff',
  },
  button: {
    width: '100%',
    padding: '0.6rem',
    backgroundColor: '#4caf50',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  message: {
    marginBottom: '1rem',
    textAlign: 'center',
  },
};
