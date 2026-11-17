import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { cambiarPassword, esAdministrador } from '../services/adminAuth'
import './LoginAdmin.css'

// Página a la que llegan los enlaces de invitación y de
// "olvidé mi contraseña". Aquí el administrador crea su contraseña.
function AdminActivar() {
  const navigate = useNavigate()
  // 'verificando' | 'listo' | 'sin-enlace'
  const [estado, setEstado] = useState('verificando')
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    let activo = true

    function marcarSesion(sesion) {
      if (!activo) return
      if (sesion?.user) {
        setCorreo(sesion.user.email || '')
        setEstado('listo')
      }
    }

    // Supabase lee el enlace del correo y crea la sesión automáticamente
    const { data: escucha } = supabase.auth.onAuthStateChange((_evento, sesion) => {
      marcarSesion(sesion)
    })

    supabase.auth.getSession().then(({ data }) => marcarSesion(data.session))

    // Si después de unos segundos no hay sesión, el enlace no sirve
    const espera = setTimeout(() => {
      if (activo) {
        setEstado((actual) => (actual === 'verificando' ? 'sin-enlace' : actual))
      }
    }, 4000)

    return () => {
      activo = false
      clearTimeout(espera)
      escucha.subscription.unsubscribe()
    }
  }, [])

  async function guardar(event) {
    event.preventDefault()
    setError('')

    if (password !== confirmacion) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setGuardando(true)
    const resultado = await cambiarPassword(password)

    if (!resultado.ok) {
      setGuardando(false)
      setError(resultado.mensaje)
      return
    }

    const admin = await esAdministrador()
    setGuardando(false)

    if (admin) {
      navigate('/admin', { replace: true })
    } else {
      await supabase.auth.signOut()
      setError('Tu contraseña quedó guardada, pero esta cuenta no tiene permisos de administrador.')
    }
  }

  return (
    <main className="login-pagina">
      <div className="login-caja">
        <div className="login-logo">👑</div>
        <p className="login-etiqueta">IMPERIUM PERFUME GALLERY</p>

        {estado === 'verificando' && (
          <>
            <h2>Verificando enlace</h2>
            <p className="login-subtitulo">Un momento por favor...</p>
          </>
        )}

        {estado === 'sin-enlace' && (
          <>
            <h2>Enlace no válido</h2>
            <p className="login-subtitulo">
              El enlace expiró o ya fue usado. Solicita uno nuevo desde la pantalla de acceso con
              la opción ¿Olvidaste tu contraseña?
            </p>
            <Link to="/admin/login" className="login-boton" style={{ textAlign: 'center', textDecoration: 'none' }}>
              Ir al acceso administrativo
            </Link>
          </>
        )}

        {estado === 'listo' && (
          <>
            <h2>Crea tu contraseña</h2>
            <p className="login-subtitulo">
              {correo ? `Cuenta: ${correo}. ` : ''}Usa al menos 8 caracteres con letras, números y símbolos.
            </p>

            <form onSubmit={guardar} className="login-form">
              <label className="login-campo">
                Nueva contraseña
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  minLength={8}
                  required
                />
              </label>

              <label className="login-campo">
                Repite la contraseña
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmacion}
                  onChange={(e) => setConfirmacion(e.target.value)}
                  placeholder="••••••••••••"
                  minLength={8}
                  required
                />
              </label>

              {error && <div className="login-error">{error}</div>}

              <button type="submit" className="login-boton" disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar y entrar al panel'}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  )
}

export default AdminActivar
