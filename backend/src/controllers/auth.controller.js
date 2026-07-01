const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const { AppError } = require('../middleware/errorHandler');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
  return { accessToken, refreshToken };
};

// ─── Login ─────────────────────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError('Email and password are required', 400));
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return next(new AppError('Invalid email or password', 401));
    }

    if (user.isLocked()) {
      return next(new AppError('Account temporarily locked due to too many failed attempts. Try again in 30 minutes.', 423));
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incrementLoginAttempts();
      return next(new AppError('Invalid email or password', 401));
    }

    // Reset login attempts on success
    await User.findByIdAndUpdate(user._id, {
      loginAttempts: 0,
      $unset: { lockUntil: 1 },
      lastLogin: new Date(),
    });

    const { accessToken, refreshToken } = generateTokens(user._id);

    // Store refresh token
    await User.findByIdAndUpdate(user._id, {
      $push: { refreshTokens: { token: refreshToken } },
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Refresh Token ─────────────────────────────────────────────────────────────
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return next(new AppError('Refresh token required', 400));
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new AppError('User not found', 401));
    }

    const tokenExists = user.refreshTokens.some(t => t.token === refreshToken);
    if (!tokenExists) {
      return next(new AppError('Invalid refresh token', 401));
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);

    // Rotate refresh token
    await User.findByIdAndUpdate(user._id, {
      $pull: { refreshTokens: { token: refreshToken } },
      $push: { refreshTokens: { token: newRefreshToken } },
    });

    res.json({
      success: true,
      data: { accessToken, refreshToken: newRefreshToken },
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid or expired refresh token', 401));
    }
    next(error);
  }
};

// ─── Logout ────────────────────────────────────────────────────────────────────
exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { refreshTokens: { token: refreshToken } },
      });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

// ─── Get Me ────────────────────────────────────────────────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    res.json({ success: true, data: { user: req.user } });
  } catch (error) {
    next(error);
  }
};

// ─── Change Password ───────────────────────────────────────────────────────────
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return next(new AppError('Current and new password are required', 400));
    }
    if (newPassword.length < 8) {
      return next(new AppError('New password must be at least 8 characters', 400));
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return next(new AppError('Current password is incorrect', 400));
    }

    user.password = newPassword;
    // Clear all refresh tokens to force re-login everywhere
    user.refreshTokens = [];
    await user.save();

    res.json({ success: true, message: 'Password changed successfully. Please log in again.' });
  } catch (error) {
    next(error);
  }
};

// ─── Admin: Create User ────────────────────────────────────────────────────────
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return next(new AppError('Name, email, and password are required', 400));
    }
    if (password.length < 8) {
      return next(new AppError('Password must be at least 8 characters', 400));
    }

    const user = await User.create({ name, email, password, role: role || 'viewer' });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Admin: Get All Users ──────────────────────────────────────────────────────
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select('-password -refreshTokens').lean();
    res.json({ success: true, data: { users } });
  } catch (error) {
    next(error);
  }
};

// ─── Admin: Update User ────────────────────────────────────────────────────────
exports.updateUser = async (req, res, next) => {
  try {
    const { name, email, role, isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role, isActive },
      { new: true, runValidators: true }
    ).select('-password -refreshTokens');

    if (!user) return next(new AppError('User not found', 404));
    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
};

// ─── Admin: Reset User Password ────────────────────────────────────────────────
exports.resetUserPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return next(new AppError('Password must be at least 8 characters', 400));
    }
    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError('User not found', 404));

    user.password = newPassword;
    user.refreshTokens = [];
    user.loginAttempts = 0;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
};
