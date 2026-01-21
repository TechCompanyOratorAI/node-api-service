/**
 * Webhook Routes - Python worker callbacks
 */

import express from 'express';
import { verifyWebhookAuth, asrComplete, analysisComplete, reportComplete, health } from '../controllers/webhookController.js';

const router = express.Router();

// Webhook authentication middleware
router.use(verifyWebhookAuth);

// Health check
router.get('/health', health);

// ASR worker callback
router.post('/asr-complete', asrComplete);

// Analysis worker callback
router.post('/analysis-complete', analysisComplete);

// Report worker callback
router.post('/report-complete', reportComplete);

export default router;
