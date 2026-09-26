import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { finalize, timeout } from 'rxjs';
import { Empleado } from '../../models/empleado.model';
import { Ruta } from '../../models/ruta.model';
import { TiempoExtraService } from '../../services/tiempo-extra.service';
import { AuthService } from '../../services/auth.service';
import { SelectorRutaParada } from '../../components/selector-ruta-parada/selector-ruta-parada';

interface FilaImportada {
  index: number;
  nombre: string;
  numeroEmpleado: string;
  departamento: string;
  turno: string;
  puesto: string | null;
  centroDeCosto: string | null;
  sucursal: string | null;
  rutaUsual: string | null;
  paradaUsual: string | null;
  errores: string[];
}

interface CampoPegado {
  key: keyof Empleado;
  label: string;
  requerido: boolean;
  placeholder: string;
}

type ModoImportacion = 'pegar' | 'excel';

const SINONIMOS_COLUMNA: Record<string, string[]> = {
  nombre: ['nombre', 'nombre completo', 'nombre del empleado', 'empleado', 'name', 'full name', 'nombrecompleto', 'nombre empleado'],
  numeroEmpleado: ['numero', 'numero de empleado', 'numeroempleado', 'no empleado', 'no de empleado', 'no', 'num', 'numero de ficha', 'ficha', 'id', 'clave', 'employee number', 'employee no', 'emp no'],
  departamento: ['departamento', 'depto', 'departamento1', 'dept', 'area', 'department', 'departament'],
  turno: ['turno', 'shift', 'horario', 'jornada', 'turno laboral'],
  puesto: ['puesto', 'puesto actual', 'cargo', 'posicion', 'position', 'job', 'role', 'rol', 'descripcion puesto', 'puesto de trabajo'],
  centroDeCosto: ['centro de costo', 'centro de costos', 'centrodecosto', 'costo', 'cc', 'costo de cc', 'c. costo', 'cost center', 'cost centre', 'costcenter'],
  sucursal: ['sucursal', 'sede', 'planta', 'branch', 'oficina', 'unidad', 'camp', 'suc'],
  rutaUsual: ['ruta', 'ruta usual', 'ruta habitual', 'rutas', 'linea', 'route', 'ruta asignada', 'ruta asign'],
  paradaUsual: ['parada', 'parada usual', 'parada habitual', 'parada del camion', 'parada camion', 'paradero', 'stop', 'stoppoint', 'parada asignada'],
};

const ORDEN_DEFECTO: (keyof Empleado)[] = [
  'nombre',
  'numeroEmpleado',
  'departamento',
  'turno',
  'puesto',
  'centroDeCosto',
  'sucursal',
  'rutaUsual',
  'paradaUsual',
];

@Component({
  selector: 'app-empleados',
  imports: [FormsModule, NgClass, SelectorRutaParada],
  templateUrl: './empleados.html',
  styleUrl: './empleados.scss',
})
export class Empleados implements OnInit {
  empleados: Empleado[] = [];
  empleadosFiltrados: Empleado[] = [];
  rutas: Ruta[] = [];
  cargando = false;
  mensaje = '';
  tipoMensaje = '';

  busqueda = '';
  filtroTurno = '';
  filtroDepartamento = '';
  filtroEstado = '';
  ordenPor = '';
  mostrarFiltros = false;
  departamentos: string[] = [];
  turnos = ['A', 'B', 'C'];

  readonly ordenOpciones = [
    { value: 'nombre', label: 'Nombre (A-Z)' },
    { value: 'nombre-desc', label: 'Nombre (Z-A)' },
    { value: 'numeroEmpleado', label: 'Número de empleado' },
    { value: 'departamento', label: 'Departamento' },
    { value: 'puesto', label: 'Puesto' },
    { value: 'turno', label: 'Turno' },
    { value: 'rutaUsual', label: 'Ruta usual' },
  ];

