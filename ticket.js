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

    // ─── Logo SVG ───
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

    // ─── Estilos CSS para ventana de impresión (usa flex, funciona en navegador) ───
    function ticketStylesPrint() {
        return '@page { size: 58mm auto; margin: 1mm 0mm; }' +
            'body { width: 200px; max-width: 200px; margin: 0 auto; padding: 2px 0; background: #fff; color: #000; font-family: Arial, sans-serif; font-size: 9pt; line-height: 1.4; }' +
            '.ticket-logo-svg { text-align: center; margin-bottom: 4px; }' +
            '.ticket-nombre { text-align: center; font-size: 13pt; font-weight: 900; margin-bottom: 4px; }' +
            '.ticket-fecha { text-align: center; font-size: 8pt; margin-bottom: 4px; }' +
            '.ticket-sep-doble { border-top: 2.5px solid #000; margin: 3px 0; }' +
            '.ticket-sep-punto { border-top: 1px dashed #555; margin: 3px 0; }' +
            '.ticket-detalles { font-size: 9pt; margin: 4px 0; }' +
            '.ticket-detalle { margin: 2px 0; }' +
            '.ticket-label { font-weight: 900; min-width: 60px; display: inline-block; }' +
            '.ticket-encabezado { font-size: 8pt; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 2px 0; display: flex; justify-content: space-between; }' +
            '.ticket-encabezado span { font-weight: 900; }' +
            '.ticket-fila-platillo { border-bottom: 1px dashed #aaa; padding: 3px 0; font-size: 9pt; }' +
            '.ticket-linea1 { display: flex; justify-content: space-between; align-items: baseline; }' +
            '.ticket-platillo-main { flex: 1; word-break: break-word; padding-right: 4px; }' +
            '.ticket-platillo-importe { width: 60px; flex-shrink: 0; text-align: right; }' +
            '.ticket-linea2 { padding-left: 2px; font-size: 9pt; color: #000; }' +
            '.ticket-total { text-align: right; font-size: 13pt; font-weight: 900; margin: 6px 0; }' +
            '.ticket-pie { text-align: center; font-size: 9pt; margin: 6px 0; font-style: italic; }' +
            '.no-print { margin-top: 12px; text-align: center; }' +
            '.no-print button { padding: 8px 16px; cursor: pointer; font-size: 9pt; }' +
            '@media print { .no-print { display: none !important; } }';
    }

    // ─── Estilos CSS para imagen WhatsApp (usa tabla, sin flex) ───
    function ticketStylesWhatsApp() {
        return 'body { width: 320px; margin: 0 auto; padding: 10px; background: #fff; color: #000; font-family: Arial, sans-serif; font-size: 11px; line-height: 1.4; box-sizing: border-box; }' +
            '.ticket-logo-svg { text-align: center; margin-bottom: 6px; }' +
            '.ticket-nombre { text-align: center; font-size: 16px; font-weight: 900; margin-bottom: 4px; }' +
            '.ticket-fecha { text-align: center; font-size: 10px; margin-bottom: 6px; }' +
            '.ticket-sep-doble { border-top: 2.5px solid #000; margin: 4px 0; }' +
            '.ticket-sep-punto { border-top: 1px dashed #555; margin: 4px 0; }' +
            '.ticket-detalles { font-size: 11px; margin: 4px 0; }' +
            '.ticket-detalle { margin: 2px 0; }' +
            '.ticket-label { font-weight: 900; }' +
            '.ticket-tabla { width: 100%; border-collapse: collapse; margin: 0; }' +
            '.ticket-tabla th { font-size: 10px; font-weight: 900; text-align: left; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 2px 0; }' +
            '.ticket-tabla th.col-imp { text-align: right; }' +
            '.ticket-tabla td { font-size: 11px; vertical-align: top; padding: 3px 0; border-bottom: 1px dashed #aaa; }' +
            '.ticket-tabla td.col-imp { text-align: right; white-space: nowrap; padding-left: 8px; }' +
            '.ticket-precio-unit { font-size: 10px; color: #000; }' +
            '.ticket-total { text-align: right; font-size: 15px; font-weight: 900; margin: 6px 0; }' +
            '.ticket-pie { text-align: center; font-size: 10px; margin: 6px 0; font-style: italic; }';
    }

    // ─── Limpia nombres contaminados "nombre — $precio" de Firestore ───
    function limpiarNombre(raw) {
        var s = String(raw || '—');
        var idx = s.indexOf(' — ');
        if (idx !== -1) s = s.substring(0, idx).trim();
        idx = s.indexOf(' - $');
        if (idx !== -1) s = s.substring(0, idx).trim();
        return s;
    }

    // ─── Filas para ventana de impresión (flex) ───
    function buildFilasPrint(platillos) {
        var filas = '';
        platillos.forEach(function (p) {
            var nombre = limpiarNombre(p && p.nombre);
            var cant = (p && p.cantidad) ? parseInt(p.cantidad, 10) : 1;
            var precio = (p && p.precio != null) ? Number(p.precio) : 0;
            var importe = (cant * precio).toFixed(2);
            filas +=
                '<div class="ticket-fila-platillo">' +
                '<div class="ticket-linea1">' +
                '<span class="ticket-platillo-main">' + escapeHtml(nombre) + ' (x' + cant + ')</span>' +
                '<span class="ticket-platillo-importe">$' + importe + '</span>' +
                '</div>' +
                '<div class="ticket-linea2">$' + precio.toFixed(2) + ' c/u</div>' +
                '</div>';
        });
        return filas;
    }

    // ─── Filas para imagen WhatsApp (tabla HTML, sin flex) ───
    function buildFilasWhatsApp(platillos) {
        var filas = '';
        platillos.forEach(function (p) {
            var nombre = limpiarNombre(p && p.nombre);
            var cant = (p && p.cantidad) ? parseInt(p.cantidad, 10) : 1;
            var precio = (p && p.precio != null) ? Number(p.precio) : 0;
            var importe = (cant * precio).toFixed(2);
            filas +=
                '<tr>' +
                '<td><b>' + escapeHtml(nombre) + ' (x' + cant + ')</b><br><span class="ticket-precio-unit">$' + precio.toFixed(2) + ' c/u</span></td>' +
                '<td class="col-imp">$' + importe + '</td>' +
                '</tr>';
        });
        return filas;
    }

    // ─── Abre ventana nueva e imprime ───
    function abrirVentanaTicket(bodyContent) {
        var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
            ticketStylesPrint() +
            '</style></head><body>' + bodyContent +
            '<script>window.onload=function(){setTimeout(function(){window.print();},400);};<\/script>' +
            '</body></html>';
        var w = window.open('', '_blank', 'width=260,height=700');
        if (!w) {
            alert('El navegador bloqueó la ventana emergente.\n\nPara imprimir:\n1. Haz clic en el ícono de bloqueo en la barra del navegador\n2. Selecciona "Permitir ventanas emergentes"\n3. Vuelve a hacer clic en Imprimir');
            return;
        }
        w.document.open();
        w.document.write(html);
        w.document.close();
    }

    // ─── Genera PNG para WhatsApp usando iframe aislado (tabla, sin flex) ───
    function generarImagenWhatsApp(bodyWhatsApp, nombreArchivo) {
        if (typeof html2canvas === 'undefined') {
            alert('html2canvas no está cargado. Comprueba la conexión.');
            return;
        }

        var iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:absolute;left:-9999px;top:0;width:340px;height:1px;border:none;opacity:0;pointer-events:none;';
        document.body.appendChild(iframe);

        var iDoc = iframe.contentDocument || iframe.contentWindow.document;
        iDoc.open();
        iDoc.write(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
            ticketStylesWhatsApp() +
            '</style></head><body>' + bodyWhatsApp + '</body></html>'
        );
        iDoc.close();

        setTimeout(function () {
            html2canvas(iDoc.body, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                width: 340,
                windowWidth: 340
            }).then(function (canvas) {
                var dataUrl = canvas.toDataURL('image/png');
                var a = document.createElement('a');
                a.download = nombreArchivo;
                a.href = dataUrl;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                document.body.removeChild(iframe);
                alert('Imagen descargada. Ábrela desde tu galería y compártela por WhatsApp.');
            }).catch(function (err) {
                console.error('Error html2canvas:', err);
                document.body.removeChild(iframe);
                alert('No se pudo generar la imagen del ticket.');
            });
        }, 500);
    }

    // ─── Body de ORDEN para impresión (flex) ───
    function buildBodyOrdenPrint(mesa, meseroNombre, fechaStr, platillos, total) {
        var totalFormatted = Number(total).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return '<div class="ticket-logo-svg">' + logoSVG() + '</div>' +
            '<div class="ticket-nombre">Familia González</div>' +
            '<div class="ticket-fecha">' + escapeHtml(fechaStr) + '</div>' +
            '<div class="ticket-sep-doble"></div>' +
            '<div class="ticket-detalles">' +
            '<div class="ticket-detalle"><span class="ticket-label">Mesa</span> ' + escapeHtml(mesa) + '</div>' +
            '<div class="ticket-detalle"><span class="ticket-label">Mesero</span> ' + escapeHtml(meseroNombre) + '</div>' +
            '</div>' +
            '<div class="ticket-sep-punto"></div>' +
            '<div class="ticket-encabezado"><span>Artículo</span><span>Importe</span></div>' +
            buildFilasPrint(platillos) +
            '<div class="ticket-sep-doble"></div>' +
            '<div class="ticket-total">TOTAL: $' + totalFormatted + '</div>' +
            '<div class="ticket-sep-punto"></div>' +
            '<div class="ticket-pie">¡Gracias por su preferencia!</div>' +
            '<div class="no-print"><button type="button" onclick="window.print();">🖨 Imprimir ticket</button></div>';
    }

    // ─── Body de ORDEN para WhatsApp (tabla) ───
    function buildBodyOrdenWhatsApp(mesa, meseroNombre, fechaStr, platillos, total) {
        var totalFormatted = Number(total).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return '<div class="ticket-logo-svg">' + logoSVG() + '</div>' +
            '<div class="ticket-nombre">Familia González</div>' +
            '<div class="ticket-fecha">' + escapeHtml(fechaStr) + '</div>' +
            '<div class="ticket-sep-doble"></div>' +
            '<div class="ticket-detalles">' +
            '<div class="ticket-detalle"><span class="ticket-label">Mesa:</span> ' + escapeHtml(mesa) + '</div>' +
            '<div class="ticket-detalle"><span class="ticket-label">Mesero:</span> ' + escapeHtml(meseroNombre) + '</div>' +
            '</div>' +
            '<div class="ticket-sep-punto"></div>' +
            '<table class="ticket-tabla"><thead><tr><th>Artículo</th><th class="col-imp">Importe</th></tr></thead><tbody>' +
            buildFilasWhatsApp(platillos) +
            '</tbody></table>' +
            '<div class="ticket-sep-doble"></div>' +
            '<div class="ticket-total">TOTAL: $' + totalFormatted + '</div>' +
            '<div class="ticket-sep-punto"></div>' +
            '<div class="ticket-pie">¡Gracias por su preferencia!</div>';
    }

    // ─── Body de COTIZACIÓN para impresión (flex) ───
    function buildBodyCotizacionPrint(titulo, detalles, fechaStr, platillos, total) {
        var totalFormatted = Number(total).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return '<div class="ticket-logo-svg">' + logoSVG() + '</div>' +
            '<div class="ticket-nombre">Familia González</div>' +
            '<div class="ticket-fecha">' + escapeHtml(fechaStr) + '</div>' +
            '<div class="ticket-sep-doble"></div>' +
            '<div class="ticket-detalles">' +
            '<div class="ticket-detalle"><span class="ticket-label">Cotización</span> ' + escapeHtml(titulo) + '</div>' +
            '<div class="ticket-detalle"><span class="ticket-label">Detalles</span> ' + escapeHtml(detalles) + '</div>' +
            '</div>' +
            '<div class="ticket-sep-punto"></div>' +
            '<div class="ticket-encabezado"><span>Artículo</span><span>Importe</span></div>' +
            buildFilasPrint(platillos) +
            '<div class="ticket-sep-doble"></div>' +
            '<div class="ticket-total">TOTAL: $' + totalFormatted + '</div>' +
            '<div class="ticket-sep-punto"></div>' +
            '<div class="ticket-pie">¡Gracias por su preferencia!</div>' +
            '<div class="no-print"><button type="button" onclick="window.print();">🖨 Imprimir</button></div>';
    }

    // ─── Body de COTIZACIÓN para WhatsApp (tabla) ───
    function buildBodyCotizacionWhatsApp(titulo, detalles, fechaStr, platillos, total) {
        var totalFormatted = Number(total).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return '<div class="ticket-logo-svg">' + logoSVG() + '</div>' +
            '<div class="ticket-nombre">Familia González</div>' +
            '<div class="ticket-fecha">' + escapeHtml(fechaStr) + '</div>' +
            '<div class="ticket-sep-doble"></div>' +
            '<div class="ticket-detalles">' +
            '<div class="ticket-detalle"><span class="ticket-label">Cotización:</span> ' + escapeHtml(titulo) + '</div>' +
            '<div class="ticket-detalle"><span class="ticket-label">Detalles:</span> ' + escapeHtml(detalles) + '</div>' +
            '</div>' +
            '<div class="ticket-sep-punto"></div>' +
            '<table class="ticket-tabla"><thead><tr><th>Artículo</th><th class="col-imp">Importe</th></tr></thead><tbody>' +
            buildFilasWhatsApp(platillos) +
            '</tbody></table>' +
            '<div class="ticket-sep-doble"></div>' +
            '<div class="ticket-total">TOTAL: $' + totalFormatted + '</div>' +
            '<div class="ticket-sep-punto"></div>' +
            '<div class="ticket-pie">¡Gracias por su preferencia!</div>';
    }

    // ─── Helpers Firestore ───
    function leerOrden(ordenId, callback) {
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
                callback(mesa, meseroNombre, fechaStr, platillos, total);
            })
            .catch(function (err) {
                console.error('Error al cargar orden:', err);
                alert('Error al cargar la orden: ' + (err && err.message ? err.message : err));
            });
    }

    function leerCotizacion(cotizacionId, callback) {
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
                callback(titulo, detalles, fechaStr, platillos, total);
            })
            .catch(function (err) {
                console.error('Error al cargar cotización:', err);
                alert('Error al cargar la cotización: ' + (err && err.message ? err.message : err));
            });
    }

    // ══════════════════════════════════════════
    // API PÚBLICA
    // ══════════════════════════════════════════

    function prepararTicket(ordenId) {
        if (!ordenId || typeof db === 'undefined') { alert('Recarga la página e intenta de nuevo.'); return; }
        leerOrden(ordenId, function (mesa, mesero, fecha, platillos, total) {
            abrirVentanaTicket(buildBodyOrdenPrint(mesa, mesero, fecha, platillos, total));
        });
    }

    function enviarWhatsApp(ordenId) {
        if (!ordenId || typeof db === 'undefined') { alert('Recarga la página e intenta de nuevo.'); return; }
        leerOrden(ordenId, function (mesa, mesero, fecha, platillos, total) {
            generarImagenWhatsApp(buildBodyOrdenWhatsApp(mesa, mesero, fecha, platillos, total), 'ticket-mesa-' + mesa + '.png');
        });
    }

    function prepararCotizacion(cotizacionId) {
        if (!cotizacionId || typeof db === 'undefined') { alert('Recarga la página e intenta de nuevo.'); return; }
        leerCotizacion(cotizacionId, function (titulo, detalles, fecha, platillos, total) {
            abrirVentanaTicket(buildBodyCotizacionPrint(titulo, detalles, fecha, platillos, total));
        });
    }

    function enviarWhatsAppCotizacion(cotizacionId) {
        if (!cotizacionId || typeof db === 'undefined') { alert('Recarga la página e intenta de nuevo.'); return; }
        leerCotizacion(cotizacionId, function (titulo, detalles, fecha, platillos, total) {
            generarImagenWhatsApp(buildBodyCotizacionWhatsApp(titulo, detalles, fecha, platillos, total), 'cotizacion-' + titulo.substring(0, 20).replace(/\s/g, '-') + '.png');
        });
    }

    window.prepararTicket = prepararTicket;
    window.enviarWhatsApp = enviarWhatsApp;
    window.prepararCotizacion = prepararCotizacion;
    window.enviarWhatsAppCotizacion = enviarWhatsAppCotizacion;

})();