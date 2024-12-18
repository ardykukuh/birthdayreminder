import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', nullable: false })
  firstName: string;

  @Column({ type: 'varchar', nullable: false })
  lastName: string;

  @Column({ type: 'varchar', nullable: false })
  birthday: Date;

  @Column({ type: 'varchar', nullable: false })
  timezone: string;

  @Column({ type: 'varchar', nullable: false })
  email: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
