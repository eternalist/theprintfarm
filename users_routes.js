// backend/src/routes/users.js

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const Joi = require('joi');
const { requireRole, requireOwnershipOrAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  avatar: Joi.string().uri().optional(),
  // Maker profile fields
  materials: Joi.array().items(Joi.string()).optional(),
  printerVolume: Joi.string().optional(),
  resolution: Joi.string().optional(),
  hasEnclosure: Joi.boolean().optional(),
  status: Joi.string().valid('ONLINE', 'OFFLINE', 'BUSY', 'AWAY').optional(),
  availability: Joi.string().optional(),
  hourlyRate: Joi.number().min(0).optional(),
  city: Joi.string().optional(),
  state: Joi.string().optional(),
  // Customer profile fields
  preferredMaterials: Joi.array().items(Joi.string()).optional(),
  maxBudget: Joi.number().min(0).optional()
});

const adminUpdateUserSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  role: Joi.string().valid('CUSTOMER', 'MAKER', 'ADMIN').optional(),
  isActive: Joi.boolean().optional()
});

// Get current user profile
router.get('/profile', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        makerProfile: true,
        customerProfile: true,
        _count: {
          select: {
            favorites: true,
            messagesSent: true,
            messagesReceived: true,
            printRequests: true,
            assignedPrints: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove sensitive data
    const { passwordHash, ...safeUser } = user;

    res.json(safeUser);
  } catch (error) {
    next(error);
  }
});

// Update current user profile
router.put('/profile', async (req, res, next) => {
  try {
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const userId = req.user.id;
    const { 
      name, 
      avatar,
      // Maker fields
      materials,
      printerVolume,
      resolution,
      hasEnclosure,
      status,
      availability,
      hourlyRate,
      city,
      state,
      // Customer fields
      preferredMaterials,
      maxBudget
    } = value;

    // Update user base data
    const userData = {};
    if (name !== undefined) userData.name = name;
    if (avatar !== undefined) userData.avatar = avatar;

    // Prepare profile updates
    const makerProfileData = {};
    const customerProfileData = {};

    if (req.user.role === 'MAKER') {
      if (materials !== undefined) makerProfileData.materials = materials;
      if (printerVolume !== undefined) makerProfileData.printerVolume = printerVolume;
      if (resolution !== undefined) makerProfileData.resolution = resolution;
      if (hasEnclosure !== undefined) makerProfileData.hasEnclosure = hasEnclosure;
      if (status !== undefined) makerProfileData.status = status;
      if (availability !== undefined) makerProfileData.availability = availability;
      if (hourlyRate !== undefined) makerProfileData.hourlyRate = hourlyRate;
      if (city !== undefined) makerProfileData.city = city;
      if (state !== undefined) makerProfileData.state = state;
    }

    if (req.user.role === 'CUSTOMER') {
      if (preferredMaterials !== undefined) customerProfileData.preferredMaterials = preferredMaterials;
      if (maxBudget !== undefined) customerProfileData.maxBudget = maxBudget;
      if (city !== undefined) customerProfileData.city = city;
      if (state !== undefined) customerProfileData.state = state;
    }

    // Update user and profiles
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Update base user data
      if (Object.keys(userData).length > 0) {
        await tx.user.update({
          where: { id: userId },
          data: userData
        });
      }

      // Update maker profile
      if (req.user.role === 'MAKER' && Object.keys(makerProfileData).length > 0) {
        await tx.makerProfile.update({
          where: { userId },
          data: makerProfileData
        });
      }

      // Update customer profile
      if (req.user.role === 'CUSTOMER' && Object.keys(customerProfileData).length > 0) {
        await tx.customerProfile.update({
          where: { userId },
          data: customerProfileData
        });
      }

      // Return updated user
      return tx.user.findUnique({
        where: { id: userId },
        include: {
          makerProfile: true,
          customerProfile: true
        }
      });
    });

    const { passwordHash, ...safeUser } = updatedUser;
    res.json(safeUser);
  } catch (error) {
    next(error);
  }
});

