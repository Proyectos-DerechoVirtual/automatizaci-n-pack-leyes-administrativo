import 'dotenv/config';
import { getSupabase } from '../../lib/supabase.js';
import { getCompletedSessions } from '../../lib/stripe.js';
import { findUserByEmail, createUser, enrollInAllCourses } from '../../lib/teachable.js';

/**
 * CRON: Revisa pagos completados en Stripe del payment link del Pack Leyes Administrativo.
 * Para cada pago nuevo:
 *   1. Busca/crea usuario en Teachable
 *   2. Enrolla en los 11 cursos del bundle
 *   3. Guarda en Supabase con fecha de expiración (enrolled_at + 1 año)
 *
 * Trigger: GET /api/cron/check-payments?key=CRON_SECRET
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
    sessionsFound: 0,
    newEnrollments: [],
    skipped: [],
    errors: [],
  };

  try {
    const sb = getSupabase();

    // Obtener la fecha del último registro para no reprocesar
    const { data: lastRecord } = await sb
      .from('pack_leyes_administrativo')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1);

    // Si no hay registros previos, buscar desde hace 30 días
    const sinceDate = lastRecord?.length
      ? new Date(lastRecord[0].created_at)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const sinceTimestamp = Math.floor(sinceDate.getTime() / 1000);

    // Obtener sesiones completadas de Stripe
    const sessions = await getCompletedSessions(sinceTimestamp);
    log.sessionsFound = sessions.length;

    // Obtener session IDs ya procesados
    const { data: existing } = await sb
      .from('pack_leyes_administrativo')
      .select('stripe_session_id');
    const processedIds = new Set((existing || []).map(r => r.stripe_session_id));

    for (const session of sessions) {
      const sessionId = session.id;

      // Saltar si ya fue procesado
      if (processedIds.has(sessionId)) {
        log.skipped.push({ sessionId, reason: 'already_processed' });
        continue;
      }

      const email = session.customer_details?.email
        || session.customer_email;
      const name = session.customer_details?.name || null;

      if (!email) {
        log.errors.push({ sessionId, error: 'No email found in session' });
        continue;
      }

      if (dryRun) {
        log.newEnrollments.push({
          sessionId,
          email,
          name,
          status: 'dry_run',
        });
        continue;
      }

      try {
        // Buscar o crear usuario en Teachable
        let user = await findUserByEmail(email);
        if (!user) {
          const created = await createUser(email, name);
          user = created;
        }

        const teachableUserId = user.id;

        // Enrollar en los 11 cursos
        const enrollResults = await enrollInAllCourses(teachableUserId);

        // Calcular fecha de expiración (1 año desde ahora)
        const enrolledAt = new Date();
        const expiresAt = new Date(enrolledAt);
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);

        // Guardar en Supabase
        const { error: insertError } = await sb
          .from('pack_leyes_administrativo')
          .insert({
            stripe_session_id: sessionId,
            customer_email: email.toLowerCase(),
            customer_name: name,
            teachable_user_id: teachableUserId,
            enrolled_at: enrolledAt.toISOString(),
            expires_at: expiresAt.toISOString(),
            status: 'active',
          });

        if (insertError) throw new Error(insertError.message);

        log.newEnrollments.push({
          sessionId,
          email,
          name,
          teachableUserId,
          enrollResults,
          status: 'enrolled',
        });
      } catch (err) {
        log.errors.push({ sessionId, email, error: err.message });
      }
    }
  } catch (err) {
    log.errors.push({ global: err.message });
  }

  log.finishedAt = new Date().toISOString();
  return res.status(200).json(log);
}
