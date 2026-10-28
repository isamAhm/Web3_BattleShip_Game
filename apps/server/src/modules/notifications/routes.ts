import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { socialRepo } from '../../repositories/socialRepo.js';
import { notificationUpdateSchema } from '@wba/shared';

export const notificationsRouter = Router();

notificationsRouter.get(
  '/',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
      const notifications = await socialRepo.getNotifications(req.user!.address, limit);
      res.json({ success: true, data: notifications });
    } catch (err) {
      next(err);
    }
  },
);

notificationsRouter.patch(
  '/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { read } = notificationUpdateSchema.parse(req.body);
      const updated = await socialRepo.markNotificationRead(req.params.id, req.user!.address, read);
      if (!updated) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Notification not found' },
        });
        return;
      }
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  },
);
