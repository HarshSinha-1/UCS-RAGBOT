import { Request, Response, NextFunction } from 'express';
import * as AuthService from './auth.service';
import passport from 'passport';

export async function signup(req: Request, res: Response, next: NextFunction) {
  try {
    await AuthService.handleCredentialSignUp(req, res); 
  } catch (err) {
    next(err);
  }
}

export async function signin(req: Request, res: Response, next: NextFunction) {
  try {
    await AuthService.handleCredentialSignIn(req, res);
  } catch (err) {
    next(err);
  }
}

export function googleAuth(req: Request, res: Response, next: NextFunction) {
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
}

export async function googleCallback(req: Request, res: Response, next: NextFunction) {
  try {
    await AuthService.handleGoogleCallback(req, res);
  } catch (err) {
    next(err);
  }
}

export async function githubCallback(req: Request, res: Response, next: NextFunction) {
  try {
    // Handle the GitHub OAuth callback
    await AuthService.handleGitHubCallback(req, res);
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try{
    await AuthService.verifyEmail(req, res);
  }catch (err) {
    next(err);
  }
}
