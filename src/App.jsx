import { useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'

import Home from './pages/Home'
import Hombre from './pages/Hombre'
import Mujer from './pages/Mujer'
import Arabes from './pages/Arabes'
import Combos from './pages/Combos'
import Carrito from './pages/Carrito'
import Checkout from './pages/Checkout'
import Admin from './pages/Admin'
import Producto from './pages/ProductoDetalle'
import LoginAdmin from './pages/LoginAdmin'
import AdminActivar from './pages/AdminActivar'
import RutaProtegida from './components/RutaProtegida'
import Footer from './components/Footer'
import { supabase } from './services/supabase'

function App() {
  const navigate = useNavigate()

  // Si alguien abre un enlace de "olvidé mi contraseña" en cualquier página,
  // se le lleva a crear su nueva contraseña.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'PASSWORD_RECOVERY') {
        navigate('/admin/activar', { replace: true })
      }
    })

    return () => data.subscription.unsubscribe()
  }, [navigate])

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Páginas de categorías */}
        <Route path="/hombre" element={<Hombre />} />
        <Route path="/mujer" element={<Mujer />} />
        <Route path="/arabes" element={<Arabes />} />
        <Route path="/combos" element={<Combos />} />

        {/* Detalle del producto */}
        <Route path="/producto/:id" element={<Producto />} />

        {/* Carrito y checkout */}
        <Route path="/carrito" element={<Carrito />} />
        <Route path="/checkout" element={<Checkout />} />

        {/* Login de Administrador */}
        <Route path="/admin/login" element={<LoginAdmin />} />

        {/* Crear contraseña desde invitación o recuperación */}
        <Route path="/admin/activar" element={<AdminActivar />} />

        {/* Panel administrativo PROTEGIDO */}
        <Route
          path="/admin"
          element={
            <RutaProtegida>
              <Admin />
            </RutaProtegida>
          }
        />
      </Routes>

      <Footer />
    </>
  )
}

export default App