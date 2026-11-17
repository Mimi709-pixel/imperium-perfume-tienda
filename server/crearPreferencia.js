// Lógica compartida para crear el pago en Mercado Pago.
// Funciona igual en Vercel (api/) y en Cloudflare Pages (functions/).
//
// Seguridad:
// - El token secreto de Mercado Pago se lee de la variable de entorno MP_ACCESS_TOKEN.
// - Los precios, el stock y el envío se calculan aquí con los datos de Supabase.
//   Lo que manda el navegador solo se usa para saber qué productos y cuántos.

import { mergeStoreConfig } from '../src/data/defaultConfig.js'
import { buscarCupon, calcularDescuento } from '../src/data/reglasTienda.js'

const MAX_UNIDADES_POR_PRODUCTO = 50

function respuesta(status, json) {
  return { status, json }
}

// Datos públicos de Supabase (los mismos de src/services/supabase.js).
// Se usan como respaldo si las variables del hosting faltan o están desactualizadas.
const SUPABASE_PUBLICO = {
  url: 'https://iznagxiqpsqvtdstkgkw.supabase.co',
  key: 'sb_publishable_fuBJAQq_jQH5YdO8dvjvzA_9sccaUG3',
}

function leerEnv(env) {
  // Conexiones a Supabase en orden de preferencia, sin repetir
  const candidatas = [
    { url: env.SUPABASE_URL, key: env.SUPABASE_ANON_KEY },
    { url: env.VITE_SUPABASE_URL, key: env.VITE_SUPABASE_ANON_KEY },
    SUPABASE_PUBLICO,
  ]
    .filter((c) => c.url && c.key)
    .map((c) => ({ url: String(c.url).trim().replace(/\/+$/, ''), key: String(c.key).trim() }))
    .filter((c, i, lista) => lista.findIndex((o) => o.url === c.url && o.key === c.key) === i)

  return {
    mpToken: env.MP_ACCESS_TOKEN ? String(env.MP_ACCESS_TOKEN).trim() : '',
    conexiones: candidatas,
  }
}

async function consultarSupabase({ url, key }, ruta) {
  const headers = { apikey: key }

  // Las llaves antiguas (JWT) también se envían como Authorization.
  // Las nuevas (sb_publishable_...) solo van en apikey.
  if (!key.startsWith('sb_')) {
    headers.Authorization = `Bearer ${key}`
  }

  const res = await fetch(`${url}/rest/v1/${ruta}`, { headers })

  if (!res.ok) {
    const detalle = await res.text().catch(() => '')
    throw new Error(`Supabase respondió ${res.status}: ${detalle.slice(0, 200)}`)
  }

  return res.json()
}

// Prueba cada conexión hasta que una funcione
async function consultarConRespaldo(conexiones, ruta) {
  let ultimoError

  for (const conexion of conexiones) {
    try {
      const datos = await consultarSupabase(conexion, ruta)
      return { datos, conexion }
    } catch (error) {
      console.error(`Supabase falló con ${conexion.url}:`, error.message)
      ultimoError = error
    }
  }

  throw ultimoError || new Error('No hay conexión a Supabase configurada')
}

