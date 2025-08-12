import { Router } from 'express';
import * as AuthController from './auth.controller';
import passport from 'passport';
import { handleGoogleCallback } from './auth.service'; // Import the callback handler
import {githubCallback ,googleCallback } from '../auth/auth.controller'; // Import the GitHub callback handler

const authRoutes = Router();

authRoutes.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Login with Google</title>
        <style>
          body {
            display: flex;
            height: 100vh;
            justify-content: center;
            align-items: center;
            background-color: #f5f5f5;
            font-family: Arial, sans-serif;
          }
  
          .google-btn {
            display: inline-flex;
            align-items: center;
            padding: 10px 20px;
            background-color: #fff;
            color: #444;
            border: 1px solid #ccc;
            border-radius: 5px;
            font-size: 16px;
            text-decoration: none;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: all 0.2s ease-in-out;
          }
  
          .google-btn:hover {
            box-shadow: 0 4px 6px rgba(0,0,0,0.15);
            background-color: #f7f7f7;
          }
  
          .google-icon {
            width: 20px;
            height: 20px;
            margin-right: 10px;
          }
        </style>
      </head>
      <body>
        <a class="google-btn" href="/auth/google">
          <img class="google-icon" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg" alt="Google icon" />
          Login with Google
        </a>
      </body>
      </html>
    `);
  });

authRoutes.post('/signin', AuthController.signin);

authRoutes.get('/google', AuthController.googleAuth);

authRoutes.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: true }), // ✅ Must be true
  googleCallback,
  async (req, res, next) => {
    try {
      await handleGoogleCallback(req, res); // store session / respond with token
    } catch (err) {
      next(err);
    }
  }
);


authRoutes.get('/github', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = 'http://localhost:3000/auth/github/callback';
  const scope = 'user:email';
  res.redirect(`https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`);
});

authRoutes.get(
  '/github/callback',
  passport.authenticate('custom-github', { failureRedirect: '/signin', session: false }),
  githubCallback
);

authRoutes.post('/signup', AuthController.signup);

authRoutes.post('/verify', AuthController.verifyEmail);

authRoutes.get('/profile', (req, res) => {
    if (!req.user) return res.redirect('/');
    res.send(`<h1>Welcome ${JSON.stringify(req.user)}</h1>`);
});
  
authRoutes.get('/logout', (req, res) => {
    req.logout((err) => {
      if (err) return res.send('Error logging out');
      res.redirect('/');
    });
  });

authRoutes.get('/dashboard', (req, res) => {
  // Check if user is authenticated
  if (req.isAuthenticated()) {
    res.send('<h1>Welcome to the Dashboard!</h1>'); // Render your dashboard content
  } else {
    res.redirect('/signin');  // Redirect to login if not authenticated
  }
});

export default authRoutes;