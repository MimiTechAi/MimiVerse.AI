import { Router } from 'express';
import { pool } from '../../storage';
import { requireAuth } from '../../auth/middleware';

export const analyticsRoutes = Router();

analyticsRoutes.post('/completions', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId as string | undefined;
    const projectId = req.session.activeProjectId as string | undefined;

    if (!userId || !projectId) {
      return res.status(400).json({ message: 'No active project' });
    }

    const { completionId, eventType, accepted, model, latencyMs } = req.body as {
      completionId?: string;
      eventType?: string;
      accepted?: boolean;
      model?: string;
      latencyMs?: number;
    };

    const safeEventType = eventType || 'unknown';

    await pool.query(
      `INSERT INTO completion_events (user_id, project_id, completion_id, event_type, accepted, model_used, latency_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        projectId,
        completionId || null,
        safeEventType,
        typeof accepted === 'boolean' ? accepted : null,
        model || null,
        Number.isFinite(latencyMs as number) ? latencyMs : null,
      ],
    );

    res.status(201).json({ success: true });
  } catch (error: any) {
    console.error('[Analytics] Failed to log completion event:', error?.message || error);
    res.status(500).json({ message: 'Failed to log completion event' });
  }
});
