import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
const router = Router();
const validate = (req, res, next) => { const e = validationResult(req); if (!e.isEmpty()) return res.status(400).json({ message: e.array()[0].msg }); next(); };
const safe = user => ({ id: user.id, name: user.name, email: user.email, mobile: user.mobile, employmentType: user.employmentType, monthlyIncome: user.monthlyIncome, creditScore: user.creditScore, role: user.role });
const tokenFor = user => jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
router.post('/register', [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Enter your full name.'),
  body('email').isEmail().normalizeEmail().withMessage('Enter a valid email address.'),
  body('mobile').trim().isLength({ min: 8, max: 16 }).withMessage('Enter a valid mobile number.'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  body('confirmPassword').custom((v, { req }) => v === req.body.password).withMessage('Passwords do not match.')
], validate, async (req, res, next) => {
  try {
    const { name, email, mobile, password } = req.body;
    const cleanEmail = email.toLowerCase().trim();
    const existing = await User.findOne({
      $or: [
        { email: cleanEmail },
        { mobile: mobile.trim() }
      ]
    });
    if (existing) {
      if (existing.email === cleanEmail) {
        return res.status(409).json({ message: 'An account with this email already exists. Please log in.' });
      }
      return res.status(409).json({ message: 'An account with this mobile number already exists. Please log in.' });
    }
    const user = await User.create({
      name,
      email: cleanEmail,
      mobile: mobile.trim(),
      password,
      role: cleanEmail === (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase() ? 'admin' : 'user'
    });
    res.status(201).json({ token: tokenFor(user), user: safe(user) });
  } catch (e) {
    next(e);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const rawIdentifier = (req.body.identifier || req.body.email || '').trim();
    const password = req.body.password;

    if (!rawIdentifier) {
      return res.status(400).json({ message: 'Please enter your email or mobile number.' });
    }
    if (!password) {
      return res.status(400).json({ message: 'Please enter your password.' });
    }

    let user;
    if (rawIdentifier.includes('@')) {
      user = await User.findOne({ email: rawIdentifier.toLowerCase() }).select('+password');
    } else {
      // Find by mobile number (exact, without +/spaces, or last 10 digits)
      const digitsOnly = rawIdentifier.replace(/\D/g, '');
      const last10 = digitsOnly.slice(-10);
      user = await User.findOne({
        $or: [
          { mobile: rawIdentifier },
          { mobile: digitsOnly },
          { mobile: `+91${last10}` },
          { mobile: last10 }
        ]
      }).select('+password');
    }

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials. Check your email/mobile or use 1-Click Demo Login.' });
    }
    if (user.disabled) {
      return res.status(403).json({ message: 'This account has been deactivated.' });
    }

    res.json({ token: tokenFor(user), user: safe(user) });
  } catch (e) {
    next(e);
  }
});

router.post('/demo-login', async (req, res, next) => {
  try {
    const role = req.body.role === 'admin' ? 'admin' : 'user';
    const email = role === 'admin' ? (process.env.ADMIN_EMAIL || 'admin@example.com') : 'demo@digitalloan.com';

    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      user = new User({
        name: role === 'admin' ? 'System Administrator' : 'Priya Sharma',
        email: email.toLowerCase(),
        mobile: role === 'admin' ? '9998887770' : '9876543210',
        password: role === 'admin' ? 'AdminPass123' : 'Password123',
        employmentType: 'salaried',
        monthlyIncome: role === 'admin' ? 120000 : 65000,
        creditScore: role === 'admin' ? 820 : 750,
        role
      });
      await user.save();
    }
    res.json({ token: tokenFor(user), user: safe(user), message: `Logged in as ${role === 'admin' ? 'Demo Admin' : 'Demo User'}` });
  } catch (e) {
    next(e);
  }
});
router.get('/profile', protect, (req, res) => res.json({ user: safe(req.user) }));
router.put('/profile', protect, [body('employmentType').optional().isIn(['salaried', 'self-employed', 'student', 'other']).withMessage('Choose a valid employment type.'), body('monthlyIncome').optional().isFloat({ min: 0, max: 100000000 }).withMessage('Enter a valid monthly income.'), body('creditScore').optional({ nullable: true }).isInt({ min: 300, max: 900 }).withMessage('Credit score must be between 300 and 900.')], validate, async (req, res, next) => {
  try { const fields = {}; for (const key of ['employmentType', 'monthlyIncome', 'creditScore']) if (key in req.body) fields[key] = req.body[key] === '' ? null : req.body[key]; const user = await User.findByIdAndUpdate(req.user.id, fields, { new: true, runValidators: true }); res.json({ user: safe(user) }); } catch (e) { next(e); }
});
export default router;
