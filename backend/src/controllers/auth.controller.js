import bcrypt from 'bcryptjs';
import { z } from 'zod';
import db from '../config/database.js';
import { signToken, sanitizeUser } from '../utils/auth.js';

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(128),
  role: z.enum(['owner', 'viewer']).optional().default('owner'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export function register(req, res) {
  try {
    const data = registerSchema.parse(req.body);
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(data.email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = bcrypt.hashSync(data.password, 12);
    const result = db
      .prepare(
        'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)'
      )
      .run(data.email.toLowerCase(), passwordHash, data.name, data.role);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    const token = signToken({ userId: user.id, role: user.role });

    res.status(201).json({ user: sanitizeUser(user), token });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
}

export function login(req, res) {
  try {
    const data = loginSchema.parse(req.body);
    const user = db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(data.email.toLowerCase());

    if (!user || !bcrypt.compareSync(data.password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken({ userId: user.id, role: user.role });
    res.json({ user: sanitizeUser(user), token });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    res.status(500).json({ error: 'Login failed' });
  }
}

export function getMe(req, res) {
  res.json({ user: req.user });
}