  mostrarModal = false;
  empleadoEdicion: Empleado | null = null;
  guardando = false;

  importarAbierto = false;
  importando = false;
  camposPegado: Record<string, string> = {};
  importarModo: ModoImportacion = 'pegar';
  private datosExcel: (string | number)[][] = [];
  private mapeoExcel: Record<string, number> | null = null;
  sobrescrituras: Record<string, string> = {};
  archivoExcelNombre = '';
  columnasDetectadas: string[] = [];
  encabezadoDetectado = true;
  errorExcel = '';
  arrastrandoSobre = false;
  cargandoExcel = false;

  readonly camposImportacion: CampoPegado[] = [
    { key: 'nombre', label: 'Nombre completo', requerido: true, placeholder: 'Ej. JUAN PEREZ LOPEZ' },
    { key: 'numeroEmpleado', label: 'Número de empleado', requerido: true, placeholder: 'Ej. 54686' },
    { key: 'departamento', label: 'Departamento', requerido: true, placeholder: 'Ej. LED' },
    { key: 'turno', label: 'Turno', requerido: true, placeholder: 'A, B o C' },
    { key: 'puesto', label: 'Puesto', requerido: false, placeholder: 'Ej. Operador' },
    { key: 'centroDeCosto', label: 'Centro de costo', requerido: false, placeholder: 'Ej. CC-01' },
    { key: 'sucursal', label: 'Sucursal', requerido: false, placeholder: 'Ej. Central' },
    { key: 'rutaUsual', label: 'Ruta usual', requerido: false, placeholder: 'Ej. RUTA 12' },
    { key: 'paradaUsual', label: 'Parada usual', requerido: false, placeholder: 'Ej. Central Norte' },
  ];

