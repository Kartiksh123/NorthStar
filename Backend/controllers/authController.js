import {
  getUser,
  loginUser,
  registerUser,
} from '../services/authService.js';

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function register(req, res) {
  const body = req.body || {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = body.password;

  if (!name || !isValidEmail(email) || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({
      message: 'Provide a name, valid email, and password with at least 8 characters.',
    });
  }

  try {
    const result = await registerUser(name, email, password);
    return res.status(201).json(result);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : 'Could not create the account.',
    });
  }
}

export async function login(req, res) {
  const body = req.body || {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = body.password;

  if (!isValidEmail(email) || typeof password !== 'string') {
    return res.status(400).json({ message: 'Provide a valid email and password.' });
  }

  try {
    const result = await loginUser(email, password);

    if (!result) {
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }

    return res.json(result);
  } catch {
    return res.status(500).json({ message: 'Could not log in.' });
  }
}

export async function currentUser(req, res) {
  try {
    const user = await getUser(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User account was not found.' });
    }

    return res.json({ user });
  } catch {
    return res.status(500).json({ message: 'Could not load the user account.' });
  }
}
