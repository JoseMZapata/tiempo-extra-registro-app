export interface Empleado {
  id?: number;
  nombre: string | null;
  numeroEmpleado: string;
  departamento: string | null;
  turno: string | null;
  rutaUsual: string | null;
  paradaUsual: string | null;
  rutaId?: number | null;
  fechaBaja?: string | null;
  puesto?: string | null;
  centroDeCosto?: string | null;
  sucursal?: string | null;
  bloqueadoTiempoExtra?: boolean;
  esAdministrativo?: boolean;
}