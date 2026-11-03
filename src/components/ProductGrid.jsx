import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getProducts } from '../data/products'
import './ProductGrid.css'

function ProductGrid({ category }) {
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
        console.error('Error al cargar productos en la categoría:', error)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadData()

    function updateProducts() {
      loadData()
    }

    window.addEventListener('imperium-products-updated', updateProducts)
    window.addEventListener('storage', updateProducts)

    return () => {
      isMounted = false
      window.removeEventListener('imperium-products-updated', updateProducts)
      window.removeEventListener('storage', updateProducts)
    }
  }, [category])

  const categoryProducts = products.filter((product) => {
    const productCategories = Array.isArray(product.categories)
      ? product.categories
      : [product.category].filter(Boolean)

    return productCategories.includes(category)
  })

  if (loading) {
    return (
      <main
        className="catalog-page"
        style={{
          textAlign: 'center',
          padding: '80px',
          color: '#fff',
        }}
      >
        <p>Cargando colección Imperium...</p>
      </main>
    )
  }

  return (
    <main className="catalog-page">
      <p className="catalog-eyebrow">IMPERIUM PERFUME GALLERY</p>

      <h1>Perfumes para {category}</h1>

      <p className="catalog-description">
        Descubre nuestra colección y encuentra tu esencia.
      </p>

      {categoryProducts.length === 0 ? (
        <p className="catalog-empty">
          Próximamente encontrarás aquí nuestra colección.
        </p>
      ) : (
        <div className="catalog-grid">
          {categoryProducts.map((product) => (
            <article className="catalog-card" key={product.id}>
              <Link
                to={`/producto/${product.id}`}
                className="catalog-product-link"
                aria-label={`Ver detalles de ${product.name}`}
              >
                <div className="catalog-image">
                  <img src={product.image} alt={product.name} />
                </div>

                <div className="catalog-info">
                  <p>
                    {(Array.isArray(product.categories)
                      ? product.categories
                      : [product.category].filter(Boolean)
                    ).join(' · ')}
                  </p>

                  <h2>{product.name}</h2>

                  <p className="catalog-price">
                    {Number(product.price).toLocaleString('es-CO', {
                      style: 'currency',
                      currency: 'COP',
                      maximumFractionDigits: 0,
                    })}
                  </p>

                  {product.stock > 0 ? (
                    <span>Disponible</span>
                  ) : (
                    <span>Consulta disponibilidad</span>
                  )}
                </div>
              </Link>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}

export default ProductGrid