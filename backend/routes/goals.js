/**
 * Goals routes
 * Handles CRUD operations for financial goals
 */

const express = require('express');
const router = express.Router();
const {
  getGoalsByUserId,
  getGoalById,
  createGoal,
  updateGoal,
  deleteGoal
} = require('../services/dataService.new');
const { authenticateRequest } = require('../middleware/auth');

router.use(authenticateRequest);

router.get('/', (req, res) => {
  try {
    const goals = getGoalsByUserId(req.user.userId);
    res.json(goals);
  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', (req, res) => {
  try {
    const { title, target_amount, current_amount, deadline } = req.body;
    
    if (!title || !target_amount) {
      return res.status(400).json({ error: 'Title and target amount are required' });
    }
    
    const goalId = createGoal(
      req.user.userId,
      title,
      target_amount,
      current_amount || 0,
      deadline || null
    );
    
    const goal = getGoalById(goalId);
    res.status(201).json(goal);
  } catch (error) {
    console.error('Create goal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const goal = getGoalById(req.params.id);
    
    if (!goal || goal.user_id !== req.user.userId) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    const { title, target_amount, current_amount, deadline } = req.body;
    const updates = {};
    
    if (title !== undefined) updates.title = title;
    if (target_amount !== undefined) updates.target_amount = target_amount;
    if (current_amount !== undefined) updates.current_amount = current_amount;
    if (deadline !== undefined) updates.deadline = deadline;
    
    updateGoal(req.params.id, updates);
    const updated = getGoalById(req.params.id);
    
    res.json(updated);
  } catch (error) {
    console.error('Update goal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const goal = getGoalById(req.params.id);
    
    if (!goal || goal.user_id !== req.user.userId) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    deleteGoal(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete goal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
