import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { socialRepo } from '../../repositories/socialRepo.js';
import {
  friendRequestSchema,
  friendActionSchema,
  inviteCreateSchema,
  inviteActionSchema,
} from '@wba/shared';

export const socialRouter = Router();

// --- Friends ---

socialRouter.get(
  '/friends',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const friends = await socialRepo.getFriends(req.user!.address);
      const pending = await socialRepo.getPendingRequests(req.user!.address);
      res.json({
        success: true,
        data: {
          friends,
          pending,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

socialRouter.post(
  '/friends',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { targetAddress } = friendRequestSchema.parse(req.body);
      const request = await socialRepo.createFriendRequest(req.user!.address, targetAddress);
      if (!request) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Friend request cannot be created' },
        });
        return;
      }
      res.json({ success: true, data: request });
    } catch (err) {
      next(err);
    }
  },
);

socialRouter.patch(
  '/friends/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { action } = friendActionSchema.parse(req.body);
      const status = action === 'accept' ? 'accepted' : 'rejected';
      const updated = await socialRepo.updateFriendStatus(req.params.id, req.user!.address, status);
      if (!updated) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Friend request not found or unauthorized' },
        });
        return;
      }
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  },
);

socialRouter.delete(
  '/friends/:address',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const success = await socialRepo.removeFriend(req.user!.address, req.params.address);
      res.json({ success: true, data: { removed: success } });
    } catch (err) {
      next(err);
    }
  },
);

// --- Invites ---

socialRouter.get(
  '/invites',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invites = await socialRepo.getPendingInvites(req.user!.address);
      res.json({ success: true, data: invites });
    } catch (err) {
      next(err);
    }
  },
);

socialRouter.post(
  '/invites',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { recipientAddress, roomCode } = inviteCreateSchema.parse(req.body);
      const invite = await socialRepo.createInvite(req.user!.address, recipientAddress, roomCode);
      res.json({ success: true, data: invite });
    } catch (err) {
      next(err);
    }
  },
);

socialRouter.patch(
  '/invites/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { action } = inviteActionSchema.parse(req.body);
      const status = action === 'accept' ? 'accepted' : 'declined';
      const updated = await socialRepo.updateInviteStatus(req.params.id, req.user!.address, status);
      if (!updated) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Invite not found or unauthorized' },
        });
        return;
      }
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  },
);
