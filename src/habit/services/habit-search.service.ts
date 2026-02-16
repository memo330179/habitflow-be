import { Injectable } from '@nestjs/common';
import { HabitRepository, HabitFilters } from '../repositories/habit.repository';
import { Habit } from '../entities/habit.entity';

@Injectable()
export class HabitSearchService {
  constructor(private readonly habitRepository: HabitRepository) {}

  /**
   * Search habits by name/description with filters
   */
  async searchHabits(
    userId: string,
    query: string,
    filters: Partial<HabitFilters> = {},
  ): Promise<Habit[]> {
    const result = await this.habitRepository.findByUser(userId, {
      ...filters,
      search: query,
    });

    return result.habits;
  }
}
