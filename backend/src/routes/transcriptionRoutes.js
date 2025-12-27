import express from 'express';
import { encrypt } from '../utils/encryption.js';
import { requireAuth } from '../controllers/projectController.js';
import User from '../models/Users.js'; 

const router = express.Router();

/**
 * Encrypts and saves a third-party API key for the authenticated user.
 * * @route PUT /api-keys
 * @param {Object} req.body - The request body.
 * @param {string} req.body.provider - The name of the service provider (must be 'assemblyAI').
 * @param {string} req.body.key - The raw API key to be encrypted.
 * @returns {Object} JSON response indicating success or error.
 */
router.put('/api-keys', requireAuth, async (req, res) => {
  const { provider, key } = req.body;

  // --- Validation ---
  const ALLOWED_PROVIDERS = ['assemblyAI'];
  if (!ALLOWED_PROVIDERS.includes(provider)) {
      return res.status(400).json({ error: `Invalid provider.` });
  }
  if (!key) return res.status(400).json({ error: 'API Key is required' });

  try {
    // --- Encryption ---
    const encryptedResult = encrypt(key);
    
    const dataToSave = {
        iv: encryptedResult.iv,
        encryptedData: encryptedResult.encryptedData || encryptedResult.content || encryptedResult.data
    };

    // --- Database Update ---
    const updatedUser = await User.findByIdAndUpdate(req.userId, {
      $set: { [`apiKeys.${provider}`]: dataToSave }
    }, { new: true });

    res.json({ success: true, message: 'API Key saved successfully' });
  } catch (error) {
    // --- Error Handling ---
    console.error('API Key Save Error:', error);
    res.status(500).json({ error: 'Failed to save API key' });
  }
});

/**
 * checks if the authenticated user has configured specific API keys.
 * * @route GET /api-status
 * @returns {Object} JSON object containing boolean flags for configured providers.
 */
router.get('/api-status', requireAuth, async (req, res) => {
  try {
    // --- User Retrieval ---
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // --- Status Check ---
    res.json({ 
      hasAssemblyAI: !!(user.apiKeys?.assemblyAI?.encryptedData) 
    });
  } catch (error) {
    // --- Error Handling ---
    console.error('API Status Error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

/**
 * Removes a stored API key for a specific provider.
 * * @route DELETE /api-keys/:provider
 * @param {Object} req.params - The request parameters.
 * @param {string} req.params.provider - The provider name to remove (must be 'assemblyAI' or 'openai').
 * @returns {Object} JSON response indicating success or error.
 */
router.delete('/api-keys/:provider', requireAuth, async (req, res) => {
  const { provider } = req.params;

  // --- Validation ---
  const ALLOWED_PROVIDERS = ['assemblyAI', 'openai'];
  if (!ALLOWED_PROVIDERS.includes(provider)) {
      return res.status(400).json({ error: `Invalid provider.` });
  }

  try {
    // --- Database Update ---
    await User.findByIdAndUpdate(req.userId, {
      $unset: { [`apiKeys.${provider}`]: "" }
    });

    res.json({ success: true, message: 'API Key deleted successfully' });
  } catch (error) {
    // --- Error Handling ---
    console.error('API Key Delete Error:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

export default router;