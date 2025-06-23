// backend/src/controllers/auth.controller.ts
// FIXED: Added database transaction for user registration (R-1)

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Transaction } from 'sequelize';
import { User, UserRole } from '@/models/user.model';
import { Cart } from '@/models/cart.model';
import { UserPreference } from '@/models/userPreference.model';
import { sequelize } from '@/config/database.config';
import logger from '@/utils/logger';
import { sendEmail } from '@/services/email.service';

export class AuthController {
  // FIXED: Register new user with proper transaction wrapping
  async register(req: Request, res: Response, next: NextFunction) {
    const transaction: Transaction = await sequelize.transaction();
    
    try {
      const { email, password, firstName, lastName, phone } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ 
        where: { email },
        transaction 
      });
      
      if (existingUser) {
        await transaction.rollback();
        return res.status(400).json({ error: 'User already exists' });
      }

      // Create user within transaction
      const user = await User.create({
        email,
        password,
        firstName,
        lastName,
        phone
      }, { transaction });

      // Create cart for user within same transaction
      await Cart.create({ 
        userId: user.id 
      }, { transaction });

      // Create user preferences with default values within same transaction
      await UserPreference.create({
        userId: user.id,
        autoBasketEnabled: true,
        autoBasketDay: 0, // Sunday
        autoBasketTime: '10:00',
        deliveryPreference: 'standard',
        notificationsEnabled: true,
        emailNotifications: true,
        smsNotifications: false
      }, { transaction });

      // Commit transaction only after all operations succeed
      await transaction.commit();

      // Generate tokens (outside transaction)
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      logger.info(`New user registered successfully: ${user.email}`);

      res.status(201).json({
        message: 'User registered successfully',
        user: user.toJSON(),
        accessToken,
        refreshToken
      });
    } catch (error) {
      // Rollback transaction on any error
      await transaction.rollback();
      logger.error('User registration failed:', error);
      next(error);
    }
  }

  // Login (unchanged)
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      // Find user with cart
      const user = await User.findOne({
        where: { email },
        include: [{ model: Cart, as: 'cart' }]
      });

      if (!user || !(await user.validatePassword(password))) {
        return res.status(401).json({ error: 'Invalid email or password' });
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

      if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token required' });
      }

      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;
      const user = await User.findByPk(decoded.userId);

      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }

      const newAccessToken = generateAccessToken(user);
      const newRefreshToken = generateRefreshToken(user);

      res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      });
    } catch (error) {
      res.status(401).json({ error: 'Invalid refresh token' });
    }
  }

  // Logout
  async logout(req: Request, res: Response, next: NextFunction) {
    // In a production app, you might want to blacklist the token
    res.json({ message: 'Logged out successfully' });
  }

  // Get current user
  async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await User.findByPk((req as any).user.id, {
        include: [{ model: Cart, as: 'cart' }]
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
        // Don't reveal if email exists
        return res.json({ message: 'If the email exists, a reset link has been sent' });
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour

      await user.update({
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires
      });

      // Send email (implement according to your email service)
      await sendEmail({
        to: user.email,
        subject: 'Password Reset',
        template: 'password-reset',
        data: { resetToken, user: user.firstName }
      });

      res.json({ message: 'If the email exists, a reset link has been sent' });
    } catch (error) {
      next(error);
    }
  }

  // Reset password
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password } = req.body;

      const user = await User.findOne({
        where: {
          resetPasswordToken: token,
          resetPasswordExpires: { [Op.gt]: new Date() }
        }
      });

      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      await user.update({
        password,
        resetPasswordToken: null,
        resetPasswordExpires: null
      });

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      next(error);
    }
  }

  // Change password
  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = (req as any).user.id;

      const user = await User.findByPk(userId);
      if (!user || !(await user.validatePassword(currentPassword))) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      await user.update({ password: newPassword });

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      next(error);
    }
  }
}

// Helper functions for JWT
function generateAccessToken(user: User): string {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRY || '8h' }
  );
}

function generateRefreshToken(user: User): string {
  return jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d' }
  );
}