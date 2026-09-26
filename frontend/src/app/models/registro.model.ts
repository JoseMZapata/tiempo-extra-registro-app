import { Empleado } from './empleado.model';

export interface Registro {
  id?: number;
  empleadoId?: number;
  empleado?: Empleado;
  fecha: string;
  horario: string;
  turnoExtra: string;
  rutaExtra: string | null;
  paradaExtra: string | null;
  observaciones: string | null;
}

export interface FormularioTiempoExtra {
  nombre: string;
  numeroEmpleado: string;
  departamento: string;
  turno: string;
  rutaUsual: string;
  paradaUsual: string;
  puesto: string;
  centroDeCosto: string;
  sucursal: string;
  fecha: string;
  horario: string;
  turnoExtra: string;
  rutaExtra: string;
  paradaExtra: string;
  observaciones: string;
}

export type RegistroPendiente = FormularioTiempoExtra & {
  uid: string;
  ts: number;
};

export interface RegistroBatchResult {
  exito: boolean;
  numeroEmpleado: string;
  registroId?: number;
  error?: string;
}