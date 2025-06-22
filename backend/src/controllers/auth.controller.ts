// backend/src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, UserRole } from '../models/user.model';
import { Cart } from '../models/cart.model';
import { UserPreference } from '../models/userPreference.model';
import logger from '../utils/logger';
import { sendEmail } from '../services/email.service';

export class AuthController {
  // Register new user
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, firstName, lastName, phone } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Create user
      const user = await User.create({
        email,
        password,
        firstName,
        lastName,
        phone
      });

      // Create cart for user
      await Cart.create({ userId: user.id });

      // Create user preferences with default values
      await UserPreference.create({
        userId: user.id,
        autoBasketEnabled: true,
        autoBasketDay: 0, // Sunday
        autoBasketTime: '10:00',
        deliveryPreference: 'standard',
        notificationsEnabled: true,
        emailNotifications: true,
        smsNotifications: false
      });

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      logger.info(`New user registered: ${user.email}`);

      res.status(201).json({
        message: 'User registered successfully',
        user: user.toJSON(),
        accessToken,
        refreshToken
      });
    } catch (error) {
      next(error);
    }
  }

  // Login
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      // Find user with cart
      const user = await User.findOne({
        where: { email },
        include: [{ model: Cart, as: 'cart' }]
      });

      if (!user || !(await user.validatePassword(password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: 'Account is deactivated' });
      }

      // Update last login
      await user.update({ lastLoginAt: new Date() });

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      logger.info(`User logged in: ${user.email}`);

      res.json({
        message: 'Login successful',
        user: user.toJSON(),
        accessToken,
        refreshToken
      });
    } catch (error) {
      next(error);
    }
  }

  // Refresh token
  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;
      
      // Find user
      const user = await User.findByPk(decoded.userId);
      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'User not found or inactive' });
      }

      // Generate new tokens
      const newAccessToken = generateAccessToken(user);
      const newRefreshToken = generateRefreshToken(user);

      res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }
      next(error);
    }
  }

  // Logout
  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;

      logger.info(`User logged out: ${userId}`);

      res.json({ message: 'Logout successful' });
    } catch (error) {
      next(error);
    }
  }

  // Get current user
  async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;

      const user = await User.findByPk(userId, {
        include: [
          { model: Cart, as: 'cart' },
          { model: UserPreference, as: 'preferences' }
        ]
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user: user.toJSON() });
    } catch (error) {
      next(error);
    }
  }

  // Forgot password
  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      const user = await User.findOne({ where: { email } });
      if (!user) {
        // Don't reveal if user exists
        return res.json({ message: 'If the email exists, a reset link has been sent' });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

      // Save reset token
      await user.update({
        resetPasswordToken: resetTokenHash,
        resetPasswordExpires: new Date(Date.now() + 3600000) // 1 hour
      });

      // Send reset email
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      await sendEmail({
        to: user.email,
        subject: 'Password Reset Request',
        html: `
          <h1>Password Reset</h1>
          <p>You requested a password reset. Click the link below to reset your password:</p>
          <a href="${resetUrl}">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `
      });

      logger.info(`Password reset requested for: ${user.email}`);

      res.json({ message: 'If the email exists, a reset link has been sent' });
    } catch (error) {
      next(error);
    }
  }

  // Reset password
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password } = req.body;

      // Hash token
      const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Find user with valid reset token
      const user = await User.findOne({
        where: {
          resetPasswordToken: resetTokenHash,
          resetPasswordExpires: { $gt: new Date() }
        }
      });

      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      // Update password
      await user.update({
        password,
        resetPasswordToken: null,
        resetPasswordExpires: null
      });

      logger.info(`Password reset for: ${user.email}`);

      res.json({ message: 'Password reset successful' });
    } catch (error) {
      next(error);
    }
  }

  // Change password
  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { currentPassword, newPassword } = req.body;

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Validate current password
      if (!(await user.validatePassword(currentPassword))) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Update password
      await user.update({ password: newPassword });

      logger.info(`Password changed for: ${user.email}`);

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      next(error);
    }
  }
}

// Helper functions - Updated JWT expiration for dev/test environment
function generateAccessToken(user: User): string {
  // Longer token expiration for dev/test convenience
  // Can be controlled via environment variable
  const expiresIn = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' 
    ? process.env.JWT_ACCESS_TOKEN_EXPIRY || '8h'  // 8 hours for dev/test
    : '15m';  // 15 minutes for production

  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET!,
    { expiresIn }
  );
}

function generateRefreshToken(user: User): string {
  // Refresh token remains the same - 7 days for all environments
  return jwt.sign(
    {
      userId: user.id,
      type: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d' }
  );
}