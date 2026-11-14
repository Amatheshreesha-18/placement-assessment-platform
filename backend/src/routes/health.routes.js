const express = require('express');
const router = express.Router();
const { successResponse } = require('../utils/apiResponse');

router.get('/', (req, res) => {
  return successResponse(res, 200, 'Placement Assistance API is healthy and operational', {
    status: 'healthy',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'Placement Assistance and Readiness Platform Backend',
  });
});

module.exports = router;
