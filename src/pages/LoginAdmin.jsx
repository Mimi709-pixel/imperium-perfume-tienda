import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { iniciarSesionAdmin } from '../services/adminAuth'
import './LoginAdmin.css'

function LoginAdmin() {
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setCargando(true)
    setError('')

    // La sesión la maneja Supabase de forma segura
    const resultado = await iniciarSesionAdmin(usuario, password)
    setCargando(false)

    if (resultado.ok) {
      navigate('/admin')
    } else {
      setError(resultado.mensaje)
    }
  }

  return (
    <main className="login-pagina">
      <div className="login-caja">
        <div className="login-logo">👑</div>
        <p className="login-etiqueta">IMPERIUM PERFUME GALLERY</p>
        <h2>Acceso Administrativo</h2>
        <p className="login-subtitulo">Ingresa tus credenciales autorizadas para gestionar la tienda.</p>

        <form onSubmit={handleLogin} className="login-form">
          <label className="login-campo">
            Correo del administrador
            <input
              type="email"
              autoComplete="username"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="admin@correo.com"
              required
            />
          </label>

          <label className="login-campo">
            Contraseña
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />
          </label>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-boton" disabled={cargando}>
            {cargando ? 'Verificando...' : 'Ingresar al Panel'}
          </button>
        </form>
      </div>
    </main>
  )
}

export default LoginAdmin