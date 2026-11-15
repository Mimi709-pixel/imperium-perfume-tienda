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
