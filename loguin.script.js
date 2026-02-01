const dniInput = document.getElementById('dniInput');
const messageContainer = document.getElementById('message-container');
const pagoInfo = document.getElementById('pago-info');

// Helper to get data from localStorage
function getUsuarios() {
    return JSON.parse(localStorage.getItem('gym_usuarios') || '[]');
}

function getPagos() {
    return JSON.parse(localStorage.getItem('gym_pagos') || '[]');
}

function getIngresos() {
    return JSON.parse(localStorage.getItem('gym_ingresos') || '[]');
}

function saveIngresos(ingresos) {
    localStorage.setItem('gym_ingresos', JSON.stringify(ingresos));
}

function getNextId() {
    const nextId = parseInt(localStorage.getItem('gym_next_id') || '1');
    localStorage.setItem('gym_next_id', (nextId + 1).toString());
    return nextId;
}

function isFechaVencimientoValidaYVigente(fechaVencimientoStr) {
    if (!fechaVencimientoStr || String(fechaVencimientoStr).trim() === '') return false;
    const fechaVencimiento = new Date(fechaVencimientoStr);
    if (Number.isNaN(fechaVencimiento.getTime())) return false;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fechaVencimiento.setHours(0, 0, 0, 0);
    return fechaVencimiento >= hoy;
}

function getUltimoPagoMensualidadUsuario(pagos, userId) {
    const pagosMensualidad = (pagos || [])
        .filter(p => p && String(p.usuario_id) === String(userId))
        .filter(p => String(p.tipo || '').toLowerCase() === 'mensualidad')
        .filter(p => p.fecha)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    return pagosMensualidad.length ? pagosMensualidad[0] : null;
}

function parseDateOnly(dateStr) {
    if (!dateStr || String(dateStr).trim() === '') return null;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
}

