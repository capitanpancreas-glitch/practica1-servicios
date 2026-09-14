const canvas = document.getElementById('interseccionCanvas');
const ctx = canvas.getContext('2d');
const ancho = canvas.width; const alto = canvas.height;
const cx = ancho / 2; const cy = alto / 2;
const anchoCarril = 30; const anchoCarretera = anchoCarril * 4; 
const offsetCarretera = anchoCarretera / 2;

//constantes (enums)
const VIA = { NORTE: 'N', SUR: 'S', ESTE: 'E', OESTE: 'O' };
const CARRIL = { RECTO_DER: 'rectoDer', IZQ: 'izq' };
const COLOR = { ROJO: 'rojo', AMBAR: 'ambar', VERDE: 'verde' };
const FASE_PEATON = { INACTIVO: null, AMBAR: 'ambar', VERDE: 'verde' };

const DILEMAS_TRANVIA = [
    ["Salvar a 5 desconocidos", "Salvar a tu mejor amigo"],
    ["Salvar a 3 ancianos", "Salvar a 1 bebé"],
    ["Salvar a 5 delincuentes", "Salvar a 1 médico"],
    ["Salvar a 10 personas", "Salvar a tu mascota"],
    ["Salvar a 1 científico", "Salvar a 5 obreros"]
];

//modelo de datos y lógica de la intersección
class ModeloInterseccion {
    constructor() {
        this._vehiculos = [];
        this._volumen = { [VIA.NORTE]: 5, [VIA.SUR]: 5, [VIA.ESTE]: 5, [VIA.OESTE]: 5 };
        this._semaforos = {
            [VIA.NORTE]: { [CARRIL.RECTO_DER]: COLOR.ROJO, [CARRIL.IZQ]: COLOR.ROJO },
            [VIA.SUR]: { [CARRIL.RECTO_DER]: COLOR.ROJO, [CARRIL.IZQ]: COLOR.ROJO },
            [VIA.ESTE]: { [CARRIL.RECTO_DER]: COLOR.ROJO, [CARRIL.IZQ]: COLOR.ROJO },
            [VIA.OESTE]: { [CARRIL.RECTO_DER]: COLOR.ROJO, [CARRIL.IZQ]: COLOR.ROJO }
        };
        this._secuencia = { faseActual: 1, tiempoFase: 0 };
        this._manual = { activo: false, via: null };
        this._peatones = {
            [VIA.NORTE]: { activo: false, fase: FASE_PEATON.INACTIVO, tiempo: 0 },
            [VIA.SUR]: { activo: false, fase: FASE_PEATON.INACTIVO, tiempo: 0 },
            [VIA.ESTE]: { activo: false, fase: FASE_PEATON.INACTIVO, tiempo: 0 },
            [VIA.OESTE]: { activo: false, fase: FASE_PEATON.INACTIVO, tiempo: 0 }
        };
        this._tren = { activo: false, animacionX: -300, palancaTirada: false, frases: DILEMAS_TRANVIA[0] };
        this._emergenciaActiva = false;
    }

    get vehiculos() { return this._vehiculos; }
    get manualActivo() { return this._manual.activo; }
    get emergenciaActiva() { return this._emergenciaActiva; }
    
    get trenActivo() { return this._tren.activo; }
    get trenX() { return this._tren.animacionX; }
    get trenPalanca() { return this._tren.palancaTirada; }
    get trenFrases() { return this._tren.frases; }
    
    get secuenciaFase() { return this._secuencia.faseActual; }
    get secuenciaTiempo() { return this._secuencia.tiempoFase; }

    getVolumen(via) { return this._volumen[via]; }
    getSemaforo(via, carril) { return this._semaforos[via][carril]; }
    getPeaton(via) { return this._peatones[via]; }

    setVolumen(via, valor) { this._volumen[via] = parseInt(valor); }
    agregarVehiculo(vehiculo) { this._vehiculos.push(vehiculo); }
    limpiarVehiculosInactivos() { this._vehiculos = this._vehiculos.filter(v => v.activo); }

    setSemaforo(via, carril, color) { this._semaforos[via][carril] = color; }
    todoRojo() {
        Object.values(VIA).forEach(v => {
            this.setSemaforo(v, CARRIL.RECTO_DER, COLOR.ROJO);
            this.setSemaforo(v, CARRIL.IZQ, COLOR.ROJO);
        });
    }

    avanzarTiempoSecuencia(delta) { this._secuencia.tiempoFase += delta; }
    resetTiempoSecuencia() { this._secuencia.tiempoFase = 0; }
    avanzarFaseSecuencia() {
        this._secuencia.faseActual = this._secuencia.faseActual >= 4 ? 1 : this._secuencia.faseActual + 1;
        this.resetTiempoSecuencia();
    }

