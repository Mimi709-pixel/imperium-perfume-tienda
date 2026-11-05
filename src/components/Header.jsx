import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getProducts } from '../data/products'
import { useCarrito } from '../context/CarritoContext'
import './Header.css'

function Header() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  // CORRECCIÓN: Inicializamos de forma segura como arreglo vacío para evitar fallos de render en móvil
  const [products, setProducts] = useState([])

  const { items } = useCarrito()
  const navigate = useNavigate()

  const cantidadCarrito = items.reduce(
    (total, item) => total + Number(item.cantidad || 0),
    0
  )

  useEffect(() => {
    // CARGA SEGURA: Obtenemos los productos al montar el componente de manera asíncrona/segura
    try {
      const initialProducts = getProducts()
      if (Array.isArray(initialProducts)) {
        setProducts(initialProducts)
      }
    } catch (e) {
      console.error('Error cargando productos en Header:', e)
    }

    function updateProducts() {
      const data = getProducts()
      if (Array.isArray(data)) {
        setProducts(data)
      }
    }

    window.addEventListener('imperium-products-updated', updateProducts)
    window.addEventListener('storage', updateProducts)

    return () => {
      window.removeEventListener('imperium-products-updated', updateProducts)
      window.removeEventListener('storage', updateProducts)
    }
  }, [])

  const term = searchTerm.trim().toLowerCase()

  const searchResults = term && Array.isArray(products)
    ? products
        .filter((product) =>
          (product.name || '').toLowerCase().includes(term) ||
          (product.category || '').toLowerCase().includes(term) ||
          (Array.isArray(product.categories) &&
            product.categories.some((category) =>
              (category || '').toLowerCase().includes(term)
            ))
        )
        .slice(0, 8)
    : []

  return (
    <header className="header">
      <div className="navigation-bar">
        <nav className="nav">
          <Link to="/">Inicio</Link>
          <Link to="/hombre">Hombre</Link>
          <Link to="/mujer">Mujer</Link>
          <Link to="/arabes">Árabes</Link>
          <Link to="/combos">Combos</Link>
        </nav>

        <div className="header-actions">
          <button
            type="button"
            className="search-button"
            aria-label="Buscar productos"
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <span>⌕</span>
          </button>

          <Link
            to="/carrito"
            className="cart-button"
            aria-label={`Carrito de compras: ${cantidadCarrito} unidades`}
          >
            <span>🛒</span>
            <span className="cart-count">{cantidadCarrito}</span>
          </Link>

          <button
            type="button"
            className="menu-button"
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="mobile-menu">
          <Link to="/" onClick={() => setMenuOpen(false)}>Inicio</Link>
          <Link to="/hombre" onClick={() => setMenuOpen(false)}>Hombre</Link>
          <Link to="/mujer" onClick={() => setMenuOpen(false)}>Mujer</Link>
          <Link to="/arabes" onClick={() => setMenuOpen(false)}>Árabes</Link>
          <Link to="/combos" onClick={() => setMenuOpen(false)}>Combos</Link>
        </div>
      )}

      {searchOpen && (
        <div className="search-panel" style={{ transform: 'translateZ(0)', WebkitBackfaceVisibility: 'hidden' }}>
          <div className="search-panel-content">
            <input
              type="text"
              placeholder="Buscar perfumes..."
              aria-label="Buscar perfumes"
              autoFocus
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              style={{ WebkitAppearance: 'none', appearance: 'none' }}
            />

            <button
              type="button"
              className="search-close"
              onClick={() => {
                setSearchOpen(false)
                setSearchTerm('')
              }}
              aria-label="Cerrar búsqueda"
            >
              ×
            </button>
          </div>

          {term && (
            <div className="search-results">
              {searchResults.length > 0 ? (
                searchResults.map((product) => (
                  <button
                    type="button"
                    className="search-result"
                    key={product.id}
                    onClick={() => {
                      navigate(`/producto/${product.id}`)
                      setSearchOpen(false)
                      setSearchTerm('')
                    }}
                  >
                    <img src={product.image} alt={product.name} />

                    <span className="search-result-info">
                      <strong>{product.name}</strong>

                      <small>
                        {Array.isArray(product.categories)
                          ? product.categories.filter(Boolean).join(' · ')
                          : product.category}
                      </small>

                      <span>
                        {Number(product.price || 0).toLocaleString('es-CO', {
                          style: 'currency',
                          currency: 'COP',
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </span>
                  </button>
                ))
              ) : (
                <p className="search-no-results">
                  No encontramos perfumes con ese nombre.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  )
}

export default Header