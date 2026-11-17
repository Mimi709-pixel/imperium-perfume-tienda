import { useEffect, useState } from 'react'
import { getStoreConfig, subscribeToStoreConfig } from '../data/products'
import './AnnouncementBar.css'

// Barra de anuncios superior. El texto y si se muestra o no
// se controlan desde el panel admin.
function AnnouncementBar() {
  const [anuncio, setAnuncio] = useState(() => getStoreConfig().announcementBar)

  useEffect(() => {
    function actualizar() {
      setAnuncio(getStoreConfig().announcementBar)
    }

    window.addEventListener('imperium-config-updated', actualizar)
    const cancelarSuscripcion = subscribeToStoreConfig()

    return () => {
      window.removeEventListener('imperium-config-updated', actualizar)
      cancelarSuscripcion()
    }
  }, [])

  const texto = String(anuncio?.text || '').trim()

  if (!anuncio?.enabled || !texto) {
    return null
  }

  return (
    <div className="announcement-bar" role="region" aria-label="Anuncio de la tienda">
      <p>{texto}</p>
    </div>
  )
}

export default AnnouncementBar
