// backend/src/routes/models.js

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const Joi = require('joi');

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(12),
  search: Joi.string().max(100).optional(),
  tags: Joi.string().optional(), // comma-separated
  complexity: Joi.string().valid('Beginner', 'Intermediate', 'Advanced').optional(),
  sortBy: Joi.string().valid('createdAt', 'title', 'downloadCount', 'likeCount').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

// Get all models with pagination and filtering
router.get('/', async (req, res, next) => {
  try {
    const { error, value } = querySchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { page, limit, search, tags, complexity, sortBy, sortOrder } = value;
    const skip = (page - 1) * limit;

    // Build where clause
    const where = {};
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { authorName: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      where.tags = {
        hasSome: tagArray
      };
    }

    if (complexity) {
      where.complexity = complexity;
    }

    // Get models with pagination
    const [models, total] = await Promise.all([
      prisma.thingiverseModel.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: {
          favorites: req.user ? {
            where: { userId: req.user.id }
          } : false,
          _count: {
            select: {
              favorites: true,
              printRequests: true
            }
          }
        }
      }),
      prisma.thingiverseModel.count({ where })
    ]);

    // Add isFavorited field
    const modelsWithFavorites = models.map(model => ({
      ...model,
      isFavorited: model.favorites ? model.favorites.length > 0 : false,
      favoritesCount: model._count.favorites,
      printRequestsCount: model._count.printRequests,
      favorites: undefined, // Remove the favorites array from response
      _count: undefined
    }));

    res.json({
      models: modelsWithFavorites,
      pagination: {
        page,
        limit,
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

// Get model by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const model = await prisma.thingiverseModel.findUnique({
      where: { id },
      include: {
        favorites: req.user ? {
          where: { userId: req.user.id }
        } : false,
        printRequests: {
          include: {
            customer: {
              select: { id: true, name: true, avatar: true }
            },
            maker: {
              select: { id: true, name: true, avatar: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 5 // Show recent print requests
        },
        _count: {
          select: {
            favorites: true,
            printRequests: true
          }
        }
      }
    });

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    const modelWithFavorites = {
      ...model,
      isFavorited: model.favorites ? model.favorites.length > 0 : false,
      favoritesCount: model._count.favorites,
      printRequestsCount: model._count.printRequests,
      favorites: undefined,
      _count: undefined
    };

    res.json(modelWithFavorites);
  } catch (error) {
    next(error);
  }
});

// Toggle favorite
router.post('/:id/favorite', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if model exists
    const model = await prisma.thingiverseModel.findUnique({
      where: { id }
    });

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    // Check if already favorited
    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        userId_modelId: {
          userId,
          modelId: id
        }
      }
    });

    if (existingFavorite) {
      // Remove favorite
      await prisma.favorite.delete({
        where: { id: existingFavorite.id }
      });
      
      res.json({ 
        isFavorited: false,
        message: 'Removed from favorites'
      });
    } else {
      // Add favorite
      await prisma.favorite.create({
        data: {
          userId,
          modelId: id
        }
      });
      
      res.json({ 
        isFavorited: true,
        message: 'Added to favorites'
      });
    }
  } catch (error) {
    next(error);
  }
});

// Get user's favorites
router.get('/favorites/my', async (req, res, next) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const skip = (page - 1) * limit;
    const userId = req.user.id;

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId },
        include: {
          model: {
            include: {
              _count: {
                select: {
                  favorites: true,
                  printRequests: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.favorite.count({ where: { userId } })
    ]);

    const models = favorites.map(fav => ({
      ...fav.model,
      isFavorited: true,
      favoritesCount: fav.model._count.favorites,
      printRequestsCount: fav.model._count.printRequests,
      favoritedAt: fav.createdAt,
      _count: undefined
    }));

    res.json({
      models,
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

// Get popular models
router.get('/popular/trending', async (req, res, next) => {
  try {
    const { limit = 6 } = req.query;

    const models = await prisma.thingiverseModel.findMany({
      orderBy: [
        { likeCount: 'desc' },
        { downloadCount: 'desc' }
      ],
      take: parseInt(limit),
      include: {
        favorites: req.user ? {
          where: { userId: req.user.id }
        } : false,
        _count: {
          select: {
            favorites: true,
            printRequests: true
          }
        }
      }
    });

    const modelsWithFavorites = models.map(model => ({
      ...model,
      isFavorited: model.favorites ? model.favorites.length > 0 : false,
      favoritesCount: model._count.favorites,
      printRequestsCount: model._count.printRequests,
      favorites: undefined,
      _count: undefined
    }));

    res.json(modelsWithFavorites);
  } catch (error) {
    next(error);
  }
});

// Get available tags
router.get('/tags/all', async (req, res, next) => {
  try {
    const models = await prisma.thingiverseModel.findMany({
      select: { tags: true }
    });

    // Flatten and count tags
    const tagCounts = {};
    models.forEach(model => {
      model.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    // Sort by popularity
    const sortedTags = Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 50) // Top 50 tags
      .map(([tag, count]) => ({ tag, count }));

    res.json(sortedTags);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
    }));

    res.json(modelsWithFavorites);
  } catch (error) {
    next(error);
  }
});

// Get recent models
router.get('/recent/latest', async (req, res, next) => {
  try {
    const { limit = 6 } = req.query;

    const models = await prisma.thingiverseModel.findMany({
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      include: {
        favorites: req.user ? {
          where: { userId: req.user.id }
        } : false,
        _count: {
          select: {
            favorites: true,
            printRequests: true
          }
        }
      }
    });

    const modelsWithFavorites = models.map(model => ({
      ...model,
      isFavorited: model.favorites ? model.favorites.length > 0 : false,
      favoritesCount: model._count.favorites,
      printRequestsCount: model._count.printRequests,
      favorites: undefined,
      _count: undefined