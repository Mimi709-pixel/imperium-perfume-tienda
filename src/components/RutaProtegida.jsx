import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { esAdministrador } from '../services/adminAuth'

function RutaProtegida({ children }) {
  // 'verificando' | 'permitido' | 'denegado'
  const [estado, setEstado] = useState('verificando')

  useEffect(() => {
    let activo = true

    esAdministrador().then((esAdmin) => {
      if (activo) setEstado(esAdmin ? 'permitido' : 'denegado')
    })

    return () => {
      activo = false
    }
  }, [])

  if (estado === 'verificando') {
    return (
      <main className="admin-page" style={{ textAlign: 'center', padding: '80px', color: '#fff' }}>
        <p>Verificando acceso...</p>
      </main>
    )
  }

  if (estado === 'denegado') {
    return <Navigate to="/admin/login" replace />
  }

  return children
}

export default RutaProtegida
