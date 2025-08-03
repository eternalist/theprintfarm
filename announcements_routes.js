// backend/src/routes/announcements.js

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const Joi = require('joi');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const createAnnouncementSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  content: Joi.string().min(10).max(2000).required(),
  type: Joi.string().valid('INFO', 'WARNING', 'SUCCESS', 'ERROR').default('INFO'),
  priority: Joi.number().integer().min(0).max(10).default(0),
  isActive: Joi.boolean().default(true)
});

const updateAnnouncementSchema = Joi.object({
  title: Joi.string().min(3).max(100).optional(),
  content: Joi.string().min(10).max(2000).optional(),
  type: Joi.string().valid('INFO', 'WARNING', 'SUCCESS', 'ERROR').optional(),
  priority: Joi.number().integer().min(0).max(10).optional(),
  isActive: Joi.boolean().optional()
});

// Get all active announcements (public)
router.get('/', async (req, res, next) => {
  try {
    const announcements = await prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    res.json(announcements);
  } catch (error) {
    next(error);
  }
});

// Get announcement by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const announcement = await prisma.announcement.findUnique({
      where: { id }
    });

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    // Only show active announcements to non-admin users
    if (!announcement.isActive && req.user.role !== 'ADMIN') {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    res.json(announcement);
  } catch (error) {
    next(error);
  }
});

// Admin routes
// Get all announcements (admin only)
router.get('/admin/all', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, isActive, type } = req.query;
    const skip = (page - 1) * limit;

    let where = {};

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (type) {
      where.type = type;
    }

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.announcement.count({ where })
    ]);

    res.json({
      announcements,
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

// Create announcement (admin only)
router.post('/admin', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { error, value } = createAnnouncementSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const announcement = await prisma.announcement.create({
      data: value
    });

    res.status(201).json(announcement);
  } catch (error) {
    next(error);
  }
});

// Update announcement (admin only)
router.put('/admin/:id', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error, value } = updateAnnouncementSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const announcement = await prisma.announcement.update({
      where: { id },
      data: value
    });

    res.json(announcement);
  } catch (error) {
    next(error);
  }
});

// Delete announcement (admin only)
router.delete('/admin/:id', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.announcement.delete({
      where: { id }
    });

    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Toggle announcement status (admin only)
router.put('/admin/:id/toggle', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;

    const currentAnnouncement = await prisma.announcement.findUnique({
      where: { id }
    });

    if (!currentAnnouncement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    const updatedAnnouncement = await prisma.announcement.update({
      where: { id },
      data: { isActive: !currentAnnouncement.isActive }
    });

    res.json(updatedAnnouncement);
  } catch (error) {
    next(error);
  }
});

module.exports = router;