    activarPeaton(via) {
        if (!this._peatones[via].activo) {
            this._peatones[via].activo = true;
            this._peatones[via].fase = FASE_PEATON.AMBAR;
            this._peatones[via].tiempo = 5000;
        }
    }

    activarTren() {
        this._tren.activo = true; this._tren.animacionX = -400;
        this._tren.frases = DILEMAS_TRANVIA[Math.floor(Math.random() * DILEMAS_TRANVIA.length)];
    }
    desactivarTren() { this._tren.activo = false; }
    moverTren(delta) { this._tren.animacionX += delta; }
    togglePalanca() { this._tren.palancaTirada = !this._tren.palancaTirada; }

    activarManual(via) {
        this._manual.activo = true; this._manual.via = via; this.todoRojo();
        this.setSemaforo(via, CARRIL.RECTO_DER, COLOR.VERDE); this.setSemaforo(via, CARRIL.IZQ, COLOR.VERDE);
    }
    desactivarManual() { this._manual.activo = false; }
    activarEmergencia(origen) {
        this._emergenciaActiva = true; this.todoRojo();
        this.setSemaforo(origen, CARRIL.RECTO_DER, COLOR.VERDE); this.setSemaforo(origen, CARRIL.IZQ, COLOR.VERDE);
    }
    desactivarEmergencia() { this._emergenciaActiva = false; }
}

const Gestor = new ModeloInterseccion();

//geometría y eventos
const yTrenBase = 80; 
const yTrenDesvio = 30; 
const xBifurcacion = ancho - 300; 
const xFinCurva = ancho - 150; 
const posPalanca = { x: ancho - 290, y: 35 }; 

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    if (Math.hypot((e.clientX - rect.left) - posPalanca.x, (e.clientY - rect.top) - posPalanca.y) < 25) {
        if (Gestor.trenActivo && Gestor.trenX > xBifurcacion - 50) return;
        Gestor.togglePalanca();
    }
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    if (Math.hypot((e.clientX - rect.left) - posPalanca.x, (e.clientY - rect.top) - posPalanca.y) < 25) {
        canvas.style.cursor = (Gestor.trenActivo && Gestor.trenX > xBifurcacion - 50) ? 'not-allowed' : 'pointer'; 
    } else {
        canvas.style.cursor = 'default';
    }
});

function getViaPos(x, porAlternativa) {
    const yCenterBase = yTrenBase + 20; const yCenterDesvio = yTrenDesvio + 20; 
    if (!porAlternativa || x <= xBifurcacion) return { x: x, y: yCenterBase, angulo: 0 };
    else if (x >= xFinCurva) return { x: x, y: yCenterDesvio, angulo: 0 };
    else {
        let t = (x - xBifurcacion) / (xFinCurva - xBifurcacion); 
        let y = yCenterBase + (yCenterDesvio - yCenterBase) * (0.5 - 0.5 * Math.cos(t * Math.PI));
        let dy = (yCenterDesvio - yCenterBase) * 0.5 * Math.PI * Math.sin(t * Math.PI) / (xFinCurva - xBifurcacion);
        return { x: x, y: y, angulo: Math.atan2(dy, 1) };
    }
}

//clase vehículo con lógica de movimiento, frenado, giro y dibujo
class Vehiculo {
    constructor(origen, esEspecial = false, tipoEspecial = null, destinoEspecial = null) {
        this.origen = origen; this.activo = true; this.esEspecial = esEspecial; this.haGirado = false;
        this.carril = Math.random() > 0.5 ? CARRIL.IZQ : CARRIL.RECTO_DER; this.vel = 2.5;
        if (!esEspecial) {
            const r = Math.random();
            if (r < 0.60) { this.tipo = 'coche'; this.color = '#3498db'; this.largo = 30; } 
            else if (r < 0.90) { this.tipo = 'furgoneta'; this.color = '#ecf0f1'; this.largo = 45; } 
            else { this.tipo = 'camion'; this.color = '#e67e22'; this.largo = 60; }
            
            if (this.carril === CARRIL.IZQ) {
                if (origen === VIA.NORTE) this.destino = VIA.ESTE; if (origen === VIA.SUR) this.destino = VIA.OESTE;
                if (origen === VIA.ESTE) this.destino = VIA.SUR; if (origen === VIA.OESTE) this.destino = VIA.NORTE;
            } else {
                let giraDerecha = Math.random() > 0.5;
                if (origen === VIA.NORTE) this.destino = giraDerecha ? VIA.OESTE : VIA.SUR;
                if (origen === VIA.SUR) this.destino = giraDerecha ? VIA.ESTE : VIA.NORTE;
                if (origen === VIA.ESTE) this.destino = giraDerecha ? VIA.NORTE : VIA.OESTE;
                if (origen === VIA.OESTE) this.destino = giraDerecha ? VIA.SUR : VIA.ESTE;
            }
        } else {
            this.tipo = tipoEspecial; this.largo = 45; this.carril = CARRIL.RECTO_DER; this.destino = destinoEspecial; 
            this.color = tipoEspecial === 'ambulancia' ? '#fff' : tipoEspecial === 'bombero' ? '#e74c3c' : '#2980b9';
        }

        if(origen === VIA.NORTE) { this.x = this.carril === CARRIL.IZQ ? cx - 24 : cx - 54; this.y = -this.largo - 10; this.dir = {x: 0, y: 1}; }
        if(origen === VIA.SUR) { this.x = this.carril === CARRIL.IZQ ? cx + 6 : cx + 36; this.y = alto + 10; this.dir = {x: 0, y: -1}; }
        if(origen === VIA.ESTE) { this.y = this.carril === CARRIL.IZQ ? cy - 24 : cy - 54; this.x = ancho + 10; this.dir = {x: -1, y: 0}; }
        if(origen === VIA.OESTE) { this.y = this.carril === CARRIL.IZQ ? cy + 6 : cy + 36; this.x = -this.largo - 10; this.dir = {x: 1, y: 0}; }
    }
    
