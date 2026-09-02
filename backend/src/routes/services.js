const express = require('express');
const router = express.Router();
const { SERVICES } = require('../../config/servicesMap');

// GET /api/services - returns the canonical services list
router.get('/', (req, res) => {
  // Deduplicate by collection key to avoid duplicate service entries
  const seen = new Set();
  const out = [];
  for (const s of SERVICES) {
    if (!seen.has(s.collection)) {
      seen.add(s.collection);
      out.push({ name: s.name, collection: s.collection });
    }
  }
  res.json(out);
});

module.exports = router;
