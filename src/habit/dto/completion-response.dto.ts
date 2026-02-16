import { HabitCompletion } from '../entities/habit-completion.entity';

export class CompletionResponseDto {
  id: string;
  habitId: string;
  completedAt: Date;
  scheduledFor: Date;
  notes: string | null;
  createdAt: Date;
  undoneAt: Date | null;

  static fromEntity(completion: HabitCompletion): CompletionResponseDto {
    const dto = new CompletionResponseDto();
    dto.id = completion.id;
    dto.habitId = completion.habitId;
    dto.completedAt = completion.completedAt;
    dto.scheduledFor = completion.scheduledFor;
    dto.notes = completion.notes;
    dto.createdAt = completion.createdAt;
    dto.undoneAt = completion.undoneAt;
    return dto;
  }
}
