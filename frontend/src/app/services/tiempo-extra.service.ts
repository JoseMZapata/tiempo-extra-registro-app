import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Registro, FormularioTiempoExtra, RegistroBatchResult } from '../models/registro.model';
import { Empleado } from '../models/empleado.model';
import { Ruta } from '../models/ruta.model';

export interface ResultadoEmpleadoBatch {
  exito: boolean;
  numeroEmpleado: string;
  empleadoId?: number;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class TiempoExtraService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  getEmpleadoPorNumero(numeroEmpleado: string): Observable<Empleado> {
    return this.http.get<Empleado>(`${this.apiUrl}/empleados/numero/${numeroEmpleado}`);
  }

  getEmpleados(): Observable<Empleado[]> {
    return this.http.get<Empleado[]>(`${this.apiUrl}/empleados`);
  }

  getEmpleadosAdministrativos(): Observable<Empleado[]> {
    return this.http.get<Empleado[]>(`${this.apiUrl}/empleados`, {
      params: { esAdministrativo: 'true' },
    });
  }

  setEmpleadosAdministrativos(
    ids: number[],
    esAdministrativo: boolean,
  ): Observable<{ actualizados: number }> {
    return this.http.patch<{ actualizados: number }>(
      `${this.apiUrl}/empleados/administrativo`,
      { ids, esAdministrativo },
    );
  }

  updateEmpleado(id: number, datos: Partial<Empleado>): Observable<Empleado> {
    return this.http.patch<Empleado>(`${this.apiUrl}/empleados/${id}`, datos);
  }

  createEmpleados(
    empleados: Partial<Empleado>[],
  ): Observable<ResultadoEmpleadoBatch[]> {
    return this.http.post<ResultadoEmpleadoBatch[]>(
      `${this.apiUrl}/empleados/batch`,
      { empleados },
    );
  }

  deleteEmpleado(id: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/empleados/${id}`);
  }

  getRegistros(busqueda?: string): Observable<Registro[]> {
    let params = new HttpParams();
    if (busqueda) {
      params = params.set('q', busqueda);
    }
    return this.http.get<Registro[]>(`${this.apiUrl}/registros`, { params });
  }

  createRegistro(datos: FormularioTiempoExtra): Observable<Registro> {
    return this.http.post<Registro>(`${this.apiUrl}/registros`, datos);
  }

  createRegistros(registros: FormularioTiempoExtra[]): Observable<RegistroBatchResult[]> {
    return this.http.post<RegistroBatchResult[]>(`${this.apiUrl}/registros/batch`, { registros });
  }

  updateRegistro(id: number, datos: Partial<FormularioTiempoExtra>): Observable<Registro> {
    return this.http.patch<Registro>(`${this.apiUrl}/registros/${id}`, datos);
  }

  deleteRegistro(id: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/registros/${id}`);
  }

  generarMantenimiento(
    fecha: string,
    empleadoIds?: number[],
  ): Observable<{ creados: number; existentes: number; eliminados: number; fecha: string }> {
    return this.http.post<{ creados: number; existentes: number; eliminados: number; fecha: string }>(
      `${this.apiUrl}/registros/mantenimiento`,
      { fecha, empleadoIds },
    );
  }

  getRutas(): Observable<Ruta[]> {
    return this.http.get<Ruta[]>(`${this.apiUrl}/rutas`);
  }

  createRuta(datos: { nombre: string; paradas: string[] }): Observable<Ruta> {
    return this.http.post<Ruta>(`${this.apiUrl}/rutas`, datos);
  }

  updateRuta(
    id: number,
    datos: { nombre: string; paradas: string[] },
  ): Observable<Ruta> {
    return this.http.patch<Ruta>(`${this.apiUrl}/rutas/${id}`, datos);
  }

  deleteRuta(id: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/rutas/${id}`);
  }
}