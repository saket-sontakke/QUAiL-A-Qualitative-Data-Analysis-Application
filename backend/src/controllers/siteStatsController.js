import User from '../models/Users.js';
import SiteStats from '../models/SiteStats.js';

// GET /api/site-stats
export const getPublicStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    let stats = await SiteStats.findOne({ name: 'global' });
    const totalVisits = stats ? stats.visits : 0;
    
    res.status(200).json({ totalUsers, totalVisits });
  } catch (error) {
    console.error("Error fetching site stats:", error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};

// GET /api/site-stats/increment
export const incrementVisits = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const stats = await SiteStats.findOneAndUpdate(
      { name: 'global' },
      { $inc: { visits: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ totalUsers, totalVisits: stats.visits });
  } catch (error) {
    console.error("Error incrementing visits:", error);
    res.status(500).json({ error: 'Failed to update statistics' });
  }
};