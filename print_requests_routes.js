// backend/src/routes/printRequests.js

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const Joi = require('joi');
const { requireRole, requireOwnershipOrAdmin } = require('../middleware/auth');
const { sendEmail } = require('../services/emailService');

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const createRequestSchema = Joi.object({
  modelId: Joi.string().uuid().required(),
  makerId: Joi.string().uuid().required(),
  quantity: Joi.number().integer().min(1).max(10).default(1),
  material: Joi.string().required(),
  color: Joi.string().optional(),
  notes: Joi.string().max(500).optional(),
  urgency: Joi.string().valid('Low', 'Normal', 'High').default('Normal')
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('ACCEPTED', 'PRINTING', 'COMPLETED', 'DELIVERED', 'CANCELLED', 'REJECTED').required(),
  quotedPrice: Joi.number().min(0).optional(),
  finalPrice: Joi.number().min(0).optional(),
  notes: Joi.string().max(500).optional()
});

// Create print request
router.post('/', requireRole(['CUSTOMER']), async (req, res, next) => {
  try {
    const { error, value } = createRequestSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { modelId, makerId, quantity, material, color, notes, urgency } = value;
    const customerId = req.user.id;

    // Verify model exists
    const model = await prisma.thingiverseModel.findUnique({
      where: { id: modelId }
    });

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    // Verify maker exists and is active
    const maker = await prisma.user.findUnique({
      where: { 
        id: makerId,
        role: 'MAKER',
        isActive: true
      },
      include: { makerProfile: true }
    });

    if (!maker || !maker.makerProfile) {
      return res.status(404).json({ error: 'Maker not found or inactive' });
    }

    // Check if maker supports the requested material
    if (!maker.makerProfile.materials.includes(material)) {
      return res.status(400).json({ 
        error: `Maker does not support ${material} material`,
        supportedMaterials: maker.makerProfile.materials
      });
    }

    // Create print request
    const printRequest = await prisma.printRequest.create({
      data: {
        modelId,
        customerId,
        makerId,
        quantity,
        material,
        color,
        notes,
        urgency,
        status: 'REQUESTED'
      },
      include: {
        model: true,
        customer: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        maker: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    });

    // Send email notification to maker
    try {
      await sendEmail({
        to: maker.email,
        subject: 'New Print Request - ThePrintFarm',
        template: 'print-request',
        data: {
          makerName: maker.name,
          customerName: req.user.name,
          modelTitle: model.title,
          modelUrl: model.sourceUrl,
          quantity,
          material,
          color: color || 'Any',
          notes: notes || 'None',
          urgency,
          dashboardUrl: `${process.env.FRONTEND_URL}/maker/dashboard`
        }
      });
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json(printRequest);
  } catch (error) {
    next(error);
  }
});

// Get print requests (filtered by user role)
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, urgency } = req.query;
    const skip = (page - 1) * limit;

    let where = {};

    // Filter based on user role
    if (req.user.role === 'CUSTOMER') {
      where.customerId = req.user.id;
    } else if (req.user.role === 'MAKER') {
      where.makerId = req.user.id;
    }
    // Admin can see all requests (no additional filter)

    // Additional filters
    if (status) {
      where.status = status;
    }

    if (urgency) {
      where.urgency = urgency;
    }

    const [requests, total] = await Promise.all([
      prisma.printRequest.findMany({
        where,
        include: {
          model: true,
          customer: {
            select: { id: true, name: true, email: true, avatar: true }
          },
          maker: {
            select: { id: true, name: true, email: true, avatar: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.printRequest.count({ where })
    ]);

    res.json({
      requests,
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

// Get single print request
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const request = await prisma.printRequest.findUnique({
      where: { id },
      include: {
        model: true,
        customer: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        maker: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    });

    if (!request) {
      return res.status(404).json({ error: 'Print request not found' });
    }

    // Check permissions
    const canView = req.user.role === 'ADMIN' || 
                   request.customerId === req.user.id || 
                   request.makerId === req.user.id;

    if (!canView) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(request);
  } catch (error) {
    next(error);
  }
});

// Update print request status
router.put('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error, value } = updateStatusSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { status, quotedPrice, finalPrice, notes } = value;

    // Get current request
    const currentRequest = await prisma.printRequest.findUnique({
      where: { id },
      include: {
        model: true,
        customer: true,
        maker: true
      }
    });

    if (!currentRequest) {
      return res.status(404).json({ error: 'Print request not found' });
    }

    // Check permissions based on status change
    let canUpdate = false;
    
    if (req.user.role === 'ADMIN') {
      canUpdate = true;
    } else if (req.user.role === 'MAKER' && currentRequest.makerId === req.user.id) {
      // Makers can update most statuses
      canUpdate = ['ACCEPTED', 'PRINTING', 'COMPLETED', 'REJECTED'].includes(status);
    } else if (req.user.role === 'CUSTOMER' && currentRequest.customerId === req.user.id) {
      // Customers can only cancel their own requests
      canUpdate = status === 'CANCELLED' && currentRequest.status === 'REQUESTED';
    }

    if (!canUpdate) {
      return res.status(403).json({ error: 'Not authorized to update this request' });
    }

    // Validate status transitions
    const validTransitions = {
      'REQUESTED': ['ACCEPTED', 'REJECTED', 'CANCELLED'],
      'ACCEPTED': ['PRINTING', 'CANCELLED'],
      'PRINTING': ['COMPLETED', 'CANCELLED'],
      'COMPLETED': ['DELIVERED'],
      'DELIVERED': [],
      'CANCELLED': [],
      'REJECTED': []
    };

    if (!validTransitions[currentRequest.status].includes(status)) {
      return res.status(400).json({ 
        error: `Cannot change status from ${currentRequest.status} to ${status}` 
      });
    }

    // Prepare update data
    const updateData = { status };
    
    if (quotedPrice !== undefined) updateData.quotedPrice = quotedPrice;
    if (finalPrice !== undefined) updateData.finalPrice = finalPrice;

    // Set timestamps based on status
    const now = new Date();
    if (status === 'ACCEPTED') updateData.acceptedAt = now;
    if (status === 'PRINTING') updateData.startedAt = now;
    if (status === 'COMPLETED') updateData.completedAt = now;
    if (status === 'DELIVERED') updateData.deliveredAt = now;

    // Update request
    const updatedRequest = await prisma.printRequest.update({
      where: { id },
      data: updateData,
      include: {
        model: true,
        customer: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        maker: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    });

    // Send email notifications
    try {
      if (status === 'COMPLETED') {
        // Notify customer when print is completed
        await sendEmail({
          to: currentRequest.customer.email,
          subject: 'Your Print is Complete - ThePrintFarm',
          template: 'print-completed',
          data: {
            customerName: currentRequest.customer.name,
            makerName: currentRequest.maker.name,
            modelTitle: currentRequest.model.title,
            dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`
          }
        });
      } else if (status === 'ACCEPTED') {
        // Notify customer when request is accepted
        await sendEmail({
          to: currentRequest.customer.email,
          subject: 'Print Request Accepted - ThePrintFarm',
          template: 'print-accepted',
          data: {
            customerName: currentRequest.customer.name,
            makerName: currentRequest.maker.name,
            modelTitle: currentRequest.model.title,
            quotedPrice: quotedPrice,
            dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`
          }
        });
      }
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
    }

    // Update maker stats if completed
    if (status === 'COMPLETED') {
      await prisma.makerProfile.update({
        where: { userId: currentRequest.makerId },
        data: {
          completedPrints: { increment: 1 }
        }
      });
    }

    res.json(updatedRequest);
  } catch (error) {
    next(error);
  }
});

// Delete print request (admin only or creator if still in REQUESTED status)
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const request = await prisma.printRequest.findUnique({
      where: { id }
    });

    if (!request) {
      return res.status(404).json({ error: 'Print request not found' });
    }

    // Check permissions
    const canDelete = req.user.role === 'ADMIN' || 
                     (request.customerId === req.user.id && request.status === 'REQUESTED');

    if (!canDelete) {
      return res.status(403).json({ error: 'Cannot delete this request' });
    }

    await prisma.printRequest.delete({
      where: { id }
    });

    res.json({ message: 'Print request deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get maker's queue (for maker dashboard)
router.get('/maker/queue', requireRole(['MAKER']), async (req, res, next) => {
  try {
    const makerId = req.user.id;
    const { status } = req.query;

    let where = { makerId };
    
    if (status) {
      where.status = status;
    } else {
      // Default to active requests
      where.status = {
        in: ['REQUESTED', 'ACCEPTED', 'PRINTING']
      };
    }

    const requests = await prisma.printRequest.findMany({
      where,
      include: {
        model: {
          select: { id: true, title: true, imageUrl: true, sourceUrl: true }
        },
        customer: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      },
      orderBy: [
        { urgency: 'desc' }, // High urgency first
        { createdAt: 'asc' }  // Then by creation time
      ]
    });

    res.json(requests);
  } catch (error) {
    next(error);
  }
});

// Get print request statistics
router.get('/stats/overview', async (req, res, next) => {
  try {
    let where = {};

    // Filter by user role
    if (req.user.role === 'CUSTOMER') {
      where.customerId = req.user.id;
    } else if (req.user.role === 'MAKER') {
      where.makerId = req.user.id;
    }

    const stats = await prisma.printRequest.groupBy({
      by: ['status'],
      where,
      _count: {
        status: true
      }
    });

    const formattedStats = {
      total: 0,
      requested: 0,
      accepted: 0,
      printing: 0,
      completed: 0,
      delivered: 0,
      cancelled: 0,
      rejected: 0
    };

    stats.forEach(stat => {
      formattedStats[stat.status.toLowerCase()] = stat._count.status;
      formattedStats.total += stat._count.status;
    });

    res.json(formattedStats);
  } catch (error) {
    next(error);
  }
});

module.exports = router;