// App de entrenamiento — versión 1
// Todo funciona en el propio dispositivo: los datos se guardan en localStorage.
'use strict';

const CLAVE_DATOS = 'entreno-datos-v1';
const CLAVE_RESPALDO_PREVIO = 'entreno-respaldo-antes-de-importar';
const VERSION_DATOS = 1;

const TIPOS_CARGA = {
  mancuerna: { nombre: 'Mancuernas', pista: 'kg de CADA mancuerna' },
  mancuerna1: { nombre: 'Una mancuerna', pista: 'kg de la mancuerna (una sola)' },
  barra: { nombre: 'Barra', pista: 'kg TOTALES, incluida la barra' },
  maquina: { nombre: 'Máquina', pista: 'kg que marca la máquina' },
  polea: { nombre: 'Polea', pista: 'kg que marca la polea' },
  multipower: { nombre: 'Multipower', pista: 'kg de discos (anota en la máquina si cuentas la barra)' },
  asistida: { nombre: 'Asistida', pista: 'kg de ASISTENCIA (menos asistencia = progreso)' },
  lastre: { nombre: 'Carga añadida', pista: 'kg de carga añadida' },
  banda: { nombre: 'Banda', pista: 'sin kg: indica la banda o tensión en las notas' },
  corporal: { nombre: 'Peso corporal', pista: 'kg de lastre añadido (vacío o 0 si sin lastre)' },
};

const INCREMENTOS_POR_DEFECTO = {
  mancuerna: 2, mancuerna1: 2, barra: 2.5, maquina: 2.5, polea: 2.5,
  multipower: 2.5, asistida: 2.5, lastre: 1, banda: 0, corporal: 1,
};

