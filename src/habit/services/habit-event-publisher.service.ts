import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HabitFrequencyType, FrequencyDetails } from '../entities/habit.entity';

export interface HabitCreatedEvent {
  habitId: string;
  userId: string;
  name: string;
  frequencyType: HabitFrequencyType;
  nextOccurrenceAt: Date | null;
}

export interface HabitUpdatedEvent {
  habitId: string;
  userId: string;
  oldFrequency: {
    type: HabitFrequencyType;
    details: FrequencyDetails;
  };
  newFrequency: {
    type: HabitFrequencyType;
    details: FrequencyDetails;
  };
}

export interface HabitDeletedEvent {
  habitId: string;
  userId: string;
  name: string;
}

export interface HabitCompletedEvent {
  habitId: string;
  userId: string;
  completionId: string;
  scheduledFor: Date;
  completedAt: Date;
}

export interface CompletionUndoneEvent {
  completionId: string;
  habitId: string;
  userId: string;
}

@Injectable()
export class HabitEventPublisher {
  private readonly logger = new Logger(HabitEventPublisher.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Publish habit.created event
   * Used by Unit 3 (Calendar Integration) to create calendar events
   */
  publishHabitCreated(payload: HabitCreatedEvent): void {
    this.logger.log(`Publishing habit.created event for habit ${payload.habitId}`);
    this.eventEmitter.emit('habit.created', payload);
  }

  /**
   * Publish habit.updated event
   * Used by Unit 3 to update calendar events when frequency changes
   */
  publishHabitUpdated(payload: HabitUpdatedEvent): void {
    this.logger.log(`Publishing habit.updated event for habit ${payload.habitId}`);
    this.eventEmitter.emit('habit.updated', payload);
  }

  /**
   * Publish habit.deleted event
   * Used by Unit 3 to remove calendar events
   */
  publishHabitDeleted(payload: HabitDeletedEvent): void {
    this.logger.log(`Publishing habit.deleted event for habit ${payload.habitId}`);
    this.eventEmitter.emit('habit.deleted', payload);
  }

  /**
   * Publish habit.completed event
   * Used by Unit 3 to mark calendar event as completed
   */
  publishHabitCompleted(payload: HabitCompletedEvent): void {
    this.logger.log(`Publishing habit.completed event for habit ${payload.habitId}`);
    this.eventEmitter.emit('habit.completed', payload);
  }

  /**
   * Publish habit.completion_undone event
   * Used by Unit 3 to revert calendar event completion status
   */
  publishCompletionUndone(payload: CompletionUndoneEvent): void {
    this.logger.log(`Publishing habit.completion_undone event for completion ${payload.completionId}`);
    this.eventEmitter.emit('habit.completion_undone', payload);
  }
}
