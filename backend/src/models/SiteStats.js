import mongoose from 'mongoose';

/**
 * Defines the Mongoose schema for tracking site-wide statistics.
 * This schema enforces a singleton-like pattern using a unique name field
 * to aggregate global metrics.
 */
const siteStatsSchema = new mongoose.Schema({
  // --- Field Definitions ---
  name: {
    type: String,
    required: true,
    default: 'global',
    unique: true
  },
  visits: {
    type: Number,
    required: true,
    default: 0
  }
});

export default mongoose.model('SiteStats', siteStatsSchema);