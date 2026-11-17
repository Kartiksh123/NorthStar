import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  createUser,
  findUserByEmail,
  findUserById,
} from '../models/userModel.js';

function createToken(user) {
  return jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn: '1h' },
  );
}

export async function registerUser(name, email, password) {
  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    const error = new Error('An account with this email already exists.');
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await createUser(name, email, passwordHash);

  return { user, token: createToken(user) };
}

export async function loginUser(email, password) {
  const user = await findUserByEmail(email);

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return null;
  }

  return {
    user: { id: user.id, name: user.name, email: user.email },
    token: createToken(user),
  };
}

export async function getUser(userId) {
  return findUserById(userId);
}
