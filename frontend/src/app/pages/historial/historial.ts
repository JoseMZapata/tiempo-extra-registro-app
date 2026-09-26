import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TiempoExtraService } from '../../services/tiempo-extra.service';
import { Registro } from '../../models/registro.model';
import { Empleado } from '../../models/empleado.model';
import { Ruta } from '../../models/ruta.model';
import { SemanaCard } from '../../components/semana-card/semana-card';
import { SelectorRutaParada } from '../../components/selector-ruta-parada/selector-ruta-parada';

interface RegistroConAlertas extends Registro {
  alertaRuta?: boolean;
  alertaParada?: boolean;
  expended?: boolean;
  diaSemana?: string;
  fechaCorta?: string;
  esAdministrativo?: boolean;
}

export interface PuntoRuta {
  parada: string;
  total: number;
  horario74: number;
  horario77: number;
}

export interface ResumenRuta {
  ruta: string;
  total: number;
  horario74: number;
  horario77: number;
  puntos: PuntoRuta[];
  expandido: boolean;
  dias?: string[];
}

export interface RutaDia {
  ruta: string;
  total: number;
  horario74: number;
  horario77: number;
}

export interface RutaDiaDetalle {
  dia: string;
  etiquetaDia: string;
  ruta: string;
  total: number;
  horario74: number;
  horario77: number;
  turnos: string[];
}

export interface ResumenDia {
  dia: string;
  etiqueta: string;
  colorClass: string;
  totalRutas: number;
  totalPersonas: number;
  rutas: RutaDia[];
  expandido: boolean;
  detalle?: RutaDiaDetalle[];
}

const REGISTROS_COLS = [
  { wch: 12 }, { wch: 28 }, { wch: 16 }, { wch: 20 },
  { wch: 14 }, { wch: 10 }, { wch: 9 }, { wch: 12 },
  { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 14 },
];

const RUTAS_COLS = [
  { wch: 5 }, { wch: 32 }, { wch: 9 }, { wch: 11 }, { wch: 11 }, { wch: 8 },
];

const ADMIN_COLS = [
  { wch: 12 }, { wch: 28 }, { wch: 16 }, { wch: 20 },
  { wch: 14 }, { wch: 10 }, { wch: 20 }, { wch: 16 }, { wch: 16 },
];

@Component({
  selector: 'app-historial',
  imports: [FormsModule, NgClass, SemanaCard, SelectorRutaParada],
  templateUrl: './historial.html',
  styleUrl: './historial.scss',
})
export class Historial implements OnInit {
  registros: RegistroConAlertas[] = [];
  semanaRegistros: RegistroConAlertas[] = [];
  semanaPasadaRegistros: RegistroConAlertas[] = [];
  registrosExportar: RegistroConAlertas[] = [];
  rutas: Ruta[] = [];
  busqueda = '';
  cargando = false;
  generandoSemana = false;
  mensaje = '';
  tipoMensaje = 'success';
  mostrarModal = false;
  mostrarModalDetalle = false;
  registroSeleccionado: RegistroConAlertas | null = null;

  mostrarModalEdicion = false;
  guardandoEdicion = false;
  registroEdicion: RegistroConAlertas | null = null;

  expandedId: number | null = null;
  vistaActiva: 'tabla' | 'semana' = 'tabla';

  filtroPeriodo: 'semana' | 'semana-pasada' | 'todo' = 'semana';
  filtroDepartamento = '';

  resumenRutas: ResumenRuta[] = [];
  resumenRutasPasada: ResumenRuta[] = [];
  resumenDias: ResumenDia[] = [];
  resumenDiasPasada: ResumenDia[] = [];

  adminEmpleados: Empleado[] = [];
  todosEmpleados: Empleado[] = [];
  adminDeshabilitados = new Set<number>();
  mostrarModalAgregarAdmin = false;
  mostrarModalEditarAdmin = false;
  mostrarModalQuitarAdmin = false;
  busquedaAgregar = '';
  filtroEstadoAgregar = '';
  seleccionAdmin = new Set<number>();
  guardandoAdmin = false;
  adminEdicion: Empleado | null = null;
  adminAEliminar: Empleado | null = null;

  readonly turnos = ['A', 'B', 'C'];

  readonly horarios = [
    { value: '7-4', label: 'De 7 a 4' },
    { value: '7-7', label: 'De 7 a 7' },
  ];

  readonly diasSemana = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

  private intentos = 0;

