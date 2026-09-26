import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TiempoExtraService } from '../../services/tiempo-extra.service';
import { Ruta } from '../../models/ruta.model';

@Component({
  selector: 'app-rutas',
  imports: [FormsModule],
  templateUrl: './rutas.html',
  styleUrl: './rutas.scss',
})
export class Rutas implements OnInit {
  rutas: Ruta[] = [];
  cargando = true;
  mensaje = '';
  tipoMensaje = '';
  expandidas = new Set<number>();
  busqueda = '';
  mostrarFiltros = false;

  mostrarModal = false;
  editando = false;
  rutaIdEdicion: number | null = null;
  nombre = '';
  paradas: string[] = [];
  nuevaParada = '';
  guardando = false;

  rutaEliminar: Ruta | null = null;
  mostrarConfirmacion = false;

  constructor(
    private readonly tiempoExtraService: TiempoExtraService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargarRutas();
  }

  cargarRutas(): void {
    this.cargando = true;
    this.tiempoExtraService.getRutas().subscribe({
      next: (rutas) => {
        this.rutas = rutas;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.mostrarMensaje('No se pudieron cargar las rutas.', 'danger');
        this.cdr.detectChanges();
      },
    });
  }

  abrirCrear(): void {
    this.editando = false;
    this.rutaIdEdicion = null;
    this.nombre = '';
    this.paradas = [];
    this.nuevaParada = '';
    this.mostrarModal = true;
  }

  abrirEditar(ruta: Ruta): void {
    this.editando = true;
    this.rutaIdEdicion = ruta.id;
    this.nombre = ruta.nombre;
    this.paradas = [...ruta.paradas];
    this.nuevaParada = '';
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    if (this.guardando) return;
    this.mostrarModal = false;
  }

  agregarParada(): void {
    const p = this.nuevaParada.trim();
    if (!p || this.paradas.includes(p)) return;
    this.paradas.push(p);
    this.nuevaParada = '';
  }

  eliminarParada(index: number): void {
    this.paradas.splice(index, 1);
  }

  paradasVisibles(ruta: Ruta): string[] {
    return this.expandidas.has(ruta.id) ? ruta.paradas : ruta.paradas.slice(0, 6);
  }

  toggleParadas(ruta: Ruta): void {
    if (this.expandidas.has(ruta.id)) {
      this.expandidas.delete(ruta.id);
    } else {
      this.expandidas.add(ruta.id);
    }
  }

  get rutasFiltradas(): Ruta[] {
    const term = this.busqueda.trim().toLowerCase();
    if (!term) return this.rutas;
    return this.rutas.filter(
      (r) =>
        r.nombre.toLowerCase().includes(term) ||
        r.paradas.some((p) => p.toLowerCase().includes(term)),
    );
  }

  limpiarBusqueda(): void {
    this.busqueda = '';
  }

  get totalParadas(): number {
    return this.rutas.reduce((acc, r) => acc + r.paradas.length, 0);
  }

  get totalEmpleadosAsignados(): number {
    return this.rutas.reduce((acc, r) => acc + (r.empleados ?? 0), 0);
  }

  guardar(): void {
    if (!this.nombre.trim() || this.guardando) return;
    this.guardando = true;
    const datos = { nombre: this.nombre.trim(), paradas: this.paradas };
    const obs = this.editando
      ? this.tiempoExtraService.updateRuta(this.rutaIdEdicion!, datos)
      : this.tiempoExtraService.createRuta(datos);
    obs.subscribe({
      next: () => {
        this.guardando = false;
        this.mostrarModal = false;
        this.cargarRutas();
        this.mostrarMensaje(
          this.editando ? 'Ruta actualizada.' : 'Ruta creada.',
          'success',
        );
      },
      error: (err) => {
        this.guardando = false;
        const texto = err?.error?.message || 'Error al guardar la ruta.';
        this.mostrarMensaje(texto, 'danger');
        this.cdr.detectChanges();
      },
    });
  }

  confirmarEliminar(ruta: Ruta): void {
    this.rutaEliminar = ruta;
    this.mostrarConfirmacion = true;
  }

  cancelarEliminar(): void {
    this.rutaEliminar = null;
    this.mostrarConfirmacion = false;
  }

  eliminarRuta(): void {
    if (!this.rutaEliminar || this.guardando) return;
    this.guardando = true;
    this.tiempoExtraService.deleteRuta(this.rutaEliminar.id).subscribe({
      next: () => {
        this.guardando = false;
        this.mostrarConfirmacion = false;
        this.rutaEliminar = null;
        this.cargarRutas();
        this.mostrarMensaje('Ruta eliminada.', 'success');
      },
      error: (err) => {
        this.guardando = false;
        const texto = err?.error?.message || 'No se pudo eliminar la ruta.';
        this.mostrarMensaje(texto, 'danger');
        this.mostrarConfirmacion = false;
        this.cdr.detectChanges();
      },
    });
  }

  private mostrarMensaje(texto: string, tipo: string): void {
    this.mensaje = texto;
    this.tipoMensaje = tipo;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.mensaje = '';
      this.cdr.detectChanges();
    }, 5000);
  }
}