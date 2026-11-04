
import { supabase } from '../services/supabase'

const CONFIG_KEY = 'imperium-store-config'

const initialProducts = [
  {
    id: '1',
    name: 'Invictus Victory',
    category: 'Hombre',
    categories: ['Hombre'],
    price: 169900,
    originalPrice: 199900,
    image: '/images/destacada-hombre.webp',
    stock: 20,
    available: true,
    featured: true,
    promoBadge: '',
  },
  {
    id: '2',
    name: 'Moschino Toy 2',
    category: 'Mujer',
    categories: ['Mujer'],
    price: 139900,
    originalPrice: 0,
    image: '/images/destacada-mujer.avif',
    stock: 20,
    available: true,
    featured: true,
    promoBadge: '',
  },
  {
    id: '3',
    name: 'Royal Bleu',
    category: 'Árabes',
    categories: ['Árabes'],
    price: 159900,
    originalPrice: 180000,
    image: '/images/destacada-arabe.jpg',
    stock: 20,
    available: true,
    featured: true,
    promoBadge: 'MÁS VENDIDO',
  },
  {
    id: '4',
    name: 'Club the nuit/Le Beau',
    category: 'Combos',
    categories: ['Combos'],
    price: 169900,
    originalPrice: 210000,
    image: '/images/destacada-combos.webp',
    stock: 20,
    available: true,
    featured: true,
    promoBadge: 'COMBO 2X1',
  },
]

const defaultConfig = {
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
    phone: '573000000000',
    message: 'Hola Imperium Perfume Gallery, quisiera recibir información sobre...',
  },
  coupons: [
    { code: 'IMPERIUM10', discountType: 'percentage', discountValue: 10, active: true },
    { code: 'BIENVENIDA20k', discountType: 'fixed', discountValue: 20000, active: true },
  ],
}

// Productos iniciales de respaldo
let cachedProducts = [...initialProducts]

// Obtener productos desde Supabase
export async function getProducts() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')

    if (error) throw error

    if (data && data.length > 0) {
      cachedProducts = data.map((p) => ({
        ...p,
        id: String(p.id),
        originalPrice: p.original_price ?? p.originalPrice ?? 0,
        promoBadge: p.promo_badge ?? p.promoBadge ?? '',
        categories: Array.isArray(p.categories)
          ? p.categories
          : (p.category ? [p.category] : []),
      }))

      return cachedProducts
    }

    return cachedProducts
  } catch (error) {
    console.error('Error al sincronizar con Supabase:', error)
    return cachedProducts
  }
}

// Guardar y actualizar productos
export async function saveProducts(productsList) {
  try {
    if (!Array.isArray(productsList) || productsList.length === 0) {
      console.error('Guardado cancelado: la lista está vacía.')
      return false
    }

    const { data: existingProducts, error: fetchError } = await supabase
      .from('products')
      .select('id')

    if (fetchError) throw fetchError

    const productsToSave = productsList.map((prod) => {
      const categories = Array.isArray(prod.categories)
        ? prod.categories
        : (prod.category ? [prod.category] : [])

      return {
        id: String(prod.id),
        name: prod.name,
        category: categories[0] || prod.category || '',
        categories,
        price: Number(prod.price) || 0,
        stock: Number(prod.stock) || 0,
        image: prod.image || null,
        description: prod.description || '',
      }
    })

    const { error: upsertError } = await supabase
      .from('products')
      .upsert(productsToSave)

    if (upsertError) throw upsertError

    // Solo permite eliminar un producto por operación.
    // Así evitamos borrar muchos productos si llega una lista incompleta.
    const incomingIds = new Set(productsToSave.map((prod) => prod.id))
    const idsToDelete = (existingProducts || [])
      .filter((prod) => !incomingIds.has(String(prod.id)))
      .map((prod) => prod.id)

    if (idsToDelete.length > 1) {
      throw new Error('Se detectaron varias eliminaciones. Operación cancelada por seguridad.')
    }

    if (idsToDelete.length === 1) {
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', idsToDelete[0])

      if (deleteError) throw deleteError
    }

    cachedProducts = productsList

    window.dispatchEvent(new Event('imperium-products-updated'))

    return true
  } catch (error) {
    console.error('Error al guardar en Supabase:', error)
    return false
  }
}

// Obtener configuración de la tienda
export function getStoreConfig() {
  try {
    const saved = localStorage.getItem(CONFIG_KEY)

    if (!saved) return defaultConfig

    const parsed = JSON.parse(saved)

    return {
      ...defaultConfig,
      ...parsed,
      zones: Array.isArray(parsed.zones)
        ? parsed.zones
        : defaultConfig.zones,
      coupons: Array.isArray(parsed.coupons)
        ? parsed.coupons
        : defaultConfig.coupons,
    }
  } catch (error) {
    console.error('Error al cargar la configuración:', error)
    return defaultConfig
  }
}

// Guardar configuración de la tienda
export function saveStoreConfig(config) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
    window.dispatchEvent(new Event('imperium-config-updated'))
    return true
  } catch (error) {
    console.error('Error al guardar la configuración:', error)
    return false
  }
}

// Escuchar cambios de productos en tiempo real desde Supabase
export function subscribeToProducts(callback) {
  const channel = supabase
    .channel('imperium-products-realtime')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'products',
      },
      async () => {
        const products = await getProducts()
        callback(products)
      }
    )
    .subscribe((status) => {
      console.log('Estado de sincronización Imperium:', status)
    })

  return () => {
    supabase.removeChannel(channel)
  }
}