// Endpoint de pago para Cloudflare Pages.
// Responde en la misma ruta que antes: POST /api/crear-preferencia
// Variables de entorno necesarias en Cloudflare: MP_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_ANON_KEY

import { crearPreferencia } from '../../server/crearPreferencia.js'

export async function onRequestPost({ request, env }) {
  let body = {}

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Solicitud no válida' }, { status: 400 })
  }

  const origin = new URL(request.url).origin
  const { status, json } = await crearPreferencia({ body, origin, env })

  return Response.json(json, { status })
}

export function onRequest() {
  return Response.json({ error: 'Método no permitido' }, { status: 405 })
}