    getRect() { if (this.dir.x !== 0) return { x: this.x, y: this.y, w: this.largo, h: 18 }; return { x: this.x, y: this.y, w: 18, h: this.largo }; }
    
    //cálculo de colisiones con distancia al coche de delante
    distanciaAlCocheDelante(modelo) {
        let distMin = Infinity; let miRect = this.getRect();
        for (let v of modelo.vehiculos) {
            if (v === this || !v.activo) continue; let suRect = v.getRect(); let dist = -1;
            let solapanX = miRect.x < suRect.x + suRect.w && miRect.x + miRect.w > suRect.x; let solapanY = miRect.y < suRect.y + suRect.h && miRect.y + miRect.h > suRect.y;
            if (this.dir.y === 1 && solapanX && suRect.y >= miRect.y) dist = suRect.y - (miRect.y + miRect.h);
            if (this.dir.y === -1 && solapanX && suRect.y <= miRect.y) dist = miRect.y - (suRect.y + suRect.h);
            if (this.dir.x === 1 && solapanY && suRect.x >= miRect.x) dist = suRect.x - (miRect.x + miRect.w);
            if (this.dir.x === -1 && solapanY && suRect.x <= miRect.x) dist = miRect.x - (suRect.x + suRect.w);
            if (dist >= 0 && dist < distMin) distMin = dist;
        } return distMin;
    }
    
    ejecutarGiro() {
        if (this.haGirado || this.origen === this.destino) return;
        const cN_izq = cx + 6, cN_der = cx + 36, cS_izq = cx - 24, cS_der = cx - 54, cE_izq = cy + 6, cE_der = cy + 36, cO_izq = cy - 24, cO_der = cy - 54; let turned = false;
        if (this.origen === VIA.NORTE) { if (this.destino === VIA.ESTE && this.y + this.largo >= cE_izq + 10) { this.dir = {x: 1, y: 0}; this.y = cE_izq; this.x = this.x + 18 - this.largo; turned = true; } else if (this.destino === VIA.OESTE && this.y + this.largo >= cO_der + 10) { this.dir = {x: -1, y: 0}; this.y = cO_der; turned = true; } } 
        else if (this.origen === VIA.SUR) { if (this.destino === VIA.OESTE && this.y <= cO_izq + 10) { this.dir = {x: -1, y: 0}; this.y = cO_izq; turned = true; } else if (this.destino === VIA.ESTE && this.y <= cE_der + 10) { this.dir = {x: 1, y: 0}; this.y = cE_der; this.x = this.x + 18 - this.largo; turned = true; } } 
        else if (this.origen === VIA.ESTE) { if (this.destino === VIA.SUR && this.x <= cS_izq + 10) { this.dir = {x: 0, y: 1}; this.x = cS_izq; this.y = this.y + 18 - this.largo; turned = true; } else if (this.destino === VIA.NORTE && this.x <= cN_der + 10) { this.dir = {x: 0, y: -1}; this.x = cN_der; turned = true; } } 
        else if (this.origen === VIA.OESTE) { if (this.destino === VIA.NORTE && this.x + this.largo >= cN_izq + 10) { this.dir = {x: 0, y: -1}; this.x = cN_izq; turned = true; } else if (this.destino === VIA.SUR && this.x + this.largo >= cS_der + 10) { this.dir = {x: 0, y: 1}; this.x = cS_der; this.y = this.y + 18 - this.largo; turned = true; } }
        if (turned) this.haGirado = true;
    }
    
