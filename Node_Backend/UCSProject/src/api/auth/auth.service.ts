import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import pool from '../../Models/db';
import JWT  from 'jsonwebtoken';
import { promise, z } from 'zod';
import config from '../../configs/config';
import genHashvalue from  '../../utils/utils';
import { Resend } from 'resend';
import { createUser , CreateISVerifiedUser, findUserByemail,createOAuthUser,FindOauthUser, createOauthMethod, createUserSession, verifyCredUser,findUserSession,deleteExpiredUserSessions } from '../../Models/userModel';
import  JWT_SECRET  from '../../configs/config';

enum AuthType {
  CREDENTIALS = 'Credentials',
  OAuth = 'OAuth',
}
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).+$/;
const SignINSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string()
    .min(8, "Password must be at least 8 characters long")
    .regex(passwordRegex, "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"),
  auth_type: z.string(),  
});
const SignupSchema = z.object({
  username: z.string().min(3).max(10),
  password: z.string()
    .min(8, "Password must be at least 8 characters long")
    .regex(passwordRegex, "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"),
   email: z.string().email("Invalid email"),
   auth_type: z.string()
});

export async function handleCredentialSignIn(req: Request, res: Response) {
try{ 
  const validation = SignINSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ 
      message: "Incorrect input format",
      error  : validation.error});
  }
 
  const { email, password , auth_type } = validation.data;

  if(email === 'admin123@gmail.com'){
    const adminResult = await findUserByemail(email);
    if (adminResult.rows.length > 0) {
      const admin = adminResult.rows[0];
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Invalid password" });
      }
      const existingSession = await findUserSession(admin.id);

      if (!existingSession || existingSession.rows.length === 0 || isTokenExpired(existingSession.rows[0].expires_at)) {
        const token = await JWT.sign({ id: admin.id}, config.JWT_ADMIN_SECRET!, { expiresIn: '1h' });
        const session = await createUserSession(admin.id, token);
        if (!session) throw new Error("Failed to create new session");

        return res.status(200).json({
           success: true,
           userId: admin.id,
           jwtToken: token,
           email,
           message: 'New session created',
           role: 'admin',
           redirect : '/admin/dashboard'
        });

      }
   const expiresAt = new Date(existingSession.rows[0].expires_at).getTime() / 1000; // Convert to seconds
   if(isTokenExpired(expiresAt)) {
        console.log('Token expired');
        // Token is expired, delete the session
        const deletesession =  await deleteExpiredUserSessions(admin.id);
        //console.log('Deleted expired session for admin:', deletesession);
        const token = await JWT.sign({ id: admin.id}, config.JWT_ADMIN_SECRET!, { expiresIn: '1h' });
        const session = await createUserSession(admin.id, token);
        if (!session) throw new Error("Failed to create new session");
        
        
        return res.status(200).json({
           success: true,
           userId: admin.id,
           jwtToken: token,
           email,
           message: 'New session created',
           role: 'admin',
           redirect : '/admin/dashboard'
        });
  }
     
    // Reuse existing token
      return res.status(200).json({
        message: 'Login successful,Session reused', 
        role: 'admin',
        success: true,
        adminId: admin.id,
        jwtToken: existingSession.rows[0].session_token,
        redirect : '/admin/dashboard'
      })

  }
}
  
if (auth_type !== 'Credentials') {
    return res.status(403).json({
      message: 'Please sign in with Google/Github'
    });
  } 
  
const userResult = await findUserByemail(email);
if (!userResult || !userResult.rows || userResult.rows.length === 0) {
  return res.status(400).json({ message: "Invalid. Please register yourself." });
}

const user = userResult.rows[0];

// Prevent comparing passwords for OAuth users
if (user.auth_type !== 'Credentials') {
  return res.status(403).json({
    message: 'This account was created using Google/GitHub. Please sign in with that provider.',
    redirect: '/api/auth/google'
  });
}

console.log('Provided password:', password);
//console.log('Stored hashed password:', user.password);

const hashedPassword = user.password;
if (!hashedPassword) {
  return res.status(500).json({ message: 'No password set for this user. Cannot perform credential login.' });
}

const isMatch = await bcrypt.compare(password, hashedPassword);
if (!isMatch) {
  return res.status(400).json({ message: "Invalid password" });
}

if (!userResult.rows[0].is_verified) {
    return res.status(403).json({ 
      message: "Please verify your email first",
      redirect: '/api/auth/verify'});
  }
  
const existingSession = await findUserSession(user.id);

