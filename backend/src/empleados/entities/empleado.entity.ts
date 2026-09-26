import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Ruta } from '../../rutas/entities/ruta.entity.js';

@Entity('empleados')
export class Empleado {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 150, nullable: true })
  nombre: string | null;

  @Column({ name: 'numero_empleado', length: 20, unique: true })
  numeroEmpleado: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  departamento: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  turno: string | null;

  @Column({ type: 'varchar', name: 'ruta_usual', length: 200, nullable: true })
  rutaUsual: string | null;

  @Column({ type: 'varchar', name: 'parada_usual', length: 200, nullable: true })
  paradaUsual: string | null;

  @Column({ type: 'int', name: 'ruta_id', nullable: true })
  rutaId: number | null;

  @ManyToOne(() => Ruta, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ruta_id' })
  ruta: Ruta | null;

  @Column({ type: 'date', name: 'fecha_de_baja', nullable: true })
  fechaBaja: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  puesto: string | null;

  @Column({ type: 'varchar', name: 'centro_de_costo', length: 150, nullable: true })
  centroDeCosto: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sucursal: string | null;

  @Column({ type: 'boolean', name: 'bloqueado_tiempo_extra', default: false })
  bloqueadoTiempoExtra: boolean;

  @Column({ type: 'boolean', name: 'es_administrativo', default: false })
  esAdministrativo: boolean;
}