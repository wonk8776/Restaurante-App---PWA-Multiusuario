/**
 * ticket.js - Generación de ticket de venta para impresión térmica 80mm e imagen PNG
 * Solo lectura desde Firebase. No modifica la base de datos.
 */
(function () {
    'use strict';

    function escapeHtml(s) {
        if (s == null) return '';
        var div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }

    /**
     * Obtiene los datos de la orden desde Firebase, genera el HTML del ticket
     * en #ticket-container y ejecuta window.print() solo para ese contenedor.
     * @param {string} ordenId - ID del documento de la orden en Firestore
     */
    function prepararTicket(ordenId) {
        if (!ordenId || typeof db === 'undefined') {
            console.warn('prepararTicket: ordenId o db no disponible.');
            return;
        }
        var container = document.getElementById('ticket-container');
        if (!container) {
            console.warn('prepararTicket: no se encontró #ticket-container.');
            return;
        }

        db.collection('ordenes').doc(ordenId).get()
            .then(function (doc) {
                if (!doc.exists) {
                    alert('No se encontró la orden.');
                    return;
                }
                var data = doc.data();
                var mesa = data.mesa != null ? String(data.mesa) : '—';
                var mesero = data.meseroNombre || '—';
                var total = data.total != null ? Number(data.total) : 0;
                var platillos = Array.isArray(data.platillos) ? data.platillos : [];
                var fechaHora = '—';
                if (data.timestamp && data.timestamp.toDate) {
                    var d = data.timestamp.toDate();
                    fechaHora = d.toLocaleDateString('es') + ' ' + d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
                }

                var filas = '';
                platillos.forEach(function (p) {
                    var nombre = (p && p.nombre) ? p.nombre : '—';
                    var cant = (p && p.cantidad) ? parseInt(p.cantidad, 10) : 1;
                    var precio = (p && p.precio != null) ? Number(p.precio) : 0;
                    var importe = (cant * precio).toFixed(2);
                    filas += '<tr><td>' + cant + '</td><td>' + escapeHtml(nombre) + '</td><td>$' + importe + '</td></tr>';
                });

                var html =
                    '<div class="ticket-paper">' +
                    '<h1 class="ticket-logo">LUXE DINING</h1>' +
                    '<p class="ticket-fecha">' + escapeHtml(fechaHora) + '</p>' +
                    '<p class="ticket-detalles">Mesa: ' + escapeHtml(mesa) + ' &nbsp;|&nbsp; Mesero: ' + escapeHtml(mesero) + '</p>' +
                    '<table class="ticket-tabla"><thead><tr><th>Cant.</th><th>Descripción</th><th>Importe</th></tr></thead><tbody>' + filas + '</tbody></table>' +
                    '<p class="ticket-total">Total: $' + total.toFixed(2) + '</p>' +
                    '<p class="ticket-gracias">¡Gracias por su visita!</p>' +
                    '</div>';

                container.innerHTML = html;
                container.style.display = 'block';
                container.style.visibility = 'visible';

                function limpiarTicket() {
                    container.style.display = 'none';
                    container.innerHTML = '';
                    window.removeEventListener('afterprint', limpiarTicket);
                }
                window.addEventListener('afterprint', limpiarTicket);
                setTimeout(function () {
                    window.print();
                }, 150);
            })
            .catch(function (err) {
                console.error('Error al cargar orden para ticket:', err);
                alert('No se pudo cargar la orden para el ticket.');
            });
    }

    /**
     * Genera una imagen del ticket en #ticket-container, la descarga como PNG y muestra un alert.
     * El usuario puede abrir la imagen desde su galería y compartirla por WhatsApp.
     * @param {string} ordenId - ID del documento de la orden en Firestore
     */
    function enviarWhatsApp(ordenId) {
        if (!ordenId || typeof db === 'undefined') {
            console.warn('enviarWhatsApp: ordenId o db no disponible.');
            return;
        }
        var container = document.getElementById('ticket-container');
        if (!container) {
            console.warn('enviarWhatsApp: no se encontró #ticket-container.');
            return;
        }
        if (typeof html2canvas === 'undefined') {
            alert('html2canvas no está cargado. Comprueba la conexión.');
            return;
        }
        db.collection('ordenes').doc(ordenId).get()
            .then(function (doc) {
                if (!doc.exists) {
                    alert('No se encontró la orden.');
                    return;
                }
                var data = doc.data();
                var mesa = data.mesa != null ? String(data.mesa) : '—';
                var mesero = data.meseroNombre || '—';
                var total = data.total != null ? Number(data.total) : 0;
                var platillos = Array.isArray(data.platillos) ? data.platillos : [];
                var fechaStr = '—';
                if (data.timestamp && data.timestamp.toDate) {
                    var d = data.timestamp.toDate();
                    fechaStr = d.toLocaleDateString('es') + ' ' + d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
                }
                var lineasPlatillos = '';
                platillos.forEach(function (p) {
                    var nombre = (p && p.nombre) ? p.nombre : '—';
                    var cant = (p && p.cantidad) ? parseInt(p.cantidad, 10) : 1;
                    var precio = (p && p.precio != null) ? Number(p.precio) : 0;
                    var importe = (cant * precio).toFixed(2);
                    lineasPlatillos += '<div style="margin:4px 0;">' + cant + 'x ' + escapeHtml(nombre) + '  $' + importe + '</div>';
                });
                var html =
                    '<div style="width:320px;background:#ffffff;color:#000000;font-family:\'Courier New\',monospace;padding:24px;font-size:14px;box-sizing:border-box;">' +
                    '<div style="text-align:center;font-weight:bold;margin-bottom:8px;">LUXE DINING</div>' +
                    '<div style="border-bottom:1px solid #000;margin:8px 0;"></div>' +
                    '<div style="margin:4px 0;">Mesa: ' + escapeHtml(mesa) + '</div>' +
                    '<div style="margin:4px 0;">Mesero: ' + escapeHtml(mesero) + '</div>' +
                    '<div style="margin:4px 0;">Fecha: ' + escapeHtml(fechaStr) + '</div>' +
                    '<div style="border-bottom:1px solid #000;margin:8px 0;"></div>' +
                    lineasPlatillos +
                    '<div style="border-bottom:1px solid #000;margin:8px 0;"></div>' +
                    '<div style="font-weight:bold;margin:8px 0;">TOTAL: $' + total.toFixed(2) + '</div>' +
                    '<div style="border-bottom:1px solid #000;margin:8px 0;"></div>' +
                    '<div style="text-align:center;margin-top:12px;">¡Gracias por su</div>' +
                    '<div style="text-align:center;">visita!</div>' +
                    '</div>';
                container.innerHTML = html;
                container.style.cssText = [
                    'display: block',
                    'position: fixed',
                    'top: 0',
                    'left: -9999px',
                    'width: 320px',
                    'background: #ffffff',
                    'color: #000000',
                    'font-family: Courier New, monospace',
                    'padding: 24px',
                    'font-size: 14px',
                    'z-index: -1'
                ].join(';');
                setTimeout(function () {
                    html2canvas(container, {
                        scale: 2,
                        useCORS: true,
                        backgroundColor: '#ffffff',
                        width: 320,
                        windowWidth: 320
                    }).then(function (canvas) {
                        var dataUrl = canvas.toDataURL('image/png');
                        var a = document.createElement('a');
                        a.download = 'ticket-mesa-' + mesa + '.png';
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
            })
            .catch(function (err) {
                console.error('Error al cargar orden para WhatsApp:', err);
                alert('No se pudo cargar la orden.');
            });
    }

    window.prepararTicket = prepararTicket;
    window.enviarWhatsApp = enviarWhatsApp;
})();