    mover(modelo) {
        let debeFrenar = false; let velActual = this.vel; let distFrente = this.distanciaAlCocheDelante(modelo);
        if (distFrente < 10) debeFrenar = true; else if (distFrente < 35) velActual = this.vel * 0.4; 
        
        if (this.dir.y === 1) { 
            let frontY = this.y + this.largo;
            if (frontY <= 70) {
                if (modelo.trenActivo && frontY + velActual >= 70) debeFrenar = true;
                let pParada = frontY + distFrente - 10; 
                if (pParada > 70 && pParada < 135 + this.largo && frontY + velActual >= 70) debeFrenar = true; 
            }
        } else if (this.dir.y === -1) { 
            if (this.y >= 125) { 
                if (modelo.trenActivo && this.y - velActual <= 125) debeFrenar = true;
                let pParada = this.y - distFrente + 10; 
                if (pParada < 125 && pParada > 20 && this.y - velActual <= 125) debeFrenar = true;
            }
        }
        
        if (!this.esEspecial && !this.haGirado && !debeFrenar) {
            const lN = cy - offsetCarretera - 15, lS = cy + offsetCarretera + 15, lE = cx + offsetCarretera + 15, lO = cx - offsetCarretera - 15;
            let semEstado = modelo.getSemaforo(this.origen, this.carril); 
            if (semEstado !== COLOR.VERDE) {
                if (this.origen === VIA.NORTE && this.y + this.largo <= lN && this.y + this.largo + velActual >= lN) debeFrenar = true;
                if (this.origen === VIA.SUR && this.y >= lS && this.y - velActual <= lS) debeFrenar = true;
                if (this.origen === VIA.ESTE && this.x >= lE && this.x - velActual <= lE) debeFrenar = true;
                if (this.origen === VIA.OESTE && this.x + this.largo <= lO && this.x + this.largo + velActual >= lO) debeFrenar = true;
            }
        }
        
        if (!debeFrenar || (this.esEspecial && distFrente > 15)) { this.x += this.dir.x * velActual; this.y += this.dir.y * velActual; this.ejecutarGiro(); }
        if (this.x < -100 || this.x > ancho + 100 || this.y < -100 || this.y > alto + 100) this.activo = false;
    }
    
    dibujar() {
        ctx.fillStyle = this.color;
        if(this.dir.x !== 0) ctx.fillRect(this.x, this.y, this.largo, 18); else ctx.fillRect(this.x, this.y, 18, this.largo);
        if(this.esEspecial) { ctx.fillStyle = (Date.now() % 300 < 150) ? 'red' : 'blue'; ctx.fillRect(this.x + 2, this.y + 2, this.dir.x !== 0 ? 8 : 14, this.dir.x !== 0 ? 14 : 8); }
    }
}

//controladores principales y secuencia
function actualizarVol(via, valor) { Gestor.setVolumen(via, valor); document.getElementById('val' + via).innerText = valor; }
function activarPeaton(via) { Gestor.activarPeaton(via); }
function forzarManual(via) { Gestor.activarManual(via); }
function soltarManual() { Gestor.desactivarManual(); }

function generarTrafico() { 
    Object.values(VIA).forEach(via => {
        if (Math.random() < ((Gestor.getVolumen(via) / 10) * 0.01)) {
            let nuevoV = new Vehiculo(via); let rectN = nuevoV.getRect(); let solapa = false;
            for(let v of Gestor.vehiculos) {
                if(!v.activo) continue; let rV = v.getRect();
                if(rectN.x < rV.x + rV.w + 20 && rectN.x + rectN.w + 20 > rV.x && rectN.y < rV.y + rV.h + 20 && rectN.y + rectN.h + 20 > rV.y) { solapa = true; break; }
            }
            if(!solapa) Gestor.agregarVehiculo(nuevoV);
        }
    });
}

function lanzarEmergencia() {
    const origen = document.getElementById('origenE').value; const destino = document.getElementById('destinoE').value;
    if(origen === destino) { alert("Origen y destino deben ser diferentes"); return; }
    Gestor.agregarVehiculo(new Vehiculo(origen, true, document.getElementById('tipoE').value, destino));
    Gestor.activarEmergencia(origen);
    setTimeout(() => { Gestor.desactivarEmergencia(); }, 5000); 
}

let intTren;
function configurarTren(seg) {
    let tiempoSeguro = Math.max(parseInt(seg), 9);
    document.getElementById('freqTren').value = tiempoSeguro; 
    clearInterval(intTren);
    intTren = setInterval(() => { if (!Gestor.trenActivo) Gestor.activarTren(); }, tiempoSeguro * 1000); 
}

