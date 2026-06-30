/**
 * ═══════════════════════════════════════════════════════════════
 * CRON JOB — Automatic Absence Verification Engine
 * ═══════════════════════════════════════════════════════════════
 *
 * PURPOSE:
 *   Runs the automatic absence detection every day at 12:00 PM.
 *   For every active employee with no Check-In event by noon,
 *   it automatically creates an ABSENT_AUTO attendance event.
 *
 * SCHEDULING OPTIONS:
 *   ──────────────────────────────────────────────────────────
 *   1. cron-job.org (FREE)
 *      Create a cron job at https://cron-job.org
 *      URL: https://your-domain.com/api/jobs/verify-attendance?token=YOUR_SECRET_TOKEN
 *      Schedule: Everyday at 12:00 → minute: 0, hour: 12, day: *, month: *, weekday: *
 *
 *   2. Vercel Cron Jobs (if deployed on Vercel)
 *      Add to vercel.json:
 *      {
 *        "crons": [
 *          {
 *            "path": "/api/jobs/verify-attendance?token=YOUR_SECRET_TOKEN",
 *            "schedule": "0 12 * * *"
 *          }
 *        ]
 *      }
 *
 *   3. Windows Task Scheduler (local deployment)
 *      Use the provided script: scripts/run-absence-cron.ps1
 *      Or set up directly:
 *        - Trigger: Daily at 12:00 PM
 *        - Action: Start a program → curl http://localhost:3000/api/jobs/verify-attendance
 *
 *   4. GitHub Actions
 *      - Uses repository_dispatch or scheduled workflow
 *      - Sends POST to your deployed endpoint
 *
 *   5. Linux/Mac Cron
 *      $ crontab -e
 *      0 12 * * * curl -s https://your-domain.com/api/jobs/verify-attendance?token=YOUR_SECRET_TOKEN
 *
 * SECURITY:
 *   Set CRON_SECRET_TOKEN in your .env.local file to protect this endpoint.
 *   Example: CRON_SECRET_TOKEN="my-secret-cron-key-2026"
 *   Then call: /api/jobs/verify-attendance?token=my-secret-cron-key-2026
 * ═══════════════════════════════════════════════════════════════
 */

import { runAbsenceEngine } from '../../../utils/attendanceEngine';

export const config = {
  // Allow longer execution for processing many employees
  maxDuration: 60,
};

export default async function handler(req, res) {
  try {
    // ── HTTP method validation ──
    if (req.method !== 'GET' && req.method !== 'POST') {
      res.status(405).json({ success: false, error: 'Method not allowed. Use GET.' });
      return;
    }

    // ── Security: Verify secret token ──
    const secretToken = process.env.CRON_SECRET_TOKEN;
    const requestToken = req.query?.token || req.headers?.['x-cron-token'] || '';

    if (secretToken) {
      if (requestToken !== secretToken) {
        console.warn('[CronJob] Unauthorized attempt to run absence engine');
        res.status(401).json({
          success: false,
          error: 'Unauthorized. Set CRON_SECRET_TOKEN in .env.local and pass ?token= in the URL.',
        });
        return;
      }
    } else {
      // No token configured — warn but still proceed (dev mode)
      console.warn('[CronJob] CRON_SECRET_TOKEN not configured. Consider setting it for production.');
    }

    // ── Run the absence engine ──
    console.log(`[CronJob] Absence engine started at ${new Date().toISOString()}`);

    const result = await runAbsenceEngine();

    if (result.success) {
      const message = `Absence verification completed. ${result.absentCount || 0} employees marked absent.`;
      console.log(`[CronJob] ${message}`);

      res.status(200).json({
        success: true,
        message,
        absentCount: result.absentCount || 0,
        timestamp: new Date().toISOString(),
        engine: 'Enterprise Attendance Engine v2.0',
      });
    } else {
      console.error('[CronJob] Absence engine failed:', result.error);
      res.status(500).json({
        success: false,
        error: result.error || 'Absence engine failed',
      });
    }
  } catch (error) {
    console.error('[CronJob] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
