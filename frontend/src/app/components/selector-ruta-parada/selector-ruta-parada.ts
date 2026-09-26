import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Ruta } from '../../models/ruta.model';

@Component({
  selector: 'app-selector-ruta-parada',
  imports: [FormsModule],
  templateUrl: './selector-ruta-parada.html',
  styleUrl: './selector-ruta-parada.scss',
})
export class SelectorRutaParada {
  @Input() rutas: Ruta[] = [];
  @Input() ruta = '';
  @Input() parada = '';
  @Input() etiquetaRuta = 'Ruta';
  @Input() etiquetaParada = 'Parada';
  @Input() deshabilitarRuta = false;
  @Input() deshabilitarParada = false;
  @Input() tamanio: 'normal' | 'sm' = 'normal';
  @Output() rutaChange = new EventEmitter<string>();
  @Output() paradaChange = new EventEmitter<string>();
  @Output() cambio = new EventEmitter<void>();

  get claseSelect(): string {
    return this.tamanio === 'sm' ? 'form-select form-select-sm' : 'form-select';
  }

  get claseInput(): string {
    return this.tamanio === 'sm' ? 'form-control form-control-sm' : 'form-control';
  }

  get paradasDisponibles(): string[] {
    const lista = this.rutas.find((r) => r.nombre === this.ruta)?.paradas ?? [];
    if (this.parada && !lista.includes(this.parada)) {
      return [...lista, this.parada];
    }
    return lista;
  }

  cambiarRuta(valor: string): void {
    this.ruta = valor;
    const paradasDeRuta =
      this.rutas.find((r) => r.nombre === valor)?.paradas ?? [];
    if (paradasDeRuta.length === 1) {
      this.parada = paradasDeRuta[0];
    } else if (!paradasDeRuta.includes(this.parada)) {
      this.parada = '';
    }
    this.rutaChange.emit(this.ruta);
    this.paradaChange.emit(this.parada);
    this.cambio.emit();
  }

  cambiarParada(valor: string): void {
    this.parada = valor;
    this.paradaChange.emit(this.parada);
    this.cambio.emit();
  }

  textoRuta(valor: string): void {
    this.ruta = valor;
    this.rutaChange.emit(valor);
    this.cambio.emit();
  }

  textoParada(valor: string): void {
    this.parada = valor;
    this.paradaChange.emit(valor);
    this.cambio.emit();
  }
}