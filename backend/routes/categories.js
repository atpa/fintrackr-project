/**
 * Categories routes
 * Handles CRUD operations for transaction categories
 */

const express = require('express');
const router = express.Router();
const {
  getCategoriesByUserId,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../services/dataService.new');
const { authenticateRequest } = require('../middleware/auth');

router.use(authenticateRequest);

/**
 * GET /api/categories
 * Get all categories for authenticated user
 */
router.get('/', (req, res) => {
  try {
    const categories = getCategoriesByUserId(req.user.userId);
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/categories
 * Create new category
 */
router.post('/', (req, res) => {
  try {
    const { name, kind } = req.body;
    
    if (!name || !kind) {
      return res.status(400).json({ error: 'Name and kind are required' });
    }
    
    if (!['income', 'expense'].includes(kind)) {
      return res.status(400).json({ error: 'Kind must be income or expense' });
    }
    
    const categoryId = createCategory(req.user.userId, name, kind);
    const category = getCategoryById(categoryId);
    
    res.status(201).json(category);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/categories/:id
 * Update category
 */
router.put('/:id', (req, res) => {
  try {
    const category = getCategoryById(req.params.id);
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    if (category.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { name, kind } = req.body;
    const updates = {};
    
    if (name !== undefined) updates.name = name;
    if (kind !== undefined) {
      if (!['income', 'expense'].includes(kind)) {
        return res.status(400).json({ error: 'Kind must be income or expense' });
      }
      updates.kind = kind;
    }
    
    updateCategory(req.params.id, updates);
    const updated = getCategoryById(req.params.id);
    
    res.json(updated);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/categories/:id
 * Delete category
 */
router.delete('/:id', (req, res) => {
  try {
    const category = getCategoryById(req.params.id);
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    if (category.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    deleteCategory(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
