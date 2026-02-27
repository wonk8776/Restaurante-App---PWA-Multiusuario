/**
 * ticket.js - Ticket térmico 58mm, WhatsApp PNG y Cotización
 * Familia González — Solo lectura desde Firebase.
 */
(function () {
    'use strict';

    function escapeHtml(s) {
        if (s == null) return '';
        var div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }

    // ─── Función interna: genera el SVG del logo ───
    function logoSVG() {
        return '<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">' +
            '<ellipse cx="20" cy="26" rx="13" ry="9" fill="none" stroke="#000000" stroke-width="1.5"/>' +
            '<rect x="6" y="17" width="28" height="4" rx="2" fill="#000000"/>' +
            '<ellipse cx="20" cy="18" rx="13" ry="4" fill="none" stroke="#000000" stroke-width="1.5"/>' +
            '<rect x="17" y="12" width="6" height="5" rx="2.5" fill="#000000"/>' +
            '<path d="M13,11 C12,9 14,7 13,4" stroke="#000000" stroke-width="1" fill="none" stroke-linecap="round"/>' +
            '<path d="M20,11 C19,9 21,7 20,4" stroke="#000000" stroke-width="1" fill="none" stroke-linecap="round"/>' +
            '<path d="M27,11 C26,9 28,7 27,4" stroke="#000000" stroke-width="1" fill="none" stroke-linecap="round"/>' +
            '<path d="M7,22 C4,22 4,28 7,28" stroke="#000000" stroke-width="2" fill="none" stroke-linecap="round"/>' +
            '<path d="M33,22 C36,22 36,28 33,28" stroke="#000000" stroke-width="2" fill="none" stroke-linecap="round"/>' +
            '</svg>';
    }

    // ─── Función interna: genera los estilos CSS del ticket ───
    function ticketStyles() {
        return '@page { size: 58mm auto; margin: 1mm 0mm; }' +
            'body { width: 200px; max-width: 200px; margin: 0 auto; padding: 2px 0; background: #fff; color: #000; font-family: Arial, sans-serif; font-size: 9pt; line-height: 1.4; font-weight: normal; }' +
            '.ticket-logo-svg { text-align: center; margin-bottom: 4px; }' +
            '.ticket-nombre { text-align: center; font-size: 13pt; font-weight: 900; font-family: Arial, sans-serif; letter-spacing: 0.5px; margin-bottom: 4px; }' +
            '.ticket-fecha { text-align: center; font-size: 8pt; margin-bottom: 4px; font-family: Arial, sans-serif; font-weight: normal; }' +
            '.ticket-sep-doble { border-top: 2.5px solid #000; margin: 3px 0; }' +
            '.ticket-sep-punto { border-top: 1px dashed #555; margin: 3px 0; }' +
            '.ticket-detalles { font-size: 9pt; margin: 4px 0; font-family: Arial, sans-serif; font-weight: normal; }' +
            '.ticket-detalle { margin: 2px 0; }' +
            '.ticket-label { font-family: Arial, sans-serif; font-weight: 900; min-width: 60px; display: inline-block; }' +
            '.ticket-valor { font-family: Arial, sans-serif; font-weight: normal; }' +
            '.ticket-encabezado { font-size: 8pt; font-family: Arial, sans-serif; font-weight: normal; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 2px 0; display: flex; justify-content: space-between; }' +
            '.ticket-encabezado span { font-family: Arial, sans-serif; font-weight: 900; }' +
            '.ticket-fila-platillo { border-bottom: 1px dashed #aaa; padding: 3px 0; font-size: 9pt; }' +
            '.ticket-linea1 { display: flex; justify-content: space-between; align-items: baseline; }' +
            '.ticket-platillo-main { flex: 1; word-break: break-word; padding-right: 4px; font-family: Arial, sans-serif; font-weight: normal; }' +
            '.ticket-platillo-importe { width: 60px; flex-shrink: 0; text-align: right; font-family: Arial, sans-serif; font-weight: normal; }' +
            '.ticket-linea2 { padding-left: 2px; font-size: 9pt; color: #000; font-family: Arial, sans-serif; font-weight: normal; }' +
            '.ticket-total { text-align: right; font-size: 13pt; font-weight: 900; font-family: Arial, sans-serif; margin: 6px 0; }' +
            '.ticket-pie { text-align: center; font-size: 9pt; margin: 6px 0; font-family: Arial, sans-serif; font-weight: normal; font-style: italic; }' +
            '.no-print { margin-top: 12px; text-align: center; }' +
            '.no-print button { padding: 8px 16px; cursor: pointer; font-size: 9pt; }' +
            '@media print { .no-print { display: none !important; } }';
    }

    // ─── Función interna: limpia nombre que puede venir contaminado "nombre — $precio" ───
    function limpiarNombre(raw) {
        var s = String(raw || '—');
        // Si el nombre viene como "Crema de elote — $40.00 x1" lo limpiamos
        var idx = s.indexOf(' — ');
        if (idx !== -1) s = s.substring(0, idx).trim();
        // También limpiar variante con guión simple " - "
        idx = s.indexOf(' - $');
        if (idx !== -1) s = s.substring(0, idx).trim();
        return s;
    }

    // ─── Función interna: construye filas de platillos ───
    function buildFilas(platillos) {
        var filas = '';
        platillos.forEach(function (p) {
            var nombre = limpiarNombre(p && p.nombre);
            var cant = (p && p.cantidad) ? parseInt(p.cantidad, 10) : 1;
            var precio = (p && p.precio != null) ? Number(p.precio) : 0;
            var importe = (cant * precio).toFixed(2);
            var precioUnit = precio.toFixed(2);
            filas +=
                '<div class="ticket-fila-platillo">' +
                '<div class="ticket-linea1">' +
                '<span class="ticket-platillo-main">' + escapeHtml(nombre) + ' (x' + cant + ')</span>' +
                '<span class="ticket-platillo-importe">$' + importe + '</span>' +
                '</div>' +
                '<div class="ticket-linea2">$' + precioUnit + ' c/u</div>' +
                '</div>';
        });
        return filas;
    }

    // ─── Función interna: abre ventana e imprime ───
    function abrirVentanaTicket(bodyContent) {
        var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
            ticketStyles() +
            '</style></head><body>' + bodyContent +
            '<script>window.onload=function(){setTimeout(function(){window.print();},400);};<\/script>' +
            '</body></html>';
        var w = window.open('', '_blank', 'width=260,height=700');
        if (!w) {
            alert('El navegador bloqueó la ventana emergente.\n\nPara imprimir tickets:\n1. Haz clic en el ícono de bloqueo en la barra del navegador\n2. Selecciona "Permitir ventanas emergentes"\n3. Vuelve a hacer clic en Imprimir');
            return;
        }
        w.document.open();
        w.document.write(html);
        w.document.close();
    }

    // ─── Función interna: genera PNG con html2canvas y descarga ───
    function generarImagenWhatsApp(bodyContent, nombreArchivo) {
        var container = document.getElementById('ticket-container');
        if (!container) {
            alert('Error interno: no se encontró el contenedor de ticket.');
            return;
        }
        if (typeof html2canvas === 'undefined') {
            alert('html2canvas no está cargado. Comprueba la conexión.');
            return;
        }

        // Construir HTML para renderizar con html2canvas (inline styles, sin @page)
        container.innerHTML = bodyContent;
        container.style.cssText = [
            'display: block',
            'position: fixed',
            'top: 0',
            'left: -9999px',
            'width: 220px',
            'background: #ffffff',
            'color: #000000',
            'font-family: Arial, sans-serif',
            'padding: 12px',
            'font-size: 10px',
            'line-height: 1.4',
            'z-index: -1'
        ].join(';');

        // Inyectar estilos del ticket en el container para html2canvas
        var styleEl = document.createElement('style');
        styleEl.textContent = ticketStyles();
        container.insertBefore(styleEl, container.firstChild);

        setTimeout(function () {
            html2canvas(container, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                width: 220,
                windowWidth: 220
            }).then(function (canvas) {
                var dataUrl = canvas.toDataURL('image/png');
                var a = document.createElement('a');
                a.download = nombreArchivo;
                a.href = dataUrl;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                container.style.cssText = 'display: none';
                container.innerHTML = '';
                alert('Imagen descargada. Ábrela desde tu galería y compártela por WhatsApp.');
            }).catch(function (err) {
                console.error('Error html2canvas:', err);
                container.style.cssText = 'display: none';
                container.innerHTML = '';
                alert('No se pudo generar la imagen del ticket.');
            });
        }, 300);
    }

    // ─── Función interna: construye el bodyContent de una ORDEN ───
    // conBoton=true solo para ventana de impresión, false para imagen WhatsApp
    function buildBodyOrden(mesa, meseroNombre, fechaStr, platillos, total, conBoton) {
        var totalFormatted = Number(total).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return '<div class="ticket-logo-svg">' + logoSVG() + '</div>' +
            '<div class="ticket-nombre">Familia González</div>' +
            '<div class="ticket-fecha">' + escapeHtml(fechaStr) + '</div>' +
            '<div class="ticket-sep-doble"></div>' +
            '<div class="ticket-detalles">' +
            '<div class="ticket-detalle"><span class="ticket-label">Mesa</span><span class="ticket-valor">' + escapeHtml(mesa) + '</span></div>' +
            '<div class="ticket-detalle"><span class="ticket-label">Mesero</span><span class="ticket-valor">' + escapeHtml(meseroNombre) + '</span></div>' +
            '</div>' +
            '<div class="ticket-sep-punto"></div>' +
            '<div class="ticket-encabezado"><span class="ticket-col-art">Artículo</span><span class="ticket-col-imp">Importe</span></div>' +
            '<div class="ticket-platillos">' + buildFilas(platillos) + '</div>' +
            '<div class="ticket-sep-doble"></div>' +
            '<div class="ticket-total">TOTAL: $' + totalFormatted + '</div>' +
            '<div class="ticket-sep-punto"></div>' +
            '<div class="ticket-pie">¡Gracias por su preferencia!</div>' +
            (conBoton ? '<div class="no-print"><button type="button" onclick="window.print();">🖨 Imprimir ticket</button></div>' : '');
    }

    // ─── Función interna: construye el bodyContent de una COTIZACIÓN ───
    // conBoton=true solo para ventana de impresión, false para imagen WhatsApp
    function buildBodyCotizacion(titulo, detalles, fechaStr, platillos, total, conBoton) {
        var totalFormatted = Number(total).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return '<div class="ticket-logo-svg">' + logoSVG() + '</div>' +
            '<div class="ticket-nombre">Familia González</div>' +
            '<div class="ticket-fecha">' + escapeHtml(fechaStr) + '</div>' +
            '<div class="ticket-sep-doble"></div>' +
            '<div class="ticket-detalles">' +
            '<div class="ticket-detalle"><span class="ticket-label">Cotización</span><span class="ticket-valor">' + escapeHtml(titulo) + '</span></div>' +
            '<div class="ticket-detalle"><span class="ticket-label">Detalles</span><span class="ticket-valor">' + escapeHtml(detalles) + '</span></div>' +
            '</div>' +
            '<div class="ticket-sep-punto"></div>' +
            '<div class="ticket-encabezado"><span class="ticket-col-art">Artículo</span><span class="ticket-col-imp">Importe</span></div>' +
            '<div class="ticket-platillos">' + buildFilas(platillos) + '</div>' +
            '<div class="ticket-sep-doble"></div>' +
            '<div class="ticket-total">TOTAL: $' + totalFormatted + '</div>' +
            '<div class="ticket-sep-punto"></div>' +
            '<div class="ticket-pie">¡Gracias por su preferencia!</div>' +
            (conBoton ? '<div class="no-print"><button type="button" onclick="window.print();">🖨 Imprimir</button></div>' : '');
    }

    // ══════════════════════════════════════════
    // API PÚBLICA
    // ══════════════════════════════════════════

    /**
     * Imprime ticket de orden en ventana nueva (58mm).
     * @param {string} ordenId
     */
    function prepararTicket(ordenId) {
        console.log('prepararTicket llamado con id:', ordenId);
        if (!ordenId || typeof db === 'undefined') {
            alert('No se pudo iniciar la impresión. Recarga la página e intenta de nuevo.');
            return;
        }
        db.collection('ordenes').doc(ordenId).get()
            .then(function (doc) {
                if (!doc.exists) { alert('No se encontró la orden.'); return; }
                var data = doc.data();
                var mesa = data.mesa != null ? String(data.mesa) : '—';
                var meseroNombre = data.meseroNombre != null ? String(data.meseroNombre) : '—';
                var total = data.total != null ? Number(data.total) : 0;
                var platillos = Array.isArray(data.platillos) ? data.platillos : [];
                var fechaStr = '—';
                if (data.timestamp && data.timestamp.toDate) {
                    var d = data.timestamp.toDate();
                    fechaStr = d.toLocaleDateString('es') + ' ' + d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
                }
                abrirVentanaTicket(buildBodyOrden(mesa, meseroNombre, fechaStr, platillos, total, true));
            })
            .catch(function (err) {
                console.error('Error al cargar orden para ticket:', err);
                alert('Error al cargar la orden: ' + (err && err.message ? err.message : err));
            });
    }

    /**
     * Descarga imagen PNG del ticket de orden para compartir por WhatsApp.
     * @param {string} ordenId
     */
    function enviarWhatsApp(ordenId) {
        console.log('enviarWhatsApp llamado con id:', ordenId);
        if (!ordenId || typeof db === 'undefined') {
            alert('No se pudo generar la imagen. Recarga la página e intenta de nuevo.');
            return;
        }
        db.collection('ordenes').doc(ordenId).get()
            .then(function (doc) {
                if (!doc.exists) { alert('No se encontró la orden.'); return; }
                var data = doc.data();
                var mesa = data.mesa != null ? String(data.mesa) : '—';
                var meseroNombre = data.meseroNombre != null ? String(data.meseroNombre) : '—';
                var total = data.total != null ? Number(data.total) : 0;
                var platillos = Array.isArray(data.platillos) ? data.platillos : [];
                var fechaStr = '—';
                if (data.timestamp && data.timestamp.toDate) {
                    var d = data.timestamp.toDate();
                    fechaStr = d.toLocaleDateString('es') + ' ' + d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
                }
                var body = buildBodyOrden(mesa, meseroNombre, fechaStr, platillos, total, false);
                generarImagenWhatsApp(body, 'ticket-mesa-' + mesa + '.png');
            })
            .catch(function (err) {
                console.error('Error al cargar orden para WhatsApp:', err);
                alert('No se pudo cargar la orden: ' + (err && err.message ? err.message : err));
            });
    }

    /**
     * Imprime cotización en ventana nueva (mismo formato 58mm).
     * Llamar desde app.js: window.prepararCotizacion(id)
     * @param {string} cotizacionId
     */
    function prepararCotizacion(cotizacionId) {
        console.log('prepararCotizacion llamado con id:', cotizacionId);
        if (!cotizacionId || typeof db === 'undefined') {
            alert('No se pudo iniciar la impresión. Recarga la página e intenta de nuevo.');
            return;
        }
        db.collection('cotizaciones').doc(cotizacionId).get()
            .then(function (doc) {
                if (!doc.exists) { alert('No se encontró la cotización.'); return; }
                var data = doc.data();
                var titulo = data.titulo != null ? String(data.titulo) : 'Cotización';
                var detalles = data.detalles != null ? String(data.detalles) : '—';
                var total = data.total != null ? Number(data.total) : 0;
                var platillos = Array.isArray(data.platillos) ? data.platillos : [];
                var fechaStr = '—';
                if (data.timestamp && data.timestamp.toDate) {
                    var d = data.timestamp.toDate();
                    fechaStr = d.toLocaleDateString('es') + ' ' + d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
                }
                abrirVentanaTicket(buildBodyCotizacion(titulo, detalles, fechaStr, platillos, total, true));
            })
            .catch(function (err) {
                console.error('Error al cargar cotización:', err);
                alert('Error al cargar la cotización: ' + (err && err.message ? err.message : err));
            });
    }

    window.prepararTicket = prepararTicket;
    window.enviarWhatsApp = enviarWhatsApp;
    window.prepararCotizacion = prepararCotizacion;

})();