const DIAS_SEMANA = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const clonar = (o) => JSON.parse(JSON.stringify(o));

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function fechaISO(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
const fechaDesdeISO = (iso) => new Date(iso + 'T12:00:00');

function fechaLarga(iso) {
  return fechaDesdeISO(iso).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}
function fechaCorta(iso) {
  return fechaDesdeISO(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}
// 1 = lunes … 7 = domingo
const diaSemana = (iso) => ((fechaDesdeISO(iso).getDay() + 6) % 7) + 1;

function lunesDe(iso) {
  const d = fechaDesdeISO(iso);
  d.setDate(d.getDate() - (diaSemana(iso) - 1));
  return fechaISO(d);
}
function sumarDias(iso, n) {
  const d = fechaDesdeISO(iso);
  d.setDate(d.getDate() + n);
  return fechaISO(d);
}

function diasEntre(isoA, isoB) {
  return Math.round((fechaDesdeISO(isoB) - fechaDesdeISO(isoA)) / 86400000);
}

// Números: se aceptan comas o puntos; se muestran con coma.
function leerNumero(texto) {
  const t = String(texto ?? '').trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
const fmt = (n) => (n === null || n === undefined || n === '' ? '' : String(n).replace('.', ','));

function rango(a, b) {
  if (a === null || a === undefined) return fmt(b);
  if (b === null || b === undefined || a === b) return fmt(a);
  return `${fmt(a)}–${fmt(b)}`;
}

// Iconos SVG (trazo fino, heredan el color del texto)
const ICONOS = {
  editar: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  nota: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  etiqueta: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  idea: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  buscar: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  biblioteca: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
  alerta: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
  movil: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  play: '<path d="M8 5v14l11-7z" fill="currentColor"/>',
};
const icono = (n) => `<svg class="icono" viewBox="0 0 24 24" aria-hidden="true">${ICONOS[n] || ''}</svg>`;

// Tiempo de sesión: siempre se calcula desde la hora de inicio guardada.
function segundosSesion(s) {
  if (s.status === 'en_curso' && s.startedAt) return Math.max(0, (Date.now() - Date.parse(s.startedAt)) / 1000);
  if (typeof s.durationSec === 'number') return s.durationSec;
  if (s.startedAt && s.finishedAt) return Math.max(0, (Date.parse(s.finishedAt) - Date.parse(s.startedAt)) / 1000);
  return null;
}
function duracionTexto(seg) {
  if (seg === null || !Number.isFinite(seg)) return '—';
  const t = Math.floor(seg);
  const p = (n) => String(n).padStart(2, '0');
  return `${Math.floor(t / 3600)}:${p(Math.floor((t % 3600) / 60))}:${p(t % 60)}`;
}
// Elemento que se actualiza cada segundo mientras la sesión está en curso.
const relojSesion = (s) => (s.status === 'en_curso'
  ? `<span class="reloj-sesion" data-inicio="${esc(s.startedAt)}">${duracionTexto(segundosSesion(s))}</span>`
  : `<span class="reloj-sesion">${duracionTexto(segundosSesion(s))}</span>`);
setInterval(() => {
  document.querySelectorAll('[data-inicio]').forEach((el) => {
    el.textContent = duracionTexto(Math.max(0, (Date.now() - Date.parse(el.dataset.inicio)) / 1000));
  });
}, 1000);

const normalizarMaquina = (m) => String(m ?? '').trim().toLowerCase();
const claveVariante = (nombre, maquina) => `${nombre}||${normalizarMaquina(maquina)}`;

// ---------------------------------------------------------------------------
// Datos: carga, guardado y valores por defecto
// ---------------------------------------------------------------------------
function prepararRutina(base) {
  const r = clonar(base);
  r.id = uid();
  r.days.forEach((d) => {
    d.id = uid();
    d.exercises.forEach((e) => { e.id = uid(); });
  });
  return r;
}

function datosIniciales() {
  const rutina = prepararRutina(crearRutinaBase());
  return {
    app: 'entreno',
    version: VERSION_DATOS,
    creado: new Date().toISOString(),
    routines: [rutina],
    activeRoutineId: rutina.id,
    sessions: [],
    weekPlans: {},
    customExercises: [],
    settings: { increments: { ...INCREMENTOS_POR_DEFECTO }, readapt: false },
    meta: { lastBackup: null },
  };
}

// Completa campos que falten (útil al importar copias o tras actualizaciones).
function normalizarDatos(d) {
  d.app = 'entreno';
  d.version = VERSION_DATOS;
  d.routines = Array.isArray(d.routines) ? d.routines : [];
  d.sessions = Array.isArray(d.sessions) ? d.sessions : [];
  d.weekPlans = d.weekPlans && typeof d.weekPlans === 'object' ? d.weekPlans : {};
  d.customExercises = Array.isArray(d.customExercises) ? d.customExercises : [];
  d.settings = d.settings || {};
  d.settings.increments = { ...INCREMENTOS_POR_DEFECTO, ...(d.settings.increments || {}) };
  d.settings.readapt = !!d.settings.readapt;
  d.meta = d.meta || { lastBackup: null };
  d.routines.forEach((r) => {
    r.id = r.id || uid();
    r.days = Array.isArray(r.days) ? r.days : [];
    r.days.forEach((dia) => {
      dia.id = dia.id || uid();
      dia.exercises = Array.isArray(dia.exercises) ? dia.exercises : [];
      dia.exercises.forEach((e) => {
        e.id = e.id || uid();
        e.variants = Array.isArray(e.variants) && e.variants.length ? e.variants : [{ name: 'Ejercicio', load: 'maquina', uni: false, note: '' }];
      });
    });
  });
  if (!d.routines.length) {
    const r = prepararRutina(crearRutinaBase());
    d.routines.push(r);
  }
  if (!d.routines.some((r) => r.id === d.activeRoutineId)) d.activeRoutineId = d.routines[0].id;
  d.sessions.forEach((s) => {
    s.exercises = Array.isArray(s.exercises) ? s.exercises : [];
    s.exercises.forEach((e) => {
      e.sets = Array.isArray(e.sets) ? e.sets : [];
      e.sets.forEach((x) => { x.id = x.id || uid(); x.type = x.type === 'C' ? 'C' : 'T'; });
      // Solo se rellenan campos que falten (copias dañadas o antiguas); lo existente no se toca.
      if (typeof e.name !== 'string' || !e.name) e.name = 'Ejercicio';
      if (!Array.isArray(e.variants) || !e.variants.length) e.variants = [{ name: e.name, load: e.load || 'maquina', uni: !!e.uni, note: '' }];
      if (!(e.variantIdx >= 0 && e.variantIdx < e.variants.length)) e.variantIdx = 0;
      if (!e.target || typeof e.target !== 'object') {
        e.target = {
          sets: e.sets.filter((x) => x.type === 'T').length || 1,
          repMin: null, repMax: null, rirMin: null, rirMax: null, rest: '', note: '', reduced: false,
        };
      }
      if (typeof e.machine !== 'string') e.machine = '';
      if (typeof e.note !== 'string') e.note = '';
    });
  });
  return d;
}

// Comprueba que un archivo importado es una copia de esta app.
function validarCopia(obj) {
  if (!obj || typeof obj !== 'object') return 'El archivo no contiene datos válidos.';
  if (obj.app !== 'entreno') return 'El archivo no es una copia de esta app.';
  if (!Array.isArray(obj.routines) || !Array.isArray(obj.sessions)) return 'A la copia le faltan rutinas o sesiones.';
  const esObjeto = (x) => x && typeof x === 'object' && !Array.isArray(x);
  for (const r of obj.routines) {
    if (!esObjeto(r) || !Array.isArray(r.days)) return 'Hay una rutina con un formato incorrecto en la copia.';
    for (const d of r.days) {
      if (!esObjeto(d) || !Array.isArray(d.exercises)) return 'Hay un día de rutina con un formato incorrecto en la copia.';
      for (const e of d.exercises) {
        if (!esObjeto(e) || !Array.isArray(e.variants) || !e.variants.length
          || !e.variants.every((v) => esObjeto(v) && typeof v.name === 'string')) {
          return 'Hay un ejercicio de rutina con un formato incorrecto en la copia.';
        }
      }
    }
  }
  for (const s of obj.sessions) {
    if (!esObjeto(s) || !s.id || !/^\d{4}-\d{2}-\d{2}$/.test(s.date || '') || !Array.isArray(s.exercises)) {
      return 'Hay una sesión con un formato incorrecto en la copia.';
    }
    for (const e of s.exercises) {
      if (!esObjeto(e) || !Array.isArray(e.sets) || !e.sets.every(esObjeto)) {
        return `La sesión del ${s.date} tiene un ejercicio con un formato incorrecto.`;
      }
    }
  }
  return null;
}

let datos;
let errorAlmacenamiento = false;
// Número de versión de los datos que tiene esta ventana. Si otra ventana o pestaña
// guarda antes, el número guardado cambia y esta ventana no sobrescribe sus datos.
let revCargada = 0;
let cambiosPendientes = false;
let errorAvisado = false;

function revEnDisco() {
  try {
    const texto = localStorage.getItem(CLAVE_DATOS);
    if (!texto) return 0;
    const meta = JSON.parse(texto).meta;
    return (meta && meta.rev) || 0;
  } catch (e) {
    return null; // ilegible: no se puede comparar
  }
}

function cargar() {
  try {
    const texto = localStorage.getItem(CLAVE_DATOS);
    if (texto) {
      const d = normalizarDatos(JSON.parse(texto));
      revCargada = d.meta.rev || 0;
      return d;
    }
  } catch (e) {
    console.error(e);
    errorAlmacenamiento = true;
    // Se aparta una copia de lo que hubiera para no perderlo al guardar de nuevo.
    try { localStorage.setItem('entreno-datos-ilegibles', localStorage.getItem(CLAVE_DATOS)); } catch (e2) { /* nada */ }
  }
  return datosIniciales();
}

let temporizadorGuardado = null;
function guardarYa() {
  clearTimeout(temporizadorGuardado);
  temporizadorGuardado = null;
  const enDisco = revEnDisco();
  if (enDisco !== null && enDisco !== revCargada) {
    conflictoEntreVentanas();
    return false;
  }
  try {
    datos.meta.rev = revCargada + 1;
    localStorage.setItem(CLAVE_DATOS, JSON.stringify(datos));
    revCargada = datos.meta.rev;
    cambiosPendientes = false;
    errorAvisado = false;
    marcarGuardado('Guardado ✓');
    return true;
  } catch (e) {
    console.error(e);
    cambiosPendientes = true; // se reintentará al cambiar o cerrar la app
    marcarGuardado('⚠ Sin guardar');
    if (!errorAvisado) {
      errorAvisado = true;
      alert('No se ha podido guardar en este dispositivo (puede que no quede espacio).\n\nTus últimos cambios NO están guardados. Ve a Datos y exporta una copia de seguridad.');
    }
    return false;
  }
}

// Otra ventana o pestaña de la app guardó cambios: se cargan esos datos en vez de pisarlos.
function conflictoEntreVentanas() {
  clearTimeout(temporizadorGuardado);
  temporizadorGuardado = null;
  cambiosPendientes = false;
  datos = cargar();
  marcarGuardado('');
  alert('Tus datos se han modificado en otra ventana o pestaña de la app. Se han cargado los datos más recientes para no perder nada.\n\nSi tu último cambio no aparece, vuelve a hacerlo.');
  repintar();
}

// Si otra pestaña guarda, esta se actualiza (si no tiene cambios propios sin guardar).
window.addEventListener('storage', (ev) => {
  if (ev.key !== CLAVE_DATOS || !ev.newValue) return;
  if (cambiosPendientes || temporizadorGuardado) { conflictoEntreVentanas(); return; }
  datos = cargar();
  repintar();
});

// Guardado con una pequeña espera para no escribir en cada tecla.
function guardar() {
  cambiosPendientes = true;
  marcarGuardado('Guardando…');
  clearTimeout(temporizadorGuardado);
  temporizadorGuardado = setTimeout(guardarYa, 300);
}
// Si la app se cierra o pasa a segundo plano, se guarda al momento.
window.addEventListener('pagehide', () => { if (cambiosPendientes) guardarYa(); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && cambiosPendientes) guardarYa();
});

function marcarGuardado(texto) {
  const el = document.getElementById('estado-guardado');
  if (el) el.textContent = texto;
}

let temporizadorAviso = null;
function aviso(texto) {
  const el = document.getElementById('aviso');
  el.textContent = texto;
  el.hidden = false;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => { el.hidden = true; }, 3500);
}

// ---------------------------------------------------------------------------
// Consultas sobre los datos
// ---------------------------------------------------------------------------
const rutinaActiva = () => datos.routines.find((r) => r.id === datos.activeRoutineId) || datos.routines[0];
const buscarRutina = (id) => datos.routines.find((r) => r.id === id);
const buscarSesion = (id) => datos.sessions.find((s) => s.id === id);
const sesionEnCurso = () => datos.sessions.find((s) => s.status === 'en_curso');

function ordenSesion(a, b) {
  // Más recientes primero
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return (b.startedAt || '').localeCompare(a.startedAt || '');
}
const sesionesTerminadas = () => datos.sessions.filter((s) => s.status === 'terminada').sort(ordenSesion);

const seriesTrabajoHechas = (ej) => ej.sets.filter((x) => x.type === 'T' && x.done);
const totalSeriesDia = (dia) => dia.exercises.reduce((t, e) => t + (Number(e.sets) || 0), 0);

// Sesión anterior a `sesion` (por fecha) en la que se hizo esta variante.
function registroAnterior(sesion, nombre, maquina) {
  const antes = sesionesTerminadas().filter((s) => s.id !== sesion.id
    && (s.date < sesion.date || (s.date === sesion.date && (s.startedAt || '') < (sesion.startedAt || ''))));
  let otraMaquina = null;
  for (const s of antes) {
    for (const e of s.exercises) {
      if (e.name !== nombre || !e.sets.some((x) => x.done)) continue;
      if (normalizarMaquina(e.machine) === normalizarMaquina(maquina)) return { sesion: s, ej: e, mismaMaquina: true };
      if (!otraMaquina) otraMaquina = { sesion: s, ej: e, mismaMaquina: false };
    }
  }
  return otraMaquina;
}

// Última máquina usada con una variante (para rellenarla automáticamente).
function ultimaMaquina(nombre) {
  for (const s of [...datos.sessions].sort(ordenSesion)) {
    const e = s.exercises.find((x) => x.name === nombre && x.machine);
    if (e) return e.machine;
  }
  return '';
}

// Doble progresión: si la última vez se completaron todas las series de trabajo
// en el extremo superior del rango con el RIR previsto, se sugiere subir el
// menor incremento disponible. Solo es una sugerencia: hay que confirmarla.
function sugerenciaProgresion(ej, anterior) {
  if (!anterior || !anterior.mismaMaquina) return null;
  const previo = anterior.ej;
  const t = previo.target || {};
  const trabajo = seriesTrabajoHechas(previo);
  if (!trabajo.length || trabajo.length < (t.sets || 1)) return null;
  if (t.repMax == null) return null;
  const todasArriba = trabajo.every((x) => x.reps != null && x.reps >= t.repMax);
  const rirOk = trabajo.every((x) => x.rir == null || t.rirMin == null || x.rir >= t.rirMin);
  if (!todasArriba || !rirOk) return null;
  const pesos = trabajo.map((x) => x.weight).filter((w) => w != null);
  if (!pesos.length) return null;
  const inc = Number(datos.settings.increments[ej.load]) || 0;
  if (!inc) return { texto: `La última vez completaste todas las series en ${t.repMax} repeticiones o más. Puedes valorar aumentar la dificultad.`, peso: null };
  if (ej.load === 'asistida') {
    const actual = Math.min(...pesos);
    const nuevo = Math.max(0, +(actual - inc).toFixed(2));
    return { texto: `La última vez completaste todas las series en ${t.repMax}+ repeticiones. Podrías probar con menos asistencia: ${fmt(nuevo)} kg (−${fmt(inc)}).`, peso: nuevo };
  }
  const actual = Math.max(...pesos);
  const nuevo = +(actual + inc).toFixed(2);
  return { texto: `La última vez completaste todas las series en ${t.repMax}+ repeticiones con el RIR previsto. Podrías probar ${fmt(nuevo)} kg (+${fmt(inc)}). Es normal volver a la parte baja del rango.`, peso: nuevo };
}

// Plan de la semana: por defecto sale de la plantilla (día de la semana de cada
// día de la rutina). Se puede cambiar para una semana concreta sin tocar la plantilla.
function planSemana(lunesISO) {
  const r = rutinaActiva();
  const guardado = datos.weekPlans[lunesISO];
  if (guardado && guardado.routineId === r.id) return { plan: guardado.days, personalizado: true };
  const plan = {};
  for (let i = 1; i <= 7; i++) plan[i] = null;
  r.days.forEach((d) => { if (d.weekday >= 1 && d.weekday <= 7 && !plan[d.weekday]) plan[d.weekday] = d.id; });
  return { plan, personalizado: false };
}

// ---------------------------------------------------------------------------
// Sesiones
// ---------------------------------------------------------------------------
function iniciarSesion(rutinaId, diaId) {
  const enCurso = sesionEnCurso();
  if (enCurso) {
    aviso('Ya hay una sesión en curso. Termínala o descártala antes de empezar otra.');
    ir(`#/sesion/${enCurso.id}`);
    return;
  }
  const rutina = buscarRutina(rutinaId);
  const dia = rutina && rutina.days.find((d) => d.id === diaId);
  if (!dia) return;
  const reducida = datos.settings.readapt;
  // Última sesión del mismo día: se reutiliza la variante y máquina elegidas.
  const ultimaDelDia = sesionesTerminadas().find((s) => s.routineId === rutinaId && s.dayId === diaId);

  const sesion = {
    id: uid(),
    routineId: rutina.id,
    routineName: rutina.name,
    dayId: dia.id,
    dayName: dia.name,
    dayFocus: dia.focus || '',
    dayNote: dia.note || '',
    date: fechaISO(),
    startedAt: new Date().toISOString(),
    finishedAt: null,
    status: 'en_curso',
    reduced: reducida,
    note: '',
    exercises: dia.exercises.map((plantilla) => {
      const previo = ultimaDelDia && ultimaDelDia.exercises.find((e) => e.slotId === plantilla.id);
      let idx = previo ? previo.variantIdx : 0;
      if (!(idx >= 0 && idx < plantilla.variants.length)) idx = 0;
      const variante = plantilla.variants[idx];
      let series = Number(plantilla.sets) || 1;
      let rirMin = plantilla.rirMin;
      let rirMax = plantilla.rirMax;
      if (reducida) {
        series = Math.max(1, series - 1); // 3 → 2, 2 → 1
        rirMin = 4;
        rirMax = 4;
      }
      return {
        slotId: plantilla.id,
        variants: clonar(plantilla.variants),
        variantIdx: idx,
        name: variante.name,
        load: variante.load,
        uni: !!variante.uni,
        machine: previo && previo.name === variante.name ? (previo.machine || '') : ultimaMaquina(variante.name),
        target: {
          sets: series,
          repMin: plantilla.repMin,
          repMax: plantilla.repMax,
          rirMin,
          rirMax,
          rest: plantilla.rest || '',
          note: plantilla.note || '',
          reduced: reducida,
        },
        note: '',
        sets: Array.from({ length: series }, () => nuevaSerie('T')),
      };
    }),
  };
  datos.sessions.push(sesion);
  guardarYa();
  ir(`#/sesion/${sesion.id}`);
}

let serieRecienMarcada = null;
const nuevaSerie = (type) => ({ id: uid(), type, weight: null, reps: null, rir: null, done: false });

// ---------------------------------------------------------------------------
// Navegación
// ---------------------------------------------------------------------------
const vista = document.getElementById('vista');
const titulo = document.getElementById('titulo');
const btnVolver = document.getElementById('btn-volver');
let volverA = null;

function ir(hash) {
  if (location.hash === hash) mostrar();
  else location.hash = hash;
}

btnVolver.addEventListener('click', () => { if (volverA) ir(volverA); });

function prepararPantalla(texto, pestana, volver = null) {
  titulo.textContent = texto;
  document.title = texto === 'Entreno' ? 'Entreno' : `${texto} · Entreno`;
  volverA = volver;
  btnVolver.hidden = !volver;
  document.querySelectorAll('.pestanas a').forEach((a) => a.classList.toggle('activa', a.dataset.tab === pestana));
}

function mostrar(conservarScroll = false) {
  const y = window.scrollY;
  const [ruta, query] = (location.hash.replace(/^#/, '') || '/').split('?');
  const partes = ruta.split('/').filter(Boolean);
  const params = new URLSearchParams(query || '');

  if (partes[0] === 'sesion' && partes[1]) pantallaSesion(partes[1]);
  else if (partes[0] === 'rutinas') pantallaRutinas();
  else if (partes[0] === 'rutina' && partes[1] && partes[2] === 'dia' && partes[3]) pantallaEditorDia(partes[1], partes[3]);
  else if (partes[0] === 'rutina' && partes[1]) pantallaEditorRutina(partes[1]);
  else if (partes[0] === 'historial') pantallaHistorial();
  else if (partes[0] === 'progreso') pantallaProgreso(params.get('e'));
  else if (partes[0] === 'datos') pantallaDatos();
  else if (partes[0] === 'biblioteca') pantallaBiblioteca(params);
  else pantallaInicio();

  if (conservarScroll) window.scrollTo(0, y);
  else {
    window.scrollTo(0, 0);
    vista.classList.remove('entrar');
    void vista.offsetWidth; // reinicia la animación
    vista.classList.add('entrar');
  }
}
window.addEventListener('hashchange', () => mostrar());
const repintar = () => mostrar(true);

// ---------------------------------------------------------------------------
// Pantalla: Inicio
// ---------------------------------------------------------------------------
function pantallaInicio() {
  prepararPantalla('Entreno', 'inicio');
  const r = rutinaActiva();
  const hoy = fechaISO();
  const lunes = lunesDe(hoy);
  const { plan, personalizado } = planSemana(lunes);
  const enCurso = sesionEnCurso();
  const diaHoy = r.days.find((d) => d.id === plan[diaSemana(hoy)]);
  const hechasSemana = new Set(datos.sessions.filter((s) => s.status === 'terminada'
    && s.date >= lunes && s.date <= sumarDias(lunes, 6)).map((s) => s.date));

  let html = '';
  if (errorAlmacenamiento) {
    html += `<div class="tarjeta info aviso-local">${icono('alerta')} No se pudieron leer los datos guardados. Revisa la sección Datos antes de seguir.</div>`;
  }

  if (enCurso) {
    html += `<div class="tarjeta hoy">
      <span class="etiqueta-en-curso">SESIÓN EN CURSO</span>
      <h2>${esc(enCurso.dayName)} <span class="suave peq">· ${esc(fechaLarga(enCurso.date))}</span></h2>
      <div class="tiempo">${icono('reloj')}<span class="suave peq">Tiempo de entrenamiento</span> ${relojSesion(enCurso)}</div>
      <p class="suave peq">${contarHechas(enCurso)} series marcadas. Se guarda sola: puedes cerrar la app y continuar después.</p>
      <a class="btn primario bloque" href="#/sesion/${enCurso.id}">Continuar sesión</a>
    </div>`;
  } else if (diaHoy) {
    html += `<div class="tarjeta hoy">
      <p class="suave peq" style="margin:0">Hoy, ${esc(fechaLarga(hoy))}</p>
      <h2>${esc(diaHoy.name)}</h2>
      <p class="suave" style="margin:0">${esc(diaHoy.focus || '')} · ${totalSeriesDia(diaHoy)} series de trabajo</p>
      <div class="fila-hoy">
        <button class="btn primario" data-accion="empezar" data-dia="${diaHoy.id}">${icono('play')} Empezar entrenamiento</button>
        <a class="btn" href="#/rutina/${r.id}/dia/${diaHoy.id}" aria-label="Editar ejercicios de ${esc(diaHoy.name)}">${icono('editar')} Editar</a>
      </div>
    </div>`;
  } else {
    html += `<div class="tarjeta"><p style="margin:0">Hoy toca <strong>descanso</strong> según tu plan. Si quieres entrenar, elige un día abajo.</p></div>`;
  }

  html += `<div class="tarjeta">
    <h2>Empezar otro día</h2>
    <p class="suave peq" style="margin-top:0">${esc(r.name)}</p>
    <div class="lista-dias">
      ${r.days.map((d) => `<div class="dia-fila">
        <button class="dia-boton" data-accion="empezar" data-dia="${d.id}" aria-label="Empezar ${esc(d.name)}">
          <span class="dia-texto"><strong>${esc(d.name)}</strong>
          <small>${esc(d.focus || '')} · ${d.exercises.length} ejercicios · ${totalSeriesDia(d)} series</small></span>
          <span class="dia-play">${icono('play')}</span>
        </button>
        <a class="btn-editar-dia" href="#/rutina/${r.id}/dia/${d.id}" aria-label="Editar ejercicios de ${esc(d.name)}">${icono('editar')}<span>Editar</span></a>
      </div>`).join('')}
    </div>
    <label class="check" style="margin-top:12px">
      <input type="checkbox" data-accion="readapt" ${datos.settings.readapt ? 'checked' : ''}>
      <span>Sesión reducida (vuelta tras parón)</span>
    </label>
    <p class="suave peq" style="margin:0">Si lo activas, las nuevas sesiones tendrán una serie menos por ejercicio (3 → 2, 2 → 1) y RIR aproximado de 4. Nunca se activa solo. Tu plantilla no cambia.</p>
  </div>`;

  html += `<div class="tarjeta">
    <h2>Esta semana</h2>
    <p class="suave peq" style="margin-top:0">Puedes mover sesiones solo para esta semana; la plantilla no cambia.${personalizado ? ' <strong>Semana modificada.</strong>' : ''}</p>
    ${[1, 2, 3, 4, 5, 6, 7].map((n) => {
      const fecha = sumarDias(lunes, n - 1);
      return `<div class="semana-fila ${fecha === hoy ? 'es-hoy' : ''}">
        <strong>${DIAS_SEMANA[n]} ${fechaDesdeISO(fecha).getDate()}</strong>
        <select data-accion="plan" data-n="${n}" aria-label="Plan del ${DIAS_SEMANA[n]}">
          <option value="">Descanso</option>
          ${r.days.map((d) => `<option value="${d.id}" ${plan[n] === d.id ? 'selected' : ''}>${esc(d.name)}${d.focus ? ' — ' + esc(d.focus) : ''}</option>`).join('')}
        </select>
        <span aria-label="${hechasSemana.has(fecha) ? 'Entrenado' : ''}">${hechasSemana.has(fecha) ? `<span class="check-semana">${icono('check')}</span>` : ''}</span>
      </div>`;
    }).join('')}
    ${personalizado ? '<button class="btn bloque" data-accion="plan-reset">Volver al plan habitual</button>' : ''}
  </div>`;

  html += `<div class="tarjeta info aviso-local peq">
    ${icono('movil')} Tus datos se guardan <strong>solo en este dispositivo</strong> y no se sincronizan con otros.
    ${datos.meta.lastBackup ? `Última copia de seguridad: ${esc(fechaLarga(datos.meta.lastBackup.slice(0, 10)))}.` : '<strong>Aún no has hecho ninguna copia de seguridad.</strong>'}
    <a href="#/datos">Ir a copias de seguridad</a>
  </div>`;

  vista.innerHTML = html;
}

const contarHechas = (s) => s.exercises.reduce((t, e) => t + e.sets.filter((x) => x.done).length, 0);

// ---------------------------------------------------------------------------
// Pantalla: Sesión (registro de series)
// ---------------------------------------------------------------------------
function pantallaSesion(id) {
  const s = buscarSesion(id);
  if (!s) {
    prepararPantalla('Sesión', 'inicio', '#/');
    vista.innerHTML = '<div class="tarjeta">Esta sesión no existe (puede que se haya borrado).</div>';
    return;
  }
  const enCurso = s.status === 'en_curso';
  prepararPantalla(s.dayName, enCurso ? 'inicio' : 'historial', enCurso ? '#/' : '#/historial');

  let html = `<div class="tarjeta">
    ${enCurso ? '<span class="etiqueta-en-curso">EN CURSO · se guarda automáticamente</span>' : '<span class="suave peq">Sesión terminada · puedes editarla</span>'}
    <h2 style="margin-top:4px">${esc(s.dayName)}${s.dayFocus ? ` <span class="suave peq">· ${esc(s.dayFocus)}</span>` : ''}</h2>
    <div class="tiempo grande">${icono('reloj')}<span class="suave peq">${enCurso ? 'Tiempo de entrenamiento' : 'Duración'}</span> ${relojSesion(s)}</div>
    ${s.reduced ? '<div class="info">Sesión reducida: una serie menos por ejercicio y RIR aproximado de 4.</div>' : ''}
    ${s.dayNote ? `<div class="info">${esc(s.dayNote)}</div>` : ''}
    <label class="campo">Fecha
      <input type="date" data-sesion-campo="date" value="${esc(s.date)}">
    </label>
    <p class="suave peq" style="margin:0">Descansos orientativos: puedes añadir 30–60 s si no estás listo para hacer bien la siguiente serie.</p>
  </div>`;

  s.exercises.forEach((e, i) => { html += tarjetaEjercicio(s, e, i); });

  html += `<div class="tarjeta">
    <label class="campo">Notas de la sesión (sensaciones, molestias, sueño…)
      <textarea data-sesion-campo="note" rows="3">${esc(s.note)}</textarea>
    </label>
    ${enCurso
    ? `<button class="btn primario bloque" data-accion="terminar">Terminar y guardar sesión</button>
       <button class="btn peligro bloque" data-accion="descartar">Descartar sesión</button>`
    : '<button class="btn peligro bloque" data-accion="borrar-sesion">Eliminar esta sesión</button>'}
  </div>`;

  vista.innerHTML = html;
  vista.dataset.sesion = s.id;
  serieRecienMarcada = null;
}

// Recuerda qué apartados "Máquina y notas" ha abierto o cerrado el usuario,
// para que no cambien al repintar la pantalla.
const detallesAbiertos = new Set();
const detallesCerrados = new Set();
vista.addEventListener('toggle', (ev) => {
  const clave = ev.target.dataset && ev.target.dataset.detalle;
  if (!clave) return;
  if (ev.target.open) { detallesAbiertos.add(clave); detallesCerrados.delete(clave); }
  else { detallesCerrados.add(clave); detallesAbiertos.delete(clave); }
}, true);

// Peso orientativo de cada serie: lo último anotado en esta sesión o, si no,
// lo de la vez anterior con la MISMA variante y máquina. Los calentamientos no tienen.
function pesosOrientativos(s, e) {
  const anterior = registroAnterior(s, e.name, e.machine);
  const previos = anterior && anterior.mismaMaquina ? seriesTrabajoHechas(anterior.ej).map((x) => x.weight) : [];
  let n = 0;
  let ultimo = null;
  return e.sets.map((x) => {
    if (x.type === 'C') return null;
    n += 1;
    const p = ultimo ?? previos[n - 1] ?? previos[previos.length - 1] ?? null;
    if (x.weight != null) ultimo = x.weight;
    return p;
  });
}

// Al cambiar la máquina se actualizan el registro anterior, la sugerencia y los
// pesos orientativos sin redibujar la tarjeta (así no se pierde el foco ni un toque).
function refrescarReferencias(s, i) {
  const tarjeta = document.getElementById(`ej-${i}`);
  if (!tarjeta) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = tarjetaEjercicio(s, s.exercises[i], i);
  const nueva = tmp.firstElementChild;
  const anteriorViejo = tarjeta.querySelector('.anterior');
  const anteriorNuevo = nueva.querySelector('.anterior');
  if (anteriorViejo && anteriorNuevo) anteriorViejo.replaceWith(anteriorNuevo);
  const sugVieja = tarjeta.querySelector('.sugerencia');
  const sugNueva = nueva.querySelector('.sugerencia');
  if (sugVieja && sugNueva) sugVieja.replaceWith(sugNueva);
  else if (sugVieja) sugVieja.remove();
  else if (sugNueva && anteriorNuevo) anteriorNuevo.after(sugNueva);
  const pesosNuevos = nueva.querySelectorAll('input[data-f="weight"]');
  tarjeta.querySelectorAll('input[data-f="weight"]').forEach((inp, k) => {
    if (pesosNuevos[k]) inp.placeholder = pesosNuevos[k].placeholder;
  });
  tarjeta.querySelector('.objetivo').innerHTML = nueva.querySelector('.objetivo').innerHTML;
}

function tarjetaEjercicio(s, e, i) {
  const t = e.target || {};
  const carga = TIPOS_CARGA[e.load] || TIPOS_CARGA.maquina;
  const variante = e.variants[e.variantIdx] || {};
  const anterior = registroAnterior(s, e.name, e.machine);
  const sugerencia = s.status === 'en_curso' ? sugerenciaProgresion(e, anterior) : null;
  const rir = t.reduced ? '~4' : rango(t.rirMin, t.rirMax);

  const pistas = pesosOrientativos(s, e);
  let nTrabajo = 0;

  const filas = e.sets.map((x, j) => {
    const pista = pistas[j];
    let etiqueta = 'C';
    if (x.type === 'T') {
      nTrabajo += 1;
      etiqueta = String(nTrabajo);
    }
    return `<tr class="${x.done ? 'hecha' : ''}">
      <td class="col-tipo"><button class="tipo-serie ${x.type}" data-accion="tipo" data-ej="${i}" data-s="${j}"
        aria-label="${x.type === 'C' ? 'Calentamiento; tocar para cambiar a serie de trabajo' : 'Serie de trabajo; tocar para cambiar a calentamiento'}">${etiqueta}</button></td>
      <td><input inputmode="decimal" data-ej="${i}" data-s="${j}" data-f="weight" value="${fmt(x.weight)}" placeholder="${x.type === 'T' ? fmt(pista) : ''}" aria-label="Peso"></td>
      <td><input inputmode="numeric" data-ej="${i}" data-s="${j}" data-f="reps" value="${fmt(x.reps)}" placeholder="${x.type === 'T' ? rango(t.repMin, t.repMax) : ''}" aria-label="Repeticiones"></td>
      <td><input inputmode="decimal" data-ej="${i}" data-s="${j}" data-f="rir" value="${fmt(x.rir)}" placeholder="${x.type === 'T' ? rir : ''}" aria-label="RIR"></td>
      <td class="col-hecho"><button class="hecho ${x.done ? 'si' : ''} ${x.id === serieRecienMarcada ? 'recien' : ''}" data-accion="hecho" data-ej="${i}" data-s="${j}"
        aria-label="${x.done ? 'Serie completada' : 'Marcar serie como completada'}">${icono('check')}</button></td>
      <td class="col-borrar"><button class="borrar-serie" data-accion="borrar-serie" data-ej="${i}" data-s="${j}" aria-label="Borrar serie">×</button></td>
    </tr>`;
  }).join('');

  let bloqueAnterior = '<div class="anterior suave">Sin registros anteriores de esta variante.</div>';
  if (anterior) {
    const hace = diasEntre(anterior.sesion.date, s.date);
    const resumen = anterior.ej.sets.filter((x) => x.done).map((x) => `${x.type === 'C' ? 'C: ' : ''}${fmt(x.weight) || '–'} kg × ${fmt(x.reps) || '–'}${x.rir != null ? ` (RIR ${fmt(x.rir)})` : ''}`).join(' · ');
    bloqueAnterior = `<div class="anterior">
      <strong>${anterior.mismaMaquina ? 'Última vez' : `Última vez con otra máquina (${esc(anterior.ej.machine || 'sin indicar')}) — no comparable`}</strong>
      <span class="suave"> · ${esc(fechaCorta(anterior.sesion.date))}${hace > 0 ? `, hace ${hace} días` : ''}</span><br>
      ${esc(resumen)}
      ${anterior.ej.note ? `<br><span class="suave">${icono('nota')} ${esc(anterior.ej.note)}</span>` : ''}
    </div>`;
  }

  const abrirDetalles = detallesAbiertos.has(`${s.id}:${i}`) || ((e.machine || e.note) && !detallesCerrados.has(`${s.id}:${i}`));
  return `<div class="tarjeta ejercicio" id="ej-${i}">
    <div class="ejercicio-cabecera">
      <span class="num">${i + 1}</span>
      <h3>${esc(e.name)}</h3>
    </div>
    <div class="objetivo">
      <span class="chip"><strong>Objetivo:</strong> ${t.sets} × ${rango(t.repMin, t.repMax)}</span>
      <span class="chip">RIR ${rir}</span>
      <span class="chip">Descanso: ${esc(t.rest || '—')}</span>
      <span class="chip carga">${esc(carga.pista)}</span>
      ${e.uni ? '<span class="chip uni">Unilateral: series POR LADO</span>' : ''}
      ${e.machine ? `<span class="chip">${icono('etiqueta')} ${esc(e.machine)}</span>` : ''}
    </div>
    ${t.note ? `<div class="info">${esc(t.note)}</div>` : ''}
    ${variante.note ? `<div class="info">${esc(variante.note)}</div>` : ''}
    ${e.variants.length > 1 ? `<label class="campo" style="margin:6px 0">Ejercicio (elige uno)
      <select data-accion="variante" data-ej="${i}">
        ${e.variants.map((v, k) => `<option value="${k}" ${k === e.variantIdx ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}
      </select></label>` : ''}
    ${bloqueAnterior}
    ${sugerencia ? `<div class="sugerencia">${icono('idea')} ${esc(sugerencia.texto)}
      ${sugerencia.peso != null ? `<div class="fila-botones"><button class="btn peque" data-accion="aplicar-sugerencia" data-ej="${i}" data-peso="${sugerencia.peso}">Usar ${fmt(sugerencia.peso)} kg en las series pendientes</button></div>` : ''}
    </div>` : ''}
    <table class="series">
      <thead><tr><th>Serie</th><th>Kg</th><th>Reps</th><th>RIR</th><th>Hecha</th><th></th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
    <div class="fila-botones">
      <button class="btn peque" data-accion="add-serie" data-ej="${i}">+ Serie</button>
      <button class="btn peque" data-accion="add-calent" data-ej="${i}">+ Calentamiento</button>
    </div>
    <details class="mas" data-detalle="${s.id}:${i}" ${abrirDetalles ? 'open' : ''}>
      <summary>Máquina y notas${e.uni ? ' (diferencias entre lados)' : ''}</summary>
      <label class="campo">Máquina / ajustes (asiento, agarre, polea…)
        <input data-ej="${i}" data-f="machine" value="${esc(e.machine)}" placeholder="Ej.: Hack del fondo, respaldo 3">
      </label>
      <p class="suave peq" style="margin:0">Cada máquina se registra por separado: las cargas no son comparables entre máquinas.</p>
      <label class="campo">Notas (técnica, molestias, sensaciones${e.uni ? ', diferencias entre lados' : ''})
        <textarea data-ej="${i}" data-f="note" rows="2">${esc(e.note)}</textarea>
      </label>
    </details>
  </div>`;
}

// ---------------------------------------------------------------------------
// Pantalla: Historial
// ---------------------------------------------------------------------------
function pantallaHistorial() {
  prepararPantalla('Historial', 'historial');
  const sesiones = [...datos.sessions].sort(ordenSesion);
  if (!sesiones.length) {
    vista.innerHTML = '<div class="tarjeta">Todavía no hay sesiones registradas. Empieza una desde Inicio.</div>';
    return;
  }
  let html = '';
  let mesActual = '';
  sesiones.forEach((s) => {
    const mes = fechaDesdeISO(s.date).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    if (mes !== mesActual) {
      if (mesActual) html += '</div>';
      html += `<h2 style="text-transform:capitalize">${esc(mes)}</h2><div class="sesion-lista">`;
      mesActual = mes;
    }
    const trabajo = s.exercises.reduce((t, e) => t + seriesTrabajoHechas(e).length, 0);
    html += `<a class="sesion-item" href="#/sesion/${s.id}">
      ${s.status === 'en_curso' ? '<span class="etiqueta-en-curso">EN CURSO</span><br>' : ''}
      <strong>${esc(s.dayName)}</strong> <small>· ${esc(fechaLarga(s.date))}</small><br>
      <small>${segundosSesion(s) !== null ? `${duracionTexto(segundosSesion(s))} · ` : ''}${trabajo} series de trabajo completadas${s.reduced ? ' · reducida' : ''}${s.note ? ' · nota' : ''}</small>
    </a>`;
  });
  html += '</div>';
  vista.innerHTML = html;
}

// ---------------------------------------------------------------------------
// Pantalla: Progreso (gráficas)
// ---------------------------------------------------------------------------
function historialVariantes() {
  const mapa = new Map();
  [...sesionesTerminadas()].reverse().forEach((s) => {
    s.exercises.forEach((e) => {
      const trabajo = seriesTrabajoHechas(e);
      if (!trabajo.length) return;
      const clave = claveVariante(e.name, e.machine);
      if (!mapa.has(clave)) mapa.set(clave, { nombre: e.name, maquina: e.machine || '', load: e.load, puntos: [] });
      const pesos = trabajo.map((x) => x.weight).filter((w) => w != null);
      mapa.get(clave).puntos.push({
        fecha: s.date,
        sesionId: s.id,
        pesoMax: pesos.length ? Math.max(...pesos) : null,
        repsTotales: trabajo.reduce((t, x) => t + (x.reps || 0), 0),
        series: trabajo,
      });
    });
  });
  return mapa;
}

function pantallaProgreso(claveElegida) {
  prepararPantalla('Progreso', 'progreso');
  const mapa = historialVariantes();
  if (!mapa.size) {
    vista.innerHTML = '<div class="tarjeta">Aquí verás gráficas de cargas y repeticiones cuando termines alguna sesión.</div>';
    return;
  }
  const claves = [...mapa.keys()].sort((a, b) => a.localeCompare(b, 'es'));
  const clave = mapa.has(claveElegida) ? claveElegida : claves[0];
  const h = mapa.get(clave);
  const carga = TIPOS_CARGA[h.load] || TIPOS_CARGA.maquina;

  vista.innerHTML = `<div class="tarjeta">
    <label class="campo">Ejercicio (cada variante y máquina por separado)
      <select data-accion="elegir-progreso">
        ${claves.map((k) => {
          const v = mapa.get(k);
          return `<option value="${esc(k)}" ${k === clave ? 'selected' : ''}>${esc(v.nombre)}${v.maquina ? ' · ' + esc(v.maquina) : ''}</option>`;
        }).join('')}
      </select>
    </label>
    <p class="suave peq" style="margin:0">Carga registrada como: ${esc(carga.pista)}.</p>
  </div>
  <div class="tarjeta">
    <h3>Peso máximo de trabajo (kg)</h3>
    ${grafica(h.puntos.map((p) => ({ x: p.fecha, y: p.pesoMax })), 'linea', 'punto')}
  </div>
  <div class="tarjeta">
    <h3>Repeticiones totales (series de trabajo)</h3>
    ${grafica(h.puntos.map((p) => ({ x: p.fecha, y: p.repsTotales })), 'linea2', 'punto2')}
  </div>
  <div class="tarjeta">
    <h3>Registros</h3>
    <table class="datos">
      <thead><tr><th>Fecha</th><th>Series de trabajo</th></tr></thead>
      <tbody>${[...h.puntos].reverse().map((p) => `<tr>
        <td><a href="#/sesion/${p.sesionId}">${esc(fechaCorta(p.fecha))}</a></td>
        <td>${p.series.map((x) => `${fmt(x.weight) || '–'}×${fmt(x.reps) || '–'}${x.rir != null ? ` @${fmt(x.rir)}` : ''}`).join(', ')}</td>
      </tr>`).join('')}</tbody>
    </table>
    <p class="suave peq">Formato: kg × repeticiones @RIR.</p>
  </div>`;
}

// Gráfica de líneas sencilla en SVG
function grafica(puntos, claseLinea, clasePunto) {
  const validos = puntos.filter((p) => p.y != null);
  if (!validos.length) return '<p class="suave">Sin datos suficientes.</p>';
  const W = 340; const H = 170; const izq = 36; const der = 10; const arr = 12; const abj = 26;
  let min = Math.min(...validos.map((p) => p.y));
  let max = Math.max(...validos.map((p) => p.y));
  if (min === max) { min -= 1; max += 1; }
  const n = validos.length;
  const x = (i) => (n === 1 ? (izq + W - der) / 2 : izq + (i * (W - izq - der)) / (n - 1));
  const y = (v) => arr + ((max - v) * (H - arr - abj)) / (max - min);
  const camino = validos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ');
  return `<svg class="grafica" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfica">
    <line class="eje" x1="${izq}" y1="${arr}" x2="${izq}" y2="${H - abj}"/>
    <line class="eje" x1="${izq}" y1="${H - abj}" x2="${W - der}" y2="${H - abj}"/>
    <text x="${izq - 4}" y="${y(max) + 4}" text-anchor="end">${fmt(+max.toFixed(1))}</text>
    <text x="${izq - 4}" y="${y(min) + 4}" text-anchor="end">${fmt(+min.toFixed(1))}</text>
    <text x="${x(0)}" y="${H - 8}" text-anchor="${n === 1 ? 'middle' : 'start'}">${esc(fechaCorta(validos[0].x))}</text>
    ${n > 1 ? `<text x="${x(n - 1)}" y="${H - 8}" text-anchor="end">${esc(fechaCorta(validos[n - 1].x))}</text>` : ''}
    <path class="${claseLinea}" d="${camino}"/>
    ${validos.map((p, i) => `<circle class="${clasePunto}" cx="${x(i).toFixed(1)}" cy="${y(p.y).toFixed(1)}" r="3.5"><title>${esc(fechaCorta(p.x))}: ${fmt(p.y)}</title></circle>`).join('')}
  </svg>`;
}

// ---------------------------------------------------------------------------
// Pantalla: Rutinas (lista y editores)
// ---------------------------------------------------------------------------
function pantallaRutinas() {
  prepararPantalla('Rutinas', 'rutinas');
  vista.innerHTML = `
    <p class="suave peq">Sin límite de rutinas ni de días. Los cambios en una rutina afectan a las sesiones nuevas; el historial no se modifica.</p>
    ${datos.routines.map((r) => {
      const activa = r.id === datos.activeRoutineId;
      const series = r.days.reduce((t, d) => t + totalSeriesDia(d), 0);
      return `<div class="tarjeta ${activa ? 'hoy' : ''}">
        ${activa ? '<span class="etiqueta-en-curso" style="color:var(--acento)">RUTINA ACTIVA</span>' : ''}
        <h2>${esc(r.name)}</h2>
        <p class="suave peq" style="margin:0">${r.days.length} días · ${series} series de trabajo semanales</p>
        <div class="fila-botones">
          <a class="btn" href="#/rutina/${r.id}">Editar</a>
          ${activa ? '' : `<button class="btn" data-accion="activar-rutina" data-r="${r.id}">Usar esta</button>`}
          <button class="btn" data-accion="duplicar-rutina" data-r="${r.id}">Duplicar</button>
          ${datos.routines.length > 1 ? `<button class="btn peligro" data-accion="borrar-rutina" data-r="${r.id}">Eliminar</button>` : ''}
        </div>
      </div>`;
    }).join('')}
    <button class="btn primario bloque" data-accion="nueva-rutina">+ Nueva rutina vacía</button>
    <button class="btn bloque" data-accion="restaurar-base">+ Añadir copia de la rutina original de 5 días</button>`;
}

function pantallaEditorRutina(rid) {
  const r = buscarRutina(rid);
  if (!r) { ir('#/rutinas'); return; }
  prepararPantalla('Editar rutina', 'rutinas', '#/rutinas');
  vista.innerHTML = `<div class="tarjeta">
      <label class="campo">Nombre de la rutina
        <input data-r="${r.id}" data-f="name" value="${esc(r.name)}">
      </label>
    </div>
    ${r.days.map((d, i) => `<div class="tarjeta">
      <h3>${esc(d.name)} <span class="suave peq">· ${d.exercises.length} ejercicios · ${totalSeriesDia(d)} series</span></h3>
      <div class="rejilla-2">
        <label class="campo">Nombre<input data-r="${r.id}" data-d="${i}" data-f="name" value="${esc(d.name)}"></label>
        <label class="campo">Día habitual
          <select data-r="${r.id}" data-d="${i}" data-f="weekday" data-tipo="num">
            <option value="">Sin día fijo</option>
            ${[1, 2, 3, 4, 5, 6, 7].map((n) => `<option value="${n}" ${d.weekday === n ? 'selected' : ''}>${DIAS_SEMANA[n]}</option>`).join('')}
          </select>
        </label>
      </div>
      <label class="campo">Grupos musculares<input data-r="${r.id}" data-d="${i}" data-f="focus" value="${esc(d.focus || '')}"></label>
      <div class="mini-botones">
        <a class="btn primario" href="#/rutina/${r.id}/dia/${d.id}">Editar ejercicios</a>
        <button class="btn" data-accion="mover-dia" data-r="${r.id}" data-d="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Subir">↑</button>
        <button class="btn" data-accion="mover-dia" data-r="${r.id}" data-d="${i}" data-dir="1" ${i === r.days.length - 1 ? 'disabled' : ''} aria-label="Bajar">↓</button>
        <button class="btn" data-accion="duplicar-dia" data-r="${r.id}" data-d="${i}">Duplicar</button>
        <button class="btn peligro" data-accion="borrar-dia" data-r="${r.id}" data-d="${i}">Eliminar</button>
      </div>
    </div>`).join('')}
    <button class="btn primario bloque" data-accion="nuevo-dia" data-r="${r.id}">+ Añadir día</button>`;
}

function pantallaEditorDia(rid, did) {
  const r = buscarRutina(rid);
  const di = r ? r.days.findIndex((d) => d.id === did) : -1;
  if (di < 0) { ir('#/rutinas'); return; }
  const d = r.days[di];
  prepararPantalla(`Editar ${d.name}`, 'rutinas', `#/rutina/${r.id}`);
  const base = `data-r="${r.id}" data-d="${di}"`;
  vista.innerHTML = `<div class="tarjeta">
      <p style="margin:0"><strong>${totalSeriesDia(d)}</strong> series de trabajo en total.</p>
      <label class="campo">Nota del día<input ${base} data-f="note" value="${esc(d.note || '')}"></label>
    </div>
    ${d.exercises.map((e, ei) => {
      const b = `${base} data-e="${ei}"`;
      return `<div class="tarjeta editor-ej">
        <h3>${ei + 1}. ${esc(e.variants[0].name)}</h3>
        <div class="rejilla-2">
          <label class="campo">Series de trabajo<input inputmode="numeric" ${b} data-f="sets" data-tipo="num" value="${fmt(e.sets)}"></label>
          <label class="campo">Descanso (texto)<input ${b} data-f="rest" value="${esc(e.rest || '')}"></label>
        </div>
        <div class="rejilla-4">
          <label class="campo">Reps mín.<input inputmode="numeric" ${b} data-f="repMin" data-tipo="num" value="${fmt(e.repMin)}"></label>
          <label class="campo">Reps máx.<input inputmode="numeric" ${b} data-f="repMax" data-tipo="num" value="${fmt(e.repMax)}"></label>
          <label class="campo">RIR mín.<input inputmode="decimal" ${b} data-f="rirMin" data-tipo="num" value="${fmt(e.rirMin)}"></label>
          <label class="campo">RIR máx.<input inputmode="decimal" ${b} data-f="rirMax" data-tipo="num" value="${fmt(e.rirMax)}"></label>
        </div>
        <label class="campo">Nota del ejercicio<input ${b} data-f="note" value="${esc(e.note || '')}"></label>
        <p class="peq" style="margin:8px 0 0"><strong>Variantes</strong> <span class="suave">(la primera es la principal; se elige una por sesión)</span></p>
        ${e.variants.map((v, vi) => `<div class="variante-fila">
          <div class="fila-nombre">
            <input ${b} data-v="${vi}" data-f="name" value="${esc(v.name)}" aria-label="Nombre de la variante">
            <a class="btn peque" href="#/biblioteca?cambiar=${r.id}:${d.id}:${ei}:${vi}" aria-label="Elegir de la biblioteca">${icono('biblioteca')} Cambiar</a>
          </div>
          <div class="rejilla-2">
            <select ${b} data-v="${vi}" data-f="load" aria-label="Tipo de carga">
              ${Object.entries(TIPOS_CARGA).map(([k, t]) => `<option value="${k}" ${v.load === k ? 'selected' : ''}>${esc(t.nombre)}</option>`).join('')}
            </select>
            <label class="check"><input type="checkbox" ${b} data-v="${vi}" data-f="uni" data-tipo="bool" ${v.uni ? 'checked' : ''}> Unilateral</label>
          </div>
          <input ${b} data-v="${vi}" data-f="note" value="${esc(v.note || '')}" placeholder="Nota de esta variante (opcional)">
          <div class="mini-botones">
            ${vi > 0 ? `<button class="btn" data-accion="principal-variante" ${b} data-v="${vi}">Hacer principal</button>` : '<span class="suave peq">★ Principal</span>'}
            ${e.variants.length > 1 ? `<button class="btn peligro" data-accion="borrar-variante" ${b} data-v="${vi}">Quitar</button>` : ''}
          </div>
        </div>`).join('')}
        <div class="mini-botones">
          <button class="btn" data-accion="nueva-variante" ${b}>+ Alternativa</button>
          <button class="btn" data-accion="mover-ej" ${b} data-dir="-1" ${ei === 0 ? 'disabled' : ''} aria-label="Subir">↑</button>
          <button class="btn" data-accion="mover-ej" ${b} data-dir="1" ${ei === d.exercises.length - 1 ? 'disabled' : ''} aria-label="Bajar">↓</button>
          <button class="btn peligro" data-accion="borrar-ej" ${b}>Eliminar ejercicio</button>
        </div>
      </div>`;
    }).join('')}
    <a class="btn primario bloque" href="#/biblioteca?dia=${r.id}:${d.id}">${icono('biblioteca')} Añadir desde la biblioteca</a>
    <button class="btn bloque" data-accion="nuevo-ej" ${base}>+ Añadir ejercicio en blanco</button>`;
}

// ---------------------------------------------------------------------------
// Pantalla: Datos (copias de seguridad, CSV, ajustes)
// ---------------------------------------------------------------------------
function pantallaDatos() {
  prepararPantalla('Datos y copias', 'datos');
  const nSesiones = datos.sessions.length;
  const tamano = (JSON.stringify(datos).length / 1024).toFixed(0);
  vista.innerHTML = `<div class="tarjeta info aviso-local">
      <strong>Importante:</strong> los datos se guardan solo en este dispositivo y en este navegador.
      <strong>No se sincronizan</strong> con otros dispositivos. Si borras los datos de Safari o la app, se pierden.
      Haz copias de seguridad con frecuencia (por ejemplo, una vez por semana) y guárdalas en Archivos o iCloud Drive.
    </div>
    <div class="tarjeta">
      <h2>Copia de seguridad completa</h2>
      <p class="suave peq" style="margin-top:0">${nSesiones} sesiones · ${datos.routines.length} rutinas · ${tamano} KB.
        ${datos.meta.lastBackup ? `Última copia: ${esc(fechaLarga(datos.meta.lastBackup.slice(0, 10)))}.` : 'Aún no has hecho ninguna copia.'}</p>
      <button class="btn primario bloque" data-accion="exportar-json">Exportar copia (JSON)</button>
      <button class="btn bloque" data-accion="importar-json">Importar copia…</button>
      <input type="file" id="archivo-importar" accept=".json,application/json" hidden>
      <p class="suave peq">Al importar, los datos actuales se sustituyen por los de la copia (se te pedirá confirmación).</p>
      ${hayRespaldoPrevio() ? '<button class="btn bloque" data-accion="deshacer-importacion">Deshacer la última importación</button>' : ''}
    </div>
    <div class="tarjeta">
      <h2>Exportar registros (CSV)</h2>
      <p class="suave peq" style="margin-top:0">Una fila por serie, para abrir en Numbers o Excel. Sirve para consultar los datos; para restaurar la app usa la copia JSON.</p>
      <button class="btn bloque" data-accion="exportar-csv">Exportar CSV</button>
    </div>
    <div class="tarjeta">
      <h2>Incremento mínimo de peso</h2>
      <p class="suave peq" style="margin-top:0">Se usa para sugerir subidas de peso (siempre las confirmas tú).</p>
      <div class="rejilla-2">
        ${Object.entries(TIPOS_CARGA).filter(([k]) => k !== 'banda').map(([k, t]) => `<label class="campo">${esc(t.nombre)} (kg)
          <input inputmode="decimal" data-ajuste-inc="${k}" value="${fmt(datos.settings.increments[k])}"></label>`).join('')}
      </div>
    </div>
    <div class="tarjeta">
      <h2>Zona peligrosa</h2>
      <button class="btn peligro bloque" data-accion="borrar-todo">Borrar todos los datos</button>
    </div>`;
}

function descargar(nombre, contenido, tipo) {
  const blob = new Blob([contenido], { type: tipo });
  const archivo = typeof File === 'function' ? new File([blob], nombre, { type: tipo }) : null;
  // En iPhone, "Compartir" permite "Guardar en Archivos". Si no está disponible, se descarga.
  if (archivo && navigator.canShare && navigator.canShare({ files: [archivo] })) {
    return navigator.share({ files: [archivo], title: nombre }).then(() => true).catch((err) => {
      if (err && err.name === 'AbortError') return false;
      descargaDirecta(nombre, blob);
      return true;
    });
  }
  descargaDirecta(nombre, blob);
  return Promise.resolve(true);
}
function descargaDirecta(nombre, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function exportarJSON() {
  guardarYa();
  const copia = { ...datos, exportado: new Date().toISOString() };
  descargar(`entreno-copia-${fechaISO()}.json`, JSON.stringify(copia, null, 2), 'application/json').then((ok) => {
    if (!ok) return;
    datos.meta.lastBackup = new Date().toISOString();
    guardarYa();
    repintar();
    aviso('Copia exportada. Guárdala en un lugar seguro.');
  });
}

function celdaCSV(v) {
  const t = String(v ?? '');
  return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}
function generarCSV() {
  const cab = ['fecha', 'dia', 'estado_sesion', 'sesion_reducida', 'orden_ejercicio', 'ejercicio', 'maquina', 'tipo_carga', 'unilateral',
    'serie', 'tipo_serie', 'peso_kg', 'repeticiones', 'rir', 'completada',
    'objetivo_series', 'objetivo_reps', 'objetivo_rir', 'descanso', 'nota_ejercicio', 'nota_sesion', 'duracion_sesion'];
  const filas = [cab.join(';')];
  [...datos.sessions].sort(ordenSesion).reverse().forEach((s) => {
    s.exercises.forEach((e, i) => {
      let nT = 0;
      e.sets.forEach((x) => {
        const etiqueta = x.type === 'C' ? 'C' : String(++nT);
        const t = e.target || {};
        filas.push([
          s.date, s.dayName, s.status === 'en_curso' ? 'en curso' : 'terminada', s.reduced ? 'sí' : 'no', i + 1,
          e.name, e.machine, (TIPOS_CARGA[e.load] || {}).nombre || e.load, e.uni ? 'sí' : 'no',
          etiqueta, x.type === 'C' ? 'calentamiento' : 'trabajo', fmt(x.weight), fmt(x.reps), fmt(x.rir), x.done ? 'sí' : 'no',
          t.sets, rango(t.repMin, t.repMax), t.reduced ? '~4' : rango(t.rirMin, t.rirMax), t.rest, e.note, s.note,
          s.status === 'terminada' ? duracionTexto(segundosSesion(s)) : '',
        ].map(celdaCSV).join(';'));
      });
    });
  });
  // BOM para que Excel reconozca los acentos
  return '﻿' + filas.join('\r\n');
}

function hayRespaldoPrevio() {
  try { return !!localStorage.getItem(CLAVE_RESPALDO_PREVIO); } catch (e) { return false; }
}

function deshacerImportacion() {
  let previo;
  try {
    previo = normalizarDatos(JSON.parse(localStorage.getItem(CLAVE_RESPALDO_PREVIO)));
  } catch (e) {
    alert('No se ha podido leer la copia de antes de importar.');
    return;
  }
  if (!confirm(`¿Volver a los datos que tenías antes de la última importación (${previo.sessions.length} sesiones)? Se perderá lo que hayas apuntado desde entonces.`)) return;
  const anteriores = datos;
  datos = previo;
  if (guardarYa()) {
    try { localStorage.removeItem(CLAVE_RESPALDO_PREVIO); } catch (e) { /* nada */ }
    aviso('Datos restaurados.');
  } else if (datos === previo) {
    datos = anteriores;
  }
  repintar();
}

function importarArchivo(archivo) {
  const lector = new FileReader();
  lector.onload = () => {
    let obj;
    try {
      obj = JSON.parse(lector.result);
    } catch (e) {
      alert('No se pudo leer el archivo: no es un JSON válido.');
      return;
    }
    const error = validarCopia(obj);
    if (error) { alert(error); return; }
    let candidata;
    try {
      delete obj.exportado;
      candidata = normalizarDatos(clonar(obj));
    } catch (e) {
      alert('La copia tiene un formato que no se puede usar. Tus datos no se han tocado.');
      return;
    }
    const ok = confirm(`Vas a sustituir tus datos actuales (${datos.sessions.length} sesiones) por los de la copia (${candidata.sessions.length} sesiones, ${candidata.routines.length} rutinas).\n\n¿Continuar?`);
    if (!ok) return;
    try {
      localStorage.setItem(CLAVE_RESPALDO_PREVIO, JSON.stringify(datos));
    } catch (e) {
      if (!confirm('No hay espacio para guardar una copia de tus datos actuales antes de importar, así que no podrás deshacer la importación.\n\n¿Importar de todos modos?')) return;
    }
    const anteriores = datos;
    datos = candidata;
    if (guardarYa()) {
      aviso('Copia importada correctamente.');
    } else if (datos === candidata) {
      datos = anteriores; // no se pudo guardar: se mantienen los datos de antes
    }
    repintar();
  };
  lector.onerror = () => alert('No se pudo leer el archivo.');
  lector.readAsText(archivo);
}

// ---------------------------------------------------------------------------
// Pantalla: Biblioteca de ejercicios
// ---------------------------------------------------------------------------
// Grupos de material para el filtro (agrupan los tipos de carga).
const EQUIPOS = [
  ['mancuernas', 'Mancuernas', ['mancuerna', 'mancuerna1']],
  ['barra', 'Barra', ['barra']],
  ['polea', 'Polea', ['polea']],
  ['maquina', 'Máquina', ['maquina']],
  ['multipower', 'Multipower', ['multipower']],
  ['corporal', 'Peso corporal', ['corporal', 'asistida', 'lastre']],
  ['banda', 'Banda', ['banda']],
];
const nombreMusculo = (m) => (MUSCULOS.find(([k]) => k === m) || [m, m])[1];
const sinAcentos = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const filtroBiblio = { q: '', musculo: '', equipo: '' };
let modoBiblio = { tipo: 'normal' };
let hojaBiblio = null; // { nombre, rid, did }

// Biblioteca + ejercicios propios + cualquier ejercicio de tus rutinas que no esté en la lista.
function entradasBiblioteca() {
  const lista = BIBLIOTECA.map((e) => ({ ...e, propio: false }));
  const vistos = new Set(lista.map((e) => sinAcentos(e.name)));
  datos.customExercises.forEach((c) => {
    if (vistos.has(sinAcentos(c.name))) return;
    vistos.add(sinAcentos(c.name));
    lista.push({ ...c, propio: true });
  });
  datos.routines.forEach((r) => r.days.forEach((d) => d.exercises.forEach((e) => e.variants.forEach((v) => {
    if (!v.name || vistos.has(sinAcentos(v.name))) return;
    vistos.add(sinAcentos(v.name));
    lista.push({ name: v.name, muscle: 'otros', load: v.load, uni: !!v.uni, propio: false });
  }))));
  return lista;
}
const buscarEntrada = (nombre) => entradasBiblioteca().find((e) => e.name === nombre);

function nombresEnRutina() {
  const set = new Set();
  rutinaActiva().days.forEach((d) => d.exercises.forEach((e) => e.variants.forEach((v) => set.add(v.name))));
  return set;
}

// Interpreta "#/biblioteca?dia=rid:did" o "?cambiar=rid:did:ei:vi"
function leerModoBiblio(params) {
  if (params.get('dia')) {
    const [rid, did] = params.get('dia').split(':');
    const r = buscarRutina(rid);
    const d = r && r.days.find((x) => x.id === did);
    if (d) return { tipo: 'dia', r, d };
  }
  if (params.get('cambiar')) {
    const [rid, did, ei, vi] = params.get('cambiar').split(':');
    const r = buscarRutina(rid);
    const d = r && r.days.find((x) => x.id === did);
    const e = d && d.exercises[Number(ei)];
    if (e && e.variants[Number(vi)]) return { tipo: 'cambiar', r, d, e, vi: Number(vi) };
  }
  return { tipo: 'normal' };
}

function pantallaBiblioteca(params) {
  modoBiblio = leerModoBiblio(params);
  hojaBiblio = null;
  const m = modoBiblio;
  const volver = m.tipo === 'normal' ? null : `#/rutina/${m.r.id}/dia/${m.d.id}`;
  prepararPantalla('Ejercicios', m.tipo === 'normal' ? 'biblioteca' : 'rutinas', volver);

  let cabecera = '';
  if (m.tipo === 'dia') {
    cabecera = `<div class="tarjeta info">Toca un ejercicio para <strong>añadirlo a ${esc(m.d.name)}</strong> (${esc(m.r.name)}).</div>`;
  } else if (m.tipo === 'cambiar') {
    cabecera = `<div class="tarjeta info">Toca un ejercicio para <strong>sustituir «${esc(m.e.variants[m.vi].name)}»</strong> en ${esc(m.d.name)}. Series, repeticiones, RIR y descanso se mantienen.</div>`;
  } else {
    cabecera = '<p class="suave peq" style="margin-top:0">Toca un ejercicio para añadirlo a un día o cambiarlo por otro de tu rutina. Tu historial no cambia.</p>';
  }

  vista.innerHTML = `${cabecera}
    <div class="buscador">
      <div class="campo-buscar">${icono('buscar')}<input type="search" id="biblio-buscar" placeholder="Buscar ejercicio…" value="${esc(filtroBiblio.q)}" autocomplete="off" enterkeyhint="search"></div>
    </div>
    <div class="filtros" role="group" aria-label="Filtrar por músculo">
      <button class="chip-filtro ${filtroBiblio.musculo === '' ? 'activa' : ''}" data-biblio-musculo="">Todos</button>
      ${MUSCULOS.map(([k, n]) => `<button class="chip-filtro ${filtroBiblio.musculo === k ? 'activa' : ''}" data-biblio-musculo="${k}">${esc(n)}</button>`).join('')}
    </div>
    <label class="campo" style="margin-top:4px">Material
      <select id="biblio-equipo">
        <option value="">Cualquiera</option>
        ${EQUIPOS.map(([k, n]) => `<option value="${k}" ${filtroBiblio.equipo === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}
      </select>
    </label>
    <details class="tarjeta" id="crear-propio">
      <summary><strong>＋ Crear ejercicio propio</strong></summary>
      <label class="campo">Nombre<input id="propio-nombre" placeholder="Ej.: Remo en máquina Hammer"></label>
      <div class="rejilla-2">
        <label class="campo">Músculo
          <select id="propio-musculo">${MUSCULOS.map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join('')}</select>
        </label>
        <label class="campo">Tipo de carga
          <select id="propio-carga">${Object.entries(TIPOS_CARGA).map(([k, t]) => `<option value="${k}" ${k === 'maquina' ? 'selected' : ''}>${esc(t.nombre)}</option>`).join('')}</select>
        </label>
      </div>
      <label class="check"><input type="checkbox" id="propio-uni"> Unilateral (series por lado)</label>
      <button class="btn primario bloque" data-biblio="crear-propio">Guardar en la biblioteca</button>
    </details>
    <p class="suave peq" id="biblio-cuenta"></p>
    <div id="biblio-lista"></div>
    <div id="hoja-cont"></div>`;
  pintarListaBiblio();
}

function filtrarBiblio() {
  const palabras = sinAcentos(filtroBiblio.q).split(/\s+/).filter(Boolean);
  const cargas = filtroBiblio.equipo ? (EQUIPOS.find(([k]) => k === filtroBiblio.equipo) || [])[2] || [] : null;
  return entradasBiblioteca().filter((e) => (!filtroBiblio.musculo || e.muscle === filtroBiblio.musculo)
    && (!cargas || cargas.includes(e.load))
    && palabras.every((p) => sinAcentos(e.name).includes(p)));
}

function pintarListaBiblio() {
  const cont = document.getElementById('biblio-lista');
  if (!cont) return;
  const lista = filtrarBiblio();
  const enRutina = nombresEnRutina();
  document.getElementById('biblio-cuenta').textContent = `${lista.length} ejercicios`;
  if (!lista.length) {
    cont.innerHTML = '<div class="tarjeta">No hay ejercicios con esos filtros. Puedes crearlo como ejercicio propio.</div>';
    return;
  }
  cont.innerHTML = MUSCULOS.map(([k, n]) => {
    const delGrupo = lista.filter((e) => e.muscle === k).sort((a, b) => a.name.localeCompare(b.name, 'es'));
    if (!delGrupo.length) return '';
    return `<h2 class="grupo-musculo">${esc(n)} <span class="suave peq">(${delGrupo.length})</span></h2>
      <div class="lista-ejercicios">${delGrupo.map((e) => `<button class="ej-biblio" data-biblio="elegir" data-nombre="${esc(e.name)}">
        <span>${esc(e.name)}</span>
        <small>${esc((TIPOS_CARGA[e.load] || {}).nombre || e.load)}${e.uni ? ' · unilateral' : ''}${e.propio ? ' · <b>propio</b>' : ''}${enRutina.has(e.name) ? ' · <b class="en-rutina">en tu rutina</b>' : ''}</small>
      </button>`).join('')}</div>`;
  }).join('');
}

// Ficha inferior con las acciones para un ejercicio
function pintarHoja() {
  const cont = document.getElementById('hoja-cont');
  if (!cont) return;
  if (!hojaBiblio) { cont.innerHTML = ''; return; }
  const ent = buscarEntrada(hojaBiblio.nombre);
  if (!ent) { hojaBiblio = null; cont.innerHTML = ''; return; }
  const r = buscarRutina(hojaBiblio.rid) || rutinaActiva();
  const d = r.days.find((x) => x.id === hojaBiblio.did) || r.days[0];
  // Agrupado por ejercicio del día: cada grupo muestra solo los nombres de sus variantes
  const opcionesEj = d ? d.exercises.map((e, ei) => `<optgroup label="Ejercicio ${ei + 1}">${e.variants.map((v, vi) => `<option value="${ei}:${vi}">${esc(v.name)}</option>`).join('')}</optgroup>`).join('') : '';

  cont.innerHTML = `<div class="hoja-fondo" data-biblio="cerrar"></div>
    <div class="hoja ${hojaBiblio.nueva ? 'animar' : ''}" role="dialog" aria-label="${esc(ent.name)}">
      <h2>${esc(ent.name)}</h2>
      <div class="objetivo">
        <span class="chip">${esc(nombreMusculo(ent.muscle))}</span>
        <span class="chip carga">${esc((TIPOS_CARGA[ent.load] || {}).pista || '')}</span>
        ${ent.uni ? '<span class="chip uni">Unilateral: series por lado</span>' : ''}
        ${ent.propio ? '<span class="chip">Propio</span>' : ''}
      </div>
      ${datos.routines.length > 1 ? `<label class="campo">Rutina
        <select id="hoja-rutina">${datos.routines.map((x) => `<option value="${x.id}" ${x.id === r.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
      </label>` : ''}
      ${d ? `<label class="campo">Día
        <select id="hoja-dia">${r.days.map((x) => `<option value="${x.id}" ${x.id === d.id ? 'selected' : ''}>${esc(x.name)}${x.focus ? ' — ' + esc(x.focus) : ''}</option>`).join('')}</select>
      </label>
      <button class="btn primario bloque" data-biblio="anadir">Añadir al final de ${esc(d.name)}</button>
      ${d.exercises.length ? `<label class="campo" style="margin-top:14px">O elegir un ejercicio de ${esc(d.name)}
        <select id="hoja-slot">${opcionesEj}</select>
      </label>
      <div class="fila-botones">
        <button class="btn" data-biblio="cambiar">Cambiar por este</button>
        <button class="btn" data-biblio="alternativa">Añadir como alternativa</button>
      </div>` : ''}
      <p class="suave peq">Al cambiar se mantienen series, repeticiones, RIR y descanso. Tu historial y la sesión en curso no cambian.</p>`
    : '<p>Esta rutina no tiene días. Añade uno en Rutinas.</p>'}
      ${ent.propio ? '<button class="btn peligro bloque" data-biblio="borrar-propio">Eliminar de la biblioteca</button>' : ''}
      <button class="btn bloque" data-biblio="cerrar">Cerrar</button>
    </div>`;
  hojaBiblio.nueva = false;
}

const varianteDesde = (ent) => ({ name: ent.name, load: ent.load, uni: !!ent.uni, note: '' });

function anadirADia(d, ent) {
  const yaEsta = d.exercises.some((e) => e.variants.some((v) => v.name === ent.name));
  if (yaEsta && !confirm(`«${ent.name}» ya está en ${d.name}. ¿Añadirlo otra vez?`)) return false;
  d.exercises.push({
    id: uid(), variants: [varianteDesde(ent)],
    sets: 3, repMin: 8, repMax: 12, rirMin: 1, rirMax: 2, rest: '2 min', note: '',
  });
  guardarYa();
  return true;
}

function cambiarVariante(d, e, vi, ent) {
  const actual = e.variants[vi];
  if (actual.name === ent.name) { aviso('Es el mismo ejercicio.'); return false; }
  if (e.variants.some((v) => v.name === ent.name)) {
    alert(`«${ent.name}» ya es una de las opciones de este ejercicio.`);
    return false;
  }
  if (!confirm(`¿Cambiar «${actual.name}» por «${ent.name}» en ${d.name}?\n\nSe mantienen series, repeticiones, RIR y descanso. El historial de «${actual.name}» se conserva.`)) return false;
  e.variants[vi] = varianteDesde(ent);
  guardarYa();
  return true;
}

function crearPropio() {
  const nombre = document.getElementById('propio-nombre').value.trim().replace(/\s+/g, ' ');
  if (!nombre) { alert('Escribe un nombre para el ejercicio.'); return; }
  const existente = entradasBiblioteca().find((e) => sinAcentos(e.name) === sinAcentos(nombre));
  if (existente) {
    alert(`Ya existe «${existente.name}» en la biblioteca.`);
    return;
  }
  const nuevo = {
    id: uid(),
    name: nombre,
    muscle: document.getElementById('propio-musculo').value,
    load: document.getElementById('propio-carga').value,
    uni: document.getElementById('propio-uni').checked,
  };
  datos.customExercises.push(nuevo);
  guardarYa();
  aviso(`«${nombre}» guardado en la biblioteca.`);
  elegirEnBiblio(nombre, true);
}

// Qué pasa al tocar un ejercicio según desde dónde se abrió la biblioteca
function elegirEnBiblio(nombre, recienCreado = false) {
  const ent = buscarEntrada(nombre);
  if (!ent) return;
  const m = modoBiblio;
  if (m.tipo === 'dia') {
    if (anadirADia(m.d, ent)) {
      aviso(`Añadido a ${m.d.name}: 3 × 8–12, RIR 1–2. Ajústalo si quieres.`);
      ir(`#/rutina/${m.r.id}/dia/${m.d.id}`);
    }
    return;
  }
  if (m.tipo === 'cambiar') {
    if (cambiarVariante(m.d, m.e, m.vi, ent)) {
      aviso('Ejercicio cambiado.');
      ir(`#/rutina/${m.r.id}/dia/${m.d.id}`);
    }
    return;
  }
  if (recienCreado) {
    // Repinta la lista para que aparezca el nuevo y abre su ficha
    document.getElementById('crear-propio').open = false;
    document.getElementById('propio-nombre').value = '';
    pintarListaBiblio();
  }
  const r = rutinaActiva();
  const hoy = r.days.find((x) => x.weekday === diaSemana(fechaISO()));
  hojaBiblio = { nombre, rid: r.id, did: (hoy || r.days[0] || {}).id, nueva: true };
  pintarHoja();
}

vista.addEventListener('input', (ev) => {
  if (ev.target.id === 'biblio-buscar') {
    filtroBiblio.q = ev.target.value;
    pintarListaBiblio();
  }
});

vista.addEventListener('change', (ev) => {
  const el = ev.target;
  if (el.id === 'biblio-equipo') { filtroBiblio.equipo = el.value; pintarListaBiblio(); }
  if (el.id === 'hoja-rutina' && hojaBiblio) {
    const r = buscarRutina(el.value);
    hojaBiblio.rid = r.id;
    hojaBiblio.did = (r.days[0] || {}).id;
    pintarHoja();
  }
  if (el.id === 'hoja-dia' && hojaBiblio) { hojaBiblio.did = el.value; pintarHoja(); }
});

vista.addEventListener('click', (ev) => {
  const chip = ev.target.closest('[data-biblio-musculo]');
  if (chip) {
    filtroBiblio.musculo = chip.dataset.biblioMusculo;
    document.querySelectorAll('[data-biblio-musculo]').forEach((b) => b.classList.toggle('activa', b === chip));
    pintarListaBiblio();
    return;
  }
  const el = ev.target.closest('[data-biblio]');
  if (!el) return;
  const accion = el.dataset.biblio;
  if (accion === 'elegir') { elegirEnBiblio(el.dataset.nombre); return; }
  if (accion === 'crear-propio') { crearPropio(); return; }
  if (accion === 'cerrar') { hojaBiblio = null; pintarHoja(); return; }
  if (!hojaBiblio) return;

  const ent = buscarEntrada(hojaBiblio.nombre);
  const r = buscarRutina(hojaBiblio.rid) || rutinaActiva();
  const d = r.days.find((x) => x.id === hojaBiblio.did) || r.days[0];
  const slot = document.getElementById('hoja-slot');
  const [ei, vi] = slot ? slot.value.split(':').map(Number) : [];
  const e = d && ei !== undefined ? d.exercises[ei] : null;

  if (accion === 'anadir' && d) {
    if (anadirADia(d, ent)) {
      aviso(`Añadido a ${d.name} (3 × 8–12, RIR 1–2). Puedes ajustarlo en Rutinas.`);
      hojaBiblio = null;
      pintarHoja();
      pintarListaBiblio();
    }
  } else if (accion === 'cambiar' && e) {
    if (cambiarVariante(d, e, vi, ent)) {
      aviso(`Cambiado en ${d.name}.`);
      hojaBiblio = null;
      pintarHoja();
      pintarListaBiblio();
    }
  } else if (accion === 'alternativa' && e) {
    if (e.variants.some((v) => v.name === ent.name)) {
      alert(`«${ent.name}» ya es una de las opciones de este ejercicio.`);
      return;
    }
    e.variants.push(varianteDesde(ent));
    guardarYa();
    aviso(`Añadido como alternativa de «${e.variants[0].name}».`);
    hojaBiblio = null;
    pintarHoja();
  } else if (accion === 'borrar-propio') {
    if (!confirm(`¿Eliminar «${ent.name}» de tu biblioteca? Si lo usas en alguna rutina, seguirá allí, y el historial se conserva.`)) return;
    datos.customExercises = datos.customExercises.filter((c) => c.name !== ent.name);
    guardarYa();
    hojaBiblio = null;
    pintarHoja();
    pintarListaBiblio();
  }
});

// ---------------------------------------------------------------------------
// Eventos (un único manejador para toda la vista)
// ---------------------------------------------------------------------------
function sesionVista() { return buscarSesion(vista.dataset.sesion); }

function objetoRutina(el) {
  const r = buscarRutina(el.dataset.r);
  if (!r) return {};
  const d = el.dataset.d !== undefined ? r.days[Number(el.dataset.d)] : undefined;
  const e = d && el.dataset.e !== undefined ? d.exercises[Number(el.dataset.e)] : undefined;
  const v = e && el.dataset.v !== undefined ? e.variants[Number(el.dataset.v)] : undefined;
  return { r, d, e, v, destino: v || e || d || r };
}

function valorCampo(el) {
  if (el.dataset.tipo === 'bool') return el.checked;
  if (el.dataset.tipo === 'num') return leerNumero(el.value);
  return el.value;
}

// Escribir en campos: se guarda sin volver a pintar (para no perder el foco).
vista.addEventListener('input', (ev) => {
  const el = ev.target;
  const s = sesionVista();

  if (el.dataset.sesionCampo && s) {
    if (el.dataset.sesionCampo === 'date') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(el.value)) return;
    }
    s[el.dataset.sesionCampo] = el.value;
    guardar();
    return;
  }
  if (el.dataset.ej !== undefined && el.dataset.f && s) {
    const e = s.exercises[Number(el.dataset.ej)];
    if (!e) return;
    if (el.dataset.s !== undefined) {
      const x = e.sets[Number(el.dataset.s)];
      if (x) x[el.dataset.f] = leerNumero(el.value);
    } else {
      e[el.dataset.f] = el.value;
      if (el.dataset.f === 'machine') refrescarReferencias(s, Number(el.dataset.ej));
    }
    guardar();
    return;
  }
  if (el.dataset.ajusteInc) {
    const n = leerNumero(el.value);
    if (n !== null && n >= 0) { datos.settings.increments[el.dataset.ajusteInc] = n; guardar(); }
    return;
  }
  if (el.dataset.r && el.dataset.f && el.type !== 'checkbox' && el.tagName !== 'SELECT') {
    const { destino } = objetoRutina(el);
    if (destino) { destino[el.dataset.f] = valorCampo(el); guardar(); }
  }
});

vista.addEventListener('change', (ev) => {
  const el = ev.target;
  const s = sesionVista();
  const accion = el.dataset.accion;

  if (accion === 'variante' && s) {
    const e = s.exercises[Number(el.dataset.ej)];
    const idx = Number(el.value);
    const v = e.variants[idx];
    e.variantIdx = idx;
    e.name = v.name;
    e.load = v.load;
    e.uni = !!v.uni;
    e.machine = ultimaMaquina(v.name);
    guardarYa();
    repintar();
    return;
  }
  if (accion === 'readapt') {
    datos.settings.readapt = el.checked;
    guardarYa();
    aviso(el.checked ? 'Las nuevas sesiones serán reducidas hasta que lo desactives.' : 'Las nuevas sesiones volverán a ser completas.');
    return;
  }
  if (accion === 'plan') {
    const lunes = lunesDe(fechaISO());
    const { plan } = planSemana(lunes);
    plan[el.dataset.n] = el.value || null;
    datos.weekPlans[lunes] = { routineId: rutinaActiva().id, days: plan };
    guardarYa();
    repintar();
    return;
  }
  if (accion === 'elegir-progreso') {
    ir(`#/progreso?e=${encodeURIComponent(el.value)}`);
    return;
  }
  if (el.id === 'archivo-importar' && el.files && el.files[0]) {
    importarArchivo(el.files[0]);
    el.value = '';
    return;
  }
  if (el.dataset.sesionCampo === 'date' && s && /^\d{4}-\d{2}-\d{2}$/.test(el.value)) {
    s.date = el.value;
    guardarYa();
    repintar();
    return;
  }
  // Editor de rutinas: selects y casillas (repinta para actualizar totales)
  if (el.dataset.r && el.dataset.f) {
    const { destino } = objetoRutina(el);
    if (destino) {
      destino[el.dataset.f] = valorCampo(el);
      guardarYa();
      if (el.tagName === 'SELECT' || el.type === 'checkbox') repintar();
    }
  }
});

vista.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-accion]');
  if (!el || el.tagName === 'SELECT' || (el.tagName === 'INPUT' && el.type !== 'button')) return;
  const accion = el.dataset.accion;
  const s = sesionVista();
  const e = s && el.dataset.ej !== undefined ? s.exercises[Number(el.dataset.ej)] : null;
  const j = el.dataset.s !== undefined ? Number(el.dataset.s) : null;

  switch (accion) {
    // ---- Inicio
    case 'empezar':
      iniciarSesion(rutinaActiva().id, el.dataset.dia);
      return;
    case 'plan-reset':
      delete datos.weekPlans[lunesDe(fechaISO())];
      guardarYa();
      repintar();
      return;

    // ---- Sesión
    case 'hecho': {
      const x = e.sets[j];
      x.done = !x.done;
      serieRecienMarcada = x.done ? x.id : null;
      if (x.done && x.weight == null) {
        const pista = pesosOrientativos(s, e)[j];
        if (pista != null) x.weight = pista;
      }
      if (x.done && x.reps == null) aviso('Serie marcada. Recuerda apuntar las repeticiones.');
      guardarYa();
      repintar();
      return;
    }
    case 'tipo':
      e.sets[j].type = e.sets[j].type === 'C' ? 'T' : 'C';
      guardarYa();
      repintar();
      return;
    case 'add-serie':
      e.sets.push(nuevaSerie('T'));
      guardarYa();
      repintar();
      return;
    case 'add-calent': {
      // Los calentamientos se colocan antes de la primera serie de trabajo
      const primera = e.sets.findIndex((x) => x.type === 'T');
      e.sets.splice(primera < 0 ? e.sets.length : primera, 0, nuevaSerie('C'));
      guardarYa();
      repintar();
      return;
    }
    case 'borrar-serie': {
      const x = e.sets[j];
      const tieneDatos = x.weight != null || x.reps != null || x.rir != null || x.done;
      if (tieneDatos && !confirm('¿Borrar esta serie?')) return;
      e.sets.splice(j, 1);
      guardarYa();
      repintar();
      return;
    }
    case 'aplicar-sugerencia': {
      const peso = Number(el.dataset.peso);
      e.sets.forEach((x) => { if (x.type === 'T' && !x.done) x.weight = peso; });
      guardarYa();
      repintar();
      aviso(`Peso de las series pendientes: ${fmt(peso)} kg.`);
      return;
    }
    case 'terminar': {
      const pendientes = s.exercises.reduce((t, x) => t + x.sets.filter((y) => !y.done && y.type === 'T').length, 0);
      if (pendientes && !confirm(`Hay ${pendientes} series de trabajo sin marcar como hechas. Se guardarán como no completadas.\n\n¿Terminar la sesión?`)) return;
      s.status = 'terminada';
      s.finishedAt = new Date().toISOString();
      s.durationSec = Math.round(Math.max(0, (Date.parse(s.finishedAt) - Date.parse(s.startedAt)) / 1000));
      if (!guardarYa()) {
        // No se guardó: la sesión sigue en curso para no dar un éxito falso
        s.status = 'en_curso';
        s.finishedAt = null;
        delete s.durationSec;
        repintar();
        return;
      }
      aviso('Sesión guardada en el historial. ¡Buen trabajo!');
      ir('#/');
      return;
    }
    case 'descartar':
      if (!confirm('¿Descartar esta sesión? Se borrará todo lo apuntado en ella.')) return;
      datos.sessions = datos.sessions.filter((x) => x.id !== s.id);
      guardarYa();
      ir('#/');
      return;
    case 'borrar-sesion':
      if (!confirm('¿Eliminar esta sesión del historial? No se puede deshacer.')) return;
      datos.sessions = datos.sessions.filter((x) => x.id !== s.id);
      guardarYa();
      ir('#/historial');
      return;

    // ---- Rutinas
    case 'activar-rutina':
      datos.activeRoutineId = el.dataset.r;
      guardarYa();
      repintar();
      return;
    case 'duplicar-rutina': {
      const copia = prepararRutina(buscarRutina(el.dataset.r));
      copia.name += ' (copia)';
      datos.routines.push(copia);
      guardarYa();
      repintar();
      return;
    }
    case 'borrar-rutina': {
      const r = buscarRutina(el.dataset.r);
      if (!confirm(`¿Eliminar la rutina "${r.name}"? Las sesiones ya registradas se conservan.`)) return;
      datos.routines = datos.routines.filter((x) => x.id !== r.id);
      if (datos.activeRoutineId === r.id) datos.activeRoutineId = datos.routines[0].id;
      guardarYa();
      repintar();
      return;
    }
    case 'nueva-rutina': {
      const r = { id: uid(), name: 'Nueva rutina', days: [{ id: uid(), name: 'Día 1', focus: '', weekday: null, note: '', exercises: [] }] };
      datos.routines.push(r);
      guardarYa();
      ir(`#/rutina/${r.id}`);
      return;
    }
    case 'restaurar-base': {
      const r = prepararRutina(crearRutinaBase());
      r.name += ' (original)';
      datos.routines.push(r);
      guardarYa();
      repintar();
      aviso('Añadida una copia de la rutina original. Pulsa "Usar esta" para activarla.');
      return;
    }
    case 'nuevo-dia': {
      const r = buscarRutina(el.dataset.r);
      r.days.push({ id: uid(), name: `Día ${r.days.length + 1}`, focus: '', weekday: null, note: '', exercises: [] });
      guardarYa();
      repintar();
      return;
    }
    case 'mover-dia': case 'mover-ej': {
      const { r, d } = objetoRutina(el);
      const lista = accion === 'mover-dia' ? r.days : d.exercises;
      const i = Number(accion === 'mover-dia' ? el.dataset.d : el.dataset.e);
      const k = i + Number(el.dataset.dir);
      if (k < 0 || k >= lista.length) return;
      [lista[i], lista[k]] = [lista[k], lista[i]];
      guardarYa();
      repintar();
      return;
    }
    case 'duplicar-dia': {
      const { r, d } = objetoRutina(el);
      const copia = clonar(d);
      copia.id = uid();
      copia.name += ' (copia)';
      copia.weekday = null;
      copia.exercises.forEach((x) => { x.id = uid(); });
      r.days.splice(Number(el.dataset.d) + 1, 0, copia);
      guardarYa();
      repintar();
      return;
    }
    case 'borrar-dia': {
      const { r, d } = objetoRutina(el);
      if (!confirm(`¿Eliminar el día "${d.name}" de la rutina? El historial se conserva.`)) return;
      r.days.splice(Number(el.dataset.d), 1);
      guardarYa();
      repintar();
      return;
    }
    case 'nuevo-ej': {
      const { d } = objetoRutina(el);
      d.exercises.push({
        id: uid(), variants: [{ name: 'Nuevo ejercicio', load: 'maquina', uni: false, note: '' }],
        sets: 3, repMin: 8, repMax: 12, rirMin: 1, rirMax: 2, rest: '2 min', note: '',
      });
      guardarYa();
      repintar();
      return;
    }
    case 'borrar-ej': {
      const { d, e: ej } = objetoRutina(el);
      if (!confirm(`¿Eliminar "${ej.variants[0].name}" de este día?`)) return;
      d.exercises.splice(Number(el.dataset.e), 1);
      guardarYa();
      repintar();
      return;
    }
    case 'nueva-variante': {
      const { e: ej } = objetoRutina(el);
      ej.variants.push({ name: 'Alternativa', load: ej.variants[0].load, uni: false, note: '' });
      guardarYa();
      repintar();
      return;
    }
    case 'borrar-variante': {
      const { e: ej } = objetoRutina(el);
      ej.variants.splice(Number(el.dataset.v), 1);
      guardarYa();
      repintar();
      return;
    }
    case 'principal-variante': {
      const { e: ej } = objetoRutina(el);
      const [v] = ej.variants.splice(Number(el.dataset.v), 1);
      ej.variants.unshift(v);
      guardarYa();
      repintar();
      return;
    }

    // ---- Datos
    case 'exportar-json':
      exportarJSON();
      return;
    case 'deshacer-importacion':
      deshacerImportacion();
      return;
    case 'importar-json':
      document.getElementById('archivo-importar').click();
      return;
    case 'exportar-csv':
      descargar(`entreno-registros-${fechaISO()}.csv`, generarCSV(), 'text/csv;charset=utf-8');
      return;
    case 'borrar-todo': {
      const texto = prompt('Esto borrará TODAS tus sesiones y rutinas de este dispositivo. Para confirmar, escribe BORRAR');
      if (texto !== 'BORRAR') return;
      datos = datosIniciales();
      guardarYa();
      aviso('Datos borrados. Se ha cargado la rutina original.');
      ir('#/');
      return;
    }
    default:
  }
});

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------
datos = cargar();
if (!errorAlmacenamiento) guardarYa();
marcarGuardado('');
mostrar();

// Pide al navegador que no borre los datos automáticamente (si lo permite).
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

// Funcionamiento sin conexión: solo se activa si la app se sirve por HTTPS (o localhost).
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Sin modo sin conexión:', e));
}
