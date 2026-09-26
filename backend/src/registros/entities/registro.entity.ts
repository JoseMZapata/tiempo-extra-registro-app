import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Empleado } from '../../empleados/entities/empleado.entity.js';

@Entity('registros')
export class Registro {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'empleado_id' })
  empleadoId: number;

  @ManyToOne(() => Empleado, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'empleado_id' })
  empleado: Empleado;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'varchar', length: 10, default: '7-4' })
  horario: string;

  @Column({ name: 'turno_extra', length: 50 })
  turnoExtra: string;

  @Column({ type: 'varchar', name: 'ruta_extra', length: 200, nullable: true })
  rutaExtra: string | null;

  @Column({ type: 'varchar', name: 'parada_extra', length: 200, nullable: true })
  paradaExtra: string | null;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;
}