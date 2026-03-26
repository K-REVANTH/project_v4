const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ─── Public Routes ───

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, role, specialization, hospitalId, hospitalName, licenseNumber } = req.body;

    // Validate role
    const validRoles = ['patient', 'doctor', 'admin'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Email already registered' });

    // Build user data
    const userData = { name, email, password, phone, role: role || 'patient' };

    // Attach doctor-specific fields
    if (role === 'doctor') {
      if (!specialization) return res.status(400).json({ error: 'Specialization required for doctor role' });
      userData.specialization = specialization;
      userData.hospitalId = hospitalId || '';
      userData.hospitalName = hospitalName || '';
      userData.licenseNumber = licenseNumber || '';
    }

    const user = new User(userData);
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRY }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: user.toSafeObject()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRY }
    );

    res.json({
      message: 'Login successful',
      token,
      user: user.toSafeObject()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Authenticated Routes ───

// Get own profile (any authenticated user)
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update own profile (any authenticated user)
router.patch('/me', authenticate, async (req, res) => {
  try {
    const allowedFields = ['name', 'phone', 'specialization', 'hospitalId', 'hospitalName'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Profile updated', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get profile by ID — patient can only see own, doctor/admin can see any
router.get('/profile/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role === 'patient' && req.user.id !== req.params.id) {
      return res.status(403).json({ error: 'Patients can only view their own profile' });
    }
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get own notifications (any authenticated user)
router.get('/notifications', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('notifications');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin-Only Routes ───

// List all users (admin only)
router.get('/all', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { role } = req.query;
    const filter = {};
    if (role) filter.role = role;
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Change user role (admin only)
router.patch('/:id/role', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    if (!['patient', 'doctor', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Role updated', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
