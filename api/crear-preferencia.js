// Endpoint de pago para Vercel.
// La lógica está en server/crearPreferencia.js y es la misma que usa Cloudflare Pages.
// El token de Mercado Pago ya no va en el código: se configura como variable de entorno MP_ACCESS_TOKEN.

import { crearPreferencia } from '../server/crearPreferencia.js'

export default async function handler(req, res) {
  // Solo se permiten peticiones POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const protocolo = req.headers['x-forwarded-proto'] || 'https'
  const origin = req.headers.origin || `${protocolo}://${req.headers.host}`

  const { status, json } = await crearPreferencia({
    body: req.body,
    origin,
    env: process.env,
  })

  return res.status(status).json(json)
}
