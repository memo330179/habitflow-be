import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Habit } from './habit.entity';
import { User } from '../../user/user.entity';

@Entity('habit_completions')
@Index(['habitId', 'scheduledFor'])
@Index(['userId', 'scheduledFor'])
@Index(['completedAt'])
export class HabitCompletion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  habitId: string;

  @ManyToOne(() => Habit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'habitId' })
  habit: Habit;

  @Column('uuid')
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'timestamp' })
  completedAt: Date;

  @Column({ type: 'date' })
  scheduledFor: Date;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  undoneAt: Date | null;
}
