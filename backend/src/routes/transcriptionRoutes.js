import express from 'express';
import mongoose from 'mongoose';
import { encrypt } from '../utils/encryption.js';
import { requireAuth } from '../controllers/projectController.js';
import User from '../models/Users.js'; 

const router = express.Router();

/**
 * @route   PUT /api/user/api-keys
 * @desc    Encrypts and saves a user's third-party API key
 * @access  Private
 */
router.put('/api-keys', requireAuth, async (req, res) => {
  const { provider, key } = req.body;

  const ALLOWED_PROVIDERS = ['assemblyAI'];
  if (!ALLOWED_PROVIDERS.includes(provider)) {
      return res.status(400).json({ error: `Invalid provider.` });
  }
  if (!key) return res.status(400).json({ error: 'API Key is required' });

  try {
    const encryptedResult = encrypt(key);
    
    const dataToSave = {
        iv: encryptedResult.iv,
        encryptedData: encryptedResult.encryptedData || encryptedResult.content || encryptedResult.data
    };

    const updatedUser = await User.findByIdAndUpdate(req.userId, {
      $set: { [`apiKeys.${provider}`]: dataToSave }
    }, { new: true });

    res.json({ success: true, message: 'API Key saved successfully' });
  } catch (error) {
    console.error('API Key Save Error:', error);
    res.status(500).json({ error: 'Failed to save API key' });
  }
});

/**
 * @route   GET /api/user/api-status
 * @desc    Checks which API keys the user has configured
 * @access  Private
 */
router.get('/api-status', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ 
      hasAssemblyAI: !!(user.apiKeys?.assemblyAI?.encryptedData) 
    });
  } catch (error) {
    console.error('API Status Error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

/**
 * @route   DELETE /api/user/api-keys/:provider
 * @desc    Deletes a user's API key for a specific provider
 * @access  Private
 */
router.delete('/api-keys/:provider', requireAuth, async (req, res) => {
  const { provider } = req.params;

  const ALLOWED_PROVIDERS = ['assemblyAI', 'openai'];
  if (!ALLOWED_PROVIDERS.includes(provider)) {
      return res.status(400).json({ error: `Invalid provider.` });
  }

  try {
    await User.findByIdAndUpdate(req.userId, {
      $unset: { [`apiKeys.${provider}`]: "" }
    });

    res.json({ success: true, message: 'API Key deleted successfully' });
  } catch (error) {
    console.error('API Key Delete Error:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

export default router;