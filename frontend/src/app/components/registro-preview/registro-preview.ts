import { Component, Input } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { FormularioTiempoExtra } from '../../models/registro.model';

@Component({
  selector: 'app-registro-preview',
  imports: [DatePipe, NgClass],
  templateUrl: './registro-preview.html',
  styleUrl: './registro-preview.scss',
})
export class RegistroPreview {
  @Input() datos: FormularioTiempoExtra | null = null;
  @Input() bloqueadoExtra = false;

  private readonly totalCampos = 8;

  get camposLlenos(): number {
    const d = this.datos;
    if (!d) return 0;
    return [
      d.nombre,
      d.numeroEmpleado,
      d.departamento,
      d.rutaUsual,
      d.paradaUsual,
      d.horario,
      d.rutaExtra,
      d.paradaExtra,
    ].filter((v) => !!v && v.trim() !== '').length;
  }

  get progreso(): number {
    return Math.round((this.camposLlenos / this.totalCampos) * 100);
  }

  get dashoffset(): number {
    const circunferencia = 2 * Math.PI * 34;
    return circunferencia * (1 - this.progreso / 100);
  }

  get mensajeProgreso(): string {
    const llenos = this.camposLlenos;
    if (llenos === 0) return 'Ingresa el nombre del empleado para comenzar.';
    if (llenos <= 3) return 'Sigue completando los datos del empleado.';
    if (llenos < 8) return 'Casi listo, solo faltan los detalles del extra.';
    return 'Estás listo para guardar el registro.';
  }

  turnoClass(turno: string | undefined): string {
    if (turno === 'A') return 'turno-a';
    if (turno === 'B') return 'turno-b';
    if (turno === 'C') return 'turno-c';
    return '';
  }

  labelHorario(horario: string | undefined): string {
    if (horario === '7-4') return 'De 7 a 4';
    if (horario === '7-7') return 'De 7 a 7';
    return horario || '—';
  }
}