function estadoBloqueoPeaton(viaOrigen, carril) {
    let maxFase = FASE_PEATON.INACTIVO;
    const comprobarConflictos = (viaCruzando) => {
        let p = Gestor.getPeaton(viaCruzando);
        if (p.activo) {
            if (p.fase === FASE_PEATON.VERDE) maxFase = FASE_PEATON.VERDE;
            else if (p.fase === FASE_PEATON.AMBAR && maxFase !== FASE_PEATON.VERDE) maxFase = FASE_PEATON.AMBAR;
        }
    };

    comprobarConflictos(viaOrigen); 

    let destinos = [];
    if (carril === CARRIL.IZQ) {
        if (viaOrigen === VIA.NORTE) destinos = [VIA.ESTE]; if (viaOrigen === VIA.SUR) destinos = [VIA.OESTE];
        if (viaOrigen === VIA.ESTE) destinos = [VIA.SUR]; if (viaOrigen === VIA.OESTE) destinos = [VIA.NORTE];
    } else {
        if (viaOrigen === VIA.NORTE) destinos = [VIA.SUR, VIA.OESTE]; if (viaOrigen === VIA.SUR) destinos = [VIA.NORTE, VIA.ESTE];
        if (viaOrigen === VIA.ESTE) destinos = [VIA.OESTE, VIA.NORTE]; if (viaOrigen === VIA.OESTE) destinos = [VIA.ESTE, VIA.SUR];
    }
    destinos.forEach(d => comprobarConflictos(d)); 

    return maxFase;
}

function procesarSecuencia(deltaTime) {
    Object.values(VIA).forEach(via => {
        let p = Gestor.getPeaton(via);
        if (p.activo) {
            p.tiempo -= deltaTime;
            if (p.fase === FASE_PEATON.AMBAR && p.tiempo <= 0) {
                p.fase = FASE_PEATON.VERDE; p.tiempo = 10000; 
            } else if (p.fase === FASE_PEATON.VERDE && p.tiempo <= 0) {
                p.activo = false; p.fase = FASE_PEATON.INACTIVO;
            }
        }
    });

    if (Gestor.manualActivo || Gestor.emergenciaActiva) return;

    Gestor.avanzarTiempoSecuencia(deltaTime);
    if (Gestor.secuenciaTiempo >= 17000) Gestor.avanzarFaseSecuencia();

    let intentos = 0;
    while(intentos < 4) {
        const fase = Gestor.secuenciaFase;
        let semaforosActivos = [];
        if (fase === 1) semaforosActivos = [{v: VIA.OESTE, c: CARRIL.RECTO_DER}, {v: VIA.ESTE, c: CARRIL.RECTO_DER}];
        else if (fase === 2) semaforosActivos = [{v: VIA.OESTE, c: CARRIL.IZQ}, {v: VIA.ESTE, c: CARRIL.IZQ}];
        else if (fase === 3) semaforosActivos = [{v: VIA.NORTE, c: CARRIL.RECTO_DER}, {v: VIA.SUR, c: CARRIL.RECTO_DER}];
        else if (fase === 4) semaforosActivos = [{v: VIA.NORTE, c: CARRIL.IZQ}, {v: VIA.SUR, c: CARRIL.IZQ}];

        let todosBloqueados = semaforosActivos.every(sem => estadoBloqueoPeaton(sem.v, sem.c) === FASE_PEATON.VERDE);
        
        if (todosBloqueados) {
            Gestor.avanzarFaseSecuencia();
            intentos++;
        } else {
            break; 
        }
    }

    let baseColor = Gestor.secuenciaTiempo < 10000 ? COLOR.VERDE : (Gestor.secuenciaTiempo < 15000 ? COLOR.AMBAR : COLOR.ROJO); 
    Gestor.todoRojo();
    
    const aplicarColor = (v, c, defColor) => {
        let bloqueo = estadoBloqueoPeaton(v, c);
        if (bloqueo === FASE_PEATON.VERDE) Gestor.setSemaforo(v, c, COLOR.ROJO);
        else if (bloqueo === FASE_PEATON.AMBAR) Gestor.setSemaforo(v, c, COLOR.AMBAR);
        else Gestor.setSemaforo(v, c, defColor);
    };

    if (baseColor !== COLOR.ROJO) {
        const f = Gestor.secuenciaFase;
        if (f === 1) { aplicarColor(VIA.OESTE, CARRIL.RECTO_DER, baseColor); aplicarColor(VIA.ESTE, CARRIL.RECTO_DER, baseColor); }
        else if (f === 2) { aplicarColor(VIA.OESTE, CARRIL.IZQ, baseColor); aplicarColor(VIA.ESTE, CARRIL.IZQ, baseColor); }
        else if (f === 3) { aplicarColor(VIA.NORTE, CARRIL.RECTO_DER, baseColor); aplicarColor(VIA.SUR, CARRIL.RECTO_DER, baseColor); }
        else if (f === 4) { aplicarColor(VIA.NORTE, CARRIL.IZQ, baseColor); aplicarColor(VIA.SUR, CARRIL.IZQ, baseColor); }
    }

    if (Gestor.trenActivo) { 
        Gestor.setSemaforo(VIA.NORTE, CARRIL.RECTO_DER, COLOR.ROJO); Gestor.setSemaforo(VIA.NORTE, CARRIL.IZQ, COLOR.ROJO); 
        Gestor.setSemaforo(VIA.SUR, CARRIL.RECTO_DER, COLOR.ROJO); Gestor.setSemaforo(VIA.ESTE, CARRIL.RECTO_DER, COLOR.ROJO); Gestor.setSemaforo(VIA.OESTE, CARRIL.IZQ, COLOR.ROJO); 
    }
}

