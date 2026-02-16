import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../user/user.entity';

@Entity('google_calendar_connections')
@Index(['userId'], { unique: true })
export class GoogleCalendarConnection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  userId: string;

  @Column({ type: 'text' })
  encryptedAccessToken: string;

  @Column({ type: 'text' })
  encryptedRefreshToken: string;

  @Column({ type: 'timestamp' })
  tokenExpiry: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  selectedCalendarId: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  connectedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastSyncAt: Date | null;

  @OneToOne(() => User, (user) => user.googleCalendarConnection)
  @JoinColumn({ name: 'userId' })
  user: User;
}
