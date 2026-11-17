import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCarrito } from '../context/CarritoContext'
import { getStoreConfig, loadStoreConfig, subscribeToStoreConfig } from '../data/products'
import { buscarCupon, calcularDescuento, describirCupon, numeroWhatsApp } from '../data/reglasTienda'
import intlTelInput from 'intl-tel-input'
import 'intl-tel-input/dist/css/intlTelInput.css'
import './Checkout.css'

function formatoPrecio(valor) {
  return Number(valor).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  })
}

function Checkout() {
  const { items, total } = useCarrito()
  const navigate = useNavigate()
  const telefonoRef = useRef(null)
  const instanciaTelefonoRef = useRef(null)

  const [config, setConfig] = useState(() => getStoreConfig())
  const [sectorSeleccionado, setSectorSeleccionado] = useState(0)

  const [datos, setDatos] = useState({
    nombre: '',
    correo: '',
    telefono: '',
    telefonoCompleto: '',
    direccion: '',
    ciudad: 'Bogotá D.C.',
    indicaciones: '',
  })

  const [revisar, setRevisar] = useState(false)
  const [errorTelefono, setErrorTelefono] = useState('')
  const [cargandoPago, setCargandoPago] = useState(false)
  const [errorPago, setErrorPago] = useState('')

  // CUPÓN DE DESCUENTO
  const [codigoCupon, setCodigoCupon] = useState('')
  const [cuponAplicado, setCuponAplicado] = useState('')
  const [mensajeCupon, setMensajeCupon] = useState({ texto: '', error: false })

  // MODALES
  const [mostrarModalPago, setMostrarModalPago] = useState(false)
  const [mostrarProcesandoMercadoPago, setMostrarProcesandoMercadoPago] = useState(false)

  useEffect(() => {
    function actualizarConfig() {
      setConfig(getStoreConfig())
    }
    window.addEventListener('imperium-config-updated', actualizarConfig)

    // Trae las tarifas de envío actuales y escucha cambios del administrador
    loadStoreConfig()
    const cancelarSuscripcion = subscribeToStoreConfig()

    return () => {
      window.removeEventListener('imperium-config-updated', actualizarConfig)
      cancelarSuscripcion()
    }
  }, [])

  useEffect(() => {
    if (!telefonoRef.current) return

    const instancia = intlTelInput(telefonoRef.current, {
      initialCountry: 'co',
      separateDialCode: true,
      nationalMode: true,
      autoPlaceholder: 'polite',
      formatOnDisplay: true,
      loadUtils: () => import('intl-tel-input/utils'),
    })

    instanciaTelefonoRef.current = instancia

    function actualizarPais() {
      setDatos((actuales) => ({
        ...actuales,
        telefonoCompleto: instancia.getNumber(),
      }))
      setRevisar(false)
      setErrorTelefono('')
    }

    telefonoRef.current.addEventListener('countrychange', actualizarPais)

    return () => {
      telefonoRef.current?.removeEventListener('countrychange', actualizarPais)
      instancia.destroy()
      instanciaTelefonoRef.current = null
    }
  }, [])

  const zonasDisponibles = config.zones && config.zones.length > 0
    ? config.zones
    : [{ name: 'Bogotá Estándar', price: 15000 }]

  const zonaActual = zonasDisponibles[sectorSeleccionado] || zonasDisponibles[0]
  const esEnvioGratis = config.enableFreeShipping && total >= config.freeShippingThreshold
  const costoEnvioAplicado = esEnvioGratis ? 0 : Number(zonaActual.price || 0)

  // El cupón se vuelve a validar con la configuración actual en cada render:
  // si el admin lo desactiva, deja de aplicarse.
  const cupon = cuponAplicado ? buscarCupon(config, cuponAplicado) : null
  const descuento = calcularDescuento(cupon, total)
  const totalFinal = Math.max(0, total - descuento) + costoEnvioAplicado

  function aplicarCupon() {
    const encontrado = buscarCupon(config, codigoCupon)

    if (!codigoCupon.trim()) {
      setMensajeCupon({ texto: 'Escribe un código de descuento.', error: true })
      return
    }

    if (!encontrado) {
      setCuponAplicado('')
      setMensajeCupon({ texto: 'Este cupón no existe o ya no está activo.', error: true })
      return
    }

    setCuponAplicado(encontrado.code)
    setCodigoCupon('')
    setMensajeCupon({ texto: `Cupón aplicado: ${describirCupon(encontrado)} de descuento.`, error: false })
  }

  function quitarCupon() {
    setCuponAplicado('')
    setMensajeCupon({ texto: '', error: false })
  }

  function actualizarCampo(event) {
    const { name, value } = event.target
    setDatos((actuales) => ({ ...actuales, [name]: value }))
    setRevisar(false)
  }

  function actualizarTelefono(event) {
    const valor = event.target.value
    const instancia = instanciaTelefonoRef.current

    setDatos((actuales) => ({
      ...actuales,
      telefono: valor,
      telefonoCompleto: instancia?.getNumber() || valor,
    }))
    setRevisar(false)
    setErrorTelefono('')
  }

  function prepararPedido(event) {
    event.preventDefault()
    const instancia = instanciaTelefonoRef.current

    if (!datos.nombre.trim() || !datos.correo.trim() || !datos.direccion.trim() || !datos.ciudad.trim()) {
      setRevisar(false)
      return
    }

    if (!instancia || !instancia.getNumber()) {
      setErrorTelefono('Ingresa tu número de teléfono.')
      setRevisar(false)
      return
    }

    if (!instancia.isValidNumber()) {
      setErrorTelefono('Revisa el número y el país seleccionado.')
      setRevisar(false)
      return
    }

    setDatos((actuales) => ({
      ...actuales,
      telefonoCompleto: instancia.getNumber(),
    }))

    setErrorTelefono('')
    setRevisar(true)
  }

  function abrirModalOpciones(e) {
    e.preventDefault()
    setMostrarModalPago(true)
  }

  // LÓGICA DE MERCADO PAGO
  async function procesarPagoMercadoPago() {
    setMostrarModalPago(false)
    setMostrarProcesandoMercadoPago(true)
    setCargandoPago(true)
    setErrorPago('')

    try {
      // El servidor recalcula precios, stock y envío con los datos reales de la tienda.
      // Aquí solo importan el id y la cantidad de cada producto.
      const itemsCheckout = [
        ...items.map((item) => ({
          id: item.id,
          title: item.name,
          unit_price: Number(item.price),
          quantity: Number(item.cantidad),
          currency_id: 'COP',
        })),
      ]

      if (costoEnvioAplicado > 0) {
        itemsCheckout.push({
          title: `Envío a domicilio (${zonaActual.name})`,
          unit_price: costoEnvioAplicado,
          quantity: 1,
          currency_id: 'COP',
        })
      }

      const ordenData = {
        items: itemsCheckout,
        zoneName: zonaActual.name,
        couponCode: cupon ? cupon.code : '',
        payer: {
          name: datos.nombre,
          email: datos.correo,
          phone: { number: datos.telefonoCompleto },
          address: { street_name: `${datos.direccion} (${zonaActual.name})`, city_name: datos.ciudad },
        },
        back_urls: {
          success: window.location.origin + '/?status=success',
          failure: window.location.origin + '/checkout?status=failure',
          pending: window.location.origin + '/checkout?status=pending',
        },
        auto_return: 'approved',
      }

      const respuesta = await fetch('/api/crear-preferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ordenData),
      })

      const data = await respuesta.json().catch(() => ({}))

      if (respuesta.ok && data.init_point) {
        window.location.href = data.init_point
        return
      }

      setErrorPago(data.error || 'No se pudo conectar con Mercado Pago. Intenta de nuevo o usa WhatsApp.')
    } catch (error) {
      console.error(error)
      setErrorPago('No se pudo conectar con Mercado Pago. Intenta de nuevo o usa WhatsApp.')
    } finally {
      setCargandoPago(false)
    }
  }

  // ENVÍO DE PEDIDO A WHATSAPP (CORREGIDO)
  function enviarPedidoWhatsApp() {
    const numeroWA = numeroWhatsApp(config)

    const listaProductos = items.map(
      (item) => `• *${item.name} (x${item.cantidad})* - ${formatoPrecio(Number(item.price) * Number(item.cantidad))}`
    ).join('\n')

    const mensaje = `✨ *NUEVO PEDIDO - IMPERIUM PERFUME GALLERY* ✨\n\n` +
      `*Destinatario:* ${datos.nombre}\n` +
      `*Correo:* ${datos.correo}\n` +
      `*Teléfono:* ${datos.telefonoCompleto}\n` +
      `*Sector de entrega:* ${zonaActual.name}\n` +
      `*Dirección:* ${datos.direccion}, ${datos.ciudad}\n` +
      (datos.indicaciones ? `*Indicaciones:* ${datos.indicaciones}\n\n` : `\n`) +
      `*DETALLE DEL PEDIDO:*\n${listaProductos}\n\n` +
      `*Subtotal:* ${formatoPrecio(total)}\n` +
      (descuento > 0 ? `*Cupón ${cupon.code.toUpperCase()}:* -${formatoPrecio(descuento)}\n` : '') +
      `*Envío:* ${esEnvioGratis ? '¡GRATIS!' : formatoPrecio(costoEnvioAplicado)}\n` +
      `*TOTAL A PAGAR:* ${formatoPrecio(totalFinal)}\n\n` +
      `Hola, quisiera confirmar mi pedido.`

    const url = `https://wa.me/${numeroWA}?text=${encodeURIComponent(mensaje)}`
    window.open(url, '_blank')
  }

  const unidades = items.reduce((suma, item) => suma + (Number(item.cantidad) || 0), 0)

  if (items.length === 0) {
    return (
      <main className="checkout-pagina">
        <section className="checkout-vacio">
          <p className="checkout-etiqueta">IMPERIUM PERFUME GALLERY</p>
          <h1>Tu carrito está vacío</h1>
          <p>Agrega tus fragancias favoritas antes de continuar.</p>
          <Link to="/" className="checkout-boton">
            Explorar perfumes
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className="checkout-pagina">
      <header className="checkout-encabezado">
        <p className="checkout-etiqueta">IMPERIUM PERFUME GALLERY</p>
        <h1>Finaliza tu compra</h1>
        <p>Estás a un paso de encontrar tu próxima esencia.</p>
      </header>

      <nav className="checkout-progreso" aria-label="Progreso de compra">
        <span className="checkout-paso completado">01 · Carrito</span>
        <span className="checkout-paso activo">02 · Entrega</span>
        <span className="checkout-paso">03 · Pago</span>
      </nav>

      <div className="checkout-contenido">
        <form className="checkout-formulario" onSubmit={prepararPedido}>
          <section className="checkout-seccion">
            <span className="checkout-numero">01</span>
            <div>
              <h2>Datos de contacto</h2>
              <p>¿A quién entregaremos el pedido?</p>
            </div>
          </section>

          <div className="checkout-campos">
            <label className="checkout-campo">
              Nombre completo *
              <input
                type="text"
                name="nombre"
                value={datos.nombre}
                onChange={actualizarCampo}
                required
                placeholder="Tu nombre completo"
              />
            </label>

            <label className="checkout-campo">
              Correo electrónico *
              <input
                type="email"
                name="correo"
                value={datos.correo}
                onChange={actualizarCampo}
                required
                placeholder="correo@ejemplo.com"
              />
            </label>

            <label className="checkout-campo checkout-campo-completo">
              Teléfono de contacto *
              <input
                ref={telefonoRef}
                type="tel"
                name="telefono"
                value={datos.telefono}
                onChange={actualizarTelefono}
                required
                placeholder="Tu número de teléfono"
              />
              {errorTelefono && <span className="checkout-error">{errorTelefono}</span>}
            </label>
          </div>

          <div className="checkout-separador" />

          <section className="checkout-seccion">
            <span className="checkout-numero">02</span>
            <div>
              <h2>Dirección y Sector de entrega</h2>
              <p>Indícanos tu zona para calcular el valor exacto de envío.</p>
            </div>
          </section>

          <div className="checkout-campos">
            <label className="checkout-campo checkout-campo-completo">
              Sector / Zona de entrega *
              <select
                value={sectorSeleccionado}
                onChange={(e) => {
                  setSectorSeleccionado(Number(e.target.value))
                  setRevisar(false)
                }}
                style={{
                  padding: '12px',
                  background: '#111111',
                  color: '#ffffff',
                  border: '1px solid #333333',
                  borderRadius: '6px',
                  marginTop: '6px',
                  fontSize: '0.95rem',
                  width: '100%',
                }}
              >
                {zonasDisponibles.map((zona, index) => (
                  <option key={index} value={index}>
                    {zona.name} — {esEnvioGratis ? '¡Envío Gratis!' : formatoPrecio(zona.price)}
                  </option>
                ))}
              </select>
            </label>

            <label className="checkout-campo checkout-campo-completo">
              Dirección completa *
              <input
                type="text"
                name="direccion"
                value={datos.direccion}
                onChange={actualizarCampo}
                required
                placeholder="Calle, carrera, número, apartamento..."
              />
            </label>

            <label className="checkout-campo checkout-campo-completo">
              Ciudad o municipio *
              <input
                type="text"
                name="ciudad"
                value={datos.ciudad}
                onChange={actualizarCampo}
                required
                placeholder="Ej. Bogotá D.C."
              />
            </label>

            <label className="checkout-campo checkout-campo-completo">
              Indicaciones adicionales (opcional)
              <textarea
                name="indicaciones"
                value={datos.indicaciones}
                onChange={actualizarCampo}
                rows={3}
                placeholder="Barrio, punto de referencia u otras indicaciones"
              />
            </label>
          </div>

          <div className="checkout-botones">
            <Link to="/carrito" className="checkout-volver">
              Volver al carrito
            </Link>

            <button type="submit" className="checkout-boton">
              Revisar datos
            </button>
          </div>

          {revisar && (
            <section className="checkout-confirmacion">
              <p className="checkout-etiqueta">CONFIRMACIÓN Y PAGO</p>
              <h2>Revisa tus datos de entrega</h2>

              <p><strong>Destinatario:</strong> {datos.nombre}</p>
              <p><strong>Correo:</strong> {datos.correo}</p>
              <p><strong>Teléfono:</strong> {datos.telefonoCompleto}</p>
              <p><strong>Sector:</strong> {zonaActual.name}</p>
              <p><strong>Dirección:</strong> {datos.direccion}, {datos.ciudad}</p>

              <div className="checkout-total">
                <span>Total a pagar</span>
                <strong>{formatoPrecio(totalFinal)}</strong>
              </div>

              <button
                type="button"
                className="checkout-boton checkout-boton-pago"
                onClick={abrirModalOpciones}
              >
                Pagar o Finalizar Pedido
              </button>
            </section>
          )}
        </form>

        <aside className="checkout-resumen">
          <h2>Resumen de tu pedido</h2>
          <p className="checkout-resumen-intro">Verifica tus fragancias antes de continuar.</p>

          <div className="checkout-productos">
            {items.map((item) => (
              <article className="checkout-producto" key={item.id}>
                <img src={item.image} alt={item.name} />
                <div className="checkout-producto-info">
                  <h3>{item.name}</h3>
                  <p>Precio unitario: {formatoPrecio(item.price)}</p>
                  <p>Cantidad: {item.cantidad}</p>
                  <strong>Subtotal: {formatoPrecio(Number(item.price) * Number(item.cantidad))}</strong>
                </div>
              </article>
            ))}
          </div>

          <div className="checkout-resumen-linea">
            <span>Total de unidades</span>
            <span>{unidades}</span>
          </div>

          <div className="checkout-resumen-linea">
            <span>Subtotal de productos</span>
            <span>{formatoPrecio(total)}</span>
          </div>

          {descuento > 0 && (
            <div className="checkout-resumen-linea checkout-descuento">
              <span>
                Cupón {cupon.code.toUpperCase()}
                <button type="button" className="checkout-cupon-quitar" onClick={quitarCupon}>
                  Quitar
                </button>
              </span>
              <span>-{formatoPrecio(descuento)}</span>
            </div>
          )}

          <div className="checkout-resumen-linea">
            <span>Envío ({zonaActual.name})</span>
            {esEnvioGratis ? (
              <strong style={{ color: '#e5c77e' }}>¡GRATIS!</strong>
            ) : (
              <span>{formatoPrecio(costoEnvioAplicado)}</span>
            )}
          </div>

          {config.shippingNotice && (
            <p className="checkout-nota" style={{ fontSize: '12px', color: '#b9b3a7', marginTop: '6px' }}>
              * {config.shippingNotice}
            </p>
          )}

          {!cupon && (
            <div className="checkout-cupon">
              <label htmlFor="checkout-cupon-input">¿Tienes un cupón de descuento?</label>
              <div className="checkout-cupon-fila">
                <input
                  id="checkout-cupon-input"
                  type="text"
                  value={codigoCupon}
                  onChange={(event) => {
                    setCodigoCupon(event.target.value.toUpperCase())
                    setMensajeCupon({ texto: '', error: false })
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      aplicarCupon()
                    }
                  }}
                  placeholder="CÓDIGO"
                  autoComplete="off"
                />
                <button type="button" onClick={aplicarCupon}>
                  Aplicar
                </button>
              </div>
            </div>
          )}

          {mensajeCupon.texto && (mensajeCupon.error || cupon) && (
            <p className={mensajeCupon.error ? 'checkout-cupon-mensaje error' : 'checkout-cupon-mensaje'} role="status">
              {mensajeCupon.texto}
            </p>
          )}

          <div className="checkout-total">
            <span>Total final</span>
            <strong>{formatoPrecio(totalFinal)}</strong>
          </div>

          <div className="checkout-seguridad">
            <span aria-hidden="true">◇</span>
            <p>
              IMPERIUM PERFUME GALLERY
              <br />
              Pagos protegidos por Mercado Pago.
            </p>
          </div>
        </aside>
      </div>

      {/* MODAL PRINCIPAL: ELECCIÓN DE MÉTODO DE PAGO */}
      {mostrarModalPago && (
        <div className="checkout-modal-overlay">
          <div className="checkout-modal-box">
            <button 
              type="button" 
              className="checkout-modal-cerrar" 
              onClick={() => setMostrarModalPago(false)}
            >
              ✕
            </button>

            <div className="checkout-modal-icono">👑</div>
            <h2>Selecciona tu método de pago</h2>
            <p>Elige la opción que prefieras para finalizar tu pedido en <strong>Imperium Perfume Gallery</strong>.</p>

            <div className="checkout-modal-opciones">
              <button 
                type="button" 
                className="checkout-btn-opcion whatsapp"
                onClick={enviarPedidoWhatsApp}
              >
                <span>📱 Pedido Directo por WhatsApp</span>
                <small>Atención personalizada, Nequi, Daviplata o Contraentrega (+57 305 3638769)</small>
              </button>

              <button 
                type="button" 
                className="checkout-btn-opcion mercadopago"
                onClick={procesarPagoMercadoPago}
              >
                <span>💳 Tarjeta de Crédito / PSE (Mercado Pago)</span>
                <small>Procesamiento en línea cifrado de 256 bits</small>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PROCESANDO PAGO CON MERCADO PAGO */}
      {mostrarProcesandoMercadoPago && (
        <div className="checkout-modal-overlay">
          <div className="checkout-modal-box">
            <button 
              type="button" 
              className="checkout-modal-cerrar" 
              onClick={() => setMostrarProcesandoMercadoPago(false)}
            >
              ✕
            </button>

            <div className="checkout-modal-icono">🔒</div>
            <h2>Mercado Pago Checkout</h2>
            {errorPago ? (
              <p className="checkout-error" style={{ fontWeight: 'bold' }}>{errorPago}</p>
            ) : (
              <>
                <p style={{ color: '#e5c77e', fontWeight: 'bold' }}>
                  {cargandoPago ? 'Conectando con la pasarela de pagos segura...' : 'Redirigiendo a Mercado Pago...'}
                </p>
                <p>Se está procesando la transacción por valor de <strong>{formatoPrecio(totalFinal)}</strong>.</p>
              </>
            )}
            
            <div style={{ margin: '20px 0', fontSize: '0.9rem', color: '#aaaaaa' }}>
              <p>✓ Cifrado SSL de 256 bits</p>
              <p>✓ Acepta Tarjetas de Crédito, Débito y PSE</p>
            </div>

            <button 
              type="button"
              className="checkout-boton"
              style={{ width: '100%', marginTop: '10px' }}
              onClick={() => setMostrarProcesandoMercadoPago(false)}
            >
              Cerrar o cambiar método
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

export default Checkout
