import Stripe from 'stripe';

let client;

export function getStripe() {
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return client;
}

const PAYMENT_LINK_ID = 'plink_1T4JrGB2szZEmbl7K8W84829';

/**
 * Obtiene checkout sessions completadas del payment link,
 * creadas después de una fecha dada.
 */
export async function getCompletedSessions(afterTimestamp) {
  const stripe = getStripe();
  const sessions = [];
  const params = {
    payment_link: PAYMENT_LINK_ID,
    status: 'complete',
    limit: 100,
  };
  if (afterTimestamp) {
    params.created = { gte: afterTimestamp };
  }

  for await (const session of stripe.checkout.sessions.list(params)) {
    sessions.push(session);
  }

  return sessions;
}
