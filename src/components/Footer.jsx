import { useEffect, useState } from 'react'
import { getStoreConfig } from '../data/products'
import { formatoWhatsApp, numeroWhatsApp } from '../data/reglasTienda'
import './Footer.css'

// Formato como estaba antes en el footer: $200.000
function formatoPrecio(valor) {
  return `$${Number(valor || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
}

function Footer() {
  const [email, setEmail] = useState('')
  const [suscrito, setSuscrito] = useState(false)
  const [config, setConfig] = useState(() => getStoreConfig())

  // El WhatsApp y el envío gratis salen de la configuración del admin
  useEffect(() => {
    function actualizarConfig() {
      setConfig(getStoreConfig())
    }

    window.addEventListener('imperium-config-updated', actualizarConfig)
    return () => window.removeEventListener('imperium-config-updated', actualizarConfig)
  }, [])

  const numeroWA = numeroWhatsApp(config)
  const mensajeWA = config.whatsappSupport?.message || ''
  const enlaceWA = `https://wa.me/${numeroWA}${mensajeWA ? `?text=${encodeURIComponent(mensajeWA)}` : ''}`

  function handleSuscripcion(e) {
    e.preventDefault()
    if (email.trim()) {
      setSuscrito(true)
      setEmail('')
      setTimeout(() => setSuscrito(false), 3000)
    }
  }

  return (
    <footer className="footer-imperium">
      {/* BENEFICIOS Y CONFIANZA */}
      <div className="footer-beneficios">
        <div className="footer-beneficio-card">
          <span className="footer-icono">🚚</span>
          {config.enableFreeShipping ? (
            <>
              <h3>Envíos gratis</h3>
              <p>En Bogotá por compras superiores a {formatoPrecio(config.freeShippingThreshold)} COP</p>
            </>
          ) : (
            <>
              <h3>Envíos en Bogotá</h3>
              <p>Tarifa según tu sector, calculada al finalizar la compra</p>
            </>
          )}
        </div>

        <div className="footer-beneficio-card">
          <span className="footer-icono">🎧</span>
          <h3>Soporte prioritario</h3>
          <p>Te asesoramos para que encuentres tu fragancia ideal</p>
        </div>

        <div className="footer-beneficio-card">
          <span className="footer-icono">🛒</span>
          <h3>Compra segura</h3>
          <p>Garantía de originalidad y pago protegido</p>
        </div>
      </div>

      <div className="footer-linea-divisoria" />

      {/* NAVEGACIÓN Y BOLETÍN */}
      <div className="footer-contenido">
        <div className="footer-marca">
          <h2>IMPERIUM</h2>
          <p className="footer-subtitulo">PERFUME GALLERY</p>
          <p className="footer-descripcion">
            La colección de fragancias masculinas, femeninas y árabes más exclusiva de Bogotá.
          </p>
        </div>

        <div className="footer-seccion">
          <h4>Contáctanos</h4>
          <p>
            <strong>WhatsApp:</strong>{' '}
            <a
              href={enlaceWA}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-whatsapp"
            >
              {formatoWhatsApp(numeroWA)}
            </a>
          </p>
          <p><strong>Ubicación:</strong> Bogotá D.C., Colombia</p>
          <p><strong>Horarios:</strong> Lunes a Sábado: 8:00 AM - 8:00 PM</p>
          
          <form className="footer-newsletter" onSubmit={handleSuscripcion}>
            <input
              type="email"
              placeholder="Tu correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit">→</button>
          </form>
          {suscrito && <span className="footer-exito">¡Gracias por suscribirte!</span>}
        </div>

        {/* REDES SOCIALES OFICIALES */}
        <div className="footer-seccion">
          <h4>Síguenos</h4>
          <div className="footer-redes">
            <a
              href="https://instagram.com/imperiumperfumegallery"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-red-link"
              aria-label="Instagram @imperiumperfumegallery"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              <span>@imperiumperfumegallery</span>
            </a>

            <a
              href="https://tiktok.com/@imperium.perfume_."
              target="_blank"
              rel="noopener noreferrer"
              className="footer-red-link"
              aria-label="TikTok @imperium.perfume_."
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-5.2-1.74 2.89 2.89 0 0 1 2.31-2.83V7.65a6.34 6.34 0 0 0-5.1 6.27 6.34 6.34 0 1 0 11.44-3.72 8.3 8.3 0 0 0 5.2 1.83V8.59a4.84 4.84 0 0 1-1.43-1.9z"/>
              </svg>
              <span>@imperium.perfume_.</span>
            </a>
          </div>
        </div>
      </div>

      {/* COPYRIGHT */}
      <div className="footer-copyright">
        <p>© 2026, Imperium Perfume Gallery · Todos los derechos reservados.</p>
      </div>
    </footer>
  )
}

export default Footer