// Get all makers (for customer to browse)
router.get('/makers', async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 12, 
      material, 
      status, 
      city, 
      state,
      sortBy = 'rating',
      sortOrder = 'desc'
    } = req.query;
    
    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      role: 'MAKER',
      isActive: true,
      makerProfile: {
        isNot: null
      }
    };

    // Apply filters through makerProfile
    const makerProfileFilters = {};
    
    if (material) {
      makerProfileFilters.materials = {
        has: material
      };
    }

    if (status) {
      makerProfileFilters.status = status;
    }

    if (city) {
      makerProfileFilters.city = {
        contains: city,
        mode: 'insensitive'
      };
    }

    if (state) {
      makerProfileFilters.state = state;
    }

    if (Object.keys(makerProfileFilters).length > 0) {
      where.makerProfile = {
        ...where.makerProfile,
        ...makerProfileFilters
      };
    }

    // Build orderBy
    let orderBy = { createdAt: 'desc' };
    
    if (sortBy === 'rating') {
      orderBy = { makerProfile: { rating: sortOrder } };
    } else if (sortBy === 'completedPrints') {
      orderBy = { makerProfile: { completedPrints: sortOrder } };
    } else if (sortBy === 'hourlyRate') {
      orderBy = { makerProfile: { hourlyRate: sortOrder } };
    }

    const [makers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          makerProfile: true,
          _count: {
            select: {
              assignedPrints: {
                where: { status: 'COMPLETED' }
              }
            }
          }
        },
        orderBy,
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.user.count({ where })
    ]);

    // Remove sensitive data
    const safeMakers = makers.map(maker => {
      const { passwordHash, email, ...safeMaker } = maker;
      return {
        ...safeMaker,
        // Only show email to authenticated users (for messaging)
        email: req.user ? email : undefined
      };
    });

    res.json({
      makers: safeMakers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get maker by ID (public profile)
router.get('/makers/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const maker = await prisma.user.findUnique({
      where: { 
        id,
        role: 'MAKER',
        isActive: true
      },
      include: {
        makerProfile: true,
        assignedPrints: {
          where: { status: 'COMPLETED' },
          include: {
            model: {
              select: { id: true, title: true, imageUrl: true }
            },
            customer: {
              select: { id: true, name: true, avatar: true }
            }
          },
          orderBy: { completedAt: 'desc' },
          take: 6 // Recent completed prints
        },
        _count: {
          select: {
            assignedPrints: {
              where: { status: 'COMPLETED' }
            }
          }
        }
      }
    });

    if (!maker) {
      return res.status(404).json({ error: 'Maker not found' });
    }

    // Remove sensitive data
    const { passwordHash, ...safeMaker } = maker;

    res.json({
      ...safeMaker,
      // Only show email to authenticated users (for messaging)
      email: req.user ? maker.email : undefined,
      completedPrintsCount: maker._count.assignedPrints,
      recentWork: maker.assignedPrints
    });
  } catch (error) {
    next(error);
  }
});

// Admin routes
// Get all users (admin only)
router.get('/admin/all', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      role, 
      search,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const skip = (page - 1) * limit;

    // Build where clause
    const where = {};
    
    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          makerProfile: true,
          customerProfile: true,
          _count: {
            select: {
              favorites: true,
              printRequests: true,
              assignedPrints: true,
              messagesSent: true
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update user (admin only)
router.put('/admin/:id', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error, value } = adminUpdateUserSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, role, isActive } = value;

    // Don't allow admin to deactivate themselves
    if (id === req.user.id && isActive === false) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    // Don't allow admin to change their own role
    if (id === req.user.id && role && role !== req.user.role) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { name, role, isActive },
      include: {
        makerProfile: true,
        customerProfile: true
      }
    });

    // If role changed, handle profile creation/deletion
    if (role && role !== updatedUser.role) {
      await prisma.$transaction(async (tx) => {
        if (role === 'MAKER' && !updatedUser.makerProfile) {
          await tx.makerProfile.create({
            data: {
              userId: id,
              materials: ['PLA'],
              printerVolume: '220x220x250mm',
              resolution: '0.2mm',
              status: 'OFFLINE',
              country: 'US'
            }
          });
        } else if (role === 'CUSTOMER' && !updatedUser.customerProfile) {
          await tx.customerProfile.create({
            data: {
              userId: id,
              preferredMaterials: ['PLA'],
              country: 'US'
            }
          });
        }
      });
    }

    const { passwordHash, ...safeUser } = updatedUser;
    res.json(safeUser);
  } catch (error) {
    next(error);
  }
});

// Delete user (admin only)
router.delete('/admin/:id', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Don't allow admin to delete themselves
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Check if user has active print requests
    const activePrints = await prisma.printRequest.findFirst({
      where: {
        OR: [
          { customerId: id },
          { makerId: id }
        ],
        status: {
          in: ['REQUESTED', 'ACCEPTED', 'PRINTING']
        }
      }
    });

    if (activePrints) {
      return res.status(400).json({ 
        error: 'Cannot delete user with active print requests' 
      });
    }

    await prisma.user.delete({
      where: { id }
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get user statistics (admin only)
router.get('/admin/stats', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalCustomers,
      totalMakers,
      activeUsers,
      recentSignups
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.user.count({ where: { role: 'MAKER' } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      })
    ]);

    res.json({
      totalUsers,
      totalCustomers,
      totalMakers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      recentSignups
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;