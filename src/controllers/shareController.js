/**
 * Share Controller - Xử lý các API liên quan đến chia sẻ bài thuyết trình
 */

import { validationResult } from 'express-validator';
import shareService from '../services/shareService.js';

class ShareController {
  // ─────────────────────────────────────────────────
  // POST /presentations/:presentationId/share/public
  // Tạo public share link
  // ─────────────────────────────────────────────────
  async createPublicShare(req, res) {
    try {
      const { presentationId } = req.params;
      const parsedId = parseInt(presentationId);

      if (Number.isNaN(parsedId)) {
        return res.status(400).json({ success: false, message: 'presentationId must be a number' });
      }

      const { expiresAt } = req.body;

      const result = await shareService.createPublicShare(parsedId, req.user, { expiresAt });

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Create public share controller error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // ─────────────────────────────────────────────────
  // DELETE /presentations/:presentationId/share/public
  // Thu hồi public share link
  // ─────────────────────────────────────────────────
  async revokePublicShare(req, res) {
    try {
      const { presentationId } = req.params;
      const parsedId = parseInt(presentationId);

      if (Number.isNaN(parsedId)) {
        return res.status(400).json({ success: false, message: 'presentationId must be a number' });
      }

      const result = await shareService.revokePublicShare(parsedId, req.user);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Revoke public share controller error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // ─────────────────────────────────────────────────
  // POST /presentations/:presentationId/share/invite
  // Mời theo email (private)
  // ─────────────────────────────────────────────────
  async inviteByEmails(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      }

      const { presentationId } = req.params;
      const parsedId = parseInt(presentationId);

      if (Number.isNaN(parsedId)) {
        return res.status(400).json({ success: false, message: 'presentationId must be a number' });
      }

      const { emails, expiresAt } = req.body;

      const result = await shareService.inviteByEmails(parsedId, req.user, emails, { expiresAt });

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Invite by emails controller error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // ─────────────────────────────────────────────────
  // DELETE /presentations/:presentationId/share/invite/:accessId
  // Thu hồi quyền private theo accessId
  // ─────────────────────────────────────────────────
  async revokePrivateShare(req, res) {
    try {
      const { presentationId, accessId } = req.params;
      const parsedId = parseInt(presentationId);
      const parsedAccessId = parseInt(accessId);

      if (Number.isNaN(parsedId) || Number.isNaN(parsedAccessId)) {
        return res.status(400).json({ success: false, message: 'Invalid IDs provided' });
      }

      const result = await shareService.revokePrivateShare(parsedId, req.user, parsedAccessId);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Revoke private share controller error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // ─────────────────────────────────────────────────
  // GET /presentations/:presentationId/share
  // Lấy danh sách tất cả share records
  // ─────────────────────────────────────────────────
  async getShareList(req, res) {
    try {
      const { presentationId } = req.params;
      const parsedId = parseInt(presentationId);

      if (Number.isNaN(parsedId)) {
        return res.status(400).json({ success: false, message: 'presentationId must be a number' });
      }

      const result = await shareService.getShareList(parsedId, req.user);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Get share list controller error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // ─────────────────────────────────────────────────
  // GET /share/:token
  // Public endpoint - Xem bài thuyết trình qua share link
  // Không cần login
  // ─────────────────────────────────────────────────
  async viewSharedPresentation(req, res) {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({ success: false, message: 'Share token is required' });
      }

      // Validate token
      const validation = await shareService.validateShareToken(token);

      if (!validation.valid) {
        return res.status(403).json({ success: false, message: validation.reason });
      }

      // Fetch all data
      const result = await shareService.getSharedPresentationData(validation.presentationId);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json({
        success: true,
        shareType: validation.shareType,
        accessLevel: validation.accessLevel,
        data: result.data,
      });
    } catch (error) {
      console.error('View shared presentation controller error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}

export default new ShareController();