if (!existingSession || existingSession.rows.length === 0) {
        // Create new token and session
        const token = await JWT.sign({ id: user.id, email }, config.JWT_SECRET!, { expiresIn: '1h' });
        const session = await createUserSession(user.id, token);
        if (!session) throw new Error("Failed to create new session");

        return res.status(200).json({
           success: true,
           userId: user.id,
           jwtToken: token,
           email,
           message: 'New session created'
        });

 }
 const expiresAt1 = new Date(existingSession.rows[0].expires_at).getTime() / 1000;
 if(isTokenExpired(expiresAt1)) {
        // Token is expired, delete the session
        const deletesession =  await deleteExpiredUserSessions(user.id);
        console.log("Deleted existing sessions ",deletesession.rows)
        const token = await JWT.sign({ id: user.id, email }, config.JWT_SECRET!, { expiresIn: '1h' });
        const session = await createUserSession(user.id, token);
        if (!session) throw new Error("Failed to create new session");
        
        return res.status(200).json({
                success: true,
                userId: user.id,
                jwtToken: token,
                email,
                message: 'New session created'
         });

  }
 // Reuse existing token
      return res.status(200).json({
        message: 'Login successful,Session reused', 
        success: true,
        userId: user.id,
        jwtToken: existingSession.rows[0].session_token,
        email
      })

} catch (error) {
  console.error('Error during credential sign-In:', error);
  return res.status(500).json({ message: "Internal server error" });
}
  
}

export const verifyGoogleProfileAndLogin = async (profile: any) => {
  try {
    const PROVIDER = 'google';
    const PROVIDER_ID = profile.id;
    const email = profile._json?.email || profile.emails?.[0]?.value;
    const name = profile.displayName || profile.username || 'Unknown';
    console.log("Google Profile Email:", email);

    if (email === 'No Email') throw new Error('No email found in Google profile');

    const userResult = await findUserByemail(email);
    let userId: number;

    if (userResult && userResult.rows?.[0]) {
      const user = userResult.rows[0];

     
        if (user.auth_type === 'Credentials') {
          throw new Error('Please sign in using credentials. OAuth login is not allowed for this account.');
        }
        
      

      const AuthmethodRes = await FindOauthUser(PROVIDER_ID, PROVIDER);

      if (!AuthmethodRes || AuthmethodRes.rows?.[0]?.provider !== PROVIDER) {
        throw new Error('Please authenticate using GitHub.');
      }

      const existingSession = await findUserSession(user.id);

      if (!existingSession || existingSession.rows.length === 0 || isTokenExpired(existingSession.rows[0].expires_at)) {
        const token = await JWT.sign({ id: user.id, email }, config.JWT_SECRET!, { expiresIn: '1h' });
        const session = await createUserSession(user.id, token);
        if (!session) throw new Error("Failed to create new session");

        return { success: true, userId: user.id, jwtToken: token, email, message: 'New session created' };
      }
      const expiresAt = new Date(existingSession.rows[0].expires_at).getTime() / 1000;
      if(isTokenExpired(expiresAt)) {
        // Token is expired, delete the session
        const deletesession =  await deleteExpiredUserSessions(user.id);
        console.log("Deleted existing sessions ",deletesession.rows)
        const token = await JWT.sign({ id: user.id, email }, config.JWT_SECRET!, { expiresIn: '1h' });
        const session = await createUserSession(user.id, token);
        if (!session) throw new Error("Failed to create new session");

        return { success: true, userId: user.id, jwtToken: token, email, message: 'New session created' };
     }
  
      return{
        success: true,
        userId: user.id,
        jwtToken: existingSession.rows[0].session_token,
        email,
        message: 'Session reused'
      };
    }

    // User does not exist, create them
    const newUser = await createOAuthUser(email, name, AuthType.OAuth);
    if (!newUser?.rows?.[0]) throw new Error("Failed to create user");

    userId = newUser.rows[0].id;

    const oauthCreated = await createOauthMethod(userId, PROVIDER, PROVIDER_ID);
    if (!oauthCreated) throw new Error("Failed to create OAuth method");

    const token = await JWT.sign({ id: userId, email }, config.JWT_SECRET!, { expiresIn: '1h' });
    const session = await createUserSession(userId, token);
    if (!session) throw new Error("Failed to create user session");

    return { success: true, userId, jwtToken: token, email };
  } catch (err: any) {
    console.error('Error in verifyGoogleProfileAndLogin:', err.message);
    return { success: false, error: err.message };
  }
};


export const handleGoogleCallback = async (req: Request, res: Response) => {
  const loginData = req.user as any;
  console.log('Google Login Data:', loginData);
  if (!loginData?.success) {
    return res.status(400).json({ error: loginData?.error  });
  }

  // You can set a cookie or redirect as needed
  console.log('✅ Google Login Successful:', loginData);

  // Example: set token as cookie
  res.cookie('token', loginData.jwtToken, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
  });

  res.locals.isAuthenticated = true; // Set authenticated flag

  res.setHeader('Authorization', `Bearer ${loginData.jwtToken}`);
  const redirectURL = `http://localhost:5173/oauth-success?token=${loginData.jwtToken}`;
  return res.redirect(redirectURL);
};