  constructor(
    private readonly tiempoExtraService: TiempoExtraService,
    public readonly auth: AuthService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargarEmpleados();
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

  cargarEmpleados(): void {
    this.cargando = true;
    this.tiempoExtraService
      .getEmpleados()
      .pipe(
        timeout({ each: 15000 }),
        finalize(() => {
          this.cargando = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (data) => {
          this.empleados = data;
          this.departamentos = [
            ...new Set(
              data
                .map((e) => e.departamento)
                .filter((d): d is string => !!d && d.trim() !== ''),
            ),
          ].sort();
          this.aplicarFiltros();
          this.cdr.detectChanges();
        },
        error: (error: unknown) => {
          this.mensaje = this.esTimeout(error)
            ? 'El servidor tardó demasiado en responder. Inténtalo de nuevo.'
            : 'Error al cargar los empleados. Verifica la conexión con el servidor.';
          this.tipoMensaje = 'danger';
          this.cdr.detectChanges();
          setTimeout(() => {
            this.mensaje = '';
            this.cdr.detectChanges();
          }, 5000);
        },
      });
  }

  private esTimeout(error: unknown): boolean {
    return !!(error && (error as { name?: string }).name === 'TimeoutError');
  }

  aplicarFiltros(): void {
    const q = this.busqueda.trim().toLowerCase();
    const filtrados = this.empleados.filter((emp) => {
      if (q) {
        const coincide =
          [emp.nombre, emp.numeroEmpleado, emp.departamento, emp.puesto, emp.centroDeCosto, emp.sucursal, emp.turno, emp.rutaUsual, emp.paradaUsual]
            .some((v) => !!v && v.toString().toLowerCase().includes(q));
        if (!coincide) return false;
      }
      if (this.filtroTurno && emp.turno !== this.filtroTurno) return false;
      if (this.filtroDepartamento && emp.departamento !== this.filtroDepartamento) return false;
      if (this.filtroEstado === 'activos' && emp.fechaBaja) return false;
      if (this.filtroEstado === 'baja' && !emp.fechaBaja) return false;
      if (this.filtroEstado === 'bloqueado' && !emp.bloqueadoTiempoExtra) return false;
      return true;
    });
    this.empleadosFiltrados = this.ordenarEmpleados(filtrados);
  }

  private ordenarEmpleados(lista: Empleado[]): Empleado[] {
    if (!this.ordenPor || lista.length <= 1) return lista;
    const colacion = new Intl.Collator('es', { sensitivity: 'base', numeric: true });
    const copia = [...lista];
    const clave = (e: Empleado, campo: keyof Empleado): string =>
      String(e[campo] ?? '').toLowerCase();
    switch (this.ordenPor) {
      case 'nombre':
        return copia.sort((a, b) => colacion.compare(a.nombre ?? '', b.nombre ?? ''));
      case 'nombre-desc':
        return copia.sort((a, b) => colacion.compare(b.nombre ?? '', a.nombre ?? ''));
      case 'departamento':
        return copia.sort((a, b) => colacion.compare(clave(a, 'departamento'), clave(b, 'departamento')));
      case 'puesto':
        return copia.sort((a, b) => colacion.compare(clave(a, 'puesto'), clave(b, 'puesto')));
      case 'turno':
        return copia.sort((a, b) => colacion.compare(clave(a, 'turno'), clave(b, 'turno')));
      case 'rutaUsual':
        return copia.sort((a, b) => colacion.compare(clave(a, 'rutaUsual'), clave(b, 'rutaUsual')));
      case 'numeroEmpleado':
        return copia.sort((a, b) => colacion.compare(a.numeroEmpleado, b.numeroEmpleado));
      default:
        return lista;
    }
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.filtroTurno = '';
    this.filtroDepartamento = '';
    this.filtroEstado = '';
    this.ordenPor = '';
    this.mostrarFiltros = false;
    this.aplicarFiltros();
  }

  get totalEmpleados(): number {
    return this.empleados.length;
  }

  get totalActivos(): number {
    return this.empleados.filter((e) => !e.fechaBaja).length;
  }

  get totalBajas(): number {
    return this.totalEmpleados - this.totalActivos;
  }

  iniciales(nombre: string | null): string {
    if (!nombre || !nombre.trim()) return '?';
    const partes = nombre.trim().split(/\s+/);
    const primeras = partes
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase());
    return primeras.join('');
  }

  turnoClass(turno: string | null | undefined): string {
    if (turno === 'A') return 'turno-a';
    if (turno === 'B') return 'turno-b';
    if (turno === 'C') return 'turno-c';
    return '';
  }

  abrirImportacion(modo: ModoImportacion = 'pegar'): void {
    this.importarModo = modo;
    const vacio: Record<string, string> = {};
    for (const campo of this.camposImportacion) {
      vacio[campo.key] = '';
    }
    this.camposPegado = vacio;
    this.datosExcel = [];
    this.mapeoExcel = null;
    this.sobrescrituras = {};
    this.archivoExcelNombre = '';
    this.columnasDetectadas = [];
    this.encabezadoDetectado = true;
    this.errorExcel = '';
    this.importarAbierto = true;
  }

  setModoImportacion(modo: ModoImportacion): void {
    if (this.importando) return;
    this.importarModo = modo;
  }

  cerrarImportacion(): void {
    if (this.importando) return;
    this.importarAbierto = false;
  }

  limpiarImportacion(): void {
    if (this.importarModo === 'pegar') {
      for (const campo of this.camposImportacion) {
        this.camposPegado[campo.key] = '';
      }
    } else {
      this.limpiarExcel();
    }
  }

  get filasExcel(): FilaImportada[] {
    if (!this.datosExcel.length || !this.mapeoExcel) return [];
    const mapeo = this.mapeoExcel;
    const obtener = (key: CampoPegado['key'], i: number): string => {
      const sobre = this.sobrescrituras[`${i}:${key}`];
      if (sobre !== undefined) return sobre;
      const idx = mapeo[key];
      if (idx !== undefined) {
        return String(this.datosExcel[i][idx] ?? '');
      }
      return '';
    };
    return this.construirFilas(this.datosExcel.length, obtener);
  }

  celdaExcel(ix: number, key: CampoPegado['key']): string {
    const sobre = this.sobrescrituras[`${ix}:${key}`];
    if (sobre !== undefined) return sobre;
    const idx = this.mapeoExcel?.[key];
    if (idx !== undefined && this.datosExcel[ix]) {
      return String(this.datosExcel[ix][idx] ?? '');
    }
    return '';
  }

  editarCelda(ix: number, key: CampoPegado['key'], event: Event): void {
    if (this.importando) return;
    const valor = (event.target as HTMLInputElement).value;
    this.sobrescrituras[`${ix}:${key}`] = valor;
  }

  get filasImportacion(): FilaImportada[] {
    if (this.importarModo === 'excel') return this.filasExcel;

    const lineas = (key: string): string[] =>
      (this.camposPegado[key] || '')
        .replace(/\r/g, '')
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s !== '');

    const total = Math.max(
      0,
      ...this.camposImportacion.map((c) => lineas(c.key).length),
    );
    if (total === 0) return [];

    const obtener = (key: CampoPegado['key'], i: number): string => {
      const arr = lineas(key);
      if (arr.length === 0) return '';
      if (arr.length === 1 && total > 1) return arr[0];
      return arr[i] ?? '';
    };

    return this.construirFilas(total, obtener);
  }

