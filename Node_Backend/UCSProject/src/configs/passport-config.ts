import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import dotenv from 'dotenv';
import { Strategy as CustomStrategy } from 'passport-custom';
import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { verifyGoogleProfileAndLogin, verifyGitHubProfileAndLogin } from '../api/auth/auth.service'; // Adjust paths if needed
import { findUserById } from '../Models/userModel';


dotenv.config();

// Google OAuth Strategy
export function googleAuth(req: Request, res: Response, next: NextFunction) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = 'http://localhost:3000/auth/google/callback';
  const scopes = ['openid', 'email', 'profile'];
  const scope = encodeURIComponent(scopes.join(' '));
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;

  res.redirect(authUrl);
}

// Google OAuth Strategy
passport.use('google', new CustomStrategy(
  async (req, done) => {
    try {
      const code = req.query.code as string;
      if (!code) return done(new Error('Missing Google code'));

      console.log('[Google] Received code:', code);

      // 1. Exchange code for access token
      const tokenRes = await axios.post<{ access_token: string }>('https://oauth2.googleapis.com/token', {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: 'http://localhost:3000/auth/google/callback',
        grant_type: 'authorization_code',
      });

      const { access_token } = tokenRes.data;

      if (!access_token) {
        console.error('[Google] No access token received:', tokenRes.data);
        return done(new Error('Failed to get Google access token'));
      }

      console.log('[Google] Access Token:', access_token);

      // 2. Fetch user info
      const profileRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const data = profileRes.data as {
        sub: string;
        given_name?: string;
        name?: string;
        email?: string;
        picture?: string;
        [key: string]: any;
      };

      const profile = {
        id: data.sub,
        username: data.given_name || '',
        displayName: data.name || '',
        emails: [{ value: data.email }],
        provider: 'google',
        _json: data,
      };
      console.log('[Google] Profile:', profile);

      const googleLoginResponse = await verifyGoogleProfileAndLogin(profile);

     if (!googleLoginResponse.success) {
       return done(new Error(googleLoginResponse.error), null);
   }

  //console.log('[Google] Sending userId to serialize:', googleLoginResponse.userId); // 👀 Add this
  return done(null, {
   id: googleLoginResponse.userId,
   jwtToken: googleLoginResponse.jwtToken,
   email: googleLoginResponse.email,
   success: true,
   message: googleLoginResponse.message,
});

    } catch (err: any) {
      console.error('[Google] Custom OAuth Error:', err.message);
      return done(err);
    }
  }
));

export function githubAuth(req: Request, res: Response, next: NextFunction) {
  passport.authenticate('github', { scope: ['user:email'] })(req, res, next);
}
 
// GitHub OAuth Strategy
passport.use('custom-github', new CustomStrategy(
  async (req, done) => {
    try {
      const code = req.query.code as string;
      if (!code) {
        return done(new Error('Missing GitHub code'));
      }

      console.log('[GitHub] Received code:', code);

      // 1. Exchange code for access token
      const tokenRes = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: 'http://localhost:3000/auth/github/callback',
        },
        {
          headers: {
            Accept: 'application/json',
          },
        }
      );

      const tokenData = tokenRes.data as { access_token?: string };
      const accessToken = tokenData.access_token;
      if (!accessToken) {
        console.error('[GitHub] No access token received:', tokenRes.data);
        return done(new Error('Failed to get GitHub access token'));
      }

      console.log('[GitHub] Access Token:', accessToken);

      // 2. Use token to fetch GitHub profile
      const profileRes = await axios.get('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      const emailsRes = await axios.get('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const emailsArray = Array.isArray(emailsRes.data) ? emailsRes.data : [];
      const email = emailsArray.find((e: any) => e.primary)?.email;

 // Assert the type of profileRes.data
      const githubData = profileRes.data as {
       id: number;
       login: string;
       name: string;
       avatar_url: string;
       [key: string]: any;
   };

 const profile = {
   id: githubData.id,
   username: githubData.login,
   displayName: githubData.name,
   emails: [{ value: email }],
   photos: [{ value: githubData.avatar_url }],
   provider: 'github',
   _json: githubData,
 };

      // 3. Pass to your custom login handler
      const githubLoginResponse = await verifyGitHubProfileAndLogin(profile);

      if (!githubLoginResponse.success) {
        return done(new Error(githubLoginResponse.error), null);
      }

      console.log('[GitHub] Login Response:', githubLoginResponse);
      return done(null, githubLoginResponse);
    } catch (err: any) {
      console.error('[GitHub] Custom OAuth Error:', err.message);
      return done(err);
    }
  }
));


passport.serializeUser((userId: any, done) => {
 // console.log('[SerializeUser] Received:', userId); // 👀 Add this

  if (!userId) {
    return done(new Error('No user ID to serialize'), null);
  }
  done(null, userId);
});


passport.deserializeUser(async (userObj: any, done) => {
  try {
    const id = typeof userObj === 'object' && userObj !== null ? userObj.id : userObj;

    if (!id || isNaN(Number(id))) {
      return done(new Error('Invalid user ID in session'), null);
    }

   // console.log('Deserializing user ID:', id);

    const user = await findUserById(Number(id)); // Ensure it's a number

    if (!user) return done(new Error('User not found'), null);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});