//apartado visual
function dibujarEscenario() {
    ctx.fillStyle = '#81c784'; ctx.fillRect(0, 0, ancho, alto);
    ctx.fillStyle = '#555'; 
    ctx.fillRect(cx - offsetCarretera, 0, anchoCarretera, alto); ctx.fillRect(0, cy - offsetCarretera, ancho, anchoCarretera); ctx.fillRect(cx - offsetCarretera, cy - offsetCarretera, anchoCarretera, anchoCarretera);
    
    ctx.lineWidth = 2;
    const lPunteada = (x1, y1, x2, y2) => { ctx.strokeStyle = '#fff'; ctx.setLineDash([15, 15]); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    const lDoble = (x1, y1, x2, y2) => { ctx.strokeStyle = '#fbc02d'; ctx.setLineDash([]); if (x1 === x2) { ctx.beginPath(); ctx.moveTo(x1 - 2, y1); ctx.lineTo(x2 - 2, y2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x1 + 2, y1); ctx.lineTo(x2 + 2, y2); ctx.stroke(); } else { ctx.beginPath(); ctx.moveTo(x1, y1 - 2); ctx.lineTo(x2, y2 - 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x1, y1 + 2); ctx.lineTo(x2, y2 + 2); ctx.stroke(); } };
    lDoble(cx, 0, cx, cy - offsetCarretera); lPunteada(cx - anchoCarril, 0, cx - anchoCarril, cy - offsetCarretera); lPunteada(cx + anchoCarril, 0, cx + anchoCarril, cy - offsetCarretera);
    lDoble(cx, cy + offsetCarretera, cx, alto); lPunteada(cx - anchoCarril, cy + offsetCarretera, cx - anchoCarril, alto); lPunteada(cx + anchoCarril, cy + offsetCarretera, cx + anchoCarril, alto);
    lDoble(0, cy, cx - offsetCarretera, cy); lPunteada(0, cy - anchoCarril, cx - offsetCarretera, cy - anchoCarril); lPunteada(0, cy + anchoCarril, cx - offsetCarretera, cy + anchoCarril);
    lDoble(cx + offsetCarretera, cy, ancho, cy); lPunteada(cx + offsetCarretera, cy - anchoCarril, ancho, cy - anchoCarril); lPunteada(cx + offsetCarretera, cy + anchoCarril, ancho, cy + anchoCarril);
    
    ctx.fillStyle = '#fff';
    for(let i=0; i<anchoCarretera; i+=15) { ctx.fillRect(cx-offsetCarretera+i+2, cy-offsetCarretera-15, 10, 15); ctx.fillRect(cx-offsetCarretera+i+2, cy+offsetCarretera, 10, 15); ctx.fillRect(cx-offsetCarretera-15, cy-offsetCarretera+i+2, 15, 10); ctx.fillRect(cx+offsetCarretera, cy-offsetCarretera+i+2, 15, 10); }

    ctx.fillStyle = '#5d4037'; 
    for(let i = 0; i < ancho; i += 25) {
        let pBase = getViaPos(i, false);
        ctx.save(); ctx.translate(pBase.x, pBase.y); ctx.rotate(pBase.angulo); ctx.fillRect(-5, -20, 10, 40); ctx.restore();
        if (i >= xBifurcacion) {
            let pAlt = getViaPos(i, true); ctx.save(); ctx.translate(pAlt.x, pAlt.y); ctx.rotate(pAlt.angulo); ctx.fillRect(-5, -20, 10, 40); ctx.restore();
        }
    }

    ctx.lineWidth = 4; ctx.strokeStyle = '#9e9e9e';
    ctx.beginPath(); ctx.moveTo(0, yTrenBase + 20 - 13); ctx.lineTo(xBifurcacion - 20, yTrenBase + 20 - 13); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, yTrenBase + 20 + 13); ctx.lineTo(xBifurcacion - 20, yTrenBase + 20 + 13); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(xBifurcacion + 20, yTrenBase + 20 - 13); ctx.lineTo(ancho, yTrenBase + 20 - 13); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(xBifurcacion + 20, yTrenBase + 20 + 13); ctx.lineTo(ancho, yTrenBase + 20 + 13); ctx.stroke();

    ctx.beginPath();
    for(let i = xBifurcacion + 20; i <= ancho; i += 5) { let p = getViaPos(i, true); let rx = p.x + 13 * Math.sin(p.angulo); let ry = p.y - 13 * Math.cos(p.angulo); i === xBifurcacion + 20 ? ctx.moveTo(rx, ry) : ctx.lineTo(rx, ry); } ctx.stroke();
    ctx.beginPath();
    for(let i = xBifurcacion + 20; i <= ancho; i += 5) { let p = getViaPos(i, true); let rx = p.x - 13 * Math.sin(p.angulo); let ry = p.y + 13 * Math.cos(p.angulo); i === xBifurcacion + 20 ? ctx.moveTo(rx, ry) : ctx.lineTo(rx, ry); } ctx.stroke();

    ctx.beginPath();
    if(Gestor.trenPalanca) {
        let pStart = getViaPos(xBifurcacion - 20, false); let pEnd = getViaPos(xBifurcacion + 20, true);
        ctx.moveTo(pStart.x, pStart.y - 13); ctx.lineTo(pEnd.x + 13 * Math.sin(pEnd.angulo), pEnd.y - 13 * Math.cos(pEnd.angulo));
        ctx.moveTo(pStart.x, pStart.y + 13); ctx.lineTo(pEnd.x - 13 * Math.sin(pEnd.angulo), pEnd.y + 13 * Math.cos(pEnd.angulo));
    } else {
        ctx.moveTo(xBifurcacion - 20, yTrenBase + 20 - 13); ctx.lineTo(xBifurcacion + 20, yTrenBase + 20 - 13);
        ctx.moveTo(xBifurcacion - 20, yTrenBase + 20 + 13); ctx.lineTo(xBifurcacion + 20, yTrenBase + 20 + 13);
    }
    ctx.stroke();

    ctx.fillStyle = '#2c3e50'; ctx.fillRect(posPalanca.x - 12, posPalanca.y - 12, 24, 24); 
    ctx.save(); ctx.translate(posPalanca.x, posPalanca.y); const anguloPalanca = Gestor.trenPalanca ? 0 : Math.PI; 
    ctx.rotate(anguloPalanca); ctx.fillStyle = '#e74c3c'; ctx.fillRect(-3, -25, 6, 25);
    ctx.beginPath(); ctx.arc(0, -25, 6, 0, Math.PI*2); ctx.fill(); ctx.restore();

    // Dibujar las cajas de las frases ANTES que el tren
    const cajaW = 140; const cajaH = 34; const cajaX = ancho - cajaW - 10; const frases = Gestor.trenFrases;
    ctx.fillStyle = '#ecf0f1'; ctx.fillRect(cajaX, yTrenDesvio + 20 - cajaH/2, cajaW, cajaH);
    ctx.lineWidth = 2; ctx.strokeStyle = '#c0392b'; ctx.strokeRect(cajaX, yTrenDesvio + 20 - cajaH/2, cajaW, cajaH);
    ctx.fillStyle = '#2c3e50'; ctx.font = 'bold 12px Arial'; ctx.fillText(frases[1], cajaX + 5, yTrenDesvio + 24, cajaW - 10);
    ctx.fillStyle = '#ecf0f1'; ctx.fillRect(cajaX, yTrenBase + 20 - cajaH/2, cajaW, cajaH);
    ctx.strokeStyle = '#f39c12'; ctx.strokeRect(cajaX, yTrenBase + 20 - cajaH/2, cajaW, cajaH);
    ctx.fillStyle = '#2c3e50'; ctx.fillText(frases[0], cajaX + 5, yTrenBase + 24, cajaW - 10);

    if(Gestor.trenActivo) { 
        const numVagones = 5; const largoVagon = 60; const separacion = 5;
        for(let i = numVagones - 1; i >= 0; i--) { 
            let xCentroVagon = Gestor.trenX - (i * (largoVagon + separacion));
            if (xCentroVagon < -150 || xCentroVagon > ancho + 150) continue; 
            let posVagon = getViaPos(xCentroVagon, Gestor.trenPalanca);

            ctx.save(); ctx.translate(posVagon.x, posVagon.y); ctx.rotate(posVagon.angulo);
            ctx.fillStyle = i === 0 ? '#900C3F' : '#c0392b'; ctx.fillRect(-largoVagon/2, -18, largoVagon, 36);
            ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(-largoVagon/2 + 2, -12, largoVagon - 4, 24);
            if (i === 0) { ctx.fillStyle = '#f1c40f'; ctx.fillRect(largoVagon/2 - 4, -12, 4, 6); ctx.fillRect(largoVagon/2 - 4, 6, 4, 6); ctx.fillStyle = '#111'; ctx.fillRect(largoVagon/2 - 15, -10, 10, 20); }
            if (i > 0) { ctx.fillStyle = '#222'; ctx.fillRect(-largoVagon/2 - separacion, -4, separacion + 2, 8); }
            ctx.restore();
        }
        Gestor.moverTren(3.5); 
        if (Gestor.trenX - (numVagones * (largoVagon + separacion)) > ancho + 100) Gestor.desactivarTren();
        ctx.fillStyle = 'red'; ctx.fillRect(cx - offsetCarretera, yTrenBase - 10, anchoCarretera, 6); ctx.fillRect(cx - offsetCarretera, 125, anchoCarretera, 6); 
    }
}

