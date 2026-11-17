// Configuración por defecto de la tienda.
// Se usa mientras carga la configuración guardada en Supabase
// y también la usa el servidor de pagos para calcular el envío.
// Este archivo no debe importar nada para que funcione en el navegador y en el servidor.

export const DEFAULT_STORE_CONFIG = {
  freeShippingThreshold: 200000,
  enableFreeShipping: true,
  shippingNotice: 'Selecciona tu sector para calcular la tarifa exacta de entrega.',
  zones: [
    { name: 'Bosa / Porvenir', price: 15000 },
    { name: 'Chapinero / Central', price: 30000 },
    { name: 'Kennedy / Fontibón', price: 15000 },
    { name: 'Suba / Usaquén', price: 20000 },
    { name: 'Otras zonas de Bogotá', price: 18000 },
  ],
  announcementBar: {
    enabled: true,
    text: '✨ ENVÍOS GRATIS A BOGOTÁ POR COMPRAS SUPERIORES A $200.000 COP ✨',
  },
  whatsappSupport: {
    phone: '573053638769',
    message: 'Hola Imperium Perfume Gallery, quisiera recibir información sobre...',
  },
  coupons: [
    { code: 'IMPERIUM10', discountType: 'percentage', discountValue: 10, active: true },
    { code: 'BIENVENIDA20k', discountType: 'fixed', discountValue: 20000, active: true },
  ],
}

// Une una configuración guardada con los valores por defecto
// para que nunca falten campos.
export function mergeStoreConfig(saved) {
  const parsed = saved && typeof saved === 'object' ? saved : {}

  // La configuración es pública: nunca se guardan credenciales en ella.
  const { adminCredentials: _omit, ...rest } = parsed

  return {
    ...DEFAULT_STORE_CONFIG,
    ...rest,
    zones: Array.isArray(parsed.zones) ? parsed.zones : DEFAULT_STORE_CONFIG.zones,
    coupons: Array.isArray(parsed.coupons) ? parsed.coupons : DEFAULT_STORE_CONFIG.coupons,
    announcementBar: { ...DEFAULT_STORE_CONFIG.announcementBar, ...(parsed.announcementBar || {}) },
    whatsappSupport: normalizarWhatsapp(parsed.whatsappSupport),
  }
}

// El número de ejemplo 573000000000 se reemplaza por el real de la tienda
function normalizarWhatsapp(guardado) {
  const whatsapp = { ...DEFAULT_STORE_CONFIG.whatsappSupport, ...(guardado || {}) }
  const numero = String(whatsapp.phone || '').replace(/\D/g, '')

  if (!numero || numero === '573000000000') {
    whatsapp.phone = DEFAULT_STORE_CONFIG.whatsappSupport.phone
  }

  return whatsapp
}
