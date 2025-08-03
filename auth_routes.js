// backend/src/routes/auth.js

const express = require('express');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');
const Joi = require('joi');

const router = express.Router();
const prisma = new PrismaClient();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Validation schemas
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().min(2).max(50).required(),
  role: Joi.string().valid('CUSTOMER', 'MAKER').required(),
  // Maker profile fields (optional)
  materials: Joi.array().items(Joi.string()).when('role', {
    is: 'MAKER',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  printerVolume: Joi.string().when('role', {
    is: 'MAKER',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  resolution: Joi.string().when('role', {
    is: 'MAKER',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  hasEnclosure: Joi.boolean().default(false),
  availability: Joi.string().optional(),
  hourlyRate: Joi.number().min(0).optional(),
  city: Joi.string().optional(),
  state: Joi.string().optional()
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password } = value;

    // Sign in with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get user from our database
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        makerProfile: true,
        customerProfile: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        makerProfile: user.makerProfile,
        customerProfile: user.customerProfile
      },
      session: authData.session
    });
  } catch (error) {
    next(error);
  }
});

// Register
router.post('/register', async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { 
      email, 
      password, 
      name, 
      role,
      materials,
      printerVolume,
      resolution,
      hasEnclosure,
      availability,
      hourlyRate,
      city,
      state
    } = value;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Sign up with Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Create user in our database
    const userData = {
      email,
      name,
      role,
      isActive: true
    };

    // Add profile data based on role
    if (role === 'MAKER') {
      userData.makerProfile = {
        create: {
          materials: materials || [],
          printerVolume: printerVolume || '',
          resolution: resolution || '0.2mm',
          hasEnclosure: hasEnclosure || false,
          status: 'OFFLINE',
          availability,
          hourlyRate,
          city,
          state,
          country: 'US'
        }
      };
    } else if (role === 'CUSTOMER') {
      userData.customerProfile = {
        create: {
          preferredMaterials: ['PLA'],
          city,
          state,
          country: 'US'
        }
      };
    }

    const user = await prisma.user.create({
      data: userData,
      include: {
        makerProfile: true,
        customerProfile: true
      }
    });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        makerProfile: user.makerProfile,
        customerProfile: user.customerProfile
      },
      session: authData.session,
      message: 'Registration successful. Please check your email to verify your account.'
    });
  } catch (error) {
    next(error);
  }
});

// Logout
router.post('/logout', async (req, res, next) => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

// Refresh token
router.post('/refresh', async (req, res, next) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    res.json({ session: data.session });
  } catch (error) {
    next(error);
  }
});

// Reset password
router.post('/reset-password', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    next(error);
  }
});

// Update password
router.post('/update-password', async (req, res, next) => {
  try {
    const { password, access_token } = req.body;

    if (!password || !access_token) {
      return res.status(400).json({ error: 'Password and access token are required' });
    }

    // Set session
    const { error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token: req.body.refresh_token
    });

    if (sessionError) {
      return res.status(401).json({ error: sessionError.message });
    }

    // Update password
    const { error } = await supabase.auth.updateUser({
      password
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;