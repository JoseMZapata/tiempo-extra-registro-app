import { Component, ViewChild, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { RegistroForm } from '../../components/registro-form/registro-form';
import { FormularioTiempoExtra, RegistroPendiente } from '../../models/registro.model';
import { TiempoExtraService } from '../../services/tiempo-extra.service';
import { RegistroPendienteService } from '../../services/registro-pendiente.service';

@Component({
  selector: 'app-home',
  imports: [RegistroForm, FormsModule, NgClass],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit, OnDestroy {
  @ViewChild(RegistroForm) registroForm!: RegistroForm;

  datos: FormularioTiempoExtra = this.cargarBorrador();
  pendientes: RegistroPendiente[] = [];
  mensaje = '';
  tipoMensaje = '';
  guardandoLote = false;
  uidEdicion: string | null = null;

  private readonly DRAFT_KEY = 'registro_borrador_v1';
  private suscripcionPendientes?: Subscription;

  constructor(
    private readonly tiempoExtraService: TiempoExtraService,
    private readonly registroPendienteService: RegistroPendienteService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.suscripcionPendientes = this.registroPendienteService.pendientes$.subscribe(
      (pendientes) => {
        this.pendientes = pendientes;
        this.cdr.detectChanges();
      },
    );
  }

  ngOnDestroy(): void {
    this.suscripcionPendientes?.unsubscribe();
  }

  get editando(): boolean {
    return this.uidEdicion !== null;
  }

  getEmpty(): FormularioTiempoExtra {
    return {
      nombre: '',
      numeroEmpleado: '',
      departamento: '',
      turno: 'A',
      rutaUsual: '',
      paradaUsual: '',
      puesto: '',
      centroDeCosto: '',
      sucursal: '',
      fecha: new Date().toISOString().split('T')[0],
      horario: '7-4',
      turnoExtra: 'A',
      rutaExtra: '',
      paradaExtra: '',
      observaciones: '',
    };
  }

  get gruposPendientes(): { departamento: string; registros: RegistroPendiente[] }[] {
    const mapa = new Map<string, RegistroPendiente[]>();
    for (const pendiente of this.pendientes) {
      const departamento = pendiente.departamento?.trim() || 'Sin departamento';
      if (!mapa.has(departamento)) {
        mapa.set(departamento, []);
      }
      mapa.get(departamento)!.push(pendiente);
    }
    return [...mapa.entries()].map(([departamento, registros]) => ({
      departamento,
      registros,
    }));
  }

  onFormChange(datos: FormularioTiempoExtra): void {
    this.datos = datos;
    this.guardarBorrador(datos);
    this.cdr.detectChanges();
  }

  onAgregar(datos: FormularioTiempoExtra): void {
    if (!datos.nombre || !datos.nombre.trim()) {
      this.mostrarMensaje('El Nombre del empleado es obligatorio.', 'danger');
      this.registroForm?.onGuardadoError();
      return;
    }
    if (!datos.numeroEmpleado || !datos.numeroEmpleado.trim()) {
      this.mostrarMensaje('El Número de empleado es obligatorio.', 'danger');
      this.registroForm?.onGuardadoError();
      return;
    }

    if (this.uidEdicion) {
      this.registroPendienteService.actualizar(this.uidEdicion, { ...datos });
      this.uidEdicion = null;
      this.registroForm?.onGuardadoExito();
      this.mostrarMensaje(
        `Registro de ${datos.nombre} actualizado en la lista pendiente.`,
        'success',
      );
    } else {
      this.registroPendienteService.agregar({ ...datos });
      this.registroForm?.onGuardadoExito();
      this.mostrarMensaje(
        `Registro de ${datos.nombre} agregado a la lista pendiente.`,
        'success',
      );
    }
  }

  editarPendiente(uid: string): void {
    const pendiente = this.pendientes.find((p) => p.uid === uid);
    if (!pendiente) return;

    const { uid: _uid, ts: _ts, ...formato } = pendiente;
    this.datos = { ...formato };
    this.uidEdicion = uid;
    this.cdr.detectChanges();
    this.mostrarMensaje(
      `Editando el registro de ${pendiente.nombre}. Guarda los cambios o cancela.`,
      'warning',
    );
  }

  cancelarEdicion(): void {
    this.uidEdicion = null;
    this.registroForm?.limpiar();
    this.mostrarMensaje('Edición cancelada.', 'warning');
  }

  eliminarPendiente(uid: string): void {
    if (uid === this.uidEdicion) {
      this.uidEdicion = null;
    }
    this.registroPendienteService.eliminar(uid);
  }

  vaciarPendientes(): void {
    this.uidEdicion = null;
    this.registroPendienteService.limpiar();
    this.mostrarMensaje('Lista de pendientes vaciada.', 'warning');
  }

  guardarLote(): void {
    if (!this.pendientes.length || this.guardandoLote) return;
    this.guardandoLote = true;
    const cola = [...this.pendientes];
    const registros = cola.map(({ uid, ts, ...resto }) => resto);

    this.tiempoExtraService.createRegistros(registros).subscribe({
      next: (resultados) => {
        this.guardandoLote = false;
        if (this.uidEdicion) {
          this.uidEdicion = null;
        }
        const eliminados: string[] = [];
        const fallidos: { numeroEmpleado: string; error: string }[] = [];
        resultados.forEach((resultado, indice) => {
          if (resultado.exito) {
            eliminados.push(cola[indice]?.uid);
          } else {
            fallidos.push({
              numeroEmpleado: resultado.numeroEmpleado,
              error: resultado.error ?? 'Error desconocido',
            });
          }
        });
        this.registroPendienteService.eliminarVarios(eliminados.filter(Boolean));

        if (fallidos.length === 0) {
          this.mostrarMensaje(
            `${resultados.length} registros guardados correctamente.`,
            'success',
          );
        } else {
          this.mostrarMensaje(
            `${resultados.length - fallidos.length} guardados, ${fallidos.length} fallaron. Revisa los empleados: ${fallidos.map((f) => f.numeroEmpleado).join(', ')}.`,
            'danger',
          );
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.guardandoLote = false;
        this.mostrarMensaje(
          'Error al guardar el lote. Verifica la conexión con el servidor.',
          'danger',
        );
        this.cdr.detectChanges();
      },
    });
  }

  formatoFecha(fecha: string): string {
    if (!fecha) return '—';
    const [anio, mes, dia] = fecha.split('-');
    if (!anio || !mes || !dia) return fecha;
    return `${dia}/${mes}/${anio}`;
  }

  labelHorario(horario: string): string {
    if (horario === '7-4') return '7 a 4';
    if (horario === '7-7') return '7 a 7';
    return horario || '—';
  }

  turnoClass(turno: string | undefined): string {
    if (turno === 'A') return 'turno-a';
    if (turno === 'B') return 'turno-b';
    if (turno === 'C') return 'turno-c';
    return '';
  }

  iniciales(nombre: string): string {
    if (!nombre) return '?';
    const partes = nombre.trim().split(/\s+/);
    const letras = partes.slice(0, 2).map((p) => p.charAt(0)?.toUpperCase() ?? '');
    return letras.join('') || '?';
  }

  private mostrarMensaje(texto: string, tipo: string): void {
    this.mensaje = texto;
    this.tipoMensaje = tipo;
    setTimeout(() => (this.mensaje = ''), 6000);
  }

  private cargarBorrador(): FormularioTiempoExtra {
    try {
      const raw = localStorage.getItem(this.DRAFT_KEY);
      if (!raw) return this.getEmpty();
      return { ...this.getEmpty(), ...(JSON.parse(raw) as FormularioTiempoExtra) };
    } catch {
      return this.getEmpty();
    }
  }

  private guardarBorrador(datos: FormularioTiempoExtra): void {
    try {
      localStorage.setItem(this.DRAFT_KEY, JSON.stringify(datos));
    } catch {
      // Almacenamiento no disponible; el borrador solo vive en memoria.
    }
  }
}