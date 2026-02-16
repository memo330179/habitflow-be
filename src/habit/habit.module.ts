import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Entities
import { Habit, HabitCompletion } from './entities';

// Controllers
import { HabitsController, HabitCompletionsController } from './controllers';

// Services
import {
  HabitService,
  HabitCompletionService,
  HabitScheduleService,
  HabitStreakService,
  HabitValidationService,
  HabitEventPublisher,
  HabitSearchService,
} from './services';

// Repositories
import { HabitRepository, HabitCompletionRepository } from './repositories';

/**
 * Habit Module
 * Handles habit management: CRUD, scheduling, completions, streaks
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Habit, HabitCompletion]),
    EventEmitterModule.forRoot(),
  ],
  controllers: [HabitsController, HabitCompletionsController],
  providers: [
    // Repositories
    HabitRepository,
    HabitCompletionRepository,
    // Core Services
    HabitService,
    HabitCompletionService,
    // Supporting Services
    HabitScheduleService,
    HabitStreakService,
    HabitValidationService,
    HabitEventPublisher,
    HabitSearchService,
  ],
  exports: [
    HabitService,
    HabitCompletionService,
    HabitScheduleService,
    HabitStreakService,
  ],
})
export class HabitModule {}
