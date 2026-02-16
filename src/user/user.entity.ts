import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
} from 'typeorm';
import { GoogleCalendarConnection } from '../google-oauth/google-calendar-connection.entity';

@Entity('users')
@Index(['email'])
@Index(['deletedAt'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  @Index()
  email: string;

  @Column({ length: 255 })
  passwordHash: string;

  @Column({ default: false })
  emailVerified: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date | null;

  @Column({ type: 'int', default: 0 })
  loginAttempts: number;

  @Column({ type: 'timestamp', nullable: true })
  lockedUntil: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  acceptedTermsAt: Date | null;

  @OneToOne(() => GoogleCalendarConnection, (connection) => connection.user, { nullable: true })
  googleCalendarConnection?: GoogleCalendarConnection;
}
