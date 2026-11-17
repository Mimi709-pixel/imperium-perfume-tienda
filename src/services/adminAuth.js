// Autenticación del administrador con Supabase Auth.
// La clave ya no está en el código: el administrador se crea en Supabase
// (Authentication > Users) y se registra en la tabla admin_users.

import { supabase } from './supabase'

// Verifica que el usuario con sesión activa sea administrador
export async function esAdministrador() {
  try {
    const { data: sesion } = await supabase.auth.getSession()
    if (!sesion?.session) return false

    const { data, error } = await supabase.rpc('is_admin')
    if (error) throw error

    return data === true
  } catch (error) {
    console.error('No se pudo verificar el administrador:', error)
    return false
  }
}

export async function iniciarSesionAdmin(correo, password) {
  const { error } = await supabase.auth.signInWithPassword({
    email: correo.trim(),
    password,
  })

  if (error) {
    return { ok: false, mensaje: 'Credenciales incorrectas. Acceso exclusivo para administradores.' }
  }

  const admin = await esAdministrador()

  if (!admin) {
    await supabase.auth.signOut()
    return { ok: false, mensaje: 'Esta cuenta no tiene permisos de administrador.' }
  }

  return { ok: true }
}

// Correo para restablecer la contraseña. Lleva a /admin/activar.
export async function enviarRecuperacion(correo) {
  const { error } = await supabase.auth.resetPasswordForEmail(correo.trim(), {
    redirectTo: `${window.location.origin}/admin/activar`,
  })

  if (error) {
    console.error('Error enviando recuperación:', error)
    return {
      ok: false,
      mensaje: error.status === 429
        ? 'Ya se enviaron varios correos. Espera unos minutos e intenta de nuevo.'
        : 'No se pudo enviar el correo. Intenta de nuevo.',
    }
  }

  return { ok: true }
}

// Cambia la contraseña del usuario con sesión activa
export async function cambiarPassword(nueva) {
  if (!nueva || nueva.length < 8) {
    return { ok: false, mensaje: 'La contraseña debe tener al menos 8 caracteres.' }
  }

  const { error } = await supabase.auth.updateUser({ password: nueva })

  if (error) {
    console.error('Error cambiando contraseña:', error)
    return {
      ok: false,
      mensaje: error.code === 'same_password'
        ? 'La nueva contraseña debe ser distinta a la actual.'
        : error.code === 'weak_password'
          ? 'Esa contraseña es muy débil. Usa letras, números y símbolos.'
          : 'No se pudo cambiar la contraseña. Vuelve a iniciar sesión e intenta de nuevo.',
    }
  }

  return { ok: true }
}

// Correo del usuario con sesión activa
export async function correoSesion() {
  const { data } = await supabase.auth.getSession()
  return data?.session?.user?.email || ''
}
