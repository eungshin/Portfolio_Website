/**
 * api/projects.js — Vercel Serverless Function
 * 
 * Replaces Express GET /api/projects
 * Returns project data with Cloudinary URLs for all media.
 * Data is read from a bundled JSON snapshot (no filesystem dependency).
 */

const projectData = require('../portfolio-data.json');

module.exports = (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.status(200).json(projectData);
};
