const BASE = 'https://developers.teachable.com/v1';

function headers() {
  return { apiKey: process.env.TEACHABLE_API_KEY, Accept: 'application/json' };
}

// Los 11 cursos del bundle Pack Leyes Administrativo (bundle 746945)
export const BUNDLE_COURSES = [
  { id: 2665379, name: 'LEY DE JURISDICCIÓN CONTENCIOSO ADMINISTRATIVA' },
  { id: 2550305, name: 'LA LEY ORGÁNICA DEL TRIBUNAL CONSTITUCIONAL' },
  { id: 2556827, name: 'LEY DE CONTRATOS DEL SECTOR PÚBLICO' },
  { id: 2550289, name: 'LAS LEYES DE IGUALDAD' },
  { id: 2559560, name: 'LEY 39/2015 + LEY 40/2015' },
  { id: 2945063, name: 'Ley de Prevención de Riesgos Laborales' },
  { id: 2550250, name: 'LA CONSTITUCIÓN ESPAÑOLA' },
  { id: 2665372, name: 'LEY REGULADORA DE LAS BASES DEL RÉGIMEN LOCAL' },
  { id: 2665376, name: 'LEY DE ENJUICIAMIENTO CIVIL' },
  { id: 2945064, name: 'LEY GENERAL PRESUPUESTARIA' },
  { id: 2550313, name: 'ESTATUTO BÁSICO DEL EMPLEADO PÚBLICO' },
];

/**
 * Busca un usuario por email. Devuelve { id, name, email } o null.
 */
export async function findUserByEmail(email) {
  const res = await fetch(
    `${BASE}/users?email=${encodeURIComponent(email)}`,
    { headers: headers() }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const users = data.users || [];
  return users.length > 0 ? users[0] : null;
}

/**
 * Crea un usuario en Teachable. Devuelve el objeto usuario creado.
 */
export async function createUser(email, name) {
  const res = await fetch(`${BASE}/users`, {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: name || email.split('@')[0],
      email,
      password: generatePassword(),
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Teachable createUser failed (${res.status}): ${err}`);
  }
  return await res.json();
}

/**
 * Enrolla un usuario en un curso.
 */
export async function enrollUser(userId, courseId) {
  const res = await fetch(`${BASE}/enroll`, {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, course_id: courseId }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Enroll failed (user=${userId}, course=${courseId}): ${err}`);
  }
}

/**
 * Desenrola un usuario de un curso.
 */
export async function unenrollUser(userId, courseId) {
  const res = await fetch(`${BASE}/unenroll`, {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, course_id: courseId }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Unenroll failed (user=${userId}, course=${courseId}): ${err}`);
  }
}

/**
 * Enrolla un usuario en TODOS los cursos del bundle.
 */
export async function enrollInAllCourses(userId) {
  const results = [];
  for (const course of BUNDLE_COURSES) {
    try {
      await enrollUser(userId, course.id);
      results.push({ course: course.name, status: 'enrolled' });
    } catch (err) {
      results.push({ course: course.name, status: 'error', error: err.message });
    }
  }
  return results;
}

/**
 * Desenrola un usuario de TODOS los cursos del bundle.
 */
export async function unenrollFromAllCourses(userId) {
  const results = [];
  for (const course of BUNDLE_COURSES) {
    try {
      await unenrollUser(userId, course.id);
      results.push({ course: course.name, status: 'unenrolled' });
    } catch (err) {
      results.push({ course: course.name, status: 'error', error: err.message });
    }
  }
  return results;
}

function generatePassword() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  let pass = '';
  for (let i = 0; i < 16; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  return pass;
}
