import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass } from '@angular/common';

export interface SemanaRecord {
  id?: number;
  empleado?: {
    numeroEmpleado?: string;
    nombre?: string | null;
    rutaUsual?: string | null;
    paradaUsual?: string | null;
    fechaBaja?: string | null;
  };
  turnoExtra?: string;
  rutaExtra?: string | null;
  paradaExtra?: string | null;
  observaciones?: string | null;
  alertaRuta?: boolean;
  alertaParada?: boolean;
  expended?: boolean;
  fechaCorta?: string;
  esAdministrativo?: boolean;
}

@Component({
  selector: 'app-semana-card',
  imports: [NgClass],
  templateUrl: './semana-card.html',
  styleUrl: './semana-card.scss',
})
export class SemanaCard {
  @Input() record: SemanaRecord = {};
  @Output() toggle = new EventEmitter<void>();
  @Output() verDetalle = new EventEmitter<void>();
  @Output() eliminar = new EventEmitter<void>();

  onCardClick(): void {
    this.toggle.emit();
  }
}