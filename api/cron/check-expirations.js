import 'dotenv/config';
import { getSupabase } from '../../lib/supabase.js';
import { unenrollFromAllCourses } from '../../lib/teachable.js';

/**
 * CRON: Revisa enrollments activos cuya fecha de expiración ya pasó.
 * Para cada uno:
 *   1. Desenrola al usuario de los 11 cursos en Teachable
 *   2. Actualiza el registro en Supabase a status='expired'
 *
 * Trigger: GET /api/cron/check-expirations?key=CRON_SECRET
 */
export default async function handler(req, res) {
  const secret = req.query.key || req.headers['x-cron-secret'];
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const dryRun = process.env.DRY_RUN === 'true';
  const log = {
    startedAt: new Date().toISOString(),
    dryRun,
    expiredFound: 0,
    unenrollments: [],
    errors: [],
  };

  try {
    const sb = getSupabase();
    const now = new Date().toISOString();

    // Buscar enrollments activos cuya fecha de expiración ya pasó
    const { data: expired, error: queryError } = await sb
      .from('pack_leyes_administrativo')
      .select('*')
      .eq('status', 'active')
      .lte('expires_at', now);

    if (queryError) throw new Error(queryError.message);

    log.expiredFound = (expired || []).length;

    for (const record of expired || []) {
      if (dryRun) {
        log.unenrollments.push({
          email: record.customer_email,
          teachableUserId: record.teachable_user_id,
          enrolledAt: record.enrolled_at,
          expiresAt: record.expires_at,
          status: 'dry_run',
        });
        continue;
      }

      try {
        // Desenrolar de todos los cursos
        const unenrollResults = await unenrollFromAllCourses(record.teachable_user_id);

        // Actualizar registro en Supabase
        const { error: updateError } = await sb
          .from('pack_leyes_administrativo')
          .update({
            status: 'expired',
            unenrolled_at: new Date().toISOString(),
          })
          .eq('id', record.id);

        if (updateError) throw new Error(updateError.message);

        log.unenrollments.push({
          email: record.customer_email,
          teachableUserId: record.teachable_user_id,
          unenrollResults,
          status: 'unenrolled',
        });
      } catch (err) {
        log.errors.push({
          email: record.customer_email,
          error: err.message,
        });
      }
    }
  } catch (err) {
    log.errors.push({ global: err.message });
  }

  log.finishedAt = new Date().toISOString();
  return res.status(200).json(log);
}
