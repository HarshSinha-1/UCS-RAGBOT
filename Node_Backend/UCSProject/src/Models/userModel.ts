// src/models/userModel.ts

import pool from "./db";
import { Resend } from "resend";
import config from "../configs/config";

const resend = new Resend(String(config.api_resend));

export async function findUserByemail(email: string) {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    return result ; // This returns the first user object
  
} 


export async function createUser(username: string, password: string, email: string, auth_type: string) {
  const result = await pool.query(
    'INSERT INTO users (username, email, password, auth_type) VALUES ($1, $2, $3, $4) RETURNING *',
    [username, email, password,auth_type]
  );
  return result.rows[0];
}

export async function findUserById(id: number) {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0]; // This returns the first user object
}

export async function createOAuthUser(email: string , username: string, auth_type: string) {
  const result = await pool.query(
    `INSERT INTO users (email, username, is_verified, auth_type) VALUES ($1, $2, $3, $4) RETURNING *`,
    [email, username, true, auth_type]
  )
  return result;
}

export async function FindOauthUser(PROVIDER_ID: string, PROVIDER: string) {
  const result = await pool.query(
      'SELECT * FROM OAUTH_METHOD WHERE PROVIDER = $1 AND PROVIDER_ID = $2',
      [PROVIDER, PROVIDER_ID]
    );
  return result;
}

export async function createOauthMethod(userId: number, PROVIDER: string, PROVIDER_ID: string) {
  const result =  await pool.query('INSERT INTO OAUTH_METHOD (user_id, PROVIDER, provider_id) VALUES ($1, $2, $3)', [
        userId,
        PROVIDER,
        PROVIDER_ID
      ]);
   return result;
}   

export async function createUserSession(userId: number, token: string) {
  const result = await pool.query(
        'INSERT INTO user_sessions (user_id, session_token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'60 minutes\')',
        [userId, token]
      );
   return result;
}   
export async function findUserSession(userId :number) {
  const result = await pool.query(
    'SELECT * FROM user_sessions WHERE user_id = $1 AND expires_at < NOW()',
    [userId]
  );
  return result;
}

export async function deleteExpiredUserSessions(userId: number) {
  const result = await pool.query(
    `DELETE FROM user_sessions 
     WHERE user_id = $1 AND expires_at < NOW()`,
    [userId]
  );
  return result;
}


export async function CreateISVerifiedUser(email: string, otp: string) {
 try {
      const emailResponse = await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: email,
        subject: 'OTP Verification',
        html: `<p>Your OTP is: <strong>${otp}</strong></p>`,
      });

      const result = await pool.query(
        'INSERT INTO user_verification (email,otp) VALUES ($1, $2) RETURNING *',
        [email, otp]
    );

    console.log('Resend email response:', emailResponse);
      if (emailResponse.error) {
        console.error('Resend email error:', emailResponse.error);
      }
    } catch (err) {
      console.error('Error sending email:', err);
    }
}

export async function verifyCredUser(email: string, otp: string) {
  const result = await pool.query(
    'SELECT * FROM user_verification WHERE email = $1 AND otp = $2',
    [email, otp]
  );
  return result;
} 

export async function checkAuthType(email: string) {
  const result = await pool.query(
    'SELECT auth_type FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0];
}

export async function insertDocument(doc_id: string, title: string, uploaded_by: number, description: string) {
  const result = await pool.query(
    'INSERT INTO documents (doc_id, title, uploaded_by, description) VALUES ($1, $2, $3, $4) RETURNING *',
    [doc_id, title, uploaded_by, description]
  );
  return result.rows[0];
}


export async function deleteDocumentFromDB(doc_id: string) {
  const result = await pool.query(
    'DELETE FROM documents WHERE doc_id = $1 RETURNING *',
    [doc_id]
  );
  return result;
}

export async function fetchDocumentsFromDB() {
  const result = await pool.query('SELECT doc_id, title, uploaded_at, description FROM documents');
  return result.rows;
}

export async function getUserDetailbyID(userId: number) {
  const result = await pool.query(
    'SELECT id, username, email, created_at, auth_type FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0];
}