export async function crearPreferencia({ body, origin, env }) {
  const { mpToken, conexiones } = leerEnv(env || {})

  if (!mpToken) {
    console.error('Falta la variable de entorno MP_ACCESS_TOKEN')
    return respuesta(500, { error: 'El pago en línea no está configurado. Usa la opción de WhatsApp.' })
  }

  // 1. Productos solicitados por el cliente: solo id y cantidad
  const itemsEntrada = Array.isArray(body?.items) ? body.items : []
  const solicitados = new Map()

  for (const item of itemsEntrada) {
    const id = item?.id ?? item?.productId
    const cantidad = Number(item?.quantity)

    // El envío ya no se acepta desde el navegador, se calcula aquí
    if (id === undefined || id === null || id === '') continue

    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAX_UNIDADES_POR_PRODUCTO) {
      return respuesta(400, { error: 'Cantidad no válida en el carrito.' })
    }

    const clave = String(id)
    solicitados.set(clave, (solicitados.get(clave) || 0) + cantidad)
  }

  if (solicitados.size === 0) {
    return respuesta(400, { error: 'El carrito está vacío.' })
  }

  // 2. Precios y stock reales desde Supabase
  const ids = [...solicitados.keys()].map((id) => `"${id.replace(/"/g, '')}"`).join(',')

  let productos
  let configGuardada

  try {
    const resultado = await consultarConRespaldo(
      conexiones,
      `products?select=*&id=in.(${encodeURIComponent(ids)})`
    )
    productos = resultado.datos

    const filasConfig = await consultarSupabase(
      resultado.conexion,
      'store_config?select=data&id=eq.main'
    ).catch(() => [])

    configGuardada = filasConfig?.[0]?.data
  } catch (error) {
    console.error('Error leyendo Supabase:', error)
    return respuesta(502, { error: 'No se pudo verificar el inventario. Intenta de nuevo.' })
  }

  const productosPorId = new Map((productos || []).map((p) => [String(p.id), p]))
  const itemsPago = []
  let subtotal = 0

  for (const [id, cantidad] of solicitados) {
    const producto = productosPorId.get(id)

    if (!producto || producto.available === false) {
      return respuesta(409, { error: 'Un producto de tu carrito ya no está disponible.' })
    }

    const stock = Number(producto.stock) || 0
    if (cantidad > stock) {
      return respuesta(409, { error: `Solo hay ${stock} unidades de ${producto.name}.` })
    }

    const precio = Number(producto.price) || 0
    if (precio <= 0) {
      return respuesta(409, { error: `El producto ${producto.name} no tiene precio válido.` })
    }

    subtotal += precio * cantidad
    itemsPago.push({
      id,
      title: String(producto.name || 'Perfume').slice(0, 250),
      unit_price: precio,
      quantity: cantidad,
      currency_id: 'COP',
    })
  }

  // 3. Cupón de descuento validado con la configuración real
  const config = mergeStoreConfig(configGuardada)
  const codigoCupon = String(body?.couponCode || '').trim()
  let descuento = 0
  let cupon = null

  if (codigoCupon) {
    cupon = buscarCupon(config, codigoCupon)

    if (!cupon) {
      return respuesta(409, { error: 'El cupón ya no es válido. Quítalo e intenta de nuevo.' })
    }

    descuento = calcularDescuento(cupon, subtotal)
  }

  // Mercado Pago no acepta precios negativos: con cupón se cobra un solo
  // ítem con el valor de los productos menos el descuento.
  if (descuento > 0) {
    const detalle = itemsPago.map((item) => `${item.title} x${item.quantity}`).join(', ')
    const totalProductos = subtotal - descuento

    if (totalProductos < 1) {
      return respuesta(409, { error: 'Este cupón cubre todo el valor. Finaliza tu pedido por WhatsApp.' })
    }

    itemsPago.length = 0
    itemsPago.push({
      id: 'pedido',
      title: `Pedido Imperium (cupón ${String(cupon.code).toUpperCase()})`.slice(0, 250),
      description: detalle.slice(0, 250),
      unit_price: totalProductos,
      quantity: 1,
      currency_id: 'COP',
    })
  }

  // 4. Envío calculado con la configuración de la tienda
  const zonas = config.zones.length > 0 ? config.zones : [{ name: 'Bogotá Estándar', price: 15000 }]
  const zona = zonas.find((z) => z.name === body?.zoneName) || zonas[0]
  const envioGratis = config.enableFreeShipping && subtotal >= Number(config.freeShippingThreshold)
  const costoEnvio = envioGratis ? 0 : Number(zona.price) || 0

  if (costoEnvio > 0) {
    itemsPago.push({
      id: 'envio',
      title: `Envío a domicilio (${zona.name})`,
      unit_price: costoEnvio,
      quantity: 1,
      currency_id: 'COP',
    })
  }

  // 5. Crear la preferencia en Mercado Pago
  const payer = body?.payer || {}
  const base = origin || ''

  try {
    const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mpToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: itemsPago,
        payer: {
          name: payer.name,
          email: payer.email,
          phone: payer.phone,
          address: payer.address,
        },
        back_urls: {
          success: `${base}/?status=success`,
          failure: `${base}/checkout?status=failure`,
          pending: `${base}/checkout?status=pending`,
        },
        auto_return: 'approved',
        statement_descriptor: 'IMPERIUM PERFUMES',
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('Mercado Pago rechazó la preferencia:', data)
      return respuesta(502, { error: 'Mercado Pago no pudo crear el pago. Intenta de nuevo.' })
    }

    return respuesta(200, { id: data.id, init_point: data.init_point })
  } catch (error) {
    console.error('Error al procesar con Mercado Pago:', error)
    return respuesta(500, { error: 'Error al crear la preferencia de pago.' })
  }
}
