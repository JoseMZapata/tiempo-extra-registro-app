import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormularioTiempoExtra } from '../../models/registro.model';
import { Empleado } from '../../models/empleado.model';
import { Ruta } from '../../models/ruta.model';
import { TiempoExtraService } from '../../services/tiempo-extra.service';
import { SelectorRutaParada } from '../selector-ruta-parada/selector-ruta-parada';

@Component({
  selector: 'app-registro-form',
  imports: [FormsModule, SelectorRutaParada],
  templateUrl: './registro-form.html',
  styleUrl: './registro-form.scss',
})
export class RegistroForm implements OnInit, OnChanges {
  @Input() datosIniciales: FormularioTiempoExtra | null = null;
  @Input() editando = false;
  @Output() formChange = new EventEmitter<FormularioTiempoExtra>();
  @Output() guardar = new EventEmitter<FormularioTiempoExtra>();
  @Output() cancelarEdicion = new EventEmitter<void>();

  datos: FormularioTiempoExtra = this.getEmpty();
  guardando = false;
  exitoGuardado = false;
  alertaBaja = '';
  verificando = false;
  autocompletado = false;
  bloqueadoExtra = false;
  rutas: Ruta[] = [];

  turnos = ['A', 'B', 'C'];

  horarios = [
    { value: '7-4', label: 'De 7 a 4' },
    { value: '7-7', label: 'De 7 a 7' },
  ];

  rutaBloqueada = false;
  paradaBloqueada = false;

  private debounceTimer?: ReturnType<typeof setTimeout>;
  private ultimoNumeroBuscado = '';

  constructor(
    private readonly tiempoExtraService: TiempoExtraService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (this.datosIniciales) {
      this.datos = { ...this.datosIniciales };
    }
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['datosIniciales'] && this.datosIniciales) {
      this.datos = { ...this.datosIniciales };
    }
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

  onFieldChange(): void {
    const numero = (this.datos.numeroEmpleado ?? '').trim();
    if (numero.length >= 2) {
      if (numero !== this.ultimoNumeroBuscado) {
        this.autocompletado = false;
        this.bloqueadoExtra = false;
        this.datos.rutaUsual = '';
        this.datos.paradaUsual = '';
        this.rutaBloqueada = false;
        this.paradaBloqueada = false;
        this.verificarEmpleado();
      }
    } else {
      this.alertaBaja = '';
      this.autocompletado = false;
      this.bloqueadoExtra = false;
      this.rutaBloqueada = false;
      this.paradaBloqueada = false;
    }
    this.formChange.emit({ ...this.datos });
  }

  onRutaParadaChange(): void {
    this.formChange.emit({ ...this.datos });
  }

  get mensajeAutocompletado(): string {
    if (this.rutaBloqueada && this.paradaBloqueada) {
      return 'Ruta y parada usual completadas automáticamente.';
    }
    if (this.rutaBloqueada) {
      return 'Ruta usual completada automáticamente. Completa la parada usual.';
    }
    if (this.paradaBloqueada) {
      return 'Parada usual completada automáticamente. Completa la ruta usual.';
    }
    return 'Ruta y parada usual se llenan aquí y se guardarán en la ficha del empleado.';
  }

  private verificarEmpleado(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      const numero = (this.datos.numeroEmpleado ?? '').trim();
      if (!numero) {
        this.alertaBaja = '';
        this.autocompletado = false;
        this.verificando = false;
        return;
      }
      this.verificando = true;
      this.tiempoExtraService.getEmpleadoPorNumero(numero).subscribe({
        next: (empleado) => {
          this.verificando = false;
          this.autocompletarDesdeEmpleado(empleado);
          this.ultimoNumeroBuscado = numero;
          this.bloqueadoExtra = !!empleado.bloqueadoTiempoExtra;
          if (empleado.fechaBaja) {
            this.alertaBaja = `Empleado ${numero} está de baja desde el ${empleado.fechaBaja}.`;
          } else {
            this.alertaBaja = '';
          }
          this.formChange.emit({ ...this.datos });
          this.cdr.detectChanges();
        },
        error: () => {
          this.verificando = false;
          this.alertaBaja = '';
          this.autocompletado = false;
          this.bloqueadoExtra = false;
          this.rutaBloqueada = false;
          this.paradaBloqueada = false;
          this.cdr.detectChanges();
        },
      });
    }, 400);
  }

  private autocompletarDesdeEmpleado(empleado: Empleado): void {
    const ruta = (empleado.rutaUsual ?? '').trim();
    const parada = (empleado.paradaUsual ?? '').trim();
    this.datos.nombre = empleado.nombre ?? '';
    this.datos.departamento = empleado.departamento ?? '';
    this.datos.turno = empleado.turno ?? 'A';
    this.datos.puesto = empleado.puesto ?? '';
    this.datos.centroDeCosto = empleado.centroDeCosto ?? '';
    this.datos.sucursal = empleado.sucursal ?? '';
    this.datos.rutaUsual = ruta;
    this.datos.paradaUsual = parada;
    this.rutaBloqueada = ruta.length > 0;
    this.paradaBloqueada = parada.length > 0;
    this.autocompletado = true;
  }

  onGuardar(): void {
    if (this.bloqueadoExtra) {
      return;
    }
    this.guardando = true;
    this.exitoGuardado = false;
    this.guardar.emit({ ...this.datos });
  }

  onGuardadoExito(): void {
    this.guardando = false;
    this.exitoGuardado = true;
    this.datos = this.getEmpty();
    this.rutaBloqueada = false;
    this.paradaBloqueada = false;
    this.bloqueadoExtra = false;
    this.ultimoNumeroBuscado = '';
    this.formChange.emit({ ...this.datos });
    this.cdr.detectChanges();
    setTimeout(() => {
      this.exitoGuardado = false;
      this.cdr.detectChanges();
    }, 3000);
  }

  onGuardadoError(): void {
    this.guardando = false;
  }

  onCancelarEdicion(): void {
    this.cancelarEdicion.emit();
  }

  limpiar(): void {
    this.datos = this.getEmpty();
    this.rutaBloqueada = false;
    this.paradaBloqueada = false;
    this.bloqueadoExtra = false;
    this.ultimoNumeroBuscado = '';
    this.formChange.emit({ ...this.datos });
  }
}