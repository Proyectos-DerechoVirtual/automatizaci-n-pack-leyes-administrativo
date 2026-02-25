import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

async function testSupabase() {
  console.log('\n--- SUPABASE ---');
  try {
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data, error } = await sb.from('pack_leyes_administrativo').select('id').limit(1);
    if (error) throw new Error(error.message);
    console.log('OK - tabla pack_leyes_administrativo accesible, registros:', data.length);
  } catch (err) {
    console.error('FAIL:', err.message);
  }
}

async function testStripe() {
  console.log('\n--- STRIPE ---');
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const sessions = await stripe.checkout.sessions.list({
      payment_link: 'plink_1T4JrGB2szZEmbl7K8W84829',
      limit: 1,
    });
    console.log('OK - payment link accesible, sesiones recientes:', sessions.data.length);
    if (sessions.data.length > 0) {
      const s = sessions.data[0];
      console.log(`  Última sesión: ${s.id} | ${s.customer_details?.email || 'sin email'} | ${s.status}`);
    }
  } catch (err) {
    console.error('FAIL:', err.message);
  }
}

async function testTeachable() {
  console.log('\n--- TEACHABLE ---');
  try {
    const res = await fetch('https://developers.teachable.com/v1/courses?per_page=1', {
      headers: { apiKey: process.env.TEACHABLE_API_KEY, Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log('OK - API accesible, total cursos:', data.meta?.total);
  } catch (err) {
    console.error('FAIL:', err.message);
  }
}

console.log('=== Test de conexiones: Pack Leyes Administrativo ===');
await testSupabase();
await testStripe();
await testTeachable();
console.log('\n=== Fin ===');
