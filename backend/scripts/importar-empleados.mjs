import { readFileSync } from 'node:fs';
import XLSX from 'xlsx';
import mysql from 'mysql2/promise';

const EXCEL_PATH = 'C:/Users/IT JOSE/Documents/tiempo-extra-registro-app/Tendance.xls';
const HOJA = 'PRE NOMINA WK 36';

const limpiar = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
};

const normalizarFecha = (v) => {
  if (v === null || v === undefined) return null;
  if (v instanceof Date && !isNaN(v.getTime())) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(v).trim();
  if (s === '') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
};

const wb = XLSX.readFile(EXCEL_PATH, { cellDates: true });
const ws = wb.Sheets[HOJA];
const filas = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });

const encabezados = filas[0].map((h) => String(h ?? '').trim().toLowerCase());
const idx = {
  numeroEmpleado: encabezados.indexOf('numero_empleado'),
  fechaBaja: encabezados.indexOf('fecha_de_baja'),
  nombre: encabezados.findIndex((h) => h === 'nombre'),
  departamento: encabezados.indexOf('departamento'),
  puesto: encabezados.indexOf('puesto'),
  centroDeCosto: encabezados.indexOf('centro_de_costo'),
  sucursal: encabezados.indexOf('sucursal'),
  turno: encabezados.indexOf('turno'),
};

console.log('Encabezados:', encabezados);

const conn = await mysql.createConnection({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'root',
  database: 'tiempo_extra_db',
});

let insertados = 0;
let actualizados = 0;
let sinNumero = 0;
const bajas = [];

for (let i = 1; i < filas.length; i++) {
  const f = filas[i];
  if (!f || f.every((c) => c === null || c === undefined || String(c).trim() === '')) continue;

  const numeroEmpleado = limpiar(f[idx.numeroEmpleado]);
  if (!numeroEmpleado) {
    sinNumero++;
    continue;
  }

  const datos = {
    nombre: limpiar(f[idx.nombre]),
    departamento: limpiar(f[idx.departamento]),
    turno: limpiar(f[idx.turno]),
    puesto: limpiar(f[idx.puesto]),
    centroDeCosto: limpiar(f[idx.centroDeCosto]),
    sucursal: limpiar(f[idx.sucursal]),
    fechaBaja: normalizarFecha(f[idx.fechaBaja]),
  };

  if (datos.fechaBaja) bajas.push({ numeroEmpleado, nombre: datos.nombre, fecha: datos.fechaBaja });

  const [existentes] = await conn.execute(
    'SELECT id FROM empleados WHERE numero_empleado = ?',
    [numeroEmpleado],
  );

  if (existentes.length > 0) {
    await conn.execute(
      `UPDATE empleados SET nombre = ?, departamento = ?, turno = ?,
        puesto = ?, centro_de_costo = ?, sucursal = ?, fecha_de_baja = ?
       WHERE numero_empleado = ?`,
      [
        datos.nombre,
        datos.departamento,
        datos.turno,
        datos.puesto,
        datos.centroDeCosto,
        datos.sucursal,
        datos.fechaBaja,
        numeroEmpleado,
      ],
    );
    actualizados++;
  } else {
    await conn.execute(
      `INSERT INTO empleados
        (nombre, numero_empleado, departamento, turno, puesto, centro_de_costo, sucursal, fecha_de_baja)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        datos.nombre,
        numeroEmpleado,
        datos.departamento,
        datos.turno,
        datos.puesto,
        datos.centroDeCosto,
        datos.sucursal,
        datos.fechaBaja,
      ],
    );
    insertados++;
  }
}

console.log(`Insertados: ${insertados}`);
console.log(`Actualizados: ${actualizados}`);
console.log(`Sin numero de empleado (omitidos): ${sinNumero}`);
console.log('Empleados con baja:');
for (const b of bajas) console.log(`  - ${b.numeroEmpleado} ${b.nombre ?? ''} (${b.fecha})`);

await conn.end();