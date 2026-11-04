import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'user_credentials' })
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  firstName: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  lastName: string | null;

  @Column({ type: 'varchar', length: 150, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 250 })
  password: string;

  @Column({ type: 'varchar', length: 200 })
  passStr: string;

  @Column({ type: 'integer', default: 0 })
  isDelete: number;

  @Column({ type: 'varchar', length: 150 })
  c_at: string;

  @Column({ type: 'varchar', length: 150 })
  u_at: string;
}
