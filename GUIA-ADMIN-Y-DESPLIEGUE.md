# Guía: admin en la nube y despliegue

Después de esta guía el cliente guarda cambios en el admin y se ven al instante en la tienda.
No hace falta VS Code, Git ni volver a publicar.

## 1. Urgente: cambiar el token de Mercado Pago

El token anterior quedó subido a GitHub, así que hay que darlo por expuesto.

1. Entra a Mercado Pago Developers > Tus integraciones > la aplicación de la tienda > Credenciales de producción.
2. Renueva el Access Token. El anterior deja de funcionar.
3. Guarda el token nuevo para el paso 3. No lo pegues en ningún archivo del proyecto.

## 2. Supabase

1. Abre Supabase > SQL Editor > New query.
2. Pega todo el contenido de `supabase/setup.sql` y dale Run.
3. Ve a Authentication > Users > Add user > Create new user.
   Pon el correo y la clave del cliente y marca Auto Confirm User.
4. Vuelve al SQL Editor y ejecuta esto con el correo real:

```sql
insert into public.admin_users (user_id)
select id from auth.users where email = 'CORREO_DEL_ADMIN@ejemplo.com'
on conflict do nothing;
```

5. Ve a Authentication > Sign In / Providers y desactiva Allow new users to sign up.
   Así nadie más puede crear cuentas.

## 3. Cloudflare Pages (reemplaza a Vercel)

1. Crea una cuenta gratis en dash.cloudflare.com.
2. Ve a Workers & Pages > Create > Pages > Connect to Git y elige el repositorio `imperium-perfume-tienda`.
3. Configuración de build:
   - Framework preset: Vite
   - Build command: `npm run build`
   - Build output directory: `dist`
4. En Environment variables agrega:
   - `MP_ACCESS_TOKEN`: el token nuevo del paso 1, de tipo Secret
   - `SUPABASE_URL`: `https://iznagxiqpsqvtdstkgkw.supabase.co`
   - `SUPABASE_ANON_KEY`: la publishable key de Supabase
5. Dale Save and Deploy.
6. Prueba la dirección `.pages.dev` que te da Cloudflare: tienda, admin y un pago de prueba.
7. Si hay dominio propio, conéctalo en Custom domains.
8. Cuando todo funcione, borra el proyecto de Vercel.

Si por ahora te quedas en Vercel, configura las mismas tres variables en Vercel > Settings > Environment Variables.
El código funciona en los dos.

## 4. Cómo usa el admin el cliente

1. Entra a `/admin/login` con su correo y clave.
2. Para un producto nuevo: llena los datos, toca Subir foto desde el equipo y luego Agregar producto.
3. Envíos, cupones, barra de anuncios y WhatsApp se guardan con su botón y se publican al instante.

## Orden recomendado

Haz el paso 2 y sube el código nuevo en el mismo momento.
El código nuevo necesita las tablas nuevas, y las reglas nuevas bloquean al admin viejo.
