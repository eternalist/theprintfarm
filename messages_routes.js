// backend/src/routes/messages.js

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const Joi = require('joi');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const sendMessageSchema = Joi.object({
  receiverId: Joi.string().uuid().required(),
  content: Joi.string().min(1).max(1000).required(),
  modelUrl: Joi.string().uri().optional()
});

// Send message
router.post('/', async (req, res, next) => {
  try {
    const { error, value } = sendMessageSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { receiverId, content, modelUrl } = value;
    const senderId = req.user.id;

    // Verify receiver exists and is active
    const receiver = await prisma.user.findUnique({
      where: { 
        id: receiverId,
        isActive: true
      },
      select: { id: true, name: true, email: true }
    });

    if (!receiver) {
      return res.status(404).json({ error: 'Receiver not found or inactive' });
    }

    // Don't allow sending messages to yourself
    if (senderId === receiverId) {
      return res.status(400).json({ error: 'Cannot send message to yourself' });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        content,
        modelUrl,
        isRead: false
      },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true, role: true }
        },
        receiver: {
          select: { id: true, name: true, avatar: true, role: true }
        }
      }
    });

    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
});

// Get user's conversations
router.get('/conversations', async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get all unique conversation partners
    const conversations = await prisma.$queryRaw`
      SELECT DISTINCT
        CASE 
          WHEN sender_id = ${userId} THEN receiver_id
          ELSE sender_id
        END as partner_id,
        MAX(created_at) as last_message_at,
        COUNT(CASE WHEN receiver_id = ${userId} AND is_read = false THEN 1 END) as unread_count
      FROM messages
      WHERE sender_id = ${userId} OR receiver_id = ${userId}
      GROUP BY partner_id
      ORDER BY last_message_at DESC
    `;

    // Get partner details
    const partnerIds = conversations.map(conv => conv.partner_id);
    
    if (partnerIds.length === 0) {
      return res.json([]);
    }

    const partners = await prisma.user.findMany({
      where: {
        id: { in: partnerIds }
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        role: true
      }
    });

    // Get latest message for each conversation
    const latestMessages = await Promise.all(
      partnerIds.map(partnerId =>
        prisma.message.findFirst({
          where: {
            OR: [
              { senderId: userId, receiverId: partnerId },
              { senderId: partnerId, receiverId: userId }
            ]
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            content: true,
            createdAt: true,
            senderId: true,
            isRead: true
          }
        })
      )
    );

    // Combine data
    const conversationsWithDetails = conversations.map((conv, index) => {
      const partner = partners.find(p => p.id === conv.partner_id);
      const latestMessage = latestMessages[index];
      
      return {
        partnerId: conv.partner_id,
        partner,
        lastMessageAt: conv.last_message_at,
        unreadCount: parseInt(conv.unread_count),
        latestMessage
      };
    });

    res.json(conversationsWithDetails);
  } catch (error) {
    next(error);
  }
});

// Get conversation thread with specific user
router.get('/thread/:partnerId', async (req, res, next) => {
  try {
    const { partnerId } = req.params;
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Verify partner exists
    const partner = await prisma.user.findUnique({
      where: { id: partnerId },
      select: { id: true, name: true, avatar: true, role: true, isActive: true }
    });

    if (!partner) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get messages between users
    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: {
          OR: [
            { senderId: userId, receiverId: partnerId },
            { senderId: partnerId, receiverId: userId }
          ]
        },
        include: {
          sender: {
            select: { id: true, name: true, avatar: true, role: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.message.count({
        where: {
          OR: [
            { senderId: userId, receiverId: partnerId },
            { senderId: partnerId, receiverId: userId }
          ]
        }
      })
    ]);

    // Mark messages as read (only messages sent to current user)
    await prisma.message.updateMany({
      where: {
        senderId: partnerId,
        receiverId: userId,
        isRead: false
      },
      data: { isRead: true }
    });

    res.json({
      partner,
      messages: messages.reverse(), // Reverse to show oldest first
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

// Get all messages (for current user)
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const skip = (page - 1) * limit;

    let where = {
      OR: [
        { senderId: userId },
        { receiverId: userId }
      ]
    };

    if (unreadOnly === 'true') {
      where.receiverId = userId;
      where.isRead = false;
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: {
          sender: {
            select: { id: true, name: true, avatar: true, role: true }
          },
          receiver: {
            select: { id: true, name: true, avatar: true, role: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.message.count({ where })
    ]);

    res.json({
      messages,
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

// Mark message as read
router.put('/:id/read', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Only allow marking messages as read if user is the receiver
    const message = await prisma.message.findFirst({
      where: {
        id,
        receiverId: userId
      }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const updatedMessage = await prisma.message.update({
      where: { id },
      data: { isRead: true },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true, role: true }
        },
        receiver: {
          select: { id: true, name: true, avatar: true, role: true }
        }
      }
    });

    res.json(updatedMessage);
  } catch (error) {
    next(error);
  }
});

// Mark all messages from a user as read
router.put('/thread/:partnerId/read-all', async (req, res, next) => {
  try {
    const { partnerId } = req.params;
    const userId = req.user.id;

    const updated = await prisma.message.updateMany({
      where: {
        senderId: partnerId,
        receiverId: userId,
        isRead: false
      },
      data: { isRead: true }
    });

    res.json({ 
      message: 'Messages marked as read',
      updatedCount: updated.count
    });
  } catch (error) {
    next(error);
  }
});

// Delete message
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Only allow deleting messages if user is the sender or admin
    const message = await prisma.message.findFirst({
      where: {
        id,
        OR: [
          { senderId: userId },
          ...(req.user.role === 'ADMIN' ? [{}] : [])
        ]
      }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found or access denied' });
    }

    await prisma.message.delete({
      where: { id }
    });

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get unread message count
router.get('/unread/count', async (req, res, next) => {
  try {
    const userId = req.user.id;

    const unreadCount = await prisma.message.count({
      where: {
        receiverId: userId,
        isRead: false
      }
    });

    res.json({ unreadCount });
  } catch (error) {
    next(error);
  }
});

// Admin: Get all messages
router.get('/admin/all', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { page = 1, limit = 50, userId, search } = req.query;
    const skip = (page - 1) * limit;

    let where = {};

    if (userId) {
      where.OR = [
        { senderId: userId },
        { receiverId: userId }
      ];
    }

    if (search) {
      where.content = {
        contains: search,
        mode: 'insensitive'
      };
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: {
          sender: {
            select: { id: true, name: true, email: true, avatar: true, role: true }
          },
          receiver: {
            select: { id: true, name: true, email: true, avatar: true, role: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.message.count({ where })
    ]);

    res.json({
      messages,
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

module.exports = router;