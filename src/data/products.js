
import { supabase } from '../services/supabase'
import { DEFAULT_STORE_CONFIG, mergeStoreConfig } from './defaultConfig'

const CONFIG_KEY = 'imperium-store-config'
// Copia local de los productos que usa el carrito para validar stock y precios
const PRODUCTS_CACHE_KEY = 'imperium-products'
const IMAGES_BUCKET = 'product-images'

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

const defaultConfig = DEFAULT_STORE_CONFIG

// Productos iniciales de respaldo
let cachedProducts = [...initialProducts]

function guardarCacheProductos(productos) {
  try {
    localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(productos))
  } catch {
    // Si el navegador no permite guardar, la tienda sigue funcionando
  }
}

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
        available: p.available ?? true,
        featured: p.featured ?? false,
        categories: Array.isArray(p.categories)
          ? p.categories
          : (p.category ? [p.category] : []),
      }))

      guardarCacheProductos(cachedProducts)
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
        // Estos campos antes no se enviaban y se perdían al guardar
        original_price: Number(prod.originalPrice) || 0,
        promo_badge: prod.promoBadge || '',
        available: prod.available ?? true,
        featured: prod.featured ?? false,
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
    guardarCacheProductos(cachedProducts)

    window.dispatchEvent(new Event('imperium-products-updated'))

    return true
  } catch (error) {
    console.error('Error al guardar en Supabase:', error)
    return false
  }
}

// ---------------------------------------------------------------
// CONFIGURACIÓN DE LA TIENDA
// Se guarda en Supabase (tabla store_config) para que los cambios del
// admin le lleguen a todos los clientes al instante.
// En el navegador se guarda una copia para mostrarla mientras carga.
// ---------------------------------------------------------------

function leerConfigLocal() {
  try {
    const saved = localStorage.getItem(CONFIG_KEY)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

function guardarConfigLocal(config) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
  } catch {
    // Sin almacenamiento local la tienda sigue funcionando
  }
}

let cachedConfig = mergeStoreConfig(leerConfigLocal() || defaultConfig)

// Obtener configuración de la tienda (respuesta inmediata con la última copia conocida)
export function getStoreConfig() {
  return cachedConfig
}

// Descargar la configuración actual desde Supabase
export async function loadStoreConfig() {
  try {
    const { data, error } = await supabase
      .from('store_config')
      .select('data')
      .eq('id', 'main')
      .maybeSingle()

    if (error) throw error

    const remota = data?.data

    // Si en Supabase todavía no hay configuración guardada se conserva la copia local.
    // Así el administrador no pierde lo que había configurado antes en su navegador.
    if (remota && Object.keys(remota).length > 0) {
      cachedConfig = mergeStoreConfig(remota)
      guardarConfigLocal(cachedConfig)
      window.dispatchEvent(new Event('imperium-config-updated'))
    }
  } catch (error) {
    console.error('Error al cargar la configuración de la tienda:', error)
  }

  return cachedConfig
}

// Guardar configuración de la tienda en Supabase
export async function saveStoreConfig(config) {
  try {
    const limpia = mergeStoreConfig(config)

    const { error } = await supabase
      .from('store_config')
      .upsert({ id: 'main', data: limpia, updated_at: new Date().toISOString() })

    if (error) throw error

    cachedConfig = limpia
    guardarConfigLocal(limpia)
    window.dispatchEvent(new Event('imperium-config-updated'))
    return true
  } catch (error) {
    console.error('Error al guardar la configuración:', error)
    return false
  }
}

// Escuchar cambios de configuración en tiempo real
export function subscribeToStoreConfig(callback) {
  const channel = supabase
    .channel(`imperium-config-realtime-${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'store_config' },
      async () => {
        const config = await loadStoreConfig()
        callback?.(config)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// ---------------------------------------------------------------
// IMÁGENES DE PRODUCTOS
// Se suben a Supabase Storage y quedan con una URL pública.
// Las imágenes viejas en /images siguen funcionando igual.
// ---------------------------------------------------------------

const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
const TAMANO_MAXIMO_MB = 5

export async function uploadProductImage(file) {
  if (!file) {
    return { ok: false, mensaje: 'Selecciona una imagen.' }
  }

  if (!TIPOS_IMAGEN.includes(file.type)) {
    return { ok: false, mensaje: 'Formato no permitido. Usa JPG, PNG, WEBP o AVIF.' }
  }

  if (file.size > TAMANO_MAXIMO_MB * 1024 * 1024) {
    return { ok: false, mensaje: `La imagen pesa más de ${TAMANO_MAXIMO_MB} MB.` }
  }

  const extension = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  const nombreBase = file.name
    .replace(/\.[^.]+$/, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'perfume'

  const ruta = `productos/${Date.now()}-${nombreBase}.${extension}`

  try {
    const { error } = await supabase.storage
      .from(IMAGES_BUCKET)
      .upload(ruta, file, { cacheControl: '31536000', upsert: false, contentType: file.type })

    if (error) throw error

    const { data } = supabase.storage.from(IMAGES_BUCKET).getPublicUrl(ruta)

    return { ok: true, url: data.publicUrl }
  } catch (error) {
    console.error('Error al subir la imagen:', error)
    return { ok: false, mensaje: 'No se pudo subir la imagen. Revisa tu sesión e intenta de nuevo.' }
  }
}

// Cargar la configuración apenas abre la tienda
if (typeof window !== 'undefined') {
  loadStoreConfig()
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