import { HabitStatus } from '../entities/habit.entity';
import { HabitResponseDto } from './habit-response.dto';

export class TodayHabitDto {
  habit: HabitResponseDto;
  status: 'pending' | 'completed' | 'overdue';
  completionId?: string;
  completedAt?: Date;
}

export class TodayScheduleResponseDto {
  date: string;
  habits: TodayHabitDto[];
  summary: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
  };
}