  private construirFilas(
    total: number,
    obtener: (key: CampoPegado['key'], i: number) => string,
  ): FilaImportada[] {
    const vistos = new Map<string, number>();
    const filas: FilaImportada[] = [];
    for (let i = 0; i < total; i++) {
      const leer = (key: CampoPegado['key']): string => obtener(key, i) ?? '';
      const nombre = this.limpiarTexto(leer('nombre'));
      const numeroEmpleado = this.normalizarNumero(leer('numeroEmpleado'));
      const departamento = this.limpiarTexto(leer('departamento'));
      const turno = this.normalizarTurno(leer('turno'));

      const errores: string[] = [];
      if (!nombre) errores.push('Falta nombre');
      if (!numeroEmpleado) errores.push('Falta número');
      if (!departamento) errores.push('Falta departamento');
      if (!turno) errores.push('Falta turno');
      else if (!['A', 'B', 'C'].includes(turno)) errores.push('Turno inválido');

      if (numeroEmpleado) {
        const clave = numeroEmpleado.toUpperCase();
        const anterior = vistos.get(clave);
        if (anterior !== undefined) {
          errores.push(`Número duplicado (fila ${anterior + 1})`);
        } else {
          vistos.set(clave, i);
        }
        if (this.existeNumero(clave)) {
          errores.push('Ya existe en la lista');
        }
      }

      filas.push({
        index: i + 1,
        nombre,
        numeroEmpleado,
        departamento,
        turno,
        puesto: this.optional(leer('puesto')),
        centroDeCosto: this.optional(leer('centroDeCosto')),
        sucursal: this.optional(leer('sucursal')),
        rutaUsual: this.optional(leer('rutaUsual')),
        paradaUsual: this.optional(leer('paradaUsual')),
        errores,
      });
    }
    return filas;
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.procesarExcel(file);
    input.value = '';
  }

  onSoltarArchivo(event: Event): void {
    event.preventDefault();
    this.arrastrandoSobre = false;
    const file = (event as DragEvent).dataTransfer?.files?.[0];
    if (file) this.procesarExcel(file);
  }