function formatDateEsShort(dateStr) {
    const d = parseDateOnly(dateStr);
    if (!d) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy}`;
}

function daysUntil(dateStr) {
    const d = parseDateOnly(dateStr);
    if (!d) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const diffMs = d.getTime() - hoy.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function hidePagoInfo() {
    if (!pagoInfo) return;
    pagoInfo.textContent = '';
    pagoInfo.classList.add('hidden');
}

function updatePagoInfoForDni(dni) {
    if (!pagoInfo) return;
    const dniStr = String(dni || '').trim();
    if (dniStr.length < 5) {
        hidePagoInfo();
        return;
    }

    const usuarios = getUsuarios();
    const user = usuarios.find(u => u && u.dni && u.dni.toString().trim() === dniStr);
    if (!user) {
        hidePagoInfo();
        return;
    }

    const pagos = getPagos();
    const ultimoPagoMensualidad = getUltimoPagoMensualidadUsuario(pagos, user.id);
    const ultimoEstado = String(ultimoPagoMensualidad?.estado || '').toLowerCase();
    const ultimoEsPendiente = ultimoEstado.includes('pendiente');
    const ultimoEsPagado = ultimoEstado.includes('pagado');
    const tieneMensualidad = !!ultimoPagoMensualidad;
    const membresiaVigente = isFechaVencimientoValidaYVigente(user.fecha_vencimiento);

    const estadoPagoValido = ultimoEsPagado || ultimoEsPendiente;
    const activo = membresiaVigente && tieneMensualidad && estadoPagoValido;
    if (!activo) {
        hidePagoInfo();
        return;
    }

    const diasRestantes = daysUntil(user.fecha_vencimiento);
    if (diasRestantes === null) {
        hidePagoInfo();
        return;
    }

    const fechaPagoFmt = formatDateEsShort(ultimoPagoMensualidad?.fecha) || String(ultimoPagoMensualidad?.fecha || '').trim();
    const fechaVencFmt = formatDateEsShort(user.fecha_vencimiento) || String(user.fecha_vencimiento || '').trim();
    const diasText = diasRestantes === 1 ? '1 día' : `${diasRestantes} días`;
    const estadoText = ultimoEsPendiente ? 'PENDIENTE' : 'OK';

    pagoInfo.innerHTML = `
        <div><strong>Pagó:</strong> ${fechaPagoFmt || 'N/D'}</div>
        <div><strong>Vence:</strong> ${fechaVencFmt || 'N/D'}</div>
        <div><strong>Faltan:</strong> ${diasText} <span style="opacity:0.85">(Estado: ${estadoText})</span></div>
    `;
    pagoInfo.classList.remove('hidden');
}

function appendNumber(number) {
    if (dniInput.value.length < 8) { // MAX 8 chars for DNI
        dniInput.value += number;
        clearMessage();
        updatePagoInfoForDni(dniInput.value);
    }
}

function clearInput() {
    dniInput.value = '';
    clearMessage();
    hidePagoInfo();
}

function backspace() {
    dniInput.value = dniInput.value.slice(0, -1);
    clearMessage();
    updatePagoInfoForDni(dniInput.value);
}

function submitLogin() {
    const dni = dniInput.value;

    if (dni.length === 0) {
        showMessage('Por favor ingrese un DNI', 'error');
        return;
    }

    if (dni.length < 5) {
        showMessage('DNI inválido (muy corto)', 'error');
        return;
    }

    // Indicate loading
    const startBtn = document.querySelector('.submit-btn');
    const originalBtnContent = startBtn.innerHTML;

    startBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Verificando...';
    startBtn.disabled = true;

    // Simulate network delay for better UX
    setTimeout(() => {
        const usuarios = getUsuarios();
        // Find user by DNI (compare as strings)
        const user = usuarios.find(u => u.dni && u.dni.toString().trim() === dni);

        if (user) {
            const pagos = getPagos();
            const ultimoPagoMensualidad = getUltimoPagoMensualidadUsuario(pagos, user.id);
            const ultimoEstado = String(ultimoPagoMensualidad?.estado || '').toLowerCase();
            const ultimoEsPendiente = ultimoEstado.includes('pendiente');
            const ultimoEsPagado = ultimoEstado.includes('pagado');
            const tieneMensualidad = !!ultimoPagoMensualidad;

            const membresiaVigente = isFechaVencimientoValidaYVigente(user.fecha_vencimiento);

            // Regla de acceso:
            // - Requiere membresía vigente (fecha válida y no vencida)
            // - Requiere que exista pago de Mensualidad (si está PENDIENTE, se permite pero se avisa)
            const estadoPagoValido = ultimoEsPagado || ultimoEsPendiente;
            const accesoPermitido = membresiaVigente && tieneMensualidad && estadoPagoValido;

            if (!accesoPermitido) {
                const partes = [];
                if (!membresiaVigente) {
                    partes.push(user.fecha_vencimiento ? `tu cuota venció el ${user.fecha_vencimiento}` : 'no registrás una membresía vigente');
                }
                if (!tieneMensualidad) {
                    partes.push('no tenés un pago de Mensualidad registrado');
                } else if (!estadoPagoValido) {
                    partes.push('tu último pago de Mensualidad tiene un estado no válido');
                }

                showMessage(`Hola ${user.nombre}, acceso denegado: ${partes.join(' y ')}.`, 'error');
                playSound('error');
                startBtn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Denegado';
            } else {
                if (ultimoEsPendiente) {
                    const ingresos = getIngresos();
                    const newIngreso = {
                        id: getNextId(),
                        usuario_id: user.id,
                        fecha: new Date().toISOString()
                    };
                    ingresos.push(newIngreso);
                    saveIngresos(ingresos);

                    showMessage(`¡Bienvenido/a ${user.nombre}! Acceso Permitido (PAGO PENDIENTE).`, 'warning');
                    playSound('warning');
                    startBtn.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Pendiente';
                    return;
                }
                const ingresos = getIngresos();
                const newIngreso = {
                    id: getNextId(),
                    usuario_id: user.id,
                    fecha: new Date().toISOString()
                };
                ingresos.push(newIngreso);
                saveIngresos(ingresos);

                showMessage(`¡Bienvenido/a ${user.nombre}! Acceso Permitido.`, 'success');
                playSound('success');
                startBtn.innerHTML = '<i class="fa-solid fa-check"></i> Adelante';
            }

        } else {
            // NOT FOUND
            showMessage('DNI no encontrado en el sistema.', 'error');
            playSound('error');
            startBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> No Existe';
        }

        // Reset UI after delay
        setTimeout(() => {
            clearInput();
            startBtn.innerHTML = originalBtnContent;
            startBtn.disabled = false;
            clearMessage();
        }, 3000);

    }, 600);
}

function showMessage(text, type) {
    messageContainer.textContent = text;
    messageContainer.className = `message ${type}`;
    messageContainer.classList.remove('hidden');
}

function clearMessage() {
    messageContainer.textContent = '';
    messageContainer.classList.add('hidden');
}

function playSound(type) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;

    if (type === 'success') {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, now); // A5
        oscillator.frequency.exponentialRampToValueAtTime(1760, now + 0.1); // Pequeño efecto "coin"

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        oscillator.start(now);
        oscillator.stop(now + 0.3);
    } else if (type === 'warning') {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(660, now);
        oscillator.frequency.linearRampToValueAtTime(440, now + 0.18);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        gainNode.gain.setValueAtTime(0.25, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        oscillator.start(now);
        oscillator.stop(now + 0.25);
    } else {
        // ALARMA DE ERROR (VENCIDO)
        // Secuencia de 3 pitidos fuertes y agresivos
        const playAlarmBeep = (startTime) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = 'square'; // Onda cuadrada = sonido más "áspero" y fuerte (tipo alarma)
            osc.frequency.setValueAtTime(600, startTime);
            osc.frequency.linearRampToValueAtTime(400, startTime + 0.15); // Efecto de caída

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            // Volumen ALTO (0.5)
            gain.gain.setValueAtTime(0.5, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

            osc.start(startTime);
            osc.stop(startTime + 0.15);
        };

        playAlarmBeep(now);
        playAlarmBeep(now + 0.2); // Segundo pitido
        playAlarmBeep(now + 0.4); // Tercer pitido
    }
}

// Keyboard support
document.addEventListener('keydown', (e) => {
    if (e.key >= '0' && e.key <= '9') {
        appendNumber(e.key);
    } else if (e.key === 'Backspace') {
        backspace();
    } else if (e.key === 'Enter') {
        submitLogin();
    } else if (e.key === 'Escape') {
        clearInput();
    }
});
