import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/user.entity';

export enum HabitFrequencyType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  CUSTOM = 'CUSTOM',
}

export enum HabitStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ARCHIVED = 'ARCHIVED',
}

export interface DailyFrequencyDetails {
  time: string; // HH:mm format
}

export interface WeeklyFrequencyDetails {
  days: number[]; // 0-6 (Sunday-Saturday)
  time: string;
}

export interface CustomFrequencyDetails {
  count: number;
  unit: 'days' | 'weeks';
  time: string;
}

export type FrequencyDetails =
  | DailyFrequencyDetails
  | WeeklyFrequencyDetails
  | CustomFrequencyDetails;

@Entity('habits')
@Index(['userId', 'status'])
@Index(['userId', 'deletedAt'])
@Index(['nextOccurrenceAt'])
export class Habit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: HabitFrequencyType,
    default: HabitFrequencyType.DAILY,
  })
  frequencyType: HabitFrequencyType;

  @Column({ type: 'jsonb' })
  frequencyDetails: FrequencyDetails;

  @Column({ type: 'int', nullable: true })
  durationMinutes: number | null;

  @Column({
    type: 'enum',
    enum: HabitStatus,
    default: HabitStatus.ACTIVE,
  })
  status: HabitStatus;

  @Column({ length: 50 })
  timezone: string;

  @Column({ type: 'timestamp', nullable: true })
  nextOccurrenceAt: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @Column({ type: 'int', default: 0 })
  version: number; // For optimistic locking
}
