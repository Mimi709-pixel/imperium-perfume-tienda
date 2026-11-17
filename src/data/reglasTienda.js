// Reglas de negocio compartidas entre la tienda y el servidor de pagos.
// No importa nada para que funcione igual en el navegador y en el servidor.

// Número de WhatsApp actual de la tienda. Se usa si el admin no ha configurado otro.
export const WHATSAPP_TIENDA = '573053638769'
const WHATSAPP_PLACEHOLDER = '573000000000'

// Devuelve el número de WhatsApp configurado, solo con dígitos
export function numeroWhatsApp(config) {
  const numero = String(config?.whatsappSupport?.phone || '').replace(/\D/g, '')

  if (numero.length < 10 || numero === WHATSAPP_PLACEHOLDER) {
    return WHATSAPP_TIENDA
  }

  return numero
}

// Formato legible: 573053638769 -> +57 305 3638769
export function formatoWhatsApp(numero) {
  const limpio = String(numero || '').replace(/\D/g, '')

  if (limpio.length === 12 && limpio.startsWith('57')) {
    return `+57 ${limpio.slice(2, 5)} ${limpio.slice(5)}`
  }

  return `+${limpio}`
}

// Busca un cupón activo por código, sin importar mayúsculas
export function buscarCupon(config, codigo) {
  const buscado = String(codigo || '').trim().toUpperCase()
  if (!buscado) return null

  const cupones = Array.isArray(config?.coupons) ? config.coupons : []

  return (
    cupones.find(
      (cupon) =>
        cupon &&
        cupon.active !== false &&
        String(cupon.code || '').trim().toUpperCase() === buscado
    ) || null
  )
}

// Calcula el descuento en pesos sobre el subtotal de productos
export function calcularDescuento(cupon, subtotal) {
  if (!cupon) return 0

  const valor = Number(cupon.discountValue) || 0
  const base = Math.max(0, Number(subtotal) || 0)

  if (valor <= 0 || base <= 0) return 0

  const descuento = cupon.discountType === 'percentage'
    ? Math.round((base * Math.min(valor, 100)) / 100)
    : Math.round(valor)

  // Nunca más que el valor de los productos
  return Math.min(descuento, base)
}

// Texto corto del cupón: "10%" o "$20.000"
export function describirCupon(cupon) {
  if (!cupon) return ''

  if (cupon.discountType === 'percentage') {
    return `${Number(cupon.discountValue) || 0}%`
  }

  return Number(cupon.discountValue || 0).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  })
}
