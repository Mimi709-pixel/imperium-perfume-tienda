import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getProducts, subscribeToProducts } from '../data/products'
import './Products.css'

function Products() {
  const [activeProduct, setActiveProduct] = useState(0)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
  let isMounted = true

  async function loadData() {
    try {
      const data = await getProducts()

      if (isMounted && Array.isArray(data)) {
        setProducts(data)
      }
    } catch (error) {
      console.error('Error cargando productos destacados:', error)
    } finally {
      if (isMounted) setLoading(false)
    }
  }

  loadData()

  // Escuchar cambios directamente desde Supabase
  const unsubscribe = subscribeToProducts((data) => {
    if (isMounted && Array.isArray(data)) {
      setProducts(data)
    }
  })

  // Mantener la compatibilidad con los eventos locales
  function updateProducts() {
    loadData()
  }

  window.addEventListener('imperium-products-updated', updateProducts)
  window.addEventListener('storage', updateProducts)

  return () => {
    isMounted = false
    unsubscribe()

    window.removeEventListener('imperium-products-updated', updateProducts)
    window.removeEventListener('storage', updateProducts)
  }
}, [])

  // Si hay productos con featured true los muestra, sino toma los primeros para asegurar que la sección no quede vacía
  const featuredProducts = Array.isArray(products) && products.length > 0
    ? products.filter((product) => product.featured === true)
    : []

  const displayProducts = featuredProducts.length > 0 ? featuredProducts : products.slice(0, 4)

  if (loading) {
    return (
      <section className="products" style={{ textAlign: 'center', padding: '40px', color: '#fff' }}>
        <p>Cargando destacados...</p>
      </section>
    )
  }

  return (
    <section className="products">
      <div className="products-header">
        <div>
          <p>SELECCIÓN IMPERIUM</p>

          <h2>
            Nuestros <span>destacados.</span>
          </h2>
        </div>

        <Link to="/hombre" className="products-link">
          VER COLECCIÓN
          <span>→</span>
        </Link>
      </div>

      <div
        className="products-grid"
        onScroll={(event) => {
          const container = event.currentTarget
          const card = container.querySelector('.product-card')

          if (card) {
            const cardWidth = card.getBoundingClientRect().width
            const gap = parseFloat(
              getComputedStyle(container).columnGap
            ) || 0

            const index = Math.round(
              container.scrollLeft / (cardWidth + gap)
            )

            setActiveProduct(index)
          }
        }}
      >
        {displayProducts.map((product) => (
          <article className="product-card" key={product.id}>
            <div className="product-image">
              <Link
                to={`/producto/${product.id}`}
                aria-label={`Ver detalles de ${product.name}`}
                className="product-image-link"
              >
                <img
                  src={product.image}
                  alt={product.name}
                />
              </Link>

              <button
                type="button"
                className="product-favorite"
                aria-label="Agregar a favoritos"
                onClick={(event) => event.stopPropagation()}
              >
                ♡
              </button>
            </div>

            <div className="product-info">
              <p className="product-category">
                {product.category}
              </p>

              <Link
                to={`/producto/${product.id}`}
                className="product-title-link"
              >
                <h3>{product.name}</h3>
              </Link>

              <p className="product-price">
                {Number(product.price).toLocaleString('es-CO', {
                  style: 'currency',
                  currency: 'COP',
                  maximumFractionDigits: 0,
                })}
              </p>

              <Link
                to={`/producto/${product.id}`}
                className="product-detail-link"
              >
                VER PERFUME →
              </Link>
            </div>
          </article>
        ))}
      </div>

      <div className="product-indicators">
        {displayProducts.map((product, index) => (
          <button
            type="button"
            key={product.id}
            aria-label={`Ver destacado ${index + 1}`}
            className={activeProduct === index ? 'active' : ''}
            onClick={() => {
              const container = document.querySelector('.products-grid')
              const card = container?.querySelectorAll('.product-card')[index]

              if (container && card) {
                container.scrollTo({
                  left: card.offsetLeft - container.offsetLeft,
                  behavior: 'smooth',
                })

                setActiveProduct(index)
              }
            }}
          />
        ))}
      </div>
    </section>
  )
}

export default Products