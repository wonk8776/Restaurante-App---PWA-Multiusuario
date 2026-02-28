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
    var ordenesConocidas = null;
    var contadorNuevas = 0;
    var ordenPendientePago = null;
    var modalMetodoPago = document.getElementById('modalMetodoPago');
    var btnCancelarMetodoPago = document.getElementById('btnCancelarMetodoPago');

    // Menú
    var menuBody = document.getElementById('menuBody');
    var btnAgregarPlatillo = document.getElementById('btnAgregarPlatillo');
    var modalPlatillo = document.getElementById('modalPlatillo');
    var platilloNombre = document.getElementById('platilloNombre');
    var platilloPrecio = document.getElementById('platilloPrecio');
    var platilloCategoria = document.getElementById('platilloCategoria');
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
        pedidos: 'Pedidos',
        cotizaciones: 'Cotizaciones',
        menu: 'Menú',
        meseros: 'Meseros',
        gastos: 'Gastos',
        reportes: 'Reportes',
        'reporte-semanal': 'Reporte Semanal',
        mantenimiento: 'Mantenimiento',
        configuracion: 'Configuración'
    };

    var pedidosInicializado = false;
    var cotizacionesInicializado = false;
    var menuItemsAdmin = [];

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
        // Abrir el grupo que contiene esta sección si estaba colapsado
        var linkActivo = document.querySelector('.nav-list a[data-section="' + sectionId + '"]');
        if (linkActivo) {
            var groupItems = linkActivo.closest('.nav-group-items');
            if (groupItems && groupItems.classList.contains('collapsed')) {
                groupItems.classList.remove('collapsed');
                var titleBtn = groupItems.previousElementSibling;
                if (titleBtn && titleBtn.classList.contains('nav-group-title')) titleBtn.classList.remove('collapsed');
            }
        }
    }

    navLinks.forEach(function (a) {
        a.addEventListener('click', function (e) {
            e.preventDefault();
            var id = a.getAttribute('data-section');
            if (id) {
                mostrarSeccion(id);
                if (id === 'pedidos' && !pedidosInicializado) {
                    iniciarSeccionPedidos();
                    pedidosInicializado = true;
                }
                if (id === 'cotizaciones' && !cotizacionesInicializado) {
                    iniciarSeccionCotizaciones();
                    cotizacionesInicializado = true;
                }
                if (id === 'reporte-semanal') {
                    actualizarPeriodoReporteSemanal();
                }
                if (id === 'configuracion') {
                    cargarConfigMesas();
                }
            }
        });
    });

    function actualizarPeriodoReporteSemanal() {
        var el = document.getElementById('reporteSemanalPeriodo');
        if (!el) return;
        var now = new Date();
        var day = now.getDay();
        var toMonday = day === 0 ? -6 : 1 - day;
        var monday = new Date(now);
        monday.setDate(monday.getDate() + toMonday);
        var sunday = new Date(monday);
        sunday.setDate(sunday.getDate() + 6);
        var opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        var lunesStr = monday.toLocaleDateString('es', opts);
        var domingoStr = sunday.toLocaleDateString('es', opts);
        el.textContent = lunesStr + ' — ' + domingoStr;
    }

    function generarReporteSemanal() {
        var now = new Date();
        var day = now.getDay();
        var toMonday = day === 0 ? -6 : 1 - day;
        var monday = new Date(now);
        monday.setDate(monday.getDate() + toMonday);
        monday.setHours(0, 0, 0, 0);
        var sunday = new Date(monday);
        sunday.setDate(sunday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);
        var lunesTs = firebase.firestore.Timestamp.fromDate(monday);
        var domingoTs = firebase.firestore.Timestamp.fromDate(sunday);

        var inicioSemanaAnterior = new Date(monday);
        inicioSemanaAnterior.setDate(monday.getDate() - 7);
        inicioSemanaAnterior.setHours(0, 0, 0, 0);
        var lunesAnteriorTs = firebase.firestore.Timestamp.fromDate(inicioSemanaAnterior);

        var pVentas = db.collection('ventas').where('timestamp', '>=', lunesTs).where('timestamp', '<=', domingoTs).get();
        var pGastos = db.collection('gastos').where('fecha', '>=', lunesTs).where('fecha', '<=', domingoTs).get();
        var pOrdenes = db.collection('ordenes').where('timestamp', '>=', lunesTs).where('timestamp', '<=', domingoTs).get();
        var pVentasAnterior = db.collection('ventas').where('timestamp', '>=', lunesAnteriorTs).where('timestamp', '<', lunesTs).get();

        Promise.all([pVentas, pGastos, pOrdenes, pVentasAnterior]).then(function (results) {
            var ventasSnap = results[0];
            var gastosSnap = results[1];
            var ordenesSnap = results[2];
            var ventasAnteriorSnap = results[3];

            function normalizarMetodo(str) {
                var s = (str && String(str).toLowerCase()) || 'efectivo';
                if (s === 'tarjeta' || s === 'transferencia') return s;
                return 'efectivo';
            }

            var totalIngresos = 0;
            var ventasList = [];
            ventasSnap.forEach(function (d) {
                var data = d.data();
                var tot = data.total != null ? Number(data.total) : 0;
                totalIngresos += tot;
                ventasList.push({
                    total: tot,
                    platillos: data.platillos || [],
                    meseroNombre: data.meseroNombre || '',
                    timestamp: data.timestamp,
                    metodoPago: normalizarMetodo(data.metodoPago)
                });
            });

            var totalSemanaAnterior = 0;
            ventasAnteriorSnap.forEach(function (d) {
                var tot = d.data().total != null ? Number(d.data().total) : 0;
                totalSemanaAnterior += tot;
            });

            var totalGastos = 0;
            gastosSnap.forEach(function (d) {
                totalGastos += (d.data().monto != null ? Number(d.data().monto) : 0);
            });

            var gananciaNeta = totalIngresos - totalGastos;
            var promedioDia = totalIngresos / 7;

            var ventasPorDiaSemana = [0, 0, 0, 0, 0, 0, 0];
            ventasList.forEach(function (v) {
                if (v.timestamp && v.timestamp.toDate) {
                    var d = v.timestamp.toDate();
                    var dayIdx = d.getDay();
                    ventasPorDiaSemana[dayIdx] += v.total;
                }
            });
            var nombresDia = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
            var diaPicoIdx = 0;
            for (var i = 1; i < 7; i++) {
                if (ventasPorDiaSemana[i] > ventasPorDiaSemana[diaPicoIdx]) diaPicoIdx = i;
            }
            var diaPico = nombresDia[diaPicoIdx];

            var ordenesPorHora = {};
            ordenesSnap.forEach(function (d) {
                var data = d.data();
                var ts = data.timestamp && data.timestamp.toDate ? data.timestamp.toDate() : null;
                if (ts) {
                    var h = ts.getHours();
                    ordenesPorHora[h] = (ordenesPorHora[h] || 0) + 1;
                }
            });
            var horaPico = '';
            var maxHora = 0;
            for (var h in ordenesPorHora) {
                if (ordenesPorHora[h] > maxHora) {
                    maxHora = ordenesPorHora[h];
                    horaPico = (h.length === 1 ? '0' + h : h) + ':00';
                }
            }
            if (!horaPico) horaPico = '—';

            var ventasPorHoraDolares = {};
            ventasList.forEach(function (v) {
                if (v.timestamp && v.timestamp.toDate) {
                    var h = v.timestamp.toDate().getHours();
                    ventasPorHoraDolares[h] = (ventasPorHoraDolares[h] || 0) + v.total;
                }
            });
            var horaMenor = '—';
            var minSum = Infinity;
            for (var kh in ventasPorHoraDolares) {
                var s = ventasPorHoraDolares[kh];
                if (s > 0 && s < minSum) {
                    minSum = s;
                    horaMenor = (kh.length === 1 ? '0' + kh : kh) + ':00';
                }
            }
            if (minSum === Infinity) horaMenor = '—';

            var rangoActivo = '—';
            var maxRangoSum = 0;
            var rangoStart = -1;
            for (var r = 0; r <= 22; r++) {
                var sum2 = (ventasPorHoraDolares[r] || 0) + (ventasPorHoraDolares[r + 1] || 0);
                if (sum2 > maxRangoSum) {
                    maxRangoSum = sum2;
                    rangoStart = r;
                }
            }
            if (rangoStart >= 0) {
                var h1 = (rangoStart < 10 ? '0' + rangoStart : '' + rangoStart) + ':00';
                var h2 = (rangoStart + 2 < 10 ? '0' + (rangoStart + 2) : '' + (rangoStart + 2)) + ':00';
                rangoActivo = h1 + ' — ' + h2;
            }

            var metodoCount = { efectivo: 0, tarjeta: 0, transferencia: 0 };
            ventasList.forEach(function (v) {
                var m = v.metodoPago || 'efectivo';
                if (metodoCount[m] !== undefined) metodoCount[m]++;
                else metodoCount.efectivo++;
            });
            var totalVentasCount = ventasList.length;
            var metodoPrincipal = '—';
            var metodoMax = 0;
            for (var mk in metodoCount) {
                if (metodoCount[mk] > metodoMax) {
                    metodoMax = metodoCount[mk];
                    metodoPrincipal = mk.charAt(0).toUpperCase() + mk.slice(1);
                }
            }
            if (totalVentasCount === 0) metodoPrincipal = '—';

            var platillosCount = {};
            ventasList.forEach(function (v) {
                var pl = Array.isArray(v.platillos) ? v.platillos : [];
                pl.forEach(function (p) {
                    var nom = (p && p.nombre) ? String(p.nombre) : '';
                    if (nom) {
                        var cant = (p && p.cantidad) ? parseInt(p.cantidad, 10) : 1;
                        platillosCount[nom] = (platillosCount[nom] || 0) + cant;
                    }
                });
            });
            var platilloEstrella = '—';
            var platilloVeces = 0;
            var top5 = [];
            var arr = [];
            for (var nombre in platillosCount) arr.push({ nombre: nombre, cant: platillosCount[nombre] });
            arr.sort(function (a, b) { return b.cant - a.cant; });
            if (arr.length > 0) {
                platilloEstrella = arr[0].nombre;
                platilloVeces = arr[0].cant;
                for (var t = 0; t < Math.min(5, arr.length); t++) top5.push(arr[t]);
            }

            var meserosTotal = {};
            ventasList.forEach(function (v) {
                var nom = v.meseroNombre || 'Sin asignar';
                meserosTotal[nom] = (meserosTotal[nom] || 0) + v.total;
            });
            var meseroTop = '—';
            var meseroTopTotal = 0;
            for (var m in meserosTotal) {
                if (meserosTotal[m] > meseroTopTotal) {
                    meseroTopTotal = meserosTotal[m];
                    meseroTop = m;
                }
            }
            var listaMeseros = [];
            for (var mm in meserosTotal) listaMeseros.push({ nombre: mm, total: meserosTotal[mm] });
            listaMeseros.sort(function (a, b) { return b.total - a.total; });

            var totalOrdenes = ordenesSnap.size;
            var ticketPromedio = totalOrdenes > 0 ? totalIngresos / totalOrdenes : 0;
            var mesaCount = {};
            ordenesSnap.forEach(function (d) {
                var mesa = (d.data().mesa != null) ? String(d.data().mesa) : '—';
                mesaCount[mesa] = (mesaCount[mesa] || 0) + 1;
            });
            var mesaMasActiva = '—';
            var mesaMax = 0;
            for (var mesa in mesaCount) {
                if (mesaCount[mesa] > mesaMax) {
                    mesaMax = mesaCount[mesa];
                    mesaMasActiva = mesa;
                }
            }
            var numMesas = Object.keys(mesaCount).length;
            var promMesa = numMesas > 0 ? (totalOrdenes / numMesas).toFixed(1) : '—';

            function set(id, text) {
                var el = document.getElementById(id);
                if (el) el.textContent = text;
            }
            function setClass(id, className) {
                var el = document.getElementById(id);
                if (el) el.className = className;
            }

            set('rsTotalIngresos', '$' + totalIngresos.toFixed(2));
            set('rsTotalGastos', '$' + totalGastos.toFixed(2));
            set('rsGananciaNeta', '$' + gananciaNeta.toFixed(2));
            set('rsPromedioDia', '$' + promedioDia.toFixed(2));
            set('rsTicketPromedio', '$' + ticketPromedio.toFixed(2));
            set('rsHoraPico', horaPico || '—');
            set('rsHoraMenor', horaMenor);
            set('rsRangoActivo', rangoActivo);
            set('rsPlatilloNombre', platilloEstrella);
            set('rsPlatilloCantidad', String(platilloVeces));
            set('rsMeseroTop', meseroTop);
            set('rsTotalOrdenes', String(totalOrdenes));
            set('rsMesaActiva', mesaMasActiva);
            set('rsPromMesa', String(promMesa));

            set('rsComparativaActual', '$' + totalIngresos.toFixed(2));
            set('rsComparativaAnterior', '$' + totalSemanaAnterior.toFixed(2));
            var diff = totalIngresos - totalSemanaAnterior;
            var diffStr = (diff >= 0 ? '+' : '') + ' $' + Math.abs(diff).toFixed(2);
            set('rsComparativaDif', diffStr);
            setClass('rsComparativaDif', 'reporte-metrica-principal ' + (diff >= 0 ? 'reporte-positivo' : 'reporte-negativo'));
            var pctVal = totalSemanaAnterior !== 0 ? ((totalIngresos - totalSemanaAnterior) / totalSemanaAnterior * 100) : null;
            var pctStr = pctVal != null ? (pctVal >= 0 ? '▲ ' : '▼ ') + Math.abs(pctVal).toFixed(1) + '%' : 'N/A';
            set('rsComparativaPct', pctStr);
            var pctClass = 'reporte-fila-valor';
            if (pctVal != null) pctClass += pctVal >= 0 ? ' reporte-positivo' : ' reporte-negativo';
            setClass('rsComparativaPct', pctClass);

            set('rsMetodoPrincipal', metodoPrincipal);
            var pctE = totalVentasCount > 0 ? (metodoCount.efectivo / totalVentasCount * 100).toFixed(1) : '0';
            var pctT = totalVentasCount > 0 ? (metodoCount.tarjeta / totalVentasCount * 100).toFixed(1) : '0';
            var pctTr = totalVentasCount > 0 ? (metodoCount.transferencia / totalVentasCount * 100).toFixed(1) : '0';
            set('rsMetodoEfectivo', metodoCount.efectivo + ' órdenes (' + pctE + '%)');
            set('rsMetodoTarjeta', metodoCount.tarjeta + ' órdenes (' + pctT + '%)');
            set('rsMetodoTransferencia', metodoCount.transferencia + ' órdenes (' + pctTr + '%)');

            set('kpiIngresosSemana', '$' + totalIngresos.toFixed(2));
            set('kpiGananciaSemana', '$' + gananciaNeta.toFixed(2));
            set('kpiOrdenesSemana', String(totalOrdenes));

            var rsTop3 = document.getElementById('rsTop3Platillos');
            if (rsTop3) {
                rsTop3.innerHTML = '';
                var top3 = arr.slice(0, 3);
                top3.forEach(function (p) {
                    var row = document.createElement('div');
                    row.className = 'reporte-fila';
                    row.innerHTML = '<span class="reporte-fila-label">' + escapeHtml(p.nombre || '—') + '</span><span class="reporte-fila-valor">' + p.cant + ' vendidos</span>';
                    rsTop3.appendChild(row);
                });
            }

            var rsRanking = document.getElementById('rsRankingMeseros');
            if (rsRanking) {
                rsRanking.innerHTML = '';
                listaMeseros.forEach(function (m) {
                    var row = document.createElement('div');
                    row.className = 'reporte-fila';
                    row.innerHTML = '<span class="reporte-fila-label">' + escapeHtml(m.nombre || '—') + '</span><span class="reporte-fila-valor">$' + m.total.toFixed(2) + '</span>';
                    rsRanking.appendChild(row);
                });
            }

            var rsVentasPorDia = document.getElementById('rsVentasPorDia');
            if (rsVentasPorDia) {
                rsVentasPorDia.innerHTML = '';
                var ordenDias = [1, 2, 3, 4, 5, 6, 0];
                ordenDias.forEach(function (idx) {
                    var row = document.createElement('div');
                    row.className = 'reporte-fila';
                    var val = (ventasPorDiaSemana[idx] || 0).toFixed(2);
                    var esPico = idx === diaPicoIdx;
                    var valorHtml = '$' + val + (esPico ? ' ★' : '');
                    row.innerHTML = '<span class="reporte-fila-label">' + nombresDia[idx] + '</span><span class="reporte-fila-valor"' + (esPico ? ' style="color:var(--color-primary);font-weight:700;"' : '') + '>' + valorHtml + '</span>';
                    rsVentasPorDia.appendChild(row);
                });
            }

            var contenido = document.getElementById('reporteSemanalContenido');
            if (contenido) contenido.style.display = 'block';
        }).catch(function (err) {
            console.error('Error generando reporte semanal:', err);
            alert('No se pudo generar el reporte.');
        });
    }

    var btnGenerarReporteSemanal = document.getElementById('btnGenerarReporteSemanal');
    if (btnGenerarReporteSemanal) btnGenerarReporteSemanal.addEventListener('click', generarReporteSemanal);

    var btnImprimirReporteSemanal = document.getElementById('btnImprimirReporteSemanal');
    if (btnImprimirReporteSemanal) {
        btnImprimirReporteSemanal.addEventListener('click', function () {
            document.body.classList.add('print-reporte-semanal');
            window.addEventListener('afterprint', function limpiar() {
                document.body.classList.remove('print-reporte-semanal');
                window.removeEventListener('afterprint', limpiar);
            });
            window.print();
        });
    }

    // --- Mantenimiento: buscar registros por período (solo cuenta, no elimina) ---
    function buscarRegistrosPeriodo(coleccion, campoFecha, desdeId, hastaId, countId) {
        var desde = document.getElementById(desdeId) && document.getElementById(desdeId).value;
        var hasta = document.getElementById(hastaId) && document.getElementById(hastaId).value;
        if (!desde || !hasta) {
            alert('Selecciona las fechas Desde y Hasta.');
            return;
        }
        var tsDesde = firebase.firestore.Timestamp.fromDate(new Date(desde + 'T00:00:00'));
        var tsHasta = firebase.firestore.Timestamp.fromDate(new Date(hasta + 'T23:59:59.999'));
        var countEl = document.getElementById(countId);
        db.collection(coleccion).where(campoFecha, '>=', tsDesde).where(campoFecha, '<=', tsHasta).get()
            .then(function (snap) {
                var n = snap.size;
                if (countEl) countEl.textContent = n + ' registros encontrados en este período';
            })
            .catch(function (err) {
                console.error('Error al buscar:', err);
                if (countEl) countEl.textContent = '0 registros encontrados en este período';
            });
    }

    // --- Mantenimiento: eliminar registros por período (triple confirmación) ---
    function eliminarRegistrosPeriodo(coleccion, campoFecha, desdeId, hastaId, countId, nombreColeccion) {
        var desde = document.getElementById(desdeId) && document.getElementById(desdeId).value;
        var hasta = document.getElementById(hastaId) && document.getElementById(hastaId).value;
        if (!desde || !hasta) {
            alert('Selecciona las fechas Desde y Hasta.');
            return;
        }
        var tsDesde = firebase.firestore.Timestamp.fromDate(new Date(desde + 'T00:00:00'));
        var tsHasta = firebase.firestore.Timestamp.fromDate(new Date(hasta + 'T23:59:59.999'));

        db.collection(coleccion).where(campoFecha, '>=', tsDesde).where(campoFecha, '<=', tsHasta).get()
            .then(function (snap) {
                var total = snap.size;
                if (total === 0) {
                    alert('No hay registros en ese período.');
                    return;
                }
                var desdeStr = new Date(desde + 'T00:00:00').toLocaleDateString('es');
                var hastaStr = new Date(hasta + 'T00:00:00').toLocaleDateString('es');
                // PASO 1
                var msg1 = 'Se encontraron ' + total + ' registros en ' + nombreColeccion + ' del ' + desdeStr + ' al ' + hastaStr + '.\n¿Deseas continuar con la eliminación?';
                if (!confirm(msg1)) return;
                // PASO 2
                var msg2 = 'ADVERTENCIA FINAL: Esta acción eliminará permanentemente ' + total + ' registros de ' + nombreColeccion + '. Esta operación NO se puede deshacer.\n¿Estás completamente seguro?';
                if (!confirm(msg2)) return;
                // PASO 3
                var msg3 = 'Para confirmar la eliminación escribe exactamente la palabra: CONFIRMAR';
                var escrito = prompt(msg3);
                if (escrito !== 'CONFIRMAR') {
                    alert('Texto incorrecto. Operación cancelada.');
                    return;
                }
                var docs = [];
                snap.forEach(function (d) { docs.push(d); });
                var BATCH_SIZE = 500;
                var batch = db.batch();
                var committed = 0;
                function runBatches(idx) {
                    if (idx >= docs.length) {
                        if (committed > 0) {
                            var countEl = document.getElementById(countId);
                            if (countEl) countEl.textContent = '0 registros encontrados en este período';
                            alert(total + ' registros eliminados correctamente');
                        }
                        return;
                    }
                    var b = db.batch();
                    var end = Math.min(idx + BATCH_SIZE, docs.length);
                    for (var i = idx; i < end; i++) b.delete(docs[i].ref);
                    b.commit().then(function () {
                        committed += (end - idx);
                        runBatches(end);
                    }).catch(function (err) {
                        console.error('Error eliminando:', err);
                        alert('Error al eliminar algunos registros.');
                    });
                }
                runBatches(0);
            })
            .catch(function (err) {
                console.error('Error al contar:', err);
                alert('No se pudo verificar el período.');
            });
    }

    // --- Botones Mantenimiento ---
    var btnBuscarOrdenes = document.getElementById('btnBuscarOrdenes');
    if (btnBuscarOrdenes) btnBuscarOrdenes.addEventListener('click', function () {
        buscarRegistrosPeriodo('ordenes', 'timestamp', 'mantOrdenesDesde', 'mantOrdenesHasta', 'mantOrdenesCount');
    });
    var btnBuscarCotiz = document.getElementById('btnBuscarCotiz');
    if (btnBuscarCotiz) btnBuscarCotiz.addEventListener('click', function () {
        buscarRegistrosPeriodo('cotizaciones', 'timestamp', 'mantCotizDesde', 'mantCotizHasta', 'mantCotizCount');
    });
    var btnBuscarGastos = document.getElementById('btnBuscarGastos');
    if (btnBuscarGastos) btnBuscarGastos.addEventListener('click', function () {
        buscarRegistrosPeriodo('gastos', 'fecha', 'mantGastosDesde', 'mantGastosHasta', 'mantGastosCount');
    });
    var btnEliminarOrdenes = document.getElementById('btnEliminarOrdenes');
    if (btnEliminarOrdenes) btnEliminarOrdenes.addEventListener('click', function () {
        eliminarRegistrosPeriodo('ordenes', 'timestamp', 'mantOrdenesDesde', 'mantOrdenesHasta', 'mantOrdenesCount', 'Órdenes');
    });
    var btnEliminarCotiz = document.getElementById('btnEliminarCotiz');
    if (btnEliminarCotiz) btnEliminarCotiz.addEventListener('click', function () {
        eliminarRegistrosPeriodo('cotizaciones', 'timestamp', 'mantCotizDesde', 'mantCotizHasta', 'mantCotizCount', 'Cotizaciones');
    });
    var btnEliminarGastos = document.getElementById('btnEliminarGastos');
    if (btnEliminarGastos) btnEliminarGastos.addEventListener('click', function () {
        eliminarRegistrosPeriodo('gastos', 'fecha', 'mantGastosDesde', 'mantGastosHasta', 'mantGastosCount', 'Gastos');
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

    function cargarResumenPeriodos() {
        var now = new Date();
        var dayOfWeek = now.getDay();
        var toMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        var mondayStart = new Date(now);
        mondayStart.setDate(mondayStart.getDate() + toMonday);
        mondayStart.setHours(0, 0, 0, 0);
        var semanaInicio = firebase.firestore.Timestamp.fromDate(mondayStart);
        var hoyFin = firebase.firestore.Timestamp.fromDate(finDelDia(now));
        var mesStart = new Date(now.getFullYear(), now.getMonth(), 1);
        var mesInicio = firebase.firestore.Timestamp.fromDate(mesStart);

        var pVentasSemana = db.collection('ventas').where('timestamp', '>=', semanaInicio).where('timestamp', '<=', hoyFin).get();
        var pVentasMes = db.collection('ventas').where('timestamp', '>=', mesInicio).where('timestamp', '<=', hoyFin).get();
        var pGastosSemana = db.collection('gastos').where('fecha', '>=', semanaInicio).where('fecha', '<=', hoyFin).get();
        var pGastosMes = db.collection('gastos').where('fecha', '>=', mesInicio).where('fecha', '<=', hoyFin).get();
        var pVentasTotal = db.collection('ventas').get();
        var pGastosTotal = db.collection('gastos').get();

        Promise.all([pVentasSemana, pVentasMes, pGastosSemana, pGastosMes, pVentasTotal, pGastosTotal]).then(function (results) {
            var totalVentasSemana = 0;
            results[0].forEach(function (d) { totalVentasSemana += (d.data().total || 0); });
            var totalVentasMes = 0;
            results[1].forEach(function (d) { totalVentasMes += (d.data().total || 0); });
            var totalGastosSemana = 0;
            results[2].forEach(function (d) { totalGastosSemana += (d.data().monto || 0); });
            var totalGastosMes = 0;
            results[3].forEach(function (d) { totalGastosMes += (d.data().monto || 0); });
            var totalVentasHist = 0;
            results[4].forEach(function (d) { totalVentasHist += (d.data().total || 0); });
            var totalGastosHist = 0;
            results[5].forEach(function (d) { totalGastosHist += (d.data().monto || 0); });

            var saldoSemana = totalVentasSemana - totalGastosSemana;
            var saldoMes = totalVentasMes - totalGastosMes;
            var saldoTotal = totalVentasHist - totalGastosHist;

            function setEl(id, val) {
                var el = document.getElementById(id);
                if (el) el.textContent = '$' + Number(val).toFixed(2);
            }
            setEl('resumenSemanaIngresos', totalVentasSemana);
            setEl('resumenSemanaGastos', totalGastosSemana);
            setEl('resumenSemanaSaldo', saldoSemana);
            setEl('resumenMesIngresos', totalVentasMes);
            setEl('resumenMesGastos', totalGastosMes);
            setEl('resumenMesSaldo', saldoMes);
            setEl('resumenTotalIngresos', totalVentasHist);
            setEl('resumenTotalGastos', totalGastosHist);
            setEl('resumenTotalSaldo', saldoTotal);
        }).catch(function (err) {
            console.error('Error cargando resumen períodos:', err);
        });
    }

    var graficaSemanaChart = null;

    function cargarGraficaSemana() {
        var now = new Date();
        var hace7 = new Date(now);
        hace7.setDate(hace7.getDate() - 6);
        var inicio7 = firebase.firestore.Timestamp.fromDate(inicioDelDia(hace7));
        var finHoy = firebase.firestore.Timestamp.fromDate(finDelDia(now));

        var pVentas = db.collection('ventas').where('timestamp', '>=', inicio7).where('timestamp', '<=', finHoy).get();
        var pGastos = db.collection('gastos').where('fecha', '>=', inicio7).where('fecha', '<=', finHoy).get();

        Promise.all([pVentas, pGastos]).then(function (results) {
            var labels = [];
            var ingresosPorDia = [0, 0, 0, 0, 0, 0, 0];
            var gastosPorDia = [0, 0, 0, 0, 0, 0, 0];
            for (var i = 0; i < 7; i++) {
                var d = new Date(hace7);
                d.setDate(d.getDate() + i);
                labels.push(d.getDate() + '/' + (d.getMonth() + 1));
            }
            var base = inicioDelDia(hace7).getTime();
            var oneDay = 24 * 60 * 60 * 1000;
            results[0].forEach(function (doc) {
                var data = doc.data();
                var ts = data.timestamp && data.timestamp.toDate ? data.timestamp.toDate() : null;
                if (ts) {
                    var idx = Math.floor((ts.getTime() - base) / oneDay);
                    if (idx >= 0 && idx < 7) ingresosPorDia[idx] += (data.total || 0);
                }
            });
            results[1].forEach(function (doc) {
                var data = doc.data();
                var ts = data.fecha && data.fecha.toDate ? data.fecha.toDate() : null;
                if (ts) {
                    var idx = Math.floor((ts.getTime() - base) / oneDay);
                    if (idx >= 0 && idx < 7) gastosPorDia[idx] += (data.monto || 0);
                }
            });

            var canvas = document.getElementById('graficaSemana');
            if (!canvas || typeof Chart === 'undefined') return;
            if (graficaSemanaChart) {
                graficaSemanaChart.destroy();
                graficaSemanaChart = null;
            }
            var ctx = canvas.getContext('2d');
            graficaSemanaChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Ingresos',
                            data: ingresosPorDia,
                            borderColor: '#1565C0',
                            backgroundColor: 'rgba(21,101,192,0.08)',
                            fill: true,
                            tension: 0.2,
                            pointBackgroundColor: '#1565C0',
                            pointBorderColor: '#FFFFFF',
                            pointBorderWidth: 2
                        },
                        {
                            label: 'Gastos',
                            data: gastosPorDia,
                            borderColor: '#C62828',
                            backgroundColor: 'rgba(198,40,40,0.06)',
                            fill: true,
                            tension: 0.2,
                            pointBackgroundColor: '#C62828',
                            pointBorderColor: '#FFFFFF',
                            pointBorderWidth: 2
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: { color: '#1A2744' }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: 'rgba(0,0,0,0.06)' },
                            ticks: { color: '#546E7A' },
                            border: { color: '#D6E0F0' }
                        },
                        y: {
                            grid: { color: 'rgba(0,0,0,0.06)' },
                            ticks: { color: '#546E7A' },
                            border: { color: '#D6E0F0' }
                        }
                    }
                }
            });
        }).catch(function (err) {
            console.error('Error cargando gráfica semana:', err);
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

    function cambiarEstadoOrden(id, nuevoEstado, metodoPago) {
        var esPagada = (nuevoEstado || '').toLowerCase() === 'pagada';
        if (esPagada && !metodoPago) {
            ordenPendientePago = id;
            if (modalMetodoPago) modalMetodoPago.style.display = 'flex';
            return;
        }
        db.collection('ordenes').doc(id).get().then(function (doc) {
            if (!doc.exists) return;
            var data = doc.data();
            var updatePayload = { estado: nuevoEstado };
            if (esPagada && metodoPago) updatePayload.metodoPago = metodoPago;
            db.collection('ordenes').doc(id).update(updatePayload).then(function () {
                if (esPagada) {
                    var venta = {
                        mesa: data.mesa || '',
                        platillos: data.platillos || [],
                        total: data.total || 0,
                        meseroNombre: data.meseroNombre || '',
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    if (metodoPago) venta.metodoPago = metodoPago;
                    db.collection('ventas').add(venta);
                }
            }).catch(function (err) {
                console.error('Error actualizando orden:', err);
            });
        });
    }

    // Modal método de pago: botones y cancelar
    if (modalMetodoPago) {
        modalMetodoPago.querySelectorAll('.btn-metodo-pago').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var metodo = this.getAttribute('data-metodo') || '';
                modalMetodoPago.style.display = 'none';
                if (ordenPendientePago) {
                    var id = ordenPendientePago;
                    ordenPendientePago = null;
                    cambiarEstadoOrden(id, 'pagada', metodo);
                }
            });
        });
    }
    if (btnCancelarMetodoPago) {
        btnCancelarMetodoPago.addEventListener('click', function () {
            if (modalMetodoPago) modalMetodoPago.style.display = 'none';
            ordenPendientePago = null;
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
                var platillosHtml = '';
                if (Array.isArray(data.platillos) && data.platillos.length > 0) {
                    var items = data.platillos.map(function (p) {
                        var n = (p && p.nombre) ? p.nombre : (typeof p === 'string' ? p : '');
                        var q = (p && p.cantidad) ? ' x' + p.cantidad : '';
                        return '<li>' + escapeHtml(n + q) + '</li>';
                    });
                    platillosHtml = '<ul style="margin:0;padding-left:1.1em;list-style:disc;">' + items.join('') + '</ul>';
                } else {
                    platillosHtml = '<span>-</span>';
                }
                var total;
                if (data.total != null) {
                    total = '$' + Number(data.total).toFixed(2);
                } else {
                    total = '-';
                }
                var estado = data.estado || 'pendiente';
                var clase = estadoToClass(estado);
                var esPagadaOCancelada = estado.toLowerCase() === 'pagada' || estado.toLowerCase() === 'cancelada';
                var flujoHtml = '';
                if (!esPagadaOCancelada) {
                    if (estado.toLowerCase() !== 'preparando') {
                        flujoHtml += '<button type="button" class="btn-sm btn-estado-preparando" data-id="' + id + '" data-estado="preparando">Preparando</button>';
                    }
                    if (estado.toLowerCase() !== 'servido' && estado.toLowerCase() !== 'servida') {
                        flujoHtml += '<button type="button" class="btn-sm btn-estado-servido" data-id="' + id + '" data-estado="servido">Servido</button>';
                    }
                    flujoHtml += '<button type="button" class="btn-sm btn-estado-pagada" data-id="' + id + '" data-estado="pagada">Pagada</button>';
                }
                var auxHtml = '<button type="button" class="btn-sm btn-whatsapp" data-id="' + id + '" title="Enviar por WhatsApp">WhatsApp</button>';
                auxHtml += '<button type="button" class="btn-sm btn-print" data-id="' + id + '" title="Imprimir ticket">Imprimir</button>';
                auxHtml += '<button type="button" class="btn-sm btn-danger eliminar-orden" data-id="' + id + '" title="Eliminar orden">Eliminar</button>';
                var opciones = '<div class="orden-acciones"><div class="orden-acciones-flujo">' + flujoHtml + '</div><div class="orden-acciones-aux">' + auxHtml + '</div></div>';
                rows.push(
                    '<tr><td data-label="Mesa">' + escapeHtml(mesa) + '</td><td data-label="Mesero">' + escapeHtml(mesero) + '</td><td data-label="Platillos">' + platillosHtml + '</td><td data-label="Total">' + total + '</td><td data-label="Estado"><span class="estado-badge ' + clase + '">' + escapeHtml(estado) + '</span></td><td data-label="Acciones">' + opciones + '</td></tr>'
                );
            });
        }
        ordenesBody.innerHTML = rows.join('');
        ordenesBody.querySelectorAll('[data-id][data-estado]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                cambiarEstadoOrden(btn.getAttribute('data-id'), btn.getAttribute('data-estado'));
            });
        });
        ordenesBody.querySelectorAll('.btn-whatsapp[data-id]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (typeof window.enviarWhatsApp === 'function') {
                    window.enviarWhatsApp(btn.getAttribute('data-id'));
                }
            });
        });
        ordenesBody.querySelectorAll('.btn-print[data-id]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (typeof window.prepararTicket === 'function') {
                    window.prepararTicket(btn.getAttribute('data-id'));
                } else {
                    alert('El módulo de impresión no está disponible.\nRecarga la página e intenta de nuevo.');
                }
            });
        });
        ordenesBody.querySelectorAll('.eliminar-orden[data-id]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var id = btn.getAttribute('data-id');
                if (!confirm('¿Eliminar esta orden permanentemente? Esta acción no se puede deshacer.')) return;
                db.collection('ordenes').doc(id).delete().catch(function (err) {
                    console.error('Error al eliminar orden:', err);
                    alert('No se pudo eliminar la orden.');
                });
            });
        });
    }

    function escapeHtml(s) {
        if (s == null) return '';
        var div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }

    var filtroOrdenActual = 'activas';
    var btnFiltroActivas = document.getElementById('filtroActivas');
    var btnFiltroPagadas = document.getElementById('filtroPagadas');
    var todasLasOrdenes = [];
    var notifBadge = document.getElementById('notifBadge');
    var notifIcon = document.getElementById('notifIcon');
    var notifCount = document.getElementById('notifCount');
    var adminToast = document.getElementById('adminToast');
    var adminToastMsg = document.getElementById('adminToastMsg');
    var adminToastHideTimeout = null;

    db.collection('ordenes').onSnapshot(function (snap) {
        todasLasOrdenes = snap;
        var idsActuales = new Set();
        snap.forEach(function (doc) { idsActuales.add(doc.id); });
        if (ordenesConocidas === null) {
            ordenesConocidas = new Set(idsActuales);
        } else {
            idsActuales.forEach(function (id) {
                if (!ordenesConocidas.has(id)) {
                    var doc = snap.docs.find(function (d) { return d.id === id; });
                    if (doc) {
                        var data = doc.data();
                        contadorNuevas++;
                        if (adminToast && adminToastMsg) {
                            adminToastMsg.textContent = 'Mesa ' + (data.mesa || '—') + ' — ' + (data.meseroNombre || '—');
                            adminToast.style.opacity = '1';
                            if (adminToastHideTimeout) clearTimeout(adminToastHideTimeout);
                            adminToastHideTimeout = setTimeout(function () {
                                if (adminToast) adminToast.style.opacity = '0';
                                adminToastHideTimeout = null;
                            }, 4000);
                        }
                        try {
                            var ctx = new (window.AudioContext || window.webkitAudioContext)();
                            var o = ctx.createOscillator();
                            var g = ctx.createGain();
                            o.connect(g);
                            g.connect(ctx.destination);
                            o.frequency.value = 800;
                            g.gain.setValueAtTime(0.15, ctx.currentTime);
                            g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
                            o.start(ctx.currentTime);
                            o.stop(ctx.currentTime + 0.15);
                        } catch (e) {}
                    }
                }
            });
            if (contadorNuevas > 0 && notifBadge && notifCount) {
                notifBadge.style.display = '';
                notifCount.textContent = String(contadorNuevas);
            }
        }
        ordenesConocidas = new Set(idsActuales);
        aplicarFiltroOrdenes();
    }, function (err) {
        if (ordenesBody) ordenesBody.innerHTML = '<tr><td colspan="6" class="msg-empty">Error al cargar órdenes.</td></tr>';
        console.error(err);
    });

    function aplicarFiltroOrdenes() {
        if (!todasLasOrdenes) return;
        var docsfiltrados = [];
        todasLasOrdenes.forEach(function (doc) {
            var estado = (doc.data().estado || '').toLowerCase();
            var esPagada = estado === 'pagada';
            if (filtroOrdenActual === 'activas' && !esPagada) {
                docsfiltrados.push(doc);
            } else if (filtroOrdenActual === 'pagadas' && esPagada) {
                docsfiltrados.push(doc);
            }
        });
        var filtradas = {
            empty: docsfiltrados.length === 0,
            forEach: function (cb) {
                docsfiltrados.forEach(cb);
            }
        };
        renderOrdenes(filtradas);
    }

    if (btnFiltroActivas) {
        btnFiltroActivas.addEventListener('click', function () {
            filtroOrdenActual = 'activas';
            btnFiltroActivas.style.opacity = '1';
            btnFiltroPagadas.style.opacity = '0.6';
            btnFiltroActivas.className = 'btn';
            btnFiltroPagadas.className = 'btn btn-secondary';
            aplicarFiltroOrdenes();
        });
    }
    if (btnFiltroPagadas) {
        btnFiltroPagadas.addEventListener('click', function () {
            filtroOrdenActual = 'pagadas';
            btnFiltroPagadas.style.opacity = '1';
            btnFiltroActivas.style.opacity = '0.6';
            btnFiltroPagadas.className = 'btn';
            btnFiltroActivas.className = 'btn btn-secondary';
            aplicarFiltroOrdenes();
        });
    }
    if (notifIcon) {
        notifIcon.addEventListener('click', function () {
            contadorNuevas = 0;
            if (notifBadge) notifBadge.style.display = 'none';
            if (notifCount) notifCount.textContent = '0';
            mostrarSeccion('ordenes');
        });
    }

    // --- Menú ---
    function agregarPlatillo(nombre, precio, categoria) {
        if (!nombre || !nombre.trim()) return;
        var p = parseFloat(precio);
        if (isNaN(p) || p < 0) return;
        var cat = (categoria || 'Otros').trim();
        db.collection('menu').add({ nombre: nombre.trim(), precio: p, categoria: cat });
    }

    function editarPlatillo(id, nombre, precio, categoria) {
        var p = parseFloat(precio);
        if (isNaN(p) || p < 0) return;
        var cat = (categoria || 'Otros').trim();
        db.collection('menu').doc(id).update({ nombre: (nombre || '').trim(), precio: p, categoria: cat });
    }

    function eliminarPlatillo(id) {
        if (!confirm('¿Eliminar este platillo?')) return;
        db.collection('menu').doc(id).delete();
    }

    var CATEGORIAS_ORDEN = ['Entradas', 'Platos fuertes', 'Bebidas', 'Postres', 'Otros'];
    function slugCategoria(cat) {
        var s = (cat || 'Otros').toLowerCase().replace(/\s+/g, '-');
        return (s === 'platos-fuertes' || s === 'entradas' || s === 'bebidas' || s === 'postres' || s === 'otros') ? s : 'otros';
    }

    function renderMenu(snap) {
        if (!menuBody) return;
        var rows = [];
        if (snap.empty) {
            rows.push('<tr><td colspan="4" class="msg-empty">No hay platillos. Agregue uno.</td></tr>');
        } else {
            var porCategoria = {};
            snap.forEach(function (d) {
                var data = d.data();
                var cat = data.categoria || 'Otros';
                if (!porCategoria[cat]) porCategoria[cat] = [];
                porCategoria[cat].push({ id: d.id, data: data });
            });
            CATEGORIAS_ORDEN.forEach(function (categoria) {
                var items = porCategoria[categoria];
                if (!items || items.length === 0) return;
                var slug = slugCategoria(categoria);
                rows.push('<tr class="menu-cat-header menu-cat-' + slug + '"><td colspan="4">' + escapeHtml(categoria.toUpperCase()) + '</td></tr>');
                items.forEach(function (item) {
                    var data = item.data;
                    var id = item.id;
                    var nombre = data.nombre || '';
                    var precio = (data.precio != null) ? '$' + Number(data.precio).toFixed(2) : '';
                    var cat = data.categoria || 'Otros';
                    var rowSlug = slugCategoria(cat);
                    rows.push(
                        '<tr class="menu-row menu-row-cat-' + rowSlug + '"><td data-label="Nombre">' + escapeHtml(nombre) + '</td><td data-label="Precio">' + precio + '</td><td data-label="Categoría">' + escapeHtml(cat) + '</td><td data-label="Acciones">' +
                        '<button type="button" class="btn-sm btn-secondary editar-platillo" data-id="' + id + '" data-nombre="' + escapeHtml(nombre) + '" data-precio="' + (data.precio != null ? data.precio : '') + '" data-categoria="' + escapeHtml(cat) + '">Editar</button> ' +
                        '<button type="button" class="btn-sm btn-danger eliminar-platillo" data-id="' + id + '">Eliminar</button></td></tr>'
                    );
                });
            });
        }
        menuBody.innerHTML = rows.join('');
        menuBody.querySelectorAll('.editar-platillo').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var id = btn.getAttribute('data-id');
                var nombre = btn.getAttribute('data-nombre') || '';
                var precio = btn.getAttribute('data-precio') || '';
                var categoria = btn.getAttribute('data-categoria') || 'Otros';
                platilloNombre.value = nombre;
                platilloPrecio.value = precio;
                if (platilloCategoria) platilloCategoria.value = categoria;
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
        menuItemsAdmin = [];
        snap.forEach(function (d) {
            var data = d.data();
            menuItemsAdmin.push({
                id: d.id,
                nombre: data.nombre != null ? String(data.nombre) : '',
                precio: data.precio != null ? Number(data.precio) : 0,
                categoria: data.categoria || 'Otros'
            });
        });
        renderMenu(snap);
    }, function (err) {
        if (menuBody) menuBody.innerHTML = '<tr><td colspan="4" class="msg-empty">Error al cargar menú.</td></tr>';
        console.error(err);
    });

    if (btnAgregarPlatillo) {
        btnAgregarPlatillo.addEventListener('click', function () {
            modalPlatillo.removeAttribute('data-edit-id');
            platilloNombre.value = '';
            platilloPrecio.value = '';
            if (platilloCategoria) platilloCategoria.value = 'Otros';
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
            var categoria = platilloCategoria ? platilloCategoria.value : 'Otros';
            if (editId) {
                editarPlatillo(editId, nombre, precio, categoria);
            } else {
                agregarPlatillo(nombre, precio, categoria);
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
            if (err && err.code === 'auth/email-already-in-use') {
                secondaryAuth.signInWithEmailAndPassword(email, password).then(function (userCredential) {
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
                    alert('Mesero actualizado correctamente.');
                }).catch(function (signInErr) {
                    if (meseroError) {
                        meseroError.textContent = 'El correo ya existe pero la contraseña no coincide. Usa la contraseña original de esa cuenta o elimínala desde Firebase Console → Authentication.';
                        meseroError.style.display = 'block';
                    }
                    try {
                        if (firebase.app('Secondary')) firebase.app('Secondary').delete();
                    } catch (e) { }
                });
            } else {
                try {
                    if (firebase.app('Secondary')) firebase.app('Secondary').delete();
                } catch (e) { }
                if (meseroError) {
                    meseroError.textContent = err.message || 'Error al crear mesero.';
                    meseroError.style.display = 'block';
                }
                console.error(err);
            }
        });
    }

    db.collection('usuarios').where('rol', '==', 'mesero').onSnapshot(function (snap) {
        if (!meserosBody) return;
        var rows = [];
        if (snap.empty) {
            rows.push('<tr><td colspan="3" class="msg-empty">No hay meseros registrados.</td></tr>');
        } else {
            snap.forEach(function (d) {
                var data = d.data();
                rows.push('<tr><td>' + escapeHtml(data.nombre || '-') + '</td><td>' + escapeHtml(data.email || '-') + '</td><td><button type="button" class="btn-sm btn-danger eliminar-mesero" data-id="' + d.id + '" data-nombre="' + escapeHtml(data.nombre || '') + '">Eliminar</button></td></tr>');
            });
        }
        meserosBody.innerHTML = rows.join('');
    });

    if (meserosBody) {
        meserosBody.addEventListener('click', function (e) {
            var btn = e.target.closest('.eliminar-mesero');
            if (!btn) return;
            var id = btn.getAttribute('data-id');
            var nombre = btn.getAttribute('data-nombre') || 'este mesero';
            if (!confirm('¿Eliminar a ' + nombre + '? Perderá acceso al sistema inmediatamente.')) return;
            db.collection('usuarios').doc(id).delete().then(function () {
                alert('Mesero eliminado de la base de datos. Para revocar el acceso de Firebase Auth completamente, elimínalo también en Firebase Console → Authentication → Users.');
            }).catch(function (err) {
                console.error('Error al eliminar mesero:', err);
                alert('No se pudo eliminar el mesero.');
            });
        });
    }

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
        var desde = reporteDesde ? reporteDesde.value : '';
        var hasta = reporteHasta ? reporteHasta.value : '';
        if (!desde || !hasta) {
            alert('Seleccione las fechas Desde y Hasta para generar el reporte.');
            return;
        }
        var tsDesde = firebase.firestore.Timestamp.fromDate(new Date(desde + 'T00:00:00'));
        var tsHasta = firebase.firestore.Timestamp.fromDate(new Date(hasta + 'T23:59:59.999'));
        var pVentas = db.collection('ventas').where('timestamp', '>=', tsDesde).where('timestamp', '<=', tsHasta).get();
        var pGastos = db.collection('gastos').where('fecha', '>=', tsDesde).where('fecha', '<=', tsHasta).get();
        Promise.all([pVentas, pGastos]).then(function (results) {
            var ventasSnap = results[0];
            var gastosSnap = results[1];
            var totalIngresos = 0;
            var ventasList = [];
            ventasSnap.forEach(function (d) {
                var data = d.data();
                var tot = data.total != null ? Number(data.total) : 0;
                totalIngresos += tot;
                var fechaObj = data.timestamp && data.timestamp.toDate ? data.timestamp.toDate() : null;
                ventasList.push({
                    fecha: fechaObj,
                    mesa: data.mesa || '—',
                    mesero: data.meseroNombre || '—',
                    total: tot
                });
            });
            var totalGastos = 0;
            var gastosList = [];
            gastosSnap.forEach(function (d) {
                var data = d.data();
                var monto = data.monto != null ? Number(data.monto) : 0;
                totalGastos += monto;
                var fechaObj = data.fecha && data.fecha.toDate ? data.fecha.toDate() : null;
                gastosList.push({
                    fecha: fechaObj,
                    descripcion: data.descripcion || '—',
                    categoria: data.categoria || '—',
                    monto: monto,
                    metodoPago: data.metodoPago || '—'
                });
            });
            var saldoFinal = totalIngresos - totalGastos;
            var saldoClase = saldoFinal >= 0 ? 'color:#228B22;' : 'color:#B22222;';
            var filasIngresos = '';
            ventasList.forEach(function (v) {
                var f = v.fecha ? v.fecha.toLocaleString('es') : '—';
                filasIngresos += '<tr><td>' + escapeHtml(f) + '</td><td>' + escapeHtml(String(v.mesa)) + '</td><td>' + escapeHtml(String(v.mesero)) + '</td><td>$' + Number(v.total).toFixed(2) + '</td></tr>';
            });
            if (ventasList.length === 0) {
                filasIngresos = '<tr><td colspan="4" style="text-align:center;">No hay ventas en este período.</td></tr>';
            }
            var filasGastos = '';
            gastosList.forEach(function (g) {
                var f = g.fecha ? g.fecha.toLocaleString('es') : '—';
                filasGastos += '<tr><td>' + escapeHtml(f) + '</td><td>' + escapeHtml(String(g.descripcion)) + '</td><td>' + escapeHtml(String(g.categoria)) + '</td><td>$' + Number(g.monto).toFixed(2) + '</td><td>' + escapeHtml(String(g.metodoPago)) + '</td></tr>';
            });
            if (gastosList.length === 0) {
                filasGastos = '<tr><td colspan="5" style="text-align:center;">No hay gastos en este período.</td></tr>';
            }
            var html = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Reporte Financiero — ' + escapeHtml(desde) + ' al ' + escapeHtml(hasta) + '</title>' +
                '<style type="text/css">' +
                'body{font-family:sans-serif;margin:1rem;color:#111;background:#fff;}' +
                'h1{font-size:1.25rem;margin-bottom:0.5rem;}' +
                '.resumen{display:flex;flex-wrap:wrap;gap:1rem;margin:1rem 0;}' +
                '.resumen-item{padding:0.75rem 1rem;border:1px solid #333;min-width:140px;}' +
                '.resumen-item strong{display:block;font-size:0.8rem;color:#555;}' +
                'table{border-collapse:collapse;width:100%;margin:1rem 0;font-size:0.9rem;}' +
                'th,td{border:1px solid #333;padding:8px;text-align:left;}' +
                'th{background:#e8e8e8;font-weight:700;}' +
                '.no-print{margin-top:1rem;}' +
                '@media print{.no-print{display:none !important;}}' +
                '</style></head><body>' +
                '<h1>Reporte Financiero — ' + escapeHtml(desde) + ' al ' + escapeHtml(hasta) + '</h1>' +
                '<div class="resumen">' +
                '<div class="resumen-item"><strong>Total Ingresos</strong><span>$' + totalIngresos.toFixed(2) + '</span></div>' +
                '<div class="resumen-item"><strong>Total Gastos</strong><span>$' + totalGastos.toFixed(2) + '</span></div>' +
                '<div class="resumen-item" style="' + saldoClase + '"><strong>Saldo Final</strong><span>$' + saldoFinal.toFixed(2) + '</span></div>' +
                '</div>' +
                '<h2 style="font-size:1.1rem;margin-top:1.5rem;">Ingresos (ventas)</h2>' +
                '<table><thead><tr><th>Fecha</th><th>Mesa</th><th>Mesero</th><th>Total</th></tr></thead><tbody>' + filasIngresos + '</tbody></table>' +
                '<h2 style="font-size:1.1rem;margin-top:1.5rem;">Gastos</h2>' +
                '<table><thead><tr><th>Fecha</th><th>Descripción</th><th>Categoría</th><th>Monto</th><th>Método de pago</th></tr></thead><tbody>' + filasGastos + '</tbody></table>' +
                '<div class="no-print"><button type="button" onclick="window.print();" style="padding:10px 20px;cursor:pointer;font-size:1rem;">Imprimir</button></div>' +
                '</body></html>';
            var ventana = window.open('', '_blank');
            if (!ventana) {
                alert('Permita ventanas emergentes para abrir el reporte.');
                return;
            }
            ventana.document.write(html);
            ventana.document.close();
            ventana.focus();
        }).catch(function (err) {
            console.error('Error generando reporte PDF:', err);
            alert('No se pudo generar el reporte. Intente de nuevo.');
        });
    }
    if (btnExportarPdf) btnExportarPdf.addEventListener('click', exportarPdf);

    // --- Iniciar listeners dashboard ---
    escucharDashboard();
    cargarResumenPeriodos();
    cargarGraficaSemana();

    // Cards del dashboard clickeables → navegación
    var cardVentas = document.getElementById('ventasDia');
    if (cardVentas) {
        cardVentas.closest('.card').addEventListener('click', function () {
            mostrarSeccion('reportes');
        });
    }
    var cardGastos = document.getElementById('gastosDia');
    if (cardGastos) {
        cardGastos.closest('.card').addEventListener('click', function () {
            mostrarSeccion('gastos');
        });
    }
    var cardOrdenes = document.getElementById('ordenesActivas');
    if (cardOrdenes) {
        cardOrdenes.closest('.card').addEventListener('click', function () {
            mostrarSeccion('ordenes');
        });
    }

    // --- Reset total (zona de peligro): elimina todo excepto ventas, con reautenticación ---
    function eliminarSnapshotEnBatches(snap) {
        var docs = [];
        snap.forEach(function (d) { docs.push(d); });
        if (docs.length === 0) return Promise.resolve();
        var BATCH_SIZE = 500;
        function run(idx) {
            if (idx >= docs.length) return Promise.resolve();
            var batch = db.batch();
            var end = Math.min(idx + BATCH_SIZE, docs.length);
            for (var i = idx; i < end; i++) batch.delete(docs[i].ref);
            return batch.commit().then(function () { return run(end); });
        }
        return run(0);
    }

    function resetTotal() {
        var btn = document.getElementById('btnResetTotal');
        var inputPassword = document.getElementById('resetPassword');

        function restaurarBoton() {
            if (btn) {
                btn.textContent = 'RESET OPERATIVO — CONSERVA VENTAS';
                btn.disabled = false;
            }
            if (inputPassword) inputPassword.value = '';
        }

        // PASO 1
        var msg1 = '⚠️ ADVERTENCIA: Estás a punto de eliminar TODOS los datos del sistema.\nEsto incluye: todas las órdenes, cotizaciones, gastos, platillos del menú y cuentas de meseros.\nLos registros de ventas se conservarán.\n¿Deseas continuar?';
        if (!confirm(msg1)) return;

        // PASO 2
        var msg2 = 'ÚLTIMA ADVERTENCIA: Esta acción es IRREVERSIBLE. No hay forma de recuperar los datos eliminados.\n¿Estás completamente seguro de que deseas proceder con el reset total?';
        if (!confirm(msg2)) return;

        // PASO 3
        var passwordIngresada = inputPassword && inputPassword.value ? inputPassword.value.trim() : '';
        if (!passwordIngresada) {
            alert('Debes ingresar tu contraseña');
            return;
        }
        var user = auth.currentUser;
        if (!user || !user.email) {
            alert('No hay sesión de administrador activa.');
            restaurarBoton();
            return;
        }
        var credential = firebase.auth.EmailAuthProvider.credential(user.email, passwordIngresada);
        user.reauthenticateWithCredential(credential).then(function () {
            // PASO 4
            if (btn) {
                btn.textContent = 'Eliminando datos...';
                btn.disabled = true;
            }
            var pOrdenes = db.collection('ordenes').get();
            var pCotiz = db.collection('cotizaciones').get();
            var pGastos = db.collection('gastos').get();
            var pMenu = db.collection('menu').get();
            var pMeseros = db.collection('usuarios').where('rol', '==', 'mesero').get();

            Promise.all([pOrdenes, pCotiz, pGastos, pMenu, pMeseros])
                .then(function (results) {
                    return eliminarSnapshotEnBatches(results[0])
                        .then(function () { return eliminarSnapshotEnBatches(results[1]); })
                        .then(function () { return eliminarSnapshotEnBatches(results[2]); })
                        .then(function () { return eliminarSnapshotEnBatches(results[3]); })
                        .then(function () { return eliminarSnapshotEnBatches(results[4]); });
                })
                .then(function () {
                    if (inputPassword) inputPassword.value = '';
                    if (btn) {
                        btn.textContent = 'RESET OPERATIVO — CONSERVA VENTAS';
                        btn.disabled = false;
                    }
                    alert('Reset completado. Todos los datos han sido eliminados. Los registros de ventas se conservaron.');
                })
                .catch(function (err) {
                    console.error('Error en reset total:', err);
                    alert(err && err.message ? err.message : 'Error al eliminar datos.');
                    restaurarBoton();
                });
        }).catch(function (err) {
            console.error('Error reautenticación:', err);
            alert('Contraseña incorrecta. Operación cancelada.');
            if (inputPassword) inputPassword.value = '';
        });
    }

    var btnResetTotal = document.getElementById('btnResetTotal');
    if (btnResetTotal) btnResetTotal.addEventListener('click', resetTotal);

    // --- Reset nuclear: borra TODO incluyendo ventas ---
    function resetNuclear() {
        var btn = document.getElementById('btnResetNuclear');
        var inputPassword = document.getElementById('resetNuclearPassword');

        function restaurarBotonNuclear() {
            if (btn) {
                btn.textContent = '☢️ BORRAR TODO — SIN EXCEPCIÓN';
                btn.disabled = false;
            }
            if (inputPassword) inputPassword.value = '';
        }

        // PASO 1
        var msg1 = '☢️ RESET NUCLEAR ACTIVADO\n\nEstás a punto de borrar ABSOLUTAMENTE TODO incluyendo el historial completo de ventas.\n\nEsto es irreversible. No quedará ningún dato.\n\n¿Deseas continuar?';
        if (!confirm(msg1)) return;

        // PASO 2
        var msg2 = 'SEGUNDA CONFIRMACIÓN REQUERIDA\n\nConfirmas que entiendes que:\n- Se borrarán TODAS las ventas\n- Se borrarán TODOS los gastos\n- Se borrará TODO el menú\n- Se borrarán TODOS los meseros\n- Se borrarán TODAS las órdenes\n- Se borrarán TODAS las cotizaciones\n\nNo quedará absolutamente nada.\n\n¿Confirmas?';
        if (!confirm(msg2)) return;

        // PASO 3
        var textoConfirmacion = prompt('CONFIRMACIÓN FINAL: Escribe exactamente BORRAR TODO para proceder');
        if (textoConfirmacion !== 'BORRAR TODO') {
            alert('Texto incorrecto. Operación cancelada.');
            return;
        }

        // VERIFICACIÓN DE CONTRASEÑA
        var passwordIngresada = inputPassword && inputPassword.value ? inputPassword.value.trim() : '';
        if (!passwordIngresada) {
            alert('Debes ingresar tu contraseña de administrador.');
            return;
        }
        var user = auth.currentUser;
        if (!user || !user.email) {
            alert('No hay sesión de administrador activa.');
            restaurarBotonNuclear();
            return;
        }
        var credential = firebase.auth.EmailAuthProvider.credential(user.email, passwordIngresada);
        user.reauthenticateWithCredential(credential).then(function () {
            // PASO 4 — ELIMINACIÓN TOTAL
            if (btn) {
                btn.textContent = 'Eliminando todo...';
                btn.disabled = true;
            }
            var pOrdenes = db.collection('ordenes').get();
            var pCotiz = db.collection('cotizaciones').get();
            var pGastos = db.collection('gastos').get();
            var pMenu = db.collection('menu').get();
            var pVentas = db.collection('ventas').get();
            var pMeseros = db.collection('usuarios').where('rol', '==', 'mesero').get();

            Promise.all([pOrdenes, pCotiz, pGastos, pMenu, pVentas, pMeseros])
                .then(function (results) {
                    return eliminarSnapshotEnBatches(results[0])
                        .then(function () { return eliminarSnapshotEnBatches(results[1]); })
                        .then(function () { return eliminarSnapshotEnBatches(results[2]); })
                        .then(function () { return eliminarSnapshotEnBatches(results[3]); })
                        .then(function () { return eliminarSnapshotEnBatches(results[4]); })
                        .then(function () { return eliminarSnapshotEnBatches(results[5]); });
                })
                .then(function () {
                    if (inputPassword) inputPassword.value = '';
                    if (btn) {
                        btn.textContent = '☢️ BORRAR TODO — SIN EXCEPCIÓN';
                        btn.disabled = false;
                    }
                    alert('Reset nuclear completado. El sistema ha sido reiniciado completamente. Todos los datos han sido eliminados.');
                })
                .catch(function (err) {
                    console.error('Error en reset nuclear:', err);
                    alert(err && err.message ? err.message : 'Error al eliminar datos.');
                    restaurarBotonNuclear();
                    if (inputPassword) inputPassword.value = '';
                });
        }).catch(function (err) {
            console.error('Error reautenticación:', err);
            alert('Contraseña incorrecta');
            if (inputPassword) inputPassword.value = '';
        });
    }

    var btnResetNuclear = document.getElementById('btnResetNuclear');
    if (btnResetNuclear) btnResetNuclear.addEventListener('click', resetNuclear);

    // --- Configuración: mesas disponibles ---
    var mesasPendientes = null;

    function cargarConfigMesas() {
        var el = document.getElementById('mesasConfigActual');
        if (!el) return;
        db.collection('configuracion').doc('mesas').get().then(function (doc) {
            if (doc.exists && doc.data().numeros && Array.isArray(doc.data().numeros) && doc.data().numeros.length > 0) {
                var arr = doc.data().numeros;
                var min = Math.min.apply(null, arr);
                var max = Math.max.apply(null, arr);
                if (min === max) {
                    el.textContent = 'Configuración actual: ' + arr.length + ' mesa(s) (solo mesa ' + min + ')';
                } else {
                    el.textContent = 'Configuración actual: ' + arr.length + ' mesas (del ' + min + ' al ' + max + ')';
                }
            } else {
                el.textContent = 'Configuración actual: 50 mesas (1 al 50) — configuración por defecto';
            }
        }).catch(function (err) {
            console.error('Error cargando config mesas:', err);
            if (el) el.textContent = 'Configuración actual: 50 mesas (1 al 50) — configuración por defecto';
        });
    }

    function generarPreviewMesas(arrayNumeros) {
        var preview = document.getElementById('mesasPreview');
        var btnGuardar = document.getElementById('btnGuardarMesas');
        if (!preview) return;
        preview.innerHTML = '';
        arrayNumeros.forEach(function (num) {
            var span = document.createElement('span');
            span.className = 'mesa-badge-preview';
            span.textContent = 'Mesa ' + num;
            preview.appendChild(span);
        });
        mesasPendientes = arrayNumeros.slice().sort(function (a, b) { return a - b; });
        if (btnGuardar) btnGuardar.disabled = false;
    }

    var btnAplicarIntervalo = document.getElementById('btnAplicarIntervalo');
    if (btnAplicarIntervalo) {
        btnAplicarIntervalo.addEventListener('click', function () {
            var desdeEl = document.getElementById('mesasDesde');
            var hastaEl = document.getElementById('mesasHasta');
            var desde = desdeEl && parseInt(desdeEl.value, 10);
            var hasta = hastaEl && parseInt(hastaEl.value, 10);
            if (!desde || !hasta || isNaN(desde) || isNaN(hasta) || desde < 1 || hasta < 1) {
                alert('Ingresa números válidos para Desde y Hasta (mínimo 1).');
                return;
            }
            if (desde > hasta) {
                alert('Desde debe ser menor o igual que Hasta.');
                return;
            }
            if (hasta - desde + 1 > 200) {
                alert('El intervalo no puede superar 200 mesas.');
                return;
            }
            var arr = [];
            for (var i = desde; i <= hasta; i++) arr.push(i);
            generarPreviewMesas(arr);
        });
    }

    var btnAplicarManual = document.getElementById('btnAplicarManual');
    if (btnAplicarManual) {
        btnAplicarManual.addEventListener('click', function () {
            var manualEl = document.getElementById('mesasManual');
            var raw = (manualEl && manualEl.value) ? manualEl.value.trim() : '';
            if (!raw) {
                alert('Escribe los números de mesa separados por comas.');
                return;
            }
            var partes = raw.split(',').map(function (s) { return parseInt(s.trim(), 10); });
            var numeros = partes.filter(function (n) { return !isNaN(n) && n >= 1; });
            if (numeros.length === 0) {
                alert('No se encontraron números de mesa válidos');
                return;
            }
            numeros.sort(function (a, b) { return a - b; });
            var unicos = [];
            for (var u = 0; u < numeros.length; u++) {
                if (unicos.indexOf(numeros[u]) === -1) unicos.push(numeros[u]);
            }
            generarPreviewMesas(unicos);
        });
    }

    var btnGuardarMesas = document.getElementById('btnGuardarMesas');
    if (btnGuardarMesas) {
        btnGuardarMesas.addEventListener('click', function () {
            if (!mesasPendientes || mesasPendientes.length === 0) return;
            var btn = this;
            btn.disabled = true;
            db.collection('configuracion').doc('mesas').set({
                numeros: mesasPendientes,
                actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
            }).then(function () {
                alert('Configuración de mesas guardada correctamente');
                cargarConfigMesas();
                btn.disabled = true;
            }).catch(function (err) {
                console.error('Error guardando mesas:', err);
                alert(err && err.message ? err.message : 'Error al guardar.');
                btn.disabled = false;
            });
        });
    }

    // --- Sección Pedidos (admin crea órdenes) ---
    function iniciarSeccionPedidos() {
        var pedidoMesa = document.getElementById('pedidoMesa');
        var pedidoMesero = document.getElementById('pedidoMesero');
        var pedidoFilas = document.getElementById('pedidoFilas');
        if (!pedidoMesa || !pedidoMesero || !pedidoFilas) return;

        db.collection('configuracion').doc('mesas').onSnapshot(function (doc) {
            var valorAntes = pedidoMesa.value;
            while (pedidoMesa.options.length > 1) pedidoMesa.remove(1);
            var numeros = [];
            if (doc.exists && doc.data().numeros && Array.isArray(doc.data().numeros) && doc.data().numeros.length > 0) {
                numeros = doc.data().numeros;
            } else {
                for (var i = 1; i <= 50; i++) numeros.push(i);
            }
            numeros.forEach(function (num) {
                var opt = document.createElement('option');
                opt.value = String(num);
                opt.textContent = 'Mesa ' + num;
                pedidoMesa.appendChild(opt);
            });
            if (valorAntes && numeros.indexOf(parseInt(valorAntes, 10)) !== -1) pedidoMesa.value = valorAntes;
        });

        db.collection('usuarios').where('rol', '==', 'mesero').get().then(function (snap) {
            pedidoMesero.innerHTML = '<option value="">Seleccione mesero</option>';
            snap.forEach(function (d) {
                var data = d.data();
                var uid = d.id;
                var nombre = data.nombre || data.displayName || data.email || 'Mesero';
                var opt = document.createElement('option');
                opt.value = uid;
                opt.setAttribute('data-nombre', nombre);
                opt.textContent = nombre;
                pedidoMesero.appendChild(opt);
            });
        }).catch(function (err) {
            console.error('Error cargando meseros:', err);
        });

        pedidoFilas.innerHTML = '';
        agregarFilaPedido();
    }

    function agregarFilaPedido() {
        var pedidoFilas = document.getElementById('pedidoFilas');
        if (!pedidoFilas) return;
        var tr = document.createElement('tr');
        var selectPlatillo = document.createElement('select');
        selectPlatillo.className = 'input-tabla';
        var optVacía = document.createElement('option');
        optVacía.value = '';
        optVacía.textContent = 'Seleccione platillo';
        selectPlatillo.appendChild(optVacía);
        var porCat = {};
        menuItemsAdmin.forEach(function (item) {
            var cat = item.categoria || 'Otros';
            if (!porCat[cat]) porCat[cat] = [];
            porCat[cat].push(item);
        });
        CATEGORIAS_ORDEN.forEach(function (categoria) {
            var items = porCat[categoria];
            if (!items || items.length === 0) return;
            var optgroup = document.createElement('optgroup');
            optgroup.label = categoria;
            items.forEach(function (item) {
                var opt = document.createElement('option');
                opt.value = item.id;
                opt.setAttribute('data-precio', String(item.precio));
                opt.textContent = item.nombre + ' — $' + (item.precio != null ? Number(item.precio).toFixed(2) : '0.00');
                optgroup.appendChild(opt);
            });
            selectPlatillo.appendChild(optgroup);
        });
        var inpPrecio = document.createElement('input');
        inpPrecio.type = 'number';
        inpPrecio.className = 'input-tabla';
        inpPrecio.value = '0';
        inpPrecio.disabled = true;
        inpPrecio.step = '0.01';
        inpPrecio.min = '0';
        var inpCant = document.createElement('input');
        inpCant.type = 'number';
        inpCant.className = 'input-tabla';
        inpCant.value = '1';
        inpCant.min = '1';
        var spanSub = document.createElement('span');
        spanSub.className = 'pedido-subtotal';
        spanSub.textContent = '$0.00';
        var btnX = document.createElement('button');
        btnX.type = 'button';
        btnX.className = 'btn-sm btn-eliminar-fila';
        btnX.textContent = 'X';
        btnX.title = 'Eliminar fila';

        function actualizarSubtotal() {
            var precio = parseFloat(inpPrecio.value) || 0;
            var cant = parseInt(inpCant.value, 10) || 0;
            var sub = precio * cant;
            spanSub.textContent = '$' + sub.toFixed(2);
            recalcularTotalPedido();
        }
        selectPlatillo.addEventListener('change', function () {
            var opt = selectPlatillo.options[selectPlatillo.selectedIndex];
            if (!opt || opt.value === '') {
                inpPrecio.value = '0';
                inpPrecio.disabled = true;
            } else {
                var precio = opt.getAttribute('data-precio');
                inpPrecio.value = precio != null ? precio : '0';
                inpPrecio.disabled = true;
            }
            actualizarSubtotal();
        });
        inpPrecio.addEventListener('input', actualizarSubtotal);
        inpCant.addEventListener('input', actualizarSubtotal);

        btnX.addEventListener('click', function () {
            tr.remove();
            recalcularTotalPedido();
        });

        var tdPlatillo = document.createElement('td');
        tdPlatillo.appendChild(selectPlatillo);
        var tdPrecio = document.createElement('td');
        tdPrecio.appendChild(inpPrecio);
        var tdCant = document.createElement('td');
        tdCant.appendChild(inpCant);
        var tdSub = document.createElement('td');
        tdSub.appendChild(spanSub);
        var tdAcc = document.createElement('td');
        tdAcc.appendChild(btnX);
        tr.appendChild(tdPlatillo);
        tr.appendChild(tdPrecio);
        tr.appendChild(tdCant);
        tr.appendChild(tdSub);
        tr.appendChild(tdAcc);
        pedidoFilas.appendChild(tr);
    }

    function recalcularTotalPedido() {
        var pedidoFilas = document.getElementById('pedidoFilas');
        var pedidoTotal = document.getElementById('pedidoTotal');
        if (!pedidoFilas || !pedidoTotal) return;
        var total = 0;
        pedidoFilas.querySelectorAll('tr').forEach(function (row) {
            var subEl = row.querySelector('.pedido-subtotal');
            if (subEl) {
                var t = parseFloat(subEl.textContent.replace('$', '').replace(',', '')) || 0;
                total += t;
            }
        });
        pedidoTotal.textContent = '$' + total.toFixed(2);
    }

    function guardarPedido() {
        var pedidoMesa = document.getElementById('pedidoMesa');
        var pedidoMesero = document.getElementById('pedidoMesero');
        var pedidoFilas = document.getElementById('pedidoFilas');
        var mesa = pedidoMesa && pedidoMesa.value ? pedidoMesa.value.trim() : '';
        if (!mesa) {
            alert('Seleccione una mesa.');
            return;
        }
        var meseroOpt = pedidoMesero && pedidoMesero.selectedIndex >= 0 ? pedidoMesero.options[pedidoMesero.selectedIndex] : null;
        var meseroId = meseroOpt ? meseroOpt.value : '';
        var meseroNombre = meseroOpt ? (meseroOpt.getAttribute('data-nombre') || meseroOpt.textContent) : '';
        if (!meseroId) {
            alert('Seleccione un mesero.');
            return;
        }
        var platillos = [];
        var total = 0;
        if (pedidoFilas) {
            pedidoFilas.querySelectorAll('tr').forEach(function (row) {
                var selectPlatillo = row.querySelector('select');
                var inputs = row.querySelectorAll('input');
                var precioEl = inputs[0];
                var cantEl = inputs[1];
                if (!selectPlatillo || selectPlatillo.value === '') return;
                var opt = selectPlatillo.options[selectPlatillo.selectedIndex];
                var nombre = opt ? (opt.textContent || '').trim() : '';
                var precio = precioEl ? (parseFloat(precioEl.value) || 0) : 0;
                var cantidad = cantEl ? (parseInt(cantEl.value, 10) || 1) : 1;
                if (nombre && precio > 0) {
                    platillos.push({ nombre: nombre, precio: precio, cantidad: cantidad });
                    total += precio * cantidad;
                }
            });
        }
        if (platillos.length === 0) {
            alert('Agregue al menos un platillo: seleccione uno en el desplegable.');
            return;
        }
        db.collection('ordenes').add({
            mesa: mesa,
            platillos: platillos,
            total: total,
            estado: 'pendiente',
            meseroId: meseroId,
            meseroNombre: meseroNombre,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            creadoPorAdmin: true
        }).then(function () {
            alert('Pedido guardado correctamente. Aparecerá en Órdenes en vivo.');
            if (pedidoMesa) pedidoMesa.value = '';
            if (pedidoMesero) pedidoMesero.value = '';
            if (pedidoFilas) {
                pedidoFilas.innerHTML = '';
                agregarFilaPedido();
            }
            recalcularTotalPedido();
        }).catch(function (err) {
            console.error('Error guardando pedido:', err);
            alert('No se pudo guardar el pedido.');
        });
    }

    var btnGuardarPedido = document.getElementById('btnGuardarPedido');
    if (btnGuardarPedido) btnGuardarPedido.addEventListener('click', guardarPedido);
    var btnAgregarFila = document.getElementById('btnAgregarFila');
    if (btnAgregarFila) btnAgregarFila.addEventListener('click', agregarFilaPedido);

    // --- Sección Cotizaciones ---
    var cotizacionEditandoId = null;

    function iniciarSeccionCotizaciones() {
        var cotizacionFilas = document.getElementById('cotizacionFilas');
        var cotizacionesBody = document.getElementById('cotizacionesBody');
        if (!cotizacionFilas || !cotizacionesBody) return;

        db.collection('cotizaciones').orderBy('timestamp', 'desc').onSnapshot(function (snap) {
            if (snap.empty) {
                cotizacionesBody.innerHTML = '<tr><td colspan="5" class="msg-empty">No hay cotizaciones.</td></tr>';
                return;
            }
            var rows = [];
            snap.forEach(function (d) {
                var data = d.data();
                var id = d.id;
                var titulo = escapeHtml(data.titulo || '—');
                var detallesStr = String(data.detalles || '—');
                if (detallesStr.length > 40) {
                    detallesStr = detallesStr.substring(0, 40) + '...';
                }
                detallesStr = escapeHtml(detallesStr);
                var total = (data.total != null) ? '$' + Number(data.total).toFixed(2) : '$0.00';
                var fecha = '—';
                if (data.timestamp && data.timestamp.toDate) {
                    fecha = data.timestamp.toDate().toLocaleDateString('es');
                }
                rows.push(
                    '<tr><td data-label="Título">' + titulo + '</td><td data-label="Detalles">' + detallesStr + '</td><td data-label="Total">' + total + '</td><td data-label="Fecha">' + fecha + '</td><td data-label="Acciones">' +
                    '<button type="button" class="btn-sm btn-editar-cotizacion" data-id="' + escapeHtml(id) + '">Editar</button> ' +
                    '<button type="button" class="btn-sm btn-imprimir-cotizacion" data-id="' + escapeHtml(id) + '">Imprimir</button> ' +
                    '<button type="button" class="btn-sm btn-whatsapp btn-whatsapp-cotizacion" data-id="' + escapeHtml(id) + '">WhatsApp</button> ' +
                    '<button type="button" class="btn-sm btn-danger btn-eliminar-cotizacion" data-id="' + escapeHtml(id) + '">Eliminar</button></td></tr>'
                );
            });
            cotizacionesBody.innerHTML = rows.join('');

            cotizacionesBody.querySelectorAll('.btn-eliminar-cotizacion').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var id = btn.getAttribute('data-id');
                    if (!confirm('¿Eliminar esta cotización?')) return;
                    db.collection('cotizaciones').doc(id).delete().catch(function (err) {
                        console.error('Error al eliminar cotización:', err);
                        alert('No se pudo eliminar.');
                    });
                });
            });
            cotizacionesBody.querySelectorAll('.btn-editar-cotizacion').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var id = btn.getAttribute('data-id');
                    db.collection('cotizaciones').doc(id).get().then(function (doc) {
                        if (doc.exists) abrirEditarCotizacion(id, doc.data());
                    }).catch(function (err) { console.error(err); });
                });
            });
            cotizacionesBody.querySelectorAll('.btn-imprimir-cotizacion').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    imprimirCotizacion(btn.getAttribute('data-id'));
                });
            });

            cotizacionesBody.querySelectorAll('.btn-whatsapp-cotizacion').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    if (typeof window.enviarWhatsAppCotizacion === 'function') {
                        window.enviarWhatsAppCotizacion(btn.getAttribute('data-id'));
                    }
                });
            });

        });

        cotizacionFilas.innerHTML = '';
        agregarFilaCotizacion();
    }

    function agregarFilaCotizacion() {
        var cotizacionFilas = document.getElementById('cotizacionFilas');
        if (!cotizacionFilas) return;
        var tr = document.createElement('tr');
        var inpDesc = document.createElement('input');
        inpDesc.type = 'text';
        inpDesc.className = 'pedido-input';
        inpDesc.placeholder = 'Descripción';
        var inpPrecio = document.createElement('input');
        inpPrecio.type = 'number';
        inpPrecio.className = 'pedido-input';
        inpPrecio.placeholder = '0';
        inpPrecio.step = '0.01';
        inpPrecio.min = '0';
        var inpCant = document.createElement('input');
        inpCant.type = 'number';
        inpCant.className = 'pedido-input';
        inpCant.placeholder = '1';
        inpCant.min = '1';
        inpCant.value = '1';
        var spanSub = document.createElement('span');
        spanSub.className = 'pedido-subtotal';
        spanSub.textContent = '$0.00';
        var btnX = document.createElement('button');
        btnX.type = 'button';
        btnX.className = 'btn-sm btn-eliminar-fila';
        btnX.textContent = 'X';
        btnX.title = 'Eliminar fila';

        function actualizarSubtotal() {
            var precio = parseFloat(inpPrecio.value) || 0;
            var cant = parseInt(inpCant.value, 10) || 0;
            var sub = precio * cant;
            spanSub.textContent = '$' + sub.toFixed(2);
            recalcularTotalCotizacion();
        }
        inpPrecio.addEventListener('input', actualizarSubtotal);
        inpCant.addEventListener('input', actualizarSubtotal);

        btnX.addEventListener('click', function () {
            tr.remove();
            recalcularTotalCotizacion();
        });

        var tdDesc = document.createElement('td');
        tdDesc.appendChild(inpDesc);
        var tdPrecio = document.createElement('td');
        tdPrecio.appendChild(inpPrecio);
        var tdCant = document.createElement('td');
        tdCant.appendChild(inpCant);
        var tdSub = document.createElement('td');
        tdSub.appendChild(spanSub);
        var tdAcc = document.createElement('td');
        tdAcc.appendChild(btnX);
        tr.appendChild(tdDesc);
        tr.appendChild(tdPrecio);
        tr.appendChild(tdCant);
        tr.appendChild(tdSub);
        tr.appendChild(tdAcc);
        cotizacionFilas.appendChild(tr);
    }

    function recalcularTotalCotizacion() {
        var cotizacionFilas = document.getElementById('cotizacionFilas');
        var cotizacionTotal = document.getElementById('cotizacionTotal');
        if (!cotizacionFilas || !cotizacionTotal) return;
        var total = 0;
        cotizacionFilas.querySelectorAll('tr').forEach(function (row) {
            var subEl = row.querySelector('.pedido-subtotal');
            if (subEl) {
                var t = parseFloat(subEl.textContent.replace('$', '').replace(',', '')) || 0;
                total += t;
            }
        });
        cotizacionTotal.textContent = '$' + total.toFixed(2);
    }

    function guardarCotizacion() {
        var cotizacionTitulo = document.getElementById('cotizacionTitulo');
        var cotizacionDetalles = document.getElementById('cotizacionDetalles');
        var cotizacionFilas = document.getElementById('cotizacionFilas');
        var titulo = (cotizacionTitulo && cotizacionTitulo.value) ? cotizacionTitulo.value.trim() : '';
        if (!titulo) {
            alert('Ingrese un título para la cotización.');
            return;
        }
        var detalles = (cotizacionDetalles && cotizacionDetalles.value) ? String(cotizacionDetalles.value).trim() : '';
        var platillos = [];
        var total = 0;
        if (cotizacionFilas) {
            cotizacionFilas.querySelectorAll('tr').forEach(function (row) {
                var inputs = row.querySelectorAll('input');
                var descEl = inputs[0];
                var precioEl = inputs[1];
                var cantEl = inputs[2];
                if (!descEl || !precioEl) return;
                var nombre = (descEl.value || '').trim();
                var precio = parseFloat(precioEl.value) || 0;
                var cantidad = cantEl ? (parseInt(cantEl.value, 10) || 1) : 1;
                if (nombre && precio > 0) {
                    platillos.push({ nombre: nombre, precio: precio, cantidad: cantidad });
                    total += precio * cantidad;
                }
            });
        }
        if (platillos.length === 0) {
            alert('Agregue al menos un platillo con descripción y precio mayor a 0.');
            return;
        }

        var payload = { titulo: titulo, detalles: detalles, platillos: platillos, total: total, timestamp: firebase.firestore.FieldValue.serverTimestamp() };

        if (cotizacionEditandoId) {
            db.collection('cotizaciones').doc(cotizacionEditandoId).update(payload).then(function () {
                cerrarFormularioCotizacion();
            }).catch(function (err) {
                console.error('Error al actualizar cotización:', err);
                alert('No se pudo guardar.');
            });
        } else {
            db.collection('cotizaciones').add(payload).then(function () {
                cerrarFormularioCotizacion();
            }).catch(function (err) {
                console.error('Error al guardar cotización:', err);
                alert('No se pudo guardar.');
            });
        }
    }

    function cerrarFormularioCotizacion() {
        var formCotizacion = document.getElementById('formCotizacion');
        var cotizacionTitulo = document.getElementById('cotizacionTitulo');
        var cotizacionDetalles = document.getElementById('cotizacionDetalles');
        var cotizacionFilas = document.getElementById('cotizacionFilas');
        if (formCotizacion) formCotizacion.style.display = 'none';
        cotizacionEditandoId = null;
        if (cotizacionTitulo) cotizacionTitulo.value = '';
        if (cotizacionDetalles) cotizacionDetalles.value = '';
        if (cotizacionFilas) {
            cotizacionFilas.innerHTML = '';
            agregarFilaCotizacion();
        }
        recalcularTotalCotizacion();
    }

    function abrirEditarCotizacion(id, data) {
        cotizacionEditandoId = id;
        var formCotizacion = document.getElementById('formCotizacion');
        var cotizacionTitulo = document.getElementById('cotizacionTitulo');
        var cotizacionDetalles = document.getElementById('cotizacionDetalles');
        var cotizacionFilas = document.getElementById('cotizacionFilas');
        if (formCotizacion) formCotizacion.style.display = 'block';
        if (cotizacionTitulo) cotizacionTitulo.value = data.titulo || '';
        if (cotizacionDetalles) cotizacionDetalles.value = String(data.detalles || '');
        if (!cotizacionFilas) return;
        cotizacionFilas.innerHTML = '';
        var platillos = Array.isArray(data.platillos) ? data.platillos : [];
        platillos.forEach(function (p) {
            agregarFilaCotizacion();
            var lastRow = cotizacionFilas.querySelector('tr:last-child');
            if (lastRow) {
                var inputs = lastRow.querySelectorAll('input');
                if (inputs[0]) inputs[0].value = p.nombre || '';
                if (inputs[1]) inputs[1].value = String(p.precio != null ? p.precio : '');
                if (inputs[2]) inputs[2].value = String(p.cantidad != null ? p.cantidad : 1);
                var subEl = lastRow.querySelector('.pedido-subtotal');
                if (subEl) {
                    var precio = Number(p.precio) || 0;
                    var cant = parseInt(p.cantidad, 10) || 1;
                    subEl.textContent = '$' + (precio * cant).toFixed(2);
                }
            }
        });
        if (platillos.length === 0) agregarFilaCotizacion();
        recalcularTotalCotizacion();
    }

    function imprimirCotizacion(id) {
    if (!id) return;
    if (typeof window.prepararCotizacion === 'function') {
        window.prepararCotizacion(id);
    } else {
        alert('El módulo de impresión no está disponible. Recarga la página.');
    }
}

    var btnNuevaCotizacion = document.getElementById('btnNuevaCotizacion');
    if (btnNuevaCotizacion) {
        btnNuevaCotizacion.addEventListener('click', function () {
            cotizacionEditandoId = null;
            var formCotizacion = document.getElementById('formCotizacion');
            var cotizacionTitulo = document.getElementById('cotizacionTitulo');
            var cotizacionDetalles = document.getElementById('cotizacionDetalles');
            var cotizacionFilas = document.getElementById('cotizacionFilas');
            if (formCotizacion) formCotizacion.style.display = 'block';
            if (cotizacionTitulo) cotizacionTitulo.value = '';
            if (cotizacionDetalles) cotizacionDetalles.value = '';
            if (cotizacionFilas) {
                cotizacionFilas.innerHTML = '';
                agregarFilaCotizacion();
            }
            recalcularTotalCotizacion();
        });
    }
    var btnCancelarCotizacion = document.getElementById('btnCancelarCotizacion');
    if (btnCancelarCotizacion) btnCancelarCotizacion.addEventListener('click', cerrarFormularioCotizacion);
    var btnGuardarCotizacion = document.getElementById('btnGuardarCotizacion');
    if (btnGuardarCotizacion) btnGuardarCotizacion.addEventListener('click', guardarCotizacion);
    var btnAgregarFilaCot = document.getElementById('btnAgregarFilaCot');
    if (btnAgregarFilaCot) btnAgregarFilaCot.addEventListener('click', agregarFilaCotizacion);

    // --- Historial de gastos ---
    var gastosHistorialBody = document.getElementById('gastosHistorialBody');
    var modalEditarGasto = document.getElementById('modalEditarGasto');
    var editGastoDescripcion = document.getElementById('editGastoDescripcion');
    var editGastoCategoria = document.getElementById('editGastoCategoria');
    var editGastoMonto = document.getElementById('editGastoMonto');
    var editGastoMetodo = document.getElementById('editGastoMetodo');
    var btnGuardarEditGasto = document.getElementById('btnGuardarEditGasto');
    var btnCancelarEditGasto = document.getElementById('btnCancelarEditGasto');
    var gastoEditandoId = null;

    db.collection('gastos').orderBy('fecha', 'desc').onSnapshot(function (snap) {
        if (!gastosHistorialBody) return;
        if (snap.empty) {
            gastosHistorialBody.innerHTML = '<tr><td colspan="6" class="msg-empty">Sin gastos registrados.</td></tr>';
            return;
        }
        var rows = [];
        snap.forEach(function (d) {
            var g = d.data();
            var fecha = g.fecha && g.fecha.toDate ? g.fecha.toDate().toLocaleDateString('es') : '—';
            var desc = escapeHtml(g.descripcion || '—');
            var cat = escapeHtml(g.categoria || '—');
            var monto = g.monto != null ? '$' + Number(g.monto).toFixed(2) : '—';
            var metodo = escapeHtml(g.metodoPago || '—');
            rows.push(
                '<tr>' +
                '<td data-label="Fecha">' + fecha + '</td>' +
                '<td data-label="Descripción">' + desc + '</td>' +
                '<td data-label="Categoría">' + cat + '</td>' +
                '<td data-label="Monto">' + monto + '</td>' +
                '<td data-label="Método">' + metodo + '</td>' +
                '<td data-label="Acciones">' +
                '<button type="button" class="btn-sm btn-secondary editar-gasto" data-id="' + d.id + '" data-desc="' + escapeHtml(g.descripcion || '') + '" data-cat="' + escapeHtml(g.categoria || 'otros') + '" data-monto="' + (g.monto || 0) + '" data-metodo="' + escapeHtml(g.metodoPago || 'efectivo') + '">Editar</button>' +
                '</td>' +
                '</tr>'
            );
        });
        gastosHistorialBody.innerHTML = rows.join('');
        gastosHistorialBody.querySelectorAll('.editar-gasto').forEach(function (btn) {
            btn.addEventListener('click', function () {
                gastoEditandoId = btn.getAttribute('data-id');
                editGastoDescripcion.value = btn.getAttribute('data-desc');
                editGastoCategoria.value = btn.getAttribute('data-cat');
                editGastoMonto.value = btn.getAttribute('data-monto');
                editGastoMetodo.value = btn.getAttribute('data-metodo');
                modalEditarGasto.style.display = 'flex';
            });
        });
    });

    if (btnGuardarEditGasto) {
        btnGuardarEditGasto.addEventListener('click', function () {
            if (!gastoEditandoId) return;
            var monto = parseFloat(editGastoMonto.value);
            if (isNaN(monto) || monto <= 0) return;
            db.collection('gastos').doc(gastoEditandoId).update({
                descripcion: editGastoDescripcion.value.trim(),
                categoria: editGastoCategoria.value,
                monto: monto,
                metodoPago: editGastoMetodo.value
            }).then(function () {
                modalEditarGasto.style.display = 'none';
                gastoEditandoId = null;
            }).catch(function (err) {
                console.error('Error al editar gasto:', err);
            });
        });
    }

    if (btnCancelarEditGasto) {
        btnCancelarEditGasto.addEventListener('click', function () {
            modalEditarGasto.style.display = 'none';
            gastoEditandoId = null;
        });
    }

    // --- Grupos colapsables del nav ---
    var navGroupTitles = document.querySelectorAll('.nav-group-title');
    navGroupTitles.forEach(function (btn) {
        btn.classList.add('collapsed');
        var items = btn.nextElementSibling;
        if (items && items.classList.contains('nav-group-items')) items.classList.add('collapsed');
    });
    navGroupTitles.forEach(function (btn) {
        btn.addEventListener('click', function () {
            btn.classList.toggle('collapsed');
            var items = btn.nextElementSibling;
            if (items && items.classList.contains('nav-group-items')) items.classList.toggle('collapsed');
        });
    });
})();