export async function handleCredentialSignUp(req: Request, res: Response) {
   try {
    const validation = SignupSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        message: "Incorrect input format",
        error : validation.error
       });
    }

    const { username, password, email, auth_type } = validation.data;
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await findUserByemail(email);

    if (result.rows.length > 0) {
      return res.status(400).json({ message: "Username already exists\n Please SignIn.!" });
    }

    const resend = new Resend(String(config.api_resend));
    const otp = await genHashvalue(4);

    const user = await createUser(username, hashedPassword, email, AuthType.CREDENTIALS);
    const is_verified = await CreateISVerifiedUser(email, otp);
    if (!user) {
      return res.status(500).json({ message: "Failed to Register User. Please try again Again." });
    }
    return res.status(201).json({
      message: "User created successfully. Please verify your email.",
      email : email,
      redirect: '/api/auth/verify',
    });
  } catch (error) {
    return res.status(500).json({ 
      message: "Internal Server Error", 
      error: error instanceof Error ? error.message : String(error) });
  }
}

// Check if the access token is expired
const isTokenExpired = (expirationTime: number): boolean => {
  const currentTime = Date.now() / 1000; // Get current time in seconds
  return currentTime > expirationTime;
};

// Example function that verifies the user with the stored access token
export const verifyGitHubProfileAndLogin = async (profile: any) => {
  try {
    const PROVIDER = 'github';
    const PROVIDER_ID = profile.id;
    const email = profile.emails?.[0]?.value || 'No Email';
    const name = profile.displayName || profile.username || 'Unknown';

    if (email === 'No Email') throw new Error('No email found in GitHub profile');

    const userResult = await findUserByemail(email);
    let userId: number;

    if (userResult && userResult.rows?.[0]) {
      const user = userResult.rows[0];

      if (user.auth_type === 'Credentials') {
        return { success: false, error: 'Please sign in using Credentials, you cannot use OAuth.' };
      }

      const AuthmethodRes = await FindOauthUser(PROVIDER_ID, PROVIDER);

      if (!AuthmethodRes || AuthmethodRes.rows?.[0]?.provider !== PROVIDER) {
        throw new Error('Please authenticate using Google.');
      }

      const existingSession = await findUserSession(user.id);

      if (!existingSession || existingSession.rows.length === 0) {
        // Create new token and session
        const token = await JWT.sign({ id: user.id, email }, config.JWT_SECRET!, { expiresIn: '1h' });
        const session = await createUserSession(user.id, token);
        if (!session) throw new Error("Failed to create new session");

        return { success: true, userId: user.id, jwtToken: token, email, message: 'New session created' };
      }
      
      const expiresAt = new Date(existingSession.rows[0].expires_at).getTime() / 1000;
      if(isTokenExpired(expiresAt)) {
        // Token is expired, delete the session
        await deleteExpiredUserSessions(user.id);
        const token = await JWT.sign({ id: user.id, email }, config.JWT_SECRET!, { expiresIn: '1h' });
        const session = await createUserSession(user.id, token);
        if (!session) throw new Error("Failed to create new session");

        return { success: true, userId: user.id, jwtToken: token, email, message: 'New session created' };
      }

      // Reuse existing token
      return {
        success: true,
        userId: user.id,
        jwtToken: existingSession.rows[0].session_token,
        email,
        message: 'Session reused'
      };
    }

    // User does not exist, create them
    const newUser = await createOAuthUser(email, name, AuthType.OAuth);
    if (!newUser?.rows?.[0]) throw new Error("Failed to create user");

    userId = newUser.rows[0].id;

    const oauthCreated = await createOauthMethod(userId, PROVIDER, PROVIDER_ID);
    if (!oauthCreated) throw new Error("Failed to create OAuth method");

    const token = await JWT.sign({ id: userId, email }, config.JWT_SECRET!, { expiresIn: '1h' });
    const session = await createUserSession(userId, token);
    if (!session) throw new Error("Failed to create user session");

    return { success: true, userId, jwtToken: token, email };
  } catch (err: any) {
    console.error('Error in verifyGitHubProfileAndLogin:', err.message);
    return { success: false, error: err.message };
  }
};


export async function githubCallback(req: Request, res: Response, next: NextFunction) {
  try {
    await handleGitHubCallback(req, res);
    console.log(req.user);
  } catch (err) {
    next(err);
  }
}

export const handleGitHubCallback = async (req: Request, res: Response) => {
  const loginData = req.user as any;
  if (!loginData?.success) {
    return res.status(400).json({ error: loginData?.error || 'Login failed' });
  }

  // You can set a cookie or redirect as needed
  console.log('✅ GitHub Login Successful:', loginData);

  // Example: set token as cookie
  res.cookie('token', loginData.jwtToken, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
  });

  res.locals.isAuthenticated = true; // Set authenticated flag

  res.setHeader('Authorization', `Bearer ${loginData.jwtToken}`);
  const redirectURL = `http://localhost:5173/oauth-success?token=${loginData.jwtToken}`;
  return res.redirect(redirectURL);
};


export async function verifyEmail(req: Request, res: Response) {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }
  const result = await verifyCredUser(email, otp);
  if (!result || !result.rows || result.rows.length === 0) {
    return res.status(400).json({ message: "Invalid OTP or email\n Please try again." });
  }
  
  await pool.query(
    'UPDATE users SET is_verified = $1 WHERE email = $2',
    [true, email]
  );

  return res.status(200).json({ 
    message: "Email verified successfully",
    redirect: '/api/auth/signin'});

}