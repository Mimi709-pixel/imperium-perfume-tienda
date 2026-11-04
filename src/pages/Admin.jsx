import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import ReactQuill from 'react-quill-new'
import DOMPurify from 'dompurify'
import {
  getProducts,
  saveProducts,
  getStoreConfig,
  saveStoreConfig,
} from '../data/products'
import 'react-quill-new/dist/quill.snow.css'
import './Admin.css'

const CATEGORIES = ['Hombre', 'Mujer', 'Árabes', 'Combos', 'Originales']

const EDITOR_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: ['#f5f0e6', '#e5c77e', '#c6a45c', '#b9b3a7', '#ffffff', '#000000'] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['link'],
    ['clean'],
  ],
}

const EDITOR_FORMATS = [
  'header',
  'bold',
  'italic',
  'underline',
  'strike',
  'color',
  'list',
  'align',
  'link',
]

function getProductCategories(product) {
  // MODIFICACIÓN FUNCIONAL: Prioriza el arreglo 'categories', y si no existe, convierte 'category' en arreglo
  const rawCategories = Array.isArray(product.categories) && product.categories.length > 0
    ? product.categories
    : (product.category ? [product.category] : [])

  return [...new Set(rawCategories.filter((category) => CATEGORIES.includes(category)))]
}

function cleanDescription(value) {
  if (!value) return ''
  const sanitized = DOMPurify.sanitize(value)

  return sanitized
    .replace(/background-color\s*:\s*[^;"]+;?/gi, '')
    .replace(/background\s*:\s*[^;"]+;?/gi, '')
    .replace(/\sbgcolor\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/<span\b[^>]*>\s*<\/span>/gi, '')
}

function Admin() {
  const navigate = useNavigate()

  function cerrarSesion() {
    sessionStorage.removeItem('imperium_admin_authenticated')
    navigate('/admin/login')
  }

  const [products, setProducts] = useState([])
  const [config, setConfig] = useState(getStoreConfig())
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [message, setMessage] = useState('')
  const [configMessage, setConfigMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const [nuevaZona, setNuevaZona] = useState({ name: '', price: '' })
  const [nuevoCupon, setNuevoCupon] = useState({ code: '', discountType: 'percentage', discountValue: '' })

  const emptyForm = {
    name: '',
    description: '',
    category: '',
    categories: [],
    price: '',
    originalPrice: '',
    promoBadge: '',
    image: '',
    stock: '0',
    available: true,
    featured: false,
  }

  const [form, setForm] = useState({ ...emptyForm })

  useEffect(() => {
    async function loadAdminData() {
      try {
        const data = await getProducts()
        if (Array.isArray(data)) {
          setProducts(data)
        }
      } catch (error) {
        console.error('Error cargando productos en Admin:', error)
      } finally {
        setLoading(false)
      }
    }
    loadAdminData()
  }, [])

  function handleChange(event) {
    const { name, value, type, checked } = event.target
    setForm((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function handleConfigChange(event) {
    const { name, value, type, checked } = event.target
    setConfig((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function handleAnnouncementChange(event) {
    const { name, value, type, checked } = event.target
    setConfig((prev) => ({
      ...prev,
      announcementBar: {
        ...(prev.announcementBar || {}),
        [name]: type === 'checkbox' ? checked : value,
      },
    }))
  }

  function handleWhatsappChange(event) {
    const { name, value } = event.target
    setConfig((prev) => ({
      ...prev,
      whatsappSupport: {
        ...(prev.whatsappSupport || {}),
        [name]: value,
      },
    }))
  }

  function agregarZona() {
    if (!nuevaZona.name.trim() || !nuevaZona.price) return
    const priceNum = Number(nuevaZona.price)
    if (!Number.isFinite(priceNum) || priceNum < 0) return

    const zonasActualizadas = [
      ...(config.zones || []),
      { name: nuevaZona.name.trim(), price: priceNum },
    ]

    const nuevaConfig = { ...config, zones: zonasActualizadas }
    setConfig(nuevaConfig)
    saveStoreConfig(nuevaConfig)
    setNuevaZona({ name: '', price: '' })
  }

  function eliminarZona(index) {
    const zonasActualizadas = (config.zones || []).filter((_, i) => i !== index)
    const nuevaConfig = { ...config, zones: zonasActualizadas }
    setConfig(nuevaConfig)
    saveStoreConfig(nuevaConfig)
  }

  function agregarCupon() {
    if (!nuevoCupon.code.trim() || !nuevoCupon.discountValue) return
    const valor = Number(nuevoCupon.discountValue)
    if (!Number.isFinite(valor) || valor <= 0) return

    const cuponesActualizados = [
      ...(config.coupons || []),
      {
        code: nuevoCupon.code.trim().toUpperCase(),
        discountType: nuevoCupon.discountType,
        discountValue: valor,
        active: true,
      },
    ]

    const nuevaConfig = { ...config, coupons: cuponesActualizados }
    setConfig(nuevaConfig)
    saveStoreConfig(nuevaConfig)
    setNuevoCupon({ code: '', discountType: 'percentage', discountValue: '' })
  }

  function eliminarCupon(index) {
    const cuponesActualizados = (config.coupons || []).filter((_, i) => i !== index)
    const nuevaConfig = { ...config, coupons: cuponesActualizados }
    setConfig(nuevaConfig)
    saveStoreConfig(nuevaConfig)
  }

  function handleSaveConfig(event) {
    event.preventDefault()
    const freeShippingThreshold = Number(config.freeShippingThreshold)

    const configData = {
      ...config,
      freeShippingThreshold: Number.isFinite(freeShippingThreshold)
        ? freeShippingThreshold
        : 0,
    }

    if (saveStoreConfig(configData)) {
      setConfigMessage('Configuración guardada correctamente.')
    } else {
      setConfigMessage('Error al guardar la configuración.')
    }
  }

  async function updateProducts(updatedProducts, successMessage) {
  try {
    const saved = await saveProducts(updatedProducts)

    if (!saved) {
      setMessage('No se pudieron guardar los cambios. Intenta nuevamente.')
      return false
    }

    setProducts(updatedProducts)
    setMessage(successMessage)
    return true
  } catch (error) {
    console.error('Error al guardar los productos:', error)
    setMessage('No se pudieron guardar los cambios.')
    return false
  }
}
  async function handleSubmit(event) {
    event.preventDefault()
    const price = Number(form.price)
    const originalPrice = form.originalPrice ? Number(form.originalPrice) : 0
    const stock = Number(form.stock)
    const categories = [...new Set(form.categories)]
    console.log('Categorías seleccionadas:', form.categories)
console.log('Categorías que se van a guardar:', categories)

    if (categories.length === 0) {
      setMessage('Debes seleccionar al menos una categoría.')
      return
    }

    if (
      !form.name.trim() ||
      !form.image.trim() ||
      form.price === '' ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      setMessage('Revisa los datos del formulario.')
      return
    }

    const productData = {
      name: form.name.trim(),
      description: cleanDescription(form.description),
      category: categories[0],
      categories,
      price,
      originalPrice,
      promoBadge: form.promoBadge.trim(),
      image: form.image.trim(),
      stock,
      available: Boolean(form.available),
      featured: Boolean(form.featured),
    }

    let updatedProducts
    let successMessage

    if (editingId !== null) {
      updatedProducts = products.map((product) =>
        product.id === editingId ? { ...product, ...productData } : product
      )
      successMessage = 'Producto actualizado.'
    } else {
      const maxId = products.length > 0 ? Math.max(0, ...products.map((p) => Number(p.id) || 0)) : 0
      const newProduct = {
        id: String(maxId + 1),
        ...productData,
      }
      updatedProducts = [...products, newProduct]
      successMessage = 'Producto agregado.'
    }

    if (await updateProducts(updatedProducts, successMessage)) {
      setForm({ ...emptyForm })
      setEditingId(null)
    }
  }

  function handleEdit(product) {
    const categories = getProductCategories(product)
    setEditingId(product.id)

    setForm({
      name: product.name ?? '',
      description: cleanDescription(product.description ?? ''),
      category: categories[0] || '',
      categories: categories,
      price: String(product.price ?? ''),
      originalPrice: String(product.originalPrice ?? ''),
      promoBadge: product.promoBadge ?? '',
      image: product.image ?? '',
      stock: String(product.stock ?? 0),
      available: product.available ?? true,
      featured: product.featured ?? false,
    })
    setMessage('')
  }

  function handleCancel() {
    setEditingId(null)
    setForm({ ...emptyForm })
    setMessage('')
  }

  async function handleDelete(id) {
    if (!window.confirm('¿Quieres eliminar este producto?')) return
    const updatedProducts = products.filter((p) => p.id !== id)
    if (await updateProducts(updatedProducts, 'Producto eliminado.')) {
      if (editingId === id) handleCancel()
    }
  }

  const filteredProducts = Array.isArray(products)
    ? products.filter((p) =>
        (p.name ?? '').toLowerCase().includes(searchTerm.trim().toLowerCase())
      )
    : []

  if (loading) {
    return (
      <main className="admin-page" style={{ textAlign: 'center', padding: '80px', color: '#fff' }}>
        <p>Cargando panel de administración...</p>
      </main>
    )
  }

  return (
    <main className="admin-page">
      <header className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p className="admin-eyebrow">IMPERIUM PERFUME GALLERY</p>
          <h1>Panel de administración profesional</h1>
          <p>Gestiona productos, descuentos, envíos, cupones y la tienda.</p>
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <Link to="/" className="admin-btn-tienda" style={{ color: '#e5c77e', textDecoration: 'none', fontSize: '0.9rem', border: '1px solid #333', padding: '8px 16px', borderRadius: '6px', background: '#111' }}>
            ← Ver Tienda
          </Link>
          <button
            type="button"
            onClick={cerrarSesion}
            style={{
              background: 'transparent',
              border: '1px solid #ff4d4d',
              color: '#ff4d4d',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.85rem',
            }}
          >
            🔒 Cerrar Sesión
          </button>
        </div>
      </header>

      {/* SECCIÓN 1: REGLAS DE ENVÍO Y PROMOCIONES GLOBALES */}
      <section className="admin-section">
        <h2>Reglas de envío y promociones globales</h2>

       <form className="admin-form" onSubmit={handleSaveConfig}>
          <div className="admin-form">
            <label className="admin-checkbox" style={{ gridColumn: '1 / -1' }}>
              <input
                name="enableFreeShipping"
                type="checkbox"
                checked={config.enableFreeShipping}
                onChange={handleConfigChange}
              />
              Activar promoción de Envío Gratis por monto mínimo
            </label>

            {config.enableFreeShipping && (
              <label style={{ gridColumn: '1 / -1' }}>
                Monto mínimo de compra para Envío Gratis (COP)
                <input
                  name="freeShippingThreshold"
                  type="number"
                  value={config.freeShippingThreshold}
                  onChange={handleConfigChange}
                  placeholder="Ej. 200000"
                />
              </label>
            )}

            <label className="admin-description-field" style={{ gridColumn: '1 / -1' }}>
              Aviso aclaratorio para el cliente sobre tarifas por sector
              <textarea
                name="shippingNotice"
                value={config.shippingNotice}
                onChange={handleConfigChange}
                rows={2}
                placeholder="Selecciona tu sector para calcular la tarifa exacta de entrega."
              />
            </label>
          </div>

          {/* MÓDULO DE TARIFAS POR SECTOR */}
          <div className="admin-description-field" style={{ marginTop: '20px' }}>
            <label style={{ color: '#e5c77e', fontWeight: 'bold' }}>
              Tarifas personalizadas por sector o localidad:
            </label>

            <div className="admin-product-list" style={{ marginTop: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
              {(config.zones || []).map((zona, index) => (
                <div key={index} className="admin-product-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{zona.name}</strong>
                    <p style={{ margin: 0, color: '#e5c77e' }}>${Number(zona.price).toLocaleString('es-CO')} COP</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => eliminarZona(index)}
                    className="admin-product-actions"
                    style={{ background: '#ba2d2d', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>

            <div className="admin-form" style={{ gridTemplateColumns: '2fr 1fr auto', display: 'grid', gap: '10px', marginTop: '15px' }}>
              <input
                value={nuevaZona.name}
                onChange={(e) => setNuevaZona({ ...nuevaZona, name: e.target.value })}
                placeholder="Nombre del sector (Ej. Bosa Porvenir)"
              />
              <input
                type="number"
                value={nuevaZona.price}
                onChange={(e) => setNuevaZona({ ...nuevaZona, price: e.target.value })}
                placeholder="Precio (Ej. 15000)"
              />
              <button type="button" onClick={agregarZona}>
                + Agregar sector
              </button>
            </div>
          </div>

          <div className="admin-form-actions" style={{ marginTop: '20px' }}>
            <button type="submit">
              Guardar configuración de envíos
            </button>
          </div>
        </form>

        {configMessage && <p role="status" style={{ color: '#e5c77e', marginTop: '10px' }}>{configMessage}</p>}
      </section>

      {/* SECCIÓN 2: BARRA DE ANUNCIOS Y WHATSAPP */}
      <section className="admin-section">
        <h2>Barra de anuncios superior y soporte de WhatsApp</h2>

        <form className="admin-form" onSubmit={handleSaveConfig}>
          <label className="admin-checkbox" style={{ gridColumn: '1 / -1' }}>
            <input
              name="enabled"
              type="checkbox"
              checked={config.announcementBar?.enabled ?? true}
              onChange={handleAnnouncementChange}
            />
            Mostrar barra de anuncios promocional en la parte superior del sitio
          </label>

          <label className="admin-description-field" style={{ gridColumn: '1 / -1' }}>
            Texto de la barra de anuncios
            <input
              name="text"
              value={config.announcementBar?.text || ''}
              onChange={handleAnnouncementChange}
              placeholder="Ej. ✨ ENVÍOS GRATIS A BOGOTÁ POR COMPRAS SUPERIORES A $200.000 COP ✨"
            />
          </label>

          <label>
            Número de WhatsApp de soporte (con código de país)
            <input
              name="phone"
              value={config.whatsappSupport?.phone || ''}
              onChange={handleWhatsappChange}
              placeholder="Ej. 573001234567"
            />
          </label>

          <label>
            Mensaje inicial predeterminado para WhatsApp
            <input
              name="message"
              value={config.whatsappSupport?.message || ''}
              onChange={handleWhatsappChange}
              placeholder="Hola Imperium Perfume Gallery, me gustaría consultar..."
            />
          </label>

          <div className="admin-form-actions" style={{ gridColumn: '1 / -1' }}>
            <button type="submit">Guardar barra y contacto</button>
          </div>
        </form>
      </section>

      {/* SECCIÓN 3: CUPONES Y CÓDIGOS DE DESCUENTO */}
      <section className="admin-section">
        <h2>Gestor de cupones y códigos de descuento</h2>

        <div className="admin-product-list" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {(config.coupons || []).map((cupon, index) => (
            <div key={index} className="admin-product-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ color: '#e5c77e', fontSize: '1.1rem' }}>{cupon.code}</strong>
                <p style={{ margin: 0 }}>
                  Descuento:{' '}
                  {cupon.discountType === 'percentage'
                    ? `${cupon.discountValue}% OFF`
                    : `$${Number(cupon.discountValue).toLocaleString('es-CO')} COP`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => eliminarCupon(index)}
                style={{ background: '#ba2d2d', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
              >
                Quitar
              </button>
            </div>
          ))}
        </div>

        <div className="admin-form" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', marginTop: '15px' }}>
          <input
            value={nuevoCupon.code}
            onChange={(e) => setNuevoCupon({ ...nuevoCupon, code: e.target.value })}
            placeholder="Código (Ej. VIP2026)"
          />

          <select
            value={nuevoCupon.discountType}
            onChange={(e) => setNuevoCupon({ ...nuevoCupon, discountType: e.target.value })}
            style={{ background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '6px', padding: '10px' }}
          >
            <option value="percentage">Porcentaje (%)</option>
            <option value="fixed">Monto Fijo (COP)</option>
          </select>

          <input
            type="number"
            value={nuevoCupon.discountValue}
            onChange={(e) => setNuevoCupon({ ...nuevoCupon, discountValue: e.target.value })}
            placeholder="Valor (10 o 20000)"
          />

          <button type="button" onClick={agregarCupon}>
            + Crear cupón
          </button>
        </div>
      </section>

      {/* SECCIÓN 4: FORMULARIO DE PRODUCTOS */}
      <section className="admin-section">
        <h2>{editingId !== null ? 'Editar producto' : 'Agregar producto'}</h2>

        <form className="admin-form" onSubmit={handleSubmit}>
          <label>
            Nombre del perfume
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Ej. Invictus Victory"
              required
            />
          </label>

          <fieldset className="admin-categories-field">
            <legend>Categorías del perfume</legend>
            {CATEGORIES.map((category) => (
              <label className="admin-checkbox" key={category}>
                <input
                  type="checkbox"
                  checked={form.categories.includes(category)}
                  onChange={(event) => {
                    const selected = event.target.checked
                      ? [...form.categories, category]
                      : form.categories.filter((item) => item !== category)

                    setForm((prev) => ({
                      ...prev,
                      categories: selected,
                      category: selected[0] || '',
                    }))
                  }}
                />
                {category}
              </label>
            ))}
          </fieldset>

          <label>
            Precio de venta (COP)
            <input
              name="price"
              type="number"
              min="0"
              value={form.price}
              onChange={handleChange}
              placeholder="Ej. 169900"
              required
            />
          </label>

          <label>
            Precio anterior/original (COP) - Opcional
            <input
              name="originalPrice"
              type="number"
              min="0"
              value={form.originalPrice}
              onChange={handleChange}
              placeholder="Ej. 199900 (Déjalo vacío si no tiene oferta)"
            />
          </label>

          <label>
            Etiqueta promocional destacada (Opcional)
            <input
              name="promoBadge"
              value={form.promoBadge}
              onChange={handleChange}
              placeholder="Ej. COMBO 2X1, MÁS VENDIDO, LIQUIDACIÓN"
            />
          </label>

          <label>
            Ruta o URL de la imagen
            <input
              name="image"
              value={form.image}
              onChange={handleChange}
              placeholder="/images/perfume.jpg"
              required
            />
          </label>

          <div className="admin-description-field">
            <label>Descripción del perfume</label>
            <div className="admin-description-editor">
              <ReactQuill
                theme="snow"
                value={form.description}
                onChange={(value) => setForm((prev) => ({ ...prev, description: value }))}
                modules={EDITOR_MODULES}
                formats={EDITOR_FORMATS}
                placeholder="Describe el aroma, las notas y el estilo del perfume..."
              />
            </div>
          </div>

          <label>
            Unidades disponibles
            <input
              name="stock"
              type="number"
              min="0"
              value={form.stock}
              onChange={handleChange}
              required
            />
          </label>

          <label className="admin-checkbox">
            <input
              name="available"
              type="checkbox"
              checked={form.available}
              onChange={handleChange}
            />
            Producto disponible para la venta
          </label>

          <label className="admin-checkbox">
            <input
              name="featured"
              type="checkbox"
              checked={form.featured}
              onChange={handleChange}
            />
            Mostrar en destacados
          </label>

          <div className="admin-form-actions">
            <button type="submit">
              {editingId !== null ? 'Guardar cambios' : 'Agregar producto'}
            </button>
            {editingId !== null && (
              <button type="button" onClick={handleCancel}>
                Cancelar
              </button>
            )}
          </div>
        </form>

        {message && <p role="status" style={{ color: '#e5c77e', marginTop: '10px' }}>{message}</p>}
      </section>

      {/* SECCIÓN 5: LISTADO Y BÚSQUEDA DE PRODUCTOS */}
      <section className="admin-section">
        <h2>Productos registrados ({filteredProducts.length})</h2>

        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Buscar perfume por nombre..."
        />

        <div className="admin-product-list">
          {filteredProducts.map((product) => (
            <article className="admin-product-item" key={product.id}>
              <div>
                <h3>{product.name}</h3>
                <p>Categorías: {getProductCategories(product).join(', ') || 'Sin categoría'}</p>
                <p>Precio: ${(Number(product.price) || 0).toLocaleString('es-CO')} COP</p>

                {Number(product.originalPrice) > Number(product.price) && (
                  <p style={{ color: '#e5c77e' }}>
                    Precio anterior: ${(Number(product.originalPrice)).toLocaleString('es-CO')} COP
                  </p>
                )}

                {product.promoBadge && (
                  <p><strong>Etiqueta:</strong> {product.promoBadge}</p>
                )}

                <p>Existencias: {product.stock ?? 0}</p>
              </div>

              <div className="admin-product-actions">
                <button type="button" onClick={() => handleEdit(product)}>
                  Editar
                </button>
                <button type="button" onClick={() => handleDelete(product.id)}>
                  Quitar
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

export default Admin