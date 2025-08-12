import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../configs/config'; 
import fs from 'fs';
import path from 'path';


export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return res.status(401).json({ message: 'Unauthorized' });
}

 interface JwtPayload {
  id: string;
  role: string;
  // Add more if needed
}

export function AdminAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = req.headers.authorization?.split(' ')[1];
  console.log('Admin token:', token);
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const payload = jwt.verify(token, config.JWT_ADMIN_SECRET) as JwtPayload;
    req.user = payload; // assuming you extended Request type with user
    next();
  } catch(err) {
    console.error('Admin authentication error:', err);
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function UserAuthenticate(req: Request, res: Response, next: NextFunction) {

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    req.user = payload; // user: { id, role }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