  async procesarExcel(file: File): Promise<void> {
    this.errorExcel = '';
    this.cargandoExcel = true;
    this.cdr.detectChanges();
    try {
      const buffer = await file.arrayBuffer();
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(buffer, { type: 'array' });
      const hoja = workbook.Sheets[workbook.SheetNames[0]];
      if (!hoja) throw new Error('El archivo no contiene hojas con datos.');

      const rows: (string | number)[][] = XLSX.utils.sheet_to_json(hoja, {
        header: 1,
        defval: '',
        raw: false,
      });
      const conDatos = rows.filter((r) =>
        r.some((c) => String(c).trim() !== ''),
      );
      if (!conDatos.length) throw new Error('El archivo no tiene datos.');

      const { inicio, mapeo, sinEncabezado } = this.detectarColumnas(conDatos);
      const datos = conDatos.slice(inicio);
      if (!datos.length)
        throw new Error('No hay filas de empleados después del encabezado.');

      this.datosExcel = datos;
      this.mapeoExcel = mapeo;
      this.sobrescrituras = {};
      this.archivoExcelNombre = file.name;
      this.encabezadoDetectado = !sinEncabezado;
      this.columnasDetectadas = Object.keys(mapeo).map((k) => {
        const campo = this.camposImportacion.find((c) => c.key === k);
        return campo ? campo.label : k;
      });
      this.cdr.detectChanges();
    } catch (e) {
      this.datosExcel = [];
      this.mapeoExcel = null;
      this.sobrescrituras = {};
      this.columnasDetectadas = [];
      this.errorExcel =
        e instanceof Error ? e.message : 'No se pudo leer el archivo.';
      this.cdr.detectChanges();
    } finally {
      this.cargandoExcel = false;
      this.cdr.detectChanges();
    }
  }

  limpiarExcel(): void {
    this.datosExcel = [];
    this.mapeoExcel = null;
    this.sobrescrituras = {};
    this.archivoExcelNombre = '';
    this.columnasDetectadas = [];
    this.encabezadoDetectado = true;
    this.errorExcel = '';
  }

  private detectarColumnas(
    rows: (string | number)[][],
  ): { inicio: number; mapeo: Record<string, number>; sinEncabezado: boolean } {
    const aplanar = (v: unknown): string => this.aplanarClave(String(v ?? ''));
    for (let r = 0; r < Math.min(3, rows.length); r++) {
      const candidatos: Record<string, number> = {};
      rows[r].forEach((celda, idx) => {
        const encabezado = aplanar(celda);
        if (!encabezado) return;
        for (const [campoKey, sinonimos] of Object.entries(SINONIMOS_COLUMNA)) {
          if (candidatos[campoKey] !== undefined) continue;
          if (sinonimos.some((s) => aplanar(s) === encabezado)) {
            candidatos[campoKey] = idx;
            break;
          }
        }
      });
      const camposNucleo = ['nombre', 'numeroEmpleado', 'departamento', 'turno'];
      const nucleo = camposNucleo.filter((f) => candidatos[f] !== undefined).length;
      if (nucleo >= 2 || Object.keys(candidatos).length >= 3) {
        return { inicio: r + 1, mapeo: candidatos, sinEncabezado: false };
      }
    }
    const mapeo: Record<string, number> = {};
    ORDEN_DEFECTO.forEach((f, i) => {
      mapeo[f] = i;
    });
    return { inicio: 0, mapeo, sinEncabezado: true };
  }