function dibujarSemaforos() {
    const dibujarPoste3Luces = (x, y, estado, horizontal) => {
        ctx.fillStyle = '#222';
        const cRojo = estado === COLOR.ROJO ? '#ff0000' : '#4a0000'; 
        const cAmbar = estado === COLOR.AMBAR ? '#ffcc00' : '#4a3b00'; 
        const cVerde = estado === COLOR.VERDE ? '#00ff00' : '#004a00';
        
        if (horizontal) {
            ctx.fillRect(x, y, 42, 16); 
            ctx.fillStyle = cRojo; ctx.beginPath(); ctx.arc(x+8, y+8, 5, 0, Math.PI*2); ctx.fill(); 
            ctx.fillStyle = cAmbar; ctx.beginPath(); ctx.arc(x+21, y+8, 5, 0, Math.PI*2); ctx.fill(); 
            ctx.fillStyle = cVerde; ctx.beginPath(); ctx.arc(x+34, y+8, 5, 0, Math.PI*2); ctx.fill();
        } else {
            ctx.fillRect(x, y, 16, 42); 
            ctx.fillStyle = cRojo; ctx.beginPath(); ctx.arc(x+8, y+8, 5, 0, Math.PI*2); ctx.fill(); 
            ctx.fillStyle = cAmbar; ctx.beginPath(); ctx.arc(x+8, y+21, 5, 0, Math.PI*2); ctx.fill(); 
            ctx.fillStyle = cVerde; ctx.beginPath(); ctx.arc(x+8, y+34, 5, 0, Math.PI*2); ctx.fill();
        }
    };

    dibujarPoste3Luces(cx - 53, cy - 160, Gestor.getSemaforo(VIA.NORTE, CARRIL.RECTO_DER), false); 
    dibujarPoste3Luces(cx - 23, cy - 160, Gestor.getSemaforo(VIA.NORTE, CARRIL.IZQ), false);
    dibujarPoste3Luces(cx + 37, cy + 118, Gestor.getSemaforo(VIA.SUR, CARRIL.RECTO_DER), false);  
    dibujarPoste3Luces(cx + 7, cy + 118, Gestor.getSemaforo(VIA.SUR, CARRIL.IZQ), false);
    dibujarPoste3Luces(cx + 118, cy - 53, Gestor.getSemaforo(VIA.ESTE, CARRIL.RECTO_DER), true);   
    dibujarPoste3Luces(cx + 118, cy - 23, Gestor.getSemaforo(VIA.ESTE, CARRIL.IZQ), true);
    dibujarPoste3Luces(cx - 160, cy + 37, Gestor.getSemaforo(VIA.OESTE, CARRIL.RECTO_DER), true);  
    dibujarPoste3Luces(cx - 160, cy + 7, Gestor.getSemaforo(VIA.OESTE, CARRIL.IZQ), true);

    const dibujarPeaton = (x, y, peaton) => {
        ctx.fillStyle = '#222'; ctx.fillRect(x, y, 16, 28);
        let luzTop = (peaton.fase === FASE_PEATON.INACTIVO || peaton.fase === FASE_PEATON.AMBAR) ? '#ff0000' : '#4a0000';
        let luzBot = (peaton.fase === FASE_PEATON.VERDE) ? '#00ff00' : '#004a00';
        
        ctx.fillStyle = luzTop; ctx.beginPath(); ctx.arc(x+8, y+8, 4, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = luzBot; ctx.beginPath(); ctx.arc(x+8, y+20, 4, 0, Math.PI*2); ctx.fill();
        
        if (peaton.activo) { 
            ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Arial'; 
            ctx.fillText(Math.ceil(peaton.tiempo/1000), x + 20, y + 18); 
        }
    };
    
    dibujarPeaton(cx - 8, cy - 110, Gestor.getPeaton(VIA.NORTE));
    dibujarPeaton(cx - 8, cy + 82, Gestor.getPeaton(VIA.SUR));
    dibujarPeaton(cx + 82, cy - 14, Gestor.getPeaton(VIA.ESTE));
    dibujarPeaton(cx - 100, cy - 14, Gestor.getPeaton(VIA.OESTE));
}

//bucle principal de animación
let ultimoTick = performance.now();
function loop(tiempoActual) {
    const deltaTime = tiempoActual - ultimoTick; ultimoTick = tiempoActual;
    
    procesarSecuencia(deltaTime); 
    generarTrafico();
    
    Gestor.vehiculos.forEach(v => v.mover(Gestor)); 
    Gestor.limpiarVehiculosInactivos();

    ctx.clearRect(0, 0, ancho, alto); 
    
    dibujarEscenario(); 
    Gestor.vehiculos.forEach(v => v.dibujar()); 
    dibujarSemaforos(); 
    
    requestAnimationFrame(loop);
}

configurarTren(document.getElementById('freqTren').value);
requestAnimationFrame(loop);