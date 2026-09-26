import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('rutas')
export class Ruta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200, unique: true })
  nombre: string;

  @Column({ type: 'json', nullable: true })
  paradas: string[] | null;
}