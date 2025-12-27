import User from '../models/Users.js';
import SiteStats from '../models/SiteStats.js';

/**
 * Retrieves public-facing site statistics, including total user count and site visits.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 * @returns {Promise<void>} Sends a JSON response containing the statistics.
 */
export const getPublicStats = async (req, res) => {
  try {
    // --- User Statistics ---
    const totalUsers = await User.countDocuments();

    // --- Site Visit Statistics ---
    let stats = await SiteStats.findOne({ name: 'global' });
    const totalVisits = stats ? stats.visits : 0;
    
    // --- Response Handling ---
    res.status(200).json({ totalUsers, totalVisits });
  } catch (error) {
    console.error("Error fetching site stats:", error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};

/**
 * Increments the global site visit counter and retrieves aggregated platform statistics.
 *
 * This function performs an atomic update to the site statistics collection to increase
 * the visit count and simultaneously queries the user collection for the total user count.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 * @returns {Promise<void>} Sends a JSON response containing the current `totalUsers` count and updated `totalVisits`.
 */
export const incrementVisits = async (req, res) => {
  try {
    // --- Data Aggregation & Atomic Update ---
    const totalUsers = await User.countDocuments();
    const stats = await SiteStats.findOneAndUpdate(
      { name: 'global' },
      { $inc: { visits: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // --- Success Response ---
    res.status(200).json({ totalUsers, totalVisits: stats.visits });
  } catch (error) {
    // --- Error Handling ---
    console.error("Error incrementing visits:", error);
    res.status(500).json({ error: 'Failed to update statistics' });
  }
};