  private aplanarClave(valor: string): string {
    return valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  get filasValidas(): number {
    return this.filasImportacion.filter((f) => f.errores.length === 0).length;
  }

  importar(): void {
    const filas = this.filasImportacion.filter((f) => f.errores.length === 0);
    if (!filas.length || this.importando) return;

    this.importando = true;
    const payload: Partial<Empleado>[] = filas.map((f) => ({
      nombre: f.nombre,
      numeroEmpleado: f.numeroEmpleado,
      departamento: f.departamento,
      turno: f.turno,
      rutaUsual: f.rutaUsual,
      paradaUsual: f.paradaUsual,
      puesto: f.puesto,
      centroDeCosto: f.centroDeCosto,
      sucursal: f.sucursal,
      bloqueadoTiempoExtra: false,
    }));

    this.tiempoExtraService.createEmpleados(payload).subscribe({
      next: (resultados) => {
        this.importando = false;
        const creados = resultados.filter((r) => r.exito).length;
        const fallidas = resultados.filter((r) => !r.exito);
        this.importarAbierto = false;
        this.limpiarImportacion();
        this.mensaje = `${creados} empleado(s) importados correctamente.` +
          (fallidas.length ? ` ${fallidas.length} no se pudieron importar.` : '');
        this.tipoMensaje = fallidas.length ? 'warning' : 'success';
        this.cdr.detectChanges();
        this.cargarEmpleados();
      },
      error: () => {
        this.importando = false;
        this.mensaje = 'Error al importar los empleados. Revisa los datos e intenta de nuevo.';
        this.tipoMensaje = 'danger';
        this.cdr.detectChanges();
      },
    });
  }

  private existeNumero(clave: string): boolean {
    return this.empleados.some(
      (e) => this.normalizarNumero(e.numeroEmpleado).toUpperCase() === clave,
    );
  }

  private normalizarNumero(valor: string): string {
    return valor.replace(/[\s\-'_.,]/g, '');
  }

  private limpiarTexto(valor: string): string {
    return valor.replace(/\s+/g, ' ').trim();
  }

  private normalizarTurno(valor: string): string {
    const s = valor.trim().toUpperCase();
    const letra = s.match(/[ABC]/);
    if (letra) return letra[0];
    if (['1', 'A'].includes(s)) return 'A';
    if (['2', 'B'].includes(s)) return 'B';
    if (['3', 'C'].includes(s)) return 'C';
    return s;
  }

  private optional(valor: string): string | null {
    return this.limpiarTexto(valor) || null;
  }

  abrirEdicion(emp: Empleado): void {
    this.empleadoEdicion = { ...emp };
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    if (this.guardando) return;
    this.mostrarModal = false;
    this.empleadoEdicion = null;
  }

  limpiarFechaBaja(): void {
    if (this.empleadoEdicion) {
      this.empleadoEdicion.fechaBaja = null;
    }
  }

  guardarEdicion(): void {
    if (!this.empleadoEdicion || !this.empleadoEdicion.id) return;
    this.guardando = true;
    this.tiempoExtraService
      .updateEmpleado(this.empleadoEdicion.id, this.empleadoEdicion)
      .pipe(
        finalize(() => {
          this.guardando = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this.mostrarModal = false;
          this.empleadoEdicion = null;
          this.mensaje = 'Empleado actualizado correctamente.';
          this.tipoMensaje = 'success';
          this.cargarEmpleados();
          this.cdr.detectChanges();
          setTimeout(() => {
            this.mensaje = '';
            this.cdr.detectChanges();
          }, 4000);
        },
        error: () => {
          this.mensaje = 'Error al actualizar el empleado. Verifica los datos.';
          this.tipoMensaje = 'danger';
          this.cdr.detectChanges();
          setTimeout(() => {
            this.mensaje = '';
            this.cdr.detectChanges();
          }, 4000);
        },
      });
  }

  eliminarEmpleado(emp: Empleado): void {
    if (!emp.id) return;
    const confirmado = window.confirm(
      `¿Eliminar al empleado ${emp.numeroEmpleado} (${emp.nombre || 'sin nombre'})?\nEsta acción borrará también sus registros de tiempo extra.`,
    );
    if (!confirmado) return;
    this.tiempoExtraService.deleteEmpleado(emp.id).subscribe({
      next: () => {
        this.mensaje = 'Empleado eliminado correctamente.';
        this.tipoMensaje = 'success';
        this.cargarEmpleados();
        this.cdr.detectChanges();
        setTimeout(() => {
          this.mensaje = '';
          this.cdr.detectChanges();
        }, 4000);
      },
      error: () => {
        this.mensaje = 'Error al eliminar el empleado.';
        this.tipoMensaje = 'danger';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.mensaje = '';
          this.cdr.detectChanges();
        }, 4000);
      },
    });
  }
}