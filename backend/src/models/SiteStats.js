import mongoose from 'mongoose';

/**
 * Schema for tracking global site statistics (visits).
 * Designed as a singleton (only one document with name: 'global' should exist).
 */
const siteStatsSchema = new mongoose.Schema({
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