import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  FormularioTiempoExtra,
  RegistroPendiente,
} from '../models/registro.model';

@Injectable({ providedIn: 'root' })
export class RegistroPendienteService {
  private readonly STORAGE_KEY = 'registros_pendientes_v1';
  private readonly pendientesSubject = new BehaviorSubject<RegistroPendiente[]>(
    this.cargar(),
  );

  readonly pendientes$ = this.pendientesSubject.asObservable();

  get pendientes(): RegistroPendiente[] {
    return this.pendientesSubject.value;
  }

  agregar(datos: FormularioTiempoExtra): void {
    const lista = [
      ...this.pendientes,
      { ...datos, uid: this.nuevoUid(), ts: Date.now() },
    ];
    this.persistir(lista);
  }

  eliminar(uid: string): void {
    this.persistir(this.pendientes.filter((p) => p.uid !== uid));
  }

  actualizar(uid: string, datos: FormularioTiempoExtra): void {
    const lista = this.pendientes.map((p) =>
      p.uid === uid ? { ...p, ...datos } : p,
    );
    this.persistir(lista);
  }

  eliminarVarios(uids: string[]): void {
    if (!uids.length) return;
    const conjunto = new Set(uids);
    this.persistir(this.pendientes.filter((p) => !conjunto.has(p.uid)));
  }

  limpiar(): void {
    this.persistir([]);
  }

  private persistir(lista: RegistroPendiente[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(lista));
    } catch {
      // Almacenamiento no disponible; se mantiene solo en memoria.
    }
    this.pendientesSubject.next(lista);
  }

  private cargar(): RegistroPendiente[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return [];
      const lista = JSON.parse(raw) as RegistroPendiente[];
      return Array.isArray(lista) ? lista : [];
    } catch {
      return [];
    }
  }

  private nuevoUid(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}