  constructor(
    private readonly tiempoExtraService: TiempoExtraService,
    private readonly cdr: ChangeDetectorRef,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.intentos = 0;
    this.cargarRegistros();
    this.cargarAdministrativos();
    this.cargarRutas();
  }

  private cargarRutas(): void {
    this.tiempoExtraService.getRutas().subscribe({
      next: (rutas) => {
        this.rutas = rutas;
        this.cdr.detectChanges();
      },
      error: () => {
        this.rutas = [];
      },
    });
  }

  cargarRegistros(): void {
    this.cargando = true;
    this.tiempoExtraService.getRegistros().subscribe({
      next: (data) => {
        this.registros = data.map((r) => ({
          ...r,
          alertaRuta: this.calcAlertaRuta(r),
          alertaParada: this.calcAlertaParada(r),
          expended: false,
          esAdministrativo: !!r.empleado?.esAdministrativo,
          diaSemana: this.diasSemana[new Date(r.fecha + 'T12:00:00').getDay()],
          fechaCorta: this.formatoFechaCorta(r.fecha),
        }));
        this.filtrarSemana();
        this.aplicarFiltros();
        this.construirResumenRutas();
        this.cargando = false;
        this.intentos = 0;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.intentos++;
        if (this.intentos <= 3) {
          setTimeout(() => this.cargarRegistros(), 1200 * this.intentos);
        } else {
          this.mensaje = 'No se pudieron cargar los registros. Intenta nuevamente.';
          this.tipoMensaje = 'danger';
          this.cdr.detectChanges();
        }
      },
    });
  }

  private calcAlertaRuta(r: Registro): boolean {
    if (!r.rutaExtra || !r.empleado?.rutaUsual) return false;
    return r.rutaExtra.trim().toUpperCase() !== r.empleado.rutaUsual.trim().toUpperCase();
  }

  private calcAlertaParada(r: Registro): boolean {
    if (!r.paradaExtra || !r.empleado?.paradaUsual) return false;
    return r.paradaExtra.trim().toUpperCase() !== r.empleado.paradaUsual.trim().toUpperCase();
  }

  private formatoFechaCorta(fecha: string): string {
    const d = new Date(fecha + 'T12:00:00');
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  }

  get inicioSemana(): Date {
    const hoy = new Date();
    const dia = hoy.getDay();
    const diff = dia === 0 ? 6 : dia - 1;
    const inicio = new Date(hoy);
    inicio.setDate(hoy.getDate() - diff);
    inicio.setHours(0, 0, 0, 0);
    return inicio;
  }

  get finSemana(): Date {
    const f = new Date(this.inicioSemana);
    f.setDate(f.getDate() + 6);
    f.setHours(23, 59, 59, 999);
    return f;
  }

  get inicioSemanaPasada(): Date {
    const inicio = new Date(this.inicioSemana);
    inicio.setDate(inicio.getDate() - 7);
    inicio.setHours(0, 0, 0, 0);
    return inicio;
  }

  get finSemanaPasada(): Date {
    const fin = new Date(this.inicioSemana);
    fin.setDate(fin.getDate() - 1);
    fin.setHours(23, 59, 59, 999);
    return fin;
  }

  filtrarSemana(): void {
    const inicio = this.inicioSemana.getTime();
    const fin = this.finSemana.getTime();
    this.semanaRegistros = this.registros.filter((r) => {
      const t = new Date(r.fecha + 'T12:00:00').getTime();
      return t >= inicio && t <= fin;
    });

    const inicioPasada = this.inicioSemanaPasada.getTime();
    const finPasada = this.finSemanaPasada.getTime();
    this.semanaPasadaRegistros = this.registros.filter((r) => {
      const t = new Date(r.fecha + 'T12:00:00').getTime();
      return t >= inicioPasada && t <= finPasada;
    });
  }

  get departamentos(): string[] {
    const set = new Set<string>();
    for (const r of this.registros) {
      const d = r.empleado?.departamento?.trim();
      if (d) set.add(d);
    }
    return [...set].sort();
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.filtroPeriodo = 'semana';
    this.filtroDepartamento = '';
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    let base = [...this.registros];

    if (this.filtroPeriodo === 'semana') {
      base = base.filter((r) => {
        const t = new Date(r.fecha + 'T12:00:00').getTime();
        return t >= this.inicioSemana.getTime() && t <= this.finSemana.getTime();
      });
    } else if (this.filtroPeriodo === 'semana-pasada') {
      base = base.filter((r) => {
        const t = new Date(r.fecha + 'T12:00:00').getTime();
        return t >= this.inicioSemanaPasada.getTime() && t <= this.finSemanaPasada.getTime();
      });
    }

    if (this.filtroDepartamento) {
      base = base.filter(
        (r) => (r.empleado?.departamento?.trim() || '') === this.filtroDepartamento,
      );
    }

    const term = this.busqueda.trim().toLowerCase();
    if (term) {
      base = base.filter((r) =>
        [
          r.empleado?.nombre,
          r.empleado?.departamento,
          r.empleado?.numeroEmpleado,
          r.turnoExtra,
          r.rutaExtra,
          r.paradaExtra,
          r.observaciones,
          r.diaSemana,
        ]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(term)),
      );
    }

    this.registrosExportar = base;
  }

  toggleExpand(registro: RegistroConAlertas): void {
    registro.expended = !registro.expended;
  }

  toggleRuta(grupo: ResumenRuta): void {
    grupo.expandido = !grupo.expandido;
  }

  toggleDia(dia: ResumenDia): void {
    dia.expandido = !dia.expandido;
  }

  chipDiaClass(dia: string): string {
    switch (dia) {
      case 'VIERNES':
        return 'd-viernes';
      case 'SABADO':
        return 'd-sabado';
      case 'DOMINGO':
        return 'd-domingo';
      default:
        return 'd-otros';
    }
  }

  etiquetaDiaCorta(dia: string): string {
    switch (dia) {
      case 'VIERNES':
        return 'V';
      case 'SABADO':
        return 'S';
      case 'DOMINGO':
        return 'D';
      default:
        return 'O';
    }
  }

  etiquetaDiaCompleta(dia: string): string {
    switch (dia) {
      case 'VIERNES':
        return 'Viernes';
      case 'SABADO':
        return 'Sabado';
      case 'DOMINGO':
        return 'Domingo';
      default:
        return 'Otros dias';
    }
  }

  private construirResumenRutas(): void {
    this.resumenRutas = this.construirResumen(this.semanaRegistros);
    this.resumenRutasPasada = this.construirResumen(this.semanaPasadaRegistros);
    this.resumenDias = this.construirResumenDias(this.semanaRegistros);
    this.resumenDiasPasada = this.construirResumenDias(this.semanaPasadaRegistros);
  }

  private construirResumen(fuente: RegistroConAlertas[]): ResumenRuta[] {
    const mapa = new Map<string, ResumenRuta>();
    const diasMap = new Map<string, Set<string>>();
    for (const r of fuente) {
      const ruta = (r.rutaExtra || '').trim();
      if (!ruta) continue;
      const clave = ruta.toUpperCase();
      let grupo = mapa.get(clave);
      if (!grupo) {
        grupo = {
          ruta,
          total: 0,
          horario74: 0,
          horario77: 0,
          puntos: [],
          expandido: false,
        };
        mapa.set(clave, grupo);
      }

      grupo.total++;
      if (r.horario === '7-4') grupo.horario74++;
      else if (r.horario === '7-7') grupo.horario77++;

      let setDias = diasMap.get(clave);
      if (!setDias) {
        setDias = new Set<string>();
        diasMap.set(clave, setDias);
      }
      setDias.add(r.diaSemana ? this.contenedorDia(r.diaSemana) : 'OTROS');

      const parada = (r.paradaExtra || '').trim();
      if (!parada) continue;
      let punto = grupo.puntos.find((p) => p.parada.toUpperCase() === parada.toUpperCase());
      if (!punto) {
        punto = { parada, total: 0, horario74: 0, horario77: 0 };
        grupo.puntos.push(punto);
      }
      punto.total++;
      if (r.horario === '7-4') punto.horario74++;
      else if (r.horario === '7-7') punto.horario77++;
    }
    const resumen = [...mapa.values()].sort((a, b) => b.total - a.total);
    for (const grupo of resumen) {
      grupo.dias = [...(diasMap.get(grupo.ruta.toUpperCase()) ?? [])];
    }
    return resumen;
  }

  private construirResumenDias(fuente: RegistroConAlertas[]): ResumenDia[] {
    const contenedores = [
      { dia: 'VIERNES', etiqueta: 'Viernes', colorClass: 'dia-viernes' },
      { dia: 'SABADO', etiqueta: 'Sabado', colorClass: 'dia-sabado' },
      { dia: 'DOMINGO', etiqueta: 'Domingo', colorClass: 'dia-domingo' },
      { dia: 'OTROS', etiqueta: 'Otros dias', colorClass: 'dia-otros' },
    ];
    const mapa = new Map<string, ResumenDia>();
    for (const contenedor of contenedores) {
      mapa.set(contenedor.dia, {
        ...contenedor,
        totalRutas: 0,
        totalPersonas: 0,
        rutas: [],
        expandido: false,
      });
    }

    const rutasPorDia = new Map<string, Map<string, RutaDia>>();
    const detalleOtros = new Map<string, RutaDiaDetalle>();
    for (const r of fuente) {
      const ruta = (r.rutaExtra || '').trim();
      if (!ruta) continue;
      const dia = r.diaSemana ? this.contenedorDia(r.diaSemana) : 'OTROS';
      let porDia = rutasPorDia.get(dia);
      if (!porDia) {
        porDia = new Map<string, RutaDia>();
        rutasPorDia.set(dia, porDia);
      }
      const clave = ruta.toUpperCase();
      let rutaDia = porDia.get(clave);
      if (!rutaDia) {
        rutaDia = { ruta, total: 0, horario74: 0, horario77: 0 };
        porDia.set(clave, rutaDia);
      }
      rutaDia.total++;
      if (r.horario === '7-4') rutaDia.horario74++;
      else if (r.horario === '7-7') rutaDia.horario77++;

      if (dia === 'OTROS') {
        const diaReal = r.diaSemana || '';
        const claveDet = `${diaReal}|${clave}`;
        let detalle = detalleOtros.get(claveDet);
        if (!detalle) {
          detalle = {
            dia: diaReal,
            etiquetaDia: this.etiquetaDiaSemana(diaReal),
            ruta,
            total: 0,
            horario74: 0,
            horario77: 0,
            turnos: [],
          };
          detalleOtros.set(claveDet, detalle);
        }
        detalle.total++;
        if (r.horario === '7-4') detalle.horario74++;
        else if (r.horario === '7-7') detalle.horario77++;
        const turno = (r.turnoExtra || '').trim().toUpperCase();
        if (turno && !detalle.turnos.includes(turno)) {
          detalle.turnos.push(turno);
          detalle.turnos.sort();
        }
      }
    }

    for (const [dia, porDia] of rutasPorDia) {
      const resumen = mapa.get(dia)!;
      const lista = [...porDia.values()].sort((a, b) => b.total - a.total);
      resumen.rutas = lista;
      resumen.totalRutas = lista.length;
      resumen.totalPersonas = lista.reduce((acc, ruta) => acc + ruta.total, 0);
    }

    const otros = mapa.get('OTROS');
    if (otros) {
      otros.detalle = [...detalleOtros.values()].sort((a, b) => {
        const indice = this.indiceDia(a.dia) - this.indiceDia(b.dia);
        return indice !== 0 ? indice : b.total - a.total;
      });
    }

    return [...mapa.values()];
  }

  private contenedorDia(dia: string): string {
    if (dia === 'VIERNES' || dia === 'SABADO' || dia === 'DOMINGO') return dia;
    return 'OTROS';
  }

  private etiquetaDiaSemana(dia: string): string {
    switch (dia) {
      case 'LUNES':
        return 'Lunes';
      case 'MARTES':
        return 'Martes';
      case 'MIERCOLES':
        return 'Miercoles';
      case 'JUEVES':
        return 'Jueves';
      default:
        return 'Otros dias';
    }
  }

  private indiceDia(dia: string): number {
    switch (dia) {
      case 'LUNES':
        return 0;
      case 'MARTES':
        return 1;
      case 'MIERCOLES':
        return 2;
      case 'JUEVES':
        return 3;
      default:
        return 10;
    }
  }

  turnoChipClass(turno: string): string {
    const t = (turno || '').trim().toUpperCase().charAt(0);
    if (t === 'A') return 'ta';
    if (t === 'B') return 'tb';
    if (t === 'C') return 'tc';
    return 'to';
  }

  seleccionarRegistro(registro: RegistroConAlertas): void {
    this.registroSeleccionado = registro;
    this.mostrarModalDetalle = true;
  }

  abrirEditarRegistro(registro: RegistroConAlertas): void {
    if (!registro.id || this.guardandoEdicion) return;
    this.registroEdicion = {
      ...registro,
      fecha: registro.fecha,
      horario: registro.horario,
      turnoExtra: registro.turnoExtra,
      rutaExtra: registro.rutaExtra,
      paradaExtra: registro.paradaExtra,
      observaciones: registro.observaciones,
    };
    this.mostrarModalEdicion = true;
  }

  cerrarEdicion(): void {
    if (this.guardandoEdicion) return;
    this.mostrarModalEdicion = false;
    this.registroEdicion = null;
  }

  guardarEdicion(): void {
    const reg = this.registroEdicion;
    if (!reg?.id || this.guardandoEdicion) return;
    this.guardandoEdicion = true;
    this.tiempoExtraService
      .updateRegistro(reg.id, {
        fecha: reg.fecha,
        horario: reg.horario,
        turnoExtra: reg.turnoExtra,
        rutaExtra: reg.rutaExtra ?? undefined,
        paradaExtra: reg.paradaExtra ?? undefined,
        observaciones: reg.observaciones ?? undefined,
      })
      .subscribe({
        next: () => {
          this.guardandoEdicion = false;
          this.mostrarModalEdicion = false;
          this.registroEdicion = null;
          this.cargarRegistros();
          this.mostrarMensaje('Registro actualizado correctamente.', 'success');
        },
        error: () => {
          this.guardandoEdicion = false;
          this.mostrarMensaje(
            'Error al actualizar el registro. Verifica los datos.',
            'danger',
          );
        },
      });
  }

  irARutas(): void {
    this.router.navigate(['/rutas']);
  }

  confirmarEliminar(registro: RegistroConAlertas): void {
    this.registroSeleccionado = registro;
    this.mostrarModal = true;
  }

  eliminar(): void {
    if (!this.registroSeleccionado) return;
    const id = this.registroSeleccionado.id!;
    this.tiempoExtraService.deleteRegistro(id).subscribe({
      next: () => {
        this.mensaje = 'Registro eliminado correctamente';
        this.tipoMensaje = 'success';
        this.mostrarModal = false;
        this.registroSeleccionado = null;
        this.cargarRegistros();
      },
      error: () => {
        this.mensaje = 'Error al eliminar el registro';
        this.tipoMensaje = 'danger';
      },
    });
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.registroSeleccionado = null;
  }

  cerrarModalDetalle(): void {
    this.mostrarModalDetalle = false;
    this.registroSeleccionado = null;
  }

  exportarExcel(): void {
    this.generarExcelMulti('Tiempo_extra_', [
      { nombre: 'Registros', data: this.registrosData(this.registrosExportar) },
    ]);
  }

  exportarTodoExcel(): void {
    this.generarExcelMulti('Tiempo_extra_completo_', [
      {
        nombre: 'SEMANA ACTUAL T.E',
        data: this.registrosData(this.semanaActualItems),
        anchos: REGISTROS_COLS,
      },
      {
        nombre: 'RUTAS SEMANA T.E',
        data: this.rutasData(this.resumenRutas),
        anchos: RUTAS_COLS,
      },
      {
        nombre: 'ADMINISTRATIVO MANAGEMENT',
        data: this.adminData(),
        anchos: ADMIN_COLS,
      },
      {
        nombre: 'SEMANA PASADA T.E',
        data: this.registrosData(this.semanaPasadaItems),
        anchos: REGISTROS_COLS,
      },
      {
        nombre: 'RUTAS PASADA T.E',
        data: this.rutasData(this.resumenRutasPasada),
        anchos: RUTAS_COLS,
      },
    ]);
  }

  private adminData(): Record<string, unknown>[] {
    return this.adminEmpleados.map((emp) => ({
      'No. Empleado': emp.numeroEmpleado ?? '',
      'Nombre': emp.nombre ?? '',
      'Puesto': emp.puesto ?? '',
      'Departamento': emp.departamento ?? '',
      'Centro de Costo': emp.centroDeCosto ?? '',
      'Turno': emp.turno ?? '',
      'Ruta usual': emp.rutaUsual ?? '',
      'Rutas TE (semana)': this.totalRutasAdmin(emp.id),
      'Rutas TE (pasada)': this.semanaPasadaRegistros.filter(
        (r) => r.empleado?.id === emp.id,
      ).length,
    }));
  }

  private registrosData(fuente: RegistroConAlertas[]): Record<string, unknown>[] {
    return fuente.map((r) => {
      const alertas: string[] = [];
      if (r.alertaRuta) alertas.push('Ruta');
      if (r.alertaParada) alertas.push('Parada');
      const esAdmin = !!r.empleado?.esAdministrativo;
      return {
        'No. Empleado': r.empleado?.numeroEmpleado ?? '',
        'Nombre': r.empleado?.nombre ?? '',
        'Puesto': r.empleado?.puesto ?? '',
        'Departamento': r.empleado?.departamento ?? '',
        'Centro de Costo': r.empleado?.centroDeCosto ?? '',
        'Turno Extra': r.turnoExtra ?? '',
        'Horario': esAdmin ? '7-4' : r.horario ?? '',
        'Fecha': r.fecha ?? '',
        'Dia': r.diaSemana ?? '',
        'Ruta Extra': esAdmin
          ? r.empleado?.rutaUsual ?? ''
          : r.rutaExtra ?? '',
        'Parada Extra': esAdmin
          ? r.empleado?.paradaUsual ?? ''
          : r.paradaExtra ?? '',
        'Alertas': alertas.length ? alertas.join(', ') : 'OK',
      };
    });
  }

  private rutasData(fuente: ResumenRuta[]): Record<string, unknown>[] {
    return fuente.map((g, i) => ({
      '#': i + 1,
      'Ruta': g.ruta,
      'Personas': g.total,
      'Horario 7-4': g.horario74,
      'Horario 7-7': g.horario77,
      'Puntos': g.puntos.length,
    }));
  }

  private generarExcelMulti(
    prefijo: string,
    hojas: {
      nombre: string;
      data: Record<string, unknown>[];
      anchos?: { wch: number }[];
    }[],
  ): void {
    import('xlsx').then((XLSX) => {
      const wb = XLSX.utils.book_new();
      for (const hoja of hojas) {
        const ws = XLSX.utils.json_to_sheet(hoja.data);
        ws['!cols'] =
          hoja.anchos ??
          (hoja.nombre === 'Registros' ? REGISTROS_COLS : RUTAS_COLS);
        if (hoja.data.length > 0) {
          const columnas = Object.keys(hoja.data[0]);
          ws['!rows'] = [{ hpt: 22 }];
          columnas.forEach((_, i) => {
            const dir = XLSX.utils.encode_cell({ r: 0, c: i });
            const celda = ws[dir];
            if (!celda) return;
            celda.s = {
              font: { bold: true, sz: 11, color: { rgb: 'FFFFFFFF' } },
              fill: {
                patternType: 'solid',
                fgColor: { rgb: 'FF2E7D32' },
                bgColor: { rgb: 'FF2E7D32' },
              },
              alignment: { horizontal: 'center', vertical: 'center' },
              border: {
                bottom: { style: 'thin', color: { rgb: 'FF1B5E20' } },
              },
            };
          });
        }
        XLSX.utils.book_append_sheet(wb, ws, hoja.nombre);
      }
      const fechaHoy = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `${prefijo}${fechaHoy}.xlsx`);
    });
  }

  totalRegistros(): number {
    return this.registrosExportar.length;
  }

  totalAlertas(): number {
    return this.registrosExportar.filter((r) => r.alertaRuta || r.alertaParada).length;
  }

  cargarAdministrativos(): void {
    this.tiempoExtraService.getEmpleadosAdministrativos().subscribe({
      next: (empleados) => {
        this.adminEmpleados = empleados;
        this.restaurarDesactivados();
        this.cdr.detectChanges();
      },
      error: () => {
        this.mostrarMensaje('No se pudieron cargar los administrativos.', 'danger');
      },
    });
  }

  toggleAdminSemana(emp: Empleado): void {
    if (!emp.id) return;
    if (this.adminDeshabilitados.has(emp.id)) {
      this.adminDeshabilitados.delete(emp.id);
    } else {
      this.adminDeshabilitados.add(emp.id);
    }
    this.persistirDesactivados();
    this.cdr.detectChanges();
  }

  estaAdminDeshabilitado(emp: Empleado): boolean {
    return !!emp.id && this.adminDeshabilitados.has(emp.id);
  }

  get adminActivos(): Empleado[] {
    return this.adminEmpleados.filter((e) => !this.estaAdminDeshabilitado(e));
  }

  private claveSemanaDesactivados(): string {
    const inicio = this.inicioSemana;
    const mes = String(inicio.getMonth() + 1).padStart(2, '0');
    const dia = String(inicio.getDate()).padStart(2, '0');
    return `historial.adminDeshabilitados.${inicio.getFullYear()}-${mes}-${dia}`;
  }

  private restaurarDesactivados(): void {
    try {
      const ids: number[] = JSON.parse(
        localStorage.getItem(this.claveSemanaDesactivados()) ?? '[]',
      );
      const validos = new Set(
        this.adminEmpleados.map((e) => e.id).filter((id): id is number => !!id),
      );
      this.adminDeshabilitados = new Set(ids.filter((id) => validos.has(id)));
    } catch {
      this.adminDeshabilitados = new Set();
    }
  }

  private persistirDesactivados(): void {
    try {
      localStorage.setItem(
        this.claveSemanaDesactivados(),
        JSON.stringify([...this.adminDeshabilitados]),
      );
    } catch {
      // sin persistencia (p. ej. modo incognito / storage bloqueado)
    }
  }

  registrarSemanaManagement(): void {
    if (this.generandoSemana) return;
    const habilitados = this.adminActivos;
    if (habilitados.length === 0) {
      this.mostrarMensaje(
        'No hay Management habilitados para registrar el viernes. Activa al menos uno.',
        'warning',
      );
      return;
    }
    this.generandoSemana = true;
    this.tiempoExtraService
      .generarMantenimiento(
        this.viernesSemanaActual,
        habilitados.map((e) => e.id).filter((id): id is number => !!id),
      )
      .subscribe({
        next: (res) => {
          this.generandoSemana = false;
          this.cargarRegistros();
          this.cargarAdministrativos();
          const desactivados = this.adminEmpleados.length - habilitados.length;
          const partes: string[] = [];
          if (res.creados > 0) partes.push(`${res.creados} nuevo(s)`);
          if (res.existentes > 0) partes.push(`${res.existentes} ya registrados`);
          if (desactivados > 0) partes.push(`${desactivados} deshabilitados no incluidos`);
          this.mostrarMensaje(
            `Registro viernes ${res.fecha}: ${partes.join(', ')}.`,
            res.creados > 0 ? 'success' : 'info',
          );
        },
        error: () => {
          this.generandoSemana = false;
          this.mostrarMensaje(
            'Error al registrar los Management. Intenta de nuevo.',
            'danger',
          );
        },
      });
  }

  registrosAdmin(empleadoId: number): RegistroConAlertas[] {
    return this.semanaRegistros.filter(
      (r) => r.empleado?.id === empleadoId,
    );
  }

  totalRutasAdmin(empleadoId: number | undefined): number {
    if (!empleadoId) return 0;
    return this.registrosAdmin(empleadoId).length;
  }

  get semanaActualItems(): RegistroConAlertas[] {
    return this.combinarAdmin(this.semanaRegistros, this.viernesSemanaActual, true);
  }

  get semanaPasadaItems(): RegistroConAlertas[] {
    return this.combinarAdmin(this.semanaPasadaRegistros, this.viernesSemanaPasada, false);
  }

  get viernesSemanaActual(): string {
    return this.fechaViernes(this.inicioSemana);
  }

  get viernesSemanaPasada(): string {
    return this.fechaViernes(this.inicioSemanaPasada);
  }

  private fechaViernes(inicioSemana: Date): string {
    const viernes = new Date(inicioSemana);
    viernes.setDate(viernes.getDate() + 4);
    const mes = String(viernes.getMonth() + 1).padStart(2, '0');
    const dia = String(viernes.getDate()).padStart(2, '0');
    return `${viernes.getFullYear()}-${mes}-${dia}`;
  }

  private combinarAdmin(
    fuente: RegistroConAlertas[],
    viernes: string,
    respetarDesactivados = false,
  ): RegistroConAlertas[] {
    const items = [...fuente];
    const yaRegistrado = new Set(
      items.map((r) => r.empleado?.id).filter((id): id is number => !!id),
    );
    for (const emp of this.adminEmpleados) {
      if (!emp.id || yaRegistrado.has(emp.id)) continue;
      if (respetarDesactivados && this.adminDeshabilitados.has(emp.id)) continue;
      items.push({
        id: undefined,
        fecha: viernes,
        horario: '7-4',
        turnoExtra: emp.turno ?? 'A',
        rutaExtra: emp.rutaUsual ?? null,
        paradaExtra: emp.paradaUsual ?? null,
        observaciones: null,
        empleado: { ...emp },
        fechaCorta: this.formatoFechaCorta(viernes),
        diaSemana: 'VIERNES',
        esAdministrativo: true,
        expended: false,
      } satisfies RegistroConAlertas);
    }
    return items;
  }

  abrirAgregarAdmin(): void {
    this.mostrarModalAgregarAdmin = true;
    this.busquedaAgregar = '';
    this.filtroEstadoAgregar = '';
    this.seleccionAdmin = new Set();
    this.tiempoExtraService.getEmpleados().subscribe({
      next: (empleados) => {
        this.todosEmpleados = empleados;
        this.cdr.detectChanges();
      },
      error: () => {
        this.mostrarMensaje('No se pudieron cargar los empleados.', 'danger');
      },
    });
  }

  cerrarAgregarAdmin(): void {
    if (this.guardandoAdmin) return;
    this.mostrarModalAgregarAdmin = false;
    this.todosEmpleados = [];
  }

  get empleadosParaAgregar(): Empleado[] {
    const adminIds = new Set(
      this.adminEmpleados.map((e) => e.id).filter((id): id is number => !!id),
    );
    let base = this.todosEmpleados.filter((e) => e.id && !adminIds.has(e.id));

    if (this.filtroEstadoAgregar === 'activos') {
      base = base.filter((e) => !e.fechaBaja);
    } else if (this.filtroEstadoAgregar === 'baja') {
      base = base.filter((e) => !!e.fechaBaja);
    } else if (this.filtroEstadoAgregar === 'bloqueado') {
      base = base.filter((e) => !!e.bloqueadoTiempoExtra);
    }

    const term = this.busquedaAgregar.trim().toLowerCase();
    if (term) {
      base = base.filter((e) =>
        [e.nombre, e.numeroEmpleado, e.departamento, e.puesto, e.centroDeCosto]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(term)),
      );
    }
    return base;
  }

  toggleSeleccionAdmin(id: number): void {
    if (this.seleccionAdmin.has(id)) {
      this.seleccionAdmin.delete(id);
    } else {
      this.seleccionAdmin.add(id);
    }
  }

  agregarAdministrativos(): void {
    if (!this.seleccionAdmin.size || this.guardandoAdmin) return;
    const ids = [...this.seleccionAdmin];
    this.guardandoAdmin = true;
    this.tiempoExtraService
      .setEmpleadosAdministrativos(ids, true)
      .subscribe({
        next: (res) => {
          this.guardandoAdmin = false;
          this.mostrarModalAgregarAdmin = false;
          this.todosEmpleados = [];
          this.cargarAdministrativos();
          this.mostrarMensaje(
            `${res.actualizados} empleado(s) agregados como Administrativo/Management.`,
            'success',
          );
        },
        error: () => {
          this.guardandoAdmin = false;
          this.mostrarMensaje(
            'Error al agregar los administrativos. Intenta de nuevo.',
            'danger',
          );
        },
      });
  }

  abrirEditarAdmin(emp: Empleado): void {
    this.adminEdicion = { ...emp };
    this.mostrarModalEditarAdmin = true;
  }

  cerrarEditarAdmin(): void {
    if (this.guardandoAdmin) return;
    this.mostrarModalEditarAdmin = false;
    this.adminEdicion = null;
  }

  guardarEdicionAdmin(): void {
    const emp = this.adminEdicion;
    if (!emp?.id || this.guardandoAdmin) return;
    this.guardandoAdmin = true;
    this.tiempoExtraService.updateEmpleado(emp.id, emp).subscribe({
      next: () => {
        this.guardandoAdmin = false;
        this.mostrarModalEditarAdmin = false;
        this.adminEdicion = null;
        this.cargarAdministrativos();
        this.mostrarMensaje('Empleado actualizado correctamente.', 'success');
      },
      error: () => {
        this.guardandoAdmin = false;
        this.mostrarMensaje(
          'Error al actualizar el empleado. Verifica los datos.',
          'danger',
        );
      },
    });
  }

  confirmarQuitarAdmin(emp: Empleado): void {
    this.adminAEliminar = emp;
    this.mostrarModalQuitarAdmin = true;
  }

  cerrarQuitarAdmin(): void {
    if (this.guardandoAdmin) return;
    this.mostrarModalQuitarAdmin = false;
    this.adminAEliminar = null;
  }

  quitarAdministrativo(): void {
    const emp = this.adminAEliminar;
    if (!emp?.id || this.guardandoAdmin) return;
    this.guardandoAdmin = true;
    this.tiempoExtraService
      .setEmpleadosAdministrativos([emp.id], false)
      .subscribe({
        next: () => {
          this.guardandoAdmin = false;
          this.mostrarModalQuitarAdmin = false;
          this.adminAEliminar = null;
          this.cargarAdministrativos();
          this.mostrarMensaje(
            `${emp.nombre} fue quitado del grupo Administrativo/Management.`,
            'success',
          );
        },
        error: () => {
          this.guardandoAdmin = false;
          this.mostrarMensaje(
            'Error al quitar al empleado del grupo. Intenta de nuevo.',
            'danger',
          );
        },
      });
  }

  private mostrarMensaje(texto: string, tipo: string): void {
    this.mensaje = texto;
    this.tipoMensaje = tipo as 'success' | 'danger' | 'warning';
    this.cdr.detectChanges();
    setTimeout(() => (this.mensaje = ''), 6000);
  }
}