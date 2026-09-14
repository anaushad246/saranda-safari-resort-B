import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'saranda_safari_resort_jwt_secret_key_1998_bolani_odisha',
    { expiresIn: '7d' }
  );
};

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Please provide email and password.');
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user || !user.isActive) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  user.lastLogin = new Date();
  await user.save();

  const token = generateToken(user._id);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      },
      'Login successful'
    )
  );
});

export const getMe = asyncHandler(async (req, res) => {
  return res.status(200).json(
    new ApiResponse(200, req.user, 'Current user profile')
  );
});
