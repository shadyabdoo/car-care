import type { Request, Response, NextFunction } from 'express';
import { registerSchema, loginSchema } from '../validators/authSchemas.js';
import { getCurrentUser, loginUser, registerUser } from '../services/authService.js';

export async function registerController(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = registerSchema.parse(req.body);
    const result = await registerUser(payload);
    return res.status(201).json({ success: true, ...result });
  } catch (error: any) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code });
    }
    return next(error);
  }
}

export async function loginController(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = loginSchema.parse(req.body);
    const result = await loginUser(payload);
    return res.json({ success: true, ...result });
  } catch (error: any) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code });
    }
    return next(error);
  }
}

export async function meController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
    }

    const user = await getCurrentUser(req.user.id);
    return res.json({ success: true, user });
  } catch (error: any) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code });
    }
    return next(error);
  }
}
