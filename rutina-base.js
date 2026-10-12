// Rutina base de 5 días (lunes a viernes), tal como está en requisitos-app.md.
// Cada ejercicio tiene una variante principal (la primera) y dos alternativas.
// Se elige UNA de las tres en cada sesión.
//
// Tipos de carga ("load"): ver TIPOS_CARGA en app.js.
// "uni: true" significa unilateral: las series se cuentan por lado.

/* eslint-disable no-unused-vars */
function crearRutinaBase() {
  const v = (name, load, uni = false, note = '') => ({ name, load, uni, note });
  const ej = (variants, sets, repMin, repMax, rest, extra = {}) => ({
    variants,
    sets,
    repMin,
    repMax,
    rirMin: extra.rirMin ?? 1,
    rirMax: extra.rirMax ?? 2,
    rest,
    note: extra.note ?? '',
  });

  // Variantes que se repiten en varios días (mismo nombre = mismo historial)
  const LAT = [
    v('Elevaciones laterales con mancuernas', 'mancuerna'),
    v('Elevaciones laterales en polea unilateral', 'polea', true),
    v('Elevaciones laterales en máquina', 'maquina'),
  ];
  const INCLINADO = [
    v('Press inclinado con mancuernas', 'mancuerna'),
    v('Press inclinado en multipower', 'multipower'),
    v('Press inclinado en máquina', 'maquina'),
  ];
  const JALON = [
    v('Jalón al pecho con agarre neutro', 'polea'),
    v('Dominadas neutras asistidas', 'asistida'),
    v('Jalón en máquina de palancas', 'maquina'),
  ];
  const REMO = [
    v('Remo en máquina con pecho apoyado', 'maquina'),
    v('Remo con mancuernas y pecho apoyado en banco inclinado', 'mancuerna'),
    v('Remo sentado en polea sin balancear el torso', 'polea'),
  ];
  const CURL = [
    v('Curl de bíceps con mancuernas (palmas hacia arriba)', 'mancuerna'),
    v('Curl con barra EZ', 'barra'),
    v('Curl en polea baja', 'polea'),
  ];
  const CRUNCH = [
    v('Crunch abdominal en polea', 'polea'),
    v('Crunch en máquina', 'maquina'),
    v('Crunch en suelo con carga', 'lastre'),
  ];
  const GEMELOS = [
    v('Elevación de gemelos de pie', 'maquina'),
    v('Gemelos de pie en multipower', 'multipower'),
    v('Gemelos en prensa con rodillas casi extendidas', 'maquina'),
  ];

  const dias = [
    {
      name: 'Lunes',
      focus: 'Pecho, deltoides lateral y tríceps',
      weekday: 1,
      note: '',
      exercises: [
        ej(LAT, 3, 12, 20, '2 min'),
        ej([
          v('Press plano con mancuernas', 'mancuerna'),
          v('Press de banca plano con barra', 'barra'),
          v('Press horizontal de pecho en máquina', 'maquina'),
        ], 3, 6, 10, '2–3 min (orientativo: 3 min)'),
        ej(INCLINADO, 2, 8, 12, '2–3 min (orientativo: 3 min)', { note: 'Banco aproximadamente a 15–30°.' }),
        ej([
          v('Extensión de tríceps por encima de la cabeza en polea', 'polea'),
          v('Extensión sobre la cabeza con mancuerna', 'mancuerna1'),
          v('Extensión sobre la cabeza con barra EZ', 'barra'),
        ], 3, 10, 15, '2 min'),
      ],
    },
    {
      name: 'Martes',
      focus: 'Espalda, deltoides posterior, bíceps y abdomen',
      weekday: 2,
      note: '',
      exercises: [
        ej(JALON, 3, 8, 12, '2–3 min (orientativo: 3 min)'),
        ej(REMO, 3, 8, 12, '2–3 min (orientativo: 3 min)'),
        ej([
          v('Aperturas inversas en máquina', 'maquina'),
          v('Aperturas inversas en poleas', 'polea'),
          v('Pájaros con mancuernas y pecho apoyado', 'mancuerna'),
        ], 3, 12, 20, '1,5–2 min (orientativo: 2 min)'),
        ej(CURL, 3, 8, 12, '2 min'),
        ej(CRUNCH, 2, 10, 20, '1–2 min (orientativo: 90 s)', { note: 'Movimiento controlado.' }),
      ],
    },
    {
      name: 'Miércoles',
      focus: 'Cuádriceps, aductores y gemelos',
      weekday: 3,
      note: 'Sin curl femoral este día.',
      exercises: [
        ej([
          v('Sentadilla hack', 'maquina'),
          v('Sentadilla en multipower', 'multipower'),
          v('Sentadilla con barra alta', 'barra'),
        ], 3, 8, 12, '3 min'),
        ej([
          v('Prensa de piernas', 'maquina'),
          v('Prensa de piernas (otra variante)', 'maquina'),
          v('Sentadilla búlgara con apoyo', 'mancuerna', true, 'Si haces búlgaras: dos series por pierna.'),
        ], 2, 10, 15, '2–3 min (orientativo: 3 min)'),
        ej([
          v('Extensión de cuádriceps en máquina', 'maquina'),
          v('Extensión de cuádriceps unilateral en máquina', 'maquina', true),
          v('Extensión de rodilla sentado con tobillera en polea', 'polea', false, 'Con montaje estable.'),
        ], 3, 10, 15, '2 min'),
        ej([
          v('Aducción de cadera en máquina', 'maquina'),
          v('Aducción de pie en polea con tobillera', 'polea', true),
          v('Aducción tumbado de lado con carga ligera en el tobillo', 'lastre', true),
        ], 2, 12, 20, '1,5–2 min (orientativo: 2 min)', { note: 'Cerrar las piernas.' }),
        ej(GEMELOS, 3, 10, 20, '2 min'),
      ],
    },
    {
      name: 'Jueves',
      focus: 'Pecho, hombro, tríceps y abdomen',
      weekday: 4,
      note: '',
      exercises: [
        ej(LAT, 3, 12, 20, '2 min'),
        ej(INCLINADO, 3, 8, 12, '2–3 min (orientativo: 3 min)'),
        ej([
          v('Aperturas de pecho en máquina', 'maquina'),
          v('Aperturas en poleas a la altura del pecho', 'polea'),
          v('Aperturas con mancuernas en banco plano', 'mancuerna'),
        ], 2, 10, 15, '2 min'),
        ej([
          v('Press de hombros sentado en máquina', 'maquina'),
          v('Press de hombros sentado con mancuernas', 'mancuerna'),
          v('Press de hombros sentado en multipower', 'multipower'),
        ], 2, 8, 12, '2–3 min (orientativo: 3 min)'),
        ej([
          v('Extensión de tríceps en polea hacia abajo', 'polea'),
          v('Extensión de tríceps unilateral en polea con asa', 'polea', true),
          v('Extensión de tríceps con banda anclada arriba', 'banda'),
        ], 3, 10, 15, '2 min'),
        ej(CRUNCH, 2, 10, 20, '1–2 min (orientativo: 90 s)', { note: 'Movimiento controlado.' }),
      ],
    },
    {
      name: 'Viernes',
      focus: 'Isquiosurales, espalda, bíceps y gemelos',
      weekday: 5,
      note: '',
      exercises: [
        ej([
          v('Peso muerto rumano con barra', 'barra'),
          v('Peso muerto rumano con mancuernas', 'mancuerna'),
          v('Peso muerto rumano en multipower', 'multipower'),
        ], 3, 8, 10, '3 min, ampliable si hace falta', {
          rirMin: 2,
          rirMax: 3,
          note: 'Mantener el control y terminar el recorrido antes de perder la posición; no es necesario llegar al suelo.',
        }),
        ej(JALON, 2, 8, 12, '2–3 min (orientativo: 3 min)'),
        ej([
          v('Curl femoral sentado', 'maquina'),
          v('Curl femoral tumbado', 'maquina'),
          v('Curl femoral de pie unilateral', 'maquina', true),
        ], 3, 10, 15, '2 min'),
        ej(REMO, 2, 8, 12, '2–3 min (orientativo: 3 min)', {
          note: 'Preferir apoyo para no sumar demasiada demanda lumbar después del rumano.',
        }),
        ej(CURL, 2, 10, 15, '2 min'),
        ej(GEMELOS, 2, 10, 20, '2 min'),
      ],
    },
  ];

  return { name: 'Mi rutina (5 días)', days: dias };
}
