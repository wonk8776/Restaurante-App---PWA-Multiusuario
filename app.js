/**
 * app.js - Panel administrador Restaurante Pro
 * Firebase v9 compat, tiempo real con onSnapshot
 */

(function () {
    'use strict';

    // --- Referencias DOM ---
    var adminNameEl = document.getElementById('adminName');
    var headerTitleEl = document.getElementById('headerTitle');
    var btnLogout = document.getElementById('btnLogout');
    var navLinks = document.querySelectorAll('.nav-list a');
    var sections = document.querySelectorAll('.section');

    // Dashboard
    var ventasDiaEl = document.getElementById('ventasDia');
    var gastosDiaEl = document.getElementById('gastosDia');
    var gananciaNetaEl = document.getElementById('gananciaNeta');
    var ordenesActivasEl = document.getElementById('ordenesActivas');

    // Órdenes
    var ordenesBody = document.getElementById('ordenesBody');

    // Menú
    var menuBody = document.getElementById('menuBody');
    var btnAgregarPlatillo = document.getElementById('btnAgregarPlatillo');
    var modalPlatillo = document.getElementById('modalPlatillo');
    var platilloNombre = document.getElementById('platilloNombre');
    var platilloPrecio = document.getElementById('platilloPrecio');
    var btnGuardarPlatillo = document.getElementById('btnGuardarPlatillo');
    var btnCancelarPlatillo = document.getElementById('btnCancelarPlatillo');

    // Meseros
    var meserosBody = document.getElementById('meserosBody');
    var btnCrearMesero = document.getElementById('btnCrearMesero');
    var modalMesero = document.getElementById('modalMesero');
    var meseroNombre = document.getElementById('meseroNombre');
    var meseroEmail = document.getElementById('meseroEmail');
    var meseroPassword = document.getElementById('meseroPassword');
    var btnGuardarMesero = document.getElementById('btnGuardarMesero');
    var btnCancelarMesero = document.getElementById('btnCancelarMesero');
    var meseroError = document.getElementById('meseroError');

    // Gastos
    var gastoDescripcion = document.getElementById('gastoDescripcion');
    var gastoCategoria = document.getElementById('gastoCategoria');
    var gastoMonto = document.getElementById('gastoMonto');
    var gastoMetodoPago = document.getElementById('gastoMetodoPago');
    var btnRegistrarGasto = document.getElementById('btnRegistrarGasto');
    var gastoOk = document.getElementById('gastoOk');

    // Reportes
    var reporteDesde = document.getElementById('reporteDesde');
    var reporteHasta = document.getElementById('reporteHasta');
    var btnFiltrarReporte = document.getElementById('btnFiltrarReporte');
    var btnExportarPdf = document.getElementById('btnExportarPdf');
    var reporteTotalVentas = document.getElementById('reporteTotalVentas');
    var reportesBody = document.getElementById('reportesBody');

    var titulosSeccion = {
        dashboard: 'Dashboard',
        ordenes: 'Órdenes en vivo',
        menu: 'Menú',
        meseros: 'Meseros',
        gastos: 'Gastos',
        reportes: 'Reportes'
    };

    // --- Navegación SPA ---
    function mostrarSeccion(sectionId) {
        sections.forEach(function (sec) {
            sec.classList.remove('active');
            if (sec.id === 'section-' + sectionId) sec.classList.add('active');
        });
        navLinks.forEach(function (a) {
            a.classList.remove('active');
            if (a.getAttribute('data-section') === sectionId) a.classList.add('active');
        });
        if (headerTitleEl) headerTitleEl.textContent = titulosSeccion[sectionId] || sectionId;
    }

    navLinks.forEach(function (a) {
        a.addEventListener('click', function (e) {
            e.preventDefault();
            var id = a.getAttribute('data-section');
            if (id) mostrarSeccion(id);
        });
    });

    // --- Cerrar sesión ---
    function cerrarSesion() {
        auth.signOut().then(function () {
            window.location.href = 'login.html';
        }).catch(function (err) {
            console.error('Error al cerrar sesión:', err);
            window.location.href = 'login.html';
        });
    }
    if (btnLogout) btnLogout.addEventListener('click', cerrarSesion);

    // --- Nombre del admin ---
    auth.onAuthStateChanged(function (user) {
        if (user && adminNameEl) {
            db.collection('usuarios').doc(user.uid).get().then(function (doc) {
                if (doc.exists && doc.data().nombre) {
                    adminNameEl.textContent = doc.data().nombre;
                } else {
                    adminNameEl.textContent = user.email || 'Admin';
                }
            }).catch(function () {
                adminNameEl.textContent = user.email || 'Admin';
            });
        }
    });

    // --- Helpers fecha (inicio/fin del día) ---
    function inicioDelDia(d) {
        var x = new Date(d);
        x.setHours(0, 0, 0, 0);
        return x;
    }
    function finDelDia(d) {
        var x = new Date(d);
        x.setHours(23, 59, 59, 999);
        return x;
    }
    function hoy() {
        return new Date();
    }

    // --- Dashboard: ventas, gastos, ganancia, órdenes activas (tiempo real) ---
    function escucharDashboard() {
        var hoyInicio = firebase.firestore.Timestamp.fromDate(inicioDelDia(hoy()));
        var hoyFin = firebase.firestore.Timestamp.fromDate(finDelDia(hoy()));

        db.collection('ventas').where('timestamp', '>=', hoyInicio).where('timestamp', '<=', hoyFin)
            .onSnapshot(function (snap) {
                var total = 0;
                snap.forEach(function (d) {
                    total += (d.data().total || 0);
                });
                if (ventasDiaEl) ventasDiaEl.textContent = '$' + total.toFixed(2);
                window._ventasDia = total;
                actualizarGananciaDashboard();
            });

        db.collection('gastos').where('fecha', '>=', hoyInicio).where('fecha', '<=', hoyFin)
            .onSnapshot(function (snap) {
                var total = 0;
                snap.forEach(function (d) {
                    total += (d.data().monto || 0);
                });
                if (gastosDiaEl) gastosDiaEl.textContent = '$' + total.toFixed(2);
                window._gastosDia = total;
                actualizarGananciaDashboard();
            });

        db.collection('ordenes').onSnapshot(function (snap) {
            var activas = 0;
            snap.forEach(function (d) {
                var est = (d.data().estado || '').toLowerCase();
                if (est !== 'pagada' && est !== 'cancelada') activas++;
            });
            if (ordenesActivasEl) ordenesActivasEl.textContent = activas;
        });
    }

    function actualizarGananciaDashboard() {
        var v = window._ventasDia || 0;
        var g = window._gastosDia || 0;
        var gan = Math.max(0, v - g);
        if (gananciaNetaEl) gananciaNetaEl.textContent = '$' + gan.toFixed(2);
    }

    // --- Órdenes en vivo ---
    function estadoToClass(estado) {
        var e = (estado || '').toLowerCase();
        if (e === 'pagada') return 'estado-pagada';
        if (e === 'servido' || e === 'servida') return 'estado-servido';
        if (e === 'preparando') return 'estado-preparando';
        return 'estado-pendiente';
    }

    function cambiarEstadoOrden(id, nuevoEstado) {
        db.collection('ordenes').doc(id).get().then(function (doc) {
            if (!doc.exists) return;
            var data = doc.data();
            db.collection('ordenes').doc(id).update({ estado: nuevoEstado }).then(function () {
                if ((nuevoEstado || '').toLowerCase() === 'pagada') {
                    var venta = {
                        mesa: data.mesa || '',
                        platillos: data.platillos || [],
                        total: data.total || 0,
                        meseroNombre: data.meseroNombre || '',
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    db.collection('ventas').add(venta);
                }
            }).catch(function (err) {
                console.error('Error actualizando orden:', err);
            });
        });
    }

    function renderOrdenes(snap) {
        if (!ordenesBody) return;
        var rows = [];
        if (snap.empty) {
            rows.push('<tr><td colspan="6" class="msg-empty">No hay órdenes.</td></tr>');
        } else {
            snap.forEach(function (d) {
                var data = d.data();
                var id = d.id;
                var mesa = data.mesa || '-';
                var mesero = data.meseroNombre || '-';
                var sepPlatillos = String.fromCharCode(44) + ' ';
                var emptyPlatillos = '-';
                var platillosList = Array.isArray(data.platillos)
                    ? data.platillos.map(function (p) {
                        var n = '';
                        if (p && p.nombre) n = p.nombre;
                        else if (typeof p === 'string') n = p;
                        var q = (p && p.cantidad) ? ' x' + p.cantidad : '';
                        return n + q;
                    })
                    : [];
                var platillos = platillosList.join(sepPlatillos) || emptyPlatillos;
                var total;
                if (data.total != null) {
                    total = '$' + Number(data.total).toFixed(2);
                } else {
                    total = '-';
                }
                var estado = data.estado || 'pendiente';
                var clase = estadoToClass(estado);
                var opciones = '';
                if (estado.toLowerCase() !== 'pagada' && estado.toLowerCase() !== 'cancelada') {
                    if (estado.toLowerCase() !== 'preparando') {
                        opciones += '<button type="button" class="btn-sm btn-primary" data-id="' + id + '" data-estado="preparando">Preparando</button>';
                    }
                    if (estado.toLowerCase() !== 'servido' && estado.toLowerCase() !== 'servida') {
                        opciones += '<button type="button" class="btn-sm btn-primary" data-id="' + id + '" data-estado="servido">Servido</button>';
                    }
                    opciones += '<button type="button" class="btn-sm btn-primary" data-id="' + id + '" data-estado="pagada">Pagada</button>';
                }
                rows.push(
                    '<tr><td data-label="Mesa">' + escapeHtml(mesa) + '</td><td data-label="Mesero">' + escapeHtml(mesero) + '</td><td data-label="Platillos">' + escapeHtml(platillos) + '</td><td data-label="Total">' + total + '</td><td data-label="Estado"><span class="estado-badge ' + clase + '">' + escapeHtml(estado) + '</span></td><td data-label="Acciones">' + opciones + '</td></tr>'
                );
            });
        }
        ordenesBody.innerHTML = rows.join('');
        ordenesBody.querySelectorAll('[data-id][data-estado]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                cambiarEstadoOrden(btn.getAttribute('data-id'), btn.getAttribute('data-estado'));
            });
        });
    }

    function escapeHtml(s) {
        if (s == null) return '';
        var div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }

    db.collection('ordenes').onSnapshot(function (snap) {
        renderOrdenes(snap);
    }, function (err) {
        if (ordenesBody) ordenesBody.innerHTML = '<tr><td colspan="6" class="msg-empty">Error al cargar órdenes.</td></tr>';
        console.error(err);
    });

    // --- Menú ---
    function agregarPlatillo(nombre, precio) {
        if (!nombre || !nombre.trim()) return;
        var p = parseFloat(precio);
        if (isNaN(p) || p < 0) return;
        db.collection('menu').add({ nombre: nombre.trim(), precio: p });
    }

    function editarPlatillo(id, nombre, precio) {
        var p = parseFloat(precio);
        if (isNaN(p) || p < 0) return;
        db.collection('menu').doc(id).update({ nombre: (nombre || '').trim(), precio: p });
    }

    function eliminarPlatillo(id) {
        if (!confirm('¿Eliminar este platillo?')) return;
        db.collection('menu').doc(id).delete();
    }

    function renderMenu(snap) {
        if (!menuBody) return;
        var rows = [];
        if (snap.empty) {
            rows.push('<tr><td colspan="3" class="msg-empty">No hay platillos. Agregue uno.</td></tr>');
        } else {
            snap.forEach(function (d) {
                var data = d.data();
                var id = d.id;
                var nombre = data.nombre || '';
                var precio = (data.precio != null) ? '$' + Number(data.precio).toFixed(2) : '';
                rows.push(
                    '<tr><td data-label="Nombre">' + escapeHtml(nombre) + '</td><td data-label="Precio">' + precio + '</td><td data-label="Acciones">' +
                    '<button type="button" class="btn-sm btn-secondary editar-platillo" data-id="' + id + '" data-nombre="' + escapeHtml(nombre) + '" data-precio="' + (data.precio != null ? data.precio : '') + '">Editar</button> ' +
                    '<button type="button" class="btn-sm btn-danger eliminar-platillo" data-id="' + id + '">Eliminar</button></td></tr>'
                );
            });
        }
        menuBody.innerHTML = rows.join('');
        menuBody.querySelectorAll('.editar-platillo').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var id = btn.getAttribute('data-id');
                var nombre = btn.getAttribute('data-nombre') || '';
                var precio = btn.getAttribute('data-precio') || '';
                platilloNombre.value = nombre;
                platilloPrecio.value = precio;
                modalPlatillo.setAttribute('data-edit-id', id);
                modalPlatillo.style.display = 'block';
            });
        });
        menuBody.querySelectorAll('.eliminar-platillo').forEach(function (btn) {
            btn.addEventListener('click', function () {
                eliminarPlatillo(btn.getAttribute('data-id'));
            });
        });
    }

    db.collection('menu').onSnapshot(function (snap) {
        renderMenu(snap);
    }, function (err) {
        if (menuBody) menuBody.innerHTML = '<tr><td colspan="3" class="msg-empty">Error al cargar menú.</td></tr>';
        console.error(err);
    });

    if (btnAgregarPlatillo) {
        btnAgregarPlatillo.addEventListener('click', function () {
            modalPlatillo.removeAttribute('data-edit-id');
            platilloNombre.value = '';
            platilloPrecio.value = '';
            modalPlatillo.style.display = 'block';
        });
    }
    if (btnCancelarPlatillo) {
        btnCancelarPlatillo.addEventListener('click', function () {
            modalPlatillo.style.display = 'none';
        });
    }
    if (btnGuardarPlatillo) {
        btnGuardarPlatillo.addEventListener('click', function () {
            var editId = modalPlatillo.getAttribute('data-edit-id');
            var nombre = platilloNombre.value.trim();
            var precio = platilloPrecio.value;
            if (editId) {
                editarPlatillo(editId, nombre, precio);
            } else {
                agregarPlatillo(nombre, precio);
            }
            modalPlatillo.style.display = 'none';
        });
    }

    // --- Meseros ---
    function crearMesero(nombre, email, password) {
        if (!email || !password) {
            if (meseroError) {
                meseroError.textContent = 'Correo y contraseña son obligatorios.';
                meseroError.style.display = 'block';
            }
            return;
        }
        if (password.length < 6) {
            if (meseroError) {
                meseroError.textContent = 'La contraseña debe tener al menos 6 caracteres.';
                meseroError.style.display = 'block';
            }
            return;
        }
        if (meseroError) meseroError.style.display = 'none';

        var secondaryApp;
        try {
            secondaryApp = firebase.initializeApp(firebaseConfig, 'Secondary');
        } catch (e) {
            secondaryApp = firebase.app('Secondary');
        }
        var secondaryAuth = secondaryApp.auth();

        secondaryAuth.createUserWithEmailAndPassword(email, password).then(function (userCredential) {
            var uid = userCredential.user.uid;
            return db.collection('usuarios').doc(uid).set({
                nombre: (nombre || '').trim() || email,
                email: email,
                rol: 'mesero'
            });
        }).then(function () {
            return secondaryApp.delete();
        }).then(function () {
            if (modalMesero) modalMesero.style.display = 'none';
            meseroNombre.value = '';
            meseroEmail.value = '';
            meseroPassword.value = '';
            alert('Mesero creado correctamente.');
        }).catch(function (err) {
            try {
                if (firebase.app('Secondary')) firebase.app('Secondary').delete();
            } catch (e) { }
            if (meseroError) {
                meseroError.textContent = err.message || 'Error al crear mesero.';
                meseroError.style.display = 'block';
            }
            console.error(err);
        });
    }

    db.collection('usuarios').where('rol', '==', 'mesero').onSnapshot(function (snap) {
        if (!meserosBody) return;
        var rows = [];
        if (snap.empty) {
            rows.push('<tr><td colspan="2" class="msg-empty">No hay meseros registrados.</td></tr>');
        } else {
            snap.forEach(function (d) {
                var data = d.data();
                rows.push('<tr><td>' + escapeHtml(data.nombre || '-') + '</td><td>' + escapeHtml(data.email || '-') + '</td></tr>');
            });
        }
        meserosBody.innerHTML = rows.join('');
    });

    if (btnCrearMesero) {
        btnCrearMesero.addEventListener('click', function () {
            modalMesero.style.display = 'block';
            meseroError.style.display = 'none';
        });
    }
    if (btnCancelarMesero) {
        btnCancelarMesero.addEventListener('click', function () {
            modalMesero.style.display = 'none';
        });
    }
    if (btnGuardarMesero) {
        btnGuardarMesero.addEventListener('click', function () {
            crearMesero(meseroNombre.value, meseroEmail.value, meseroPassword.value);
        });
    }

    // Nota: crearMesero hace signUp y luego el usuario queda logueado como el nuevo mesero.
    // Para que el admin siga logueado, en producción se usaría Cloud Functions con Admin SDK.
    // Aquí re-autenticamos al admin si es posible (auth.currentUser puede ser el nuevo mesero).
    // Dejamos el flujo como pedido; el admin puede volver a iniciar sesión si queda deslogueado.

    // --- Gastos ---
    function registrarGasto(descripcion, categoria, monto, metodoPago) {
        var m = parseFloat(monto);
        if (isNaN(m) || m <= 0) return;
        db.collection('gastos').add({
            descripcion: (descripcion || '').trim(),
            categoria: categoria || 'otros',
            monto: m,
            metodoPago: metodoPago || 'efectivo',
            fecha: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function () {
            gastoDescripcion.value = '';
            gastoMonto.value = '';
            if (gastoOk) {
                gastoOk.style.display = 'block';
                setTimeout(function () { gastoOk.style.display = 'none'; }, 3000);
            }
        }).catch(function (err) {
            console.error(err);
        });
    }

    if (btnRegistrarGasto) {
        btnRegistrarGasto.addEventListener('click', function () {
            registrarGasto(gastoDescripcion.value, gastoCategoria.value, gastoMonto.value, gastoMetodoPago.value);
        });
    }

    // --- Reportes ---
    var reporteVentas = [];

    function filtrarReporte() {
        var desde = reporteDesde.value;
        var hasta = reporteHasta.value;
        if (!desde || !hasta) {
            reportesBody.innerHTML = '<tr><td colspan="4" class="msg-empty">Seleccione fechas desde y hasta.</td></tr>';
            return;
        }
        var d1 = firebase.firestore.Timestamp.fromDate(new Date(desde + 'T00:00:00'));
        var d2 = firebase.firestore.Timestamp.fromDate(new Date(hasta + 'T23:59:59.999'));
        db.collection('ventas').where('timestamp', '>=', d1).where('timestamp', '<=', d2).get().then(function (snap) {
            reporteVentas = [];
            var total = 0;
            snap.forEach(function (d) {
                var data = d.data();
                reporteVentas.push({
                    id: d.id,
                    fecha: data.timestamp && data.timestamp.toDate ? data.timestamp.toDate() : null,
                    mesa: data.mesa || '-',
                    mesero: data.meseroNombre || '-',
                    total: data.total || 0
                });
                total += data.total || 0;
            });
            reporteTotalVentas.textContent = '$' + total.toFixed(2);
            var rows = [];
            reporteVentas.forEach(function (v) {
                var f = v.fecha ? (v.fecha.getFullYear() + '-' + String(v.fecha.getMonth() + 1).padStart(2, '0') + '-' + String(v.fecha.getDate()).padStart(2, '0') + ' ' + v.fecha.toLocaleTimeString('es')) : '-';
                rows.push('<tr><td data-label="Fecha">' + f + '</td><td data-label="Mesa">' + escapeHtml(v.mesa) + '</td><td data-label="Mesero">' + escapeHtml(v.mesero) + '</td><td data-label="Total">$' + Number(v.total).toFixed(2) + '</td></tr>');
            });
            if (rows.length === 0) {
                rows.push('<tr><td colspan="4" class="msg-empty">No hay ventas en este período.</td></tr>');
            }
            reportesBody.innerHTML = rows.join('');
        });
    }

    if (btnFiltrarReporte) btnFiltrarReporte.addEventListener('click', filtrarReporte);

    function exportarPdf() {
        var desde = reporteDesde.value;
        var hasta = reporteHasta.value;
        if (!desde || !hasta || reporteVentas.length === 0) {
            alert('Filtre primero un período con ventas y luego exporte.');
            return;
        }
        var ventana = window.open('', '_blank');
        var tabla = '<table border="1" cellpadding="8" style="border-collapse:collapse;width:100%;"><thead><tr><th>Fecha</th><th>Mesa</th><th>Mesero</th><th>Total</th></tr></thead><tbody>';
        reporteVentas.forEach(function (v) {
            var f = v.fecha ? v.fecha.toLocaleString('es') : '-';
            tabla += '<tr><td>' + f + '</td><td>' + v.mesa + '</td><td>' + v.mesero + '</td><td>$' + Number(v.total).toFixed(2) + '</td></tr>';
        });
        tabla += '</tbody></table>';
        ventana.document.write(
            '<html><head><title>Reporte ventas ' + desde + ' - ' + hasta + '</title></head><body>' +
            '<h1>Reporte de ventas</h1><p>Período: ' + desde + ' a ' + hasta + '</p>' + tabla +
            '</body></html>'
        );
        ventana.document.close();
        ventana.print();
        ventana.close();
    }
    if (btnExportarPdf) btnExportarPdf.addEventListener('click', exportarPdf);

    // --- Iniciar listeners dashboard ---
    escucharDashboard();
})();
