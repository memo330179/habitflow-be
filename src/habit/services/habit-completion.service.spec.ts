import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { HabitCompletionService } from './habit-completion.service';
import { HabitCompletionRepository } from '../repositories/habit-completion.repository';
import { HabitRepository } from '../repositories/habit.repository';
import { HabitStreakService } from './habit-streak.service';
import { HabitScheduleService } from './habit-schedule.service';
import { HabitEventPublisher } from './habit-event-publisher.service';
import { HabitCompletion } from '../entities/habit-completion.entity';
import { Habit, HabitFrequencyType, HabitStatus } from '../entities/habit.entity';
import { CreateCompletionDto } from '../dto';

describe('HabitCompletionService', () => {
  let service: HabitCompletionService;
  let completionRepository: jest.Mocked<HabitCompletionRepository>;
  let habitRepository: jest.Mocked<HabitRepository>;
  let habitStreakService: jest.Mocked<HabitStreakService>;
  let habitScheduleService: jest.Mocked<HabitScheduleService>;
  let habitEventPublisher: jest.Mocked<HabitEventPublisher>;

  const mockUserId = 'user-123';
  const mockHabitId = 'habit-456';
  const mockCompletionId = 'completion-789';

  const mockHabit: Habit = {
    id: mockHabitId,
    userId: mockUserId,
    name: 'Morning Meditation',
    description: 'Daily meditation practice',
    frequencyType: HabitFrequencyType.DAILY,
    frequencyDetails: { time: '07:00' },
    durationMinutes: 15,
    status: HabitStatus.ACTIVE,
    timezone: 'America/New_York',
    nextOccurrenceAt: new Date('2026-02-16T07:00:00Z'),
    createdAt: new Date('2026-02-01'),
    updatedAt: new Date('2026-02-16'),
    deletedAt: null,
    user: {} as any,
    version: 1,
  };

  const mockCompletion: HabitCompletion = {
    id: mockCompletionId,
    habitId: mockHabitId,
    userId: mockUserId,
    completedAt: new Date('2026-02-16T07:30:00Z'),
    scheduledFor: new Date('2026-02-16'),
    notes: 'Great session',
    undoneAt: null,
    createdAt: new Date('2026-02-16T07:30:00Z'),
    habit: mockHabit,
    user: {} as any,
  };

  const mockCompletionRepository = {
    create: jest.fn(),
    findByIdAndUser: jest.fn(),
    findByHabit: jest.fn(),
    findByUserAndDate: jest.fn(),
    isCompletedForDate: jest.fn(),
    markUndone: jest.fn(),
  };

  const mockHabitRepository = {
    findByIdAndUser: jest.fn(),
    findByUser: jest.fn(),
    update: jest.fn(),
  };

  const mockHabitStreakService = {
    updateStreakOnCompletion: jest.fn(),
    recalculateStreak: jest.fn(),
  };

  const mockHabitScheduleService = {
    getNextOccurrence: jest.fn(),
    isScheduledForDate: jest.fn(),
  };

  const mockHabitEventPublisher = {
    publishHabitCompleted: jest.fn(),
    publishCompletionUndone: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HabitCompletionService,
        { provide: HabitCompletionRepository, useValue: mockCompletionRepository },
        { provide: HabitRepository, useValue: mockHabitRepository },
        { provide: HabitStreakService, useValue: mockHabitStreakService },
        { provide: HabitScheduleService, useValue: mockHabitScheduleService },
        { provide: HabitEventPublisher, useValue: mockHabitEventPublisher },
      ],
    }).compile();

    service = module.get<HabitCompletionService>(HabitCompletionService);
    completionRepository = module.get(HabitCompletionRepository);
    habitRepository = module.get(HabitRepository);
    habitStreakService = module.get(HabitStreakService);
    habitScheduleService = module.get(HabitScheduleService);
    habitEventPublisher = module.get(HabitEventPublisher);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('markComplete', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const createCompletionDto: CreateCompletionDto = {
      scheduledFor: todayStr,
      notes: 'Great session',
    };

    it('should mark a habit as complete successfully', async () => {
      const nextOccurrence = new Date('2026-02-17T07:00:00Z');

      mockHabitRepository.findByIdAndUser.mockResolvedValue(mockHabit);
      mockCompletionRepository.isCompletedForDate.mockResolvedValue(false);
      mockCompletionRepository.create.mockResolvedValue(mockCompletion);
      mockHabitScheduleService.getNextOccurrence.mockReturnValue(nextOccurrence);
      mockHabitRepository.update.mockResolvedValue({ ...mockHabit, nextOccurrenceAt: nextOccurrence });

      const result = await service.markComplete(mockHabitId, mockUserId, createCompletionDto);

      expect(habitRepository.findByIdAndUser).toHaveBeenCalledWith(mockHabitId, mockUserId);
      expect(completionRepository.isCompletedForDate).toHaveBeenCalled();
      expect(completionRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        habitId: mockHabitId,
        userId: mockUserId,
        notes: 'Great session',
      }));
      expect(habitStreakService.updateStreakOnCompletion).toHaveBeenCalledWith(
        mockHabitId,
        mockUserId,
        expect.any(Date),
      );
      expect(habitEventPublisher.publishHabitCompleted).toHaveBeenCalled();
      expect(result).toEqual(mockCompletion);
    });

    it('should complete without notes', async () => {
      const dtoWithoutNotes: CreateCompletionDto = { scheduledFor: todayStr };

      mockHabitRepository.findByIdAndUser.mockResolvedValue(mockHabit);
      mockCompletionRepository.isCompletedForDate.mockResolvedValue(false);
      mockCompletionRepository.create.mockResolvedValue({ ...mockCompletion, notes: null });
      mockHabitScheduleService.getNextOccurrence.mockReturnValue(null);

      const result = await service.markComplete(mockHabitId, mockUserId, dtoWithoutNotes);

      expect(completionRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        notes: null,
      }));
      expect(result.notes).toBeNull();
    });

    it('should throw NotFoundException when habit not found', async () => {
      mockHabitRepository.findByIdAndUser.mockResolvedValue(null);

      await expect(
        service.markComplete(mockHabitId, mockUserId, createCompletionDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when habit is paused', async () => {
      const pausedHabit = { ...mockHabit, status: HabitStatus.PAUSED };
      mockHabitRepository.findByIdAndUser.mockResolvedValue(pausedHabit);

      await expect(
        service.markComplete(mockHabitId, mockUserId, createCompletionDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when completing for future date', async () => {
      // Use a date definitely in the future (30 days from now)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const futureDateDto: CreateCompletionDto = {
        scheduledFor: futureDate.toISOString().split('T')[0],
      };

      mockHabitRepository.findByIdAndUser.mockResolvedValue(mockHabit);

      await expect(
        service.markComplete(mockHabitId, mockUserId, futureDateDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when already completed for date', async () => {
      mockHabitRepository.findByIdAndUser.mockResolvedValue(mockHabit);
      mockCompletionRepository.isCompletedForDate.mockResolvedValue(true);

      await expect(
        service.markComplete(mockHabitId, mockUserId, createCompletionDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('undoCompletion', () => {
    it('should undo a completion successfully within time window', async () => {
      // Set completedAt to within the 24-hour window
      const recentCompletion = {
        ...mockCompletion,
        completedAt: new Date(), // Just completed
      };

      mockCompletionRepository.findByIdAndUser.mockResolvedValue(recentCompletion);
      mockCompletionRepository.markUndone.mockResolvedValue(undefined);

      await service.undoCompletion(mockCompletionId, mockUserId);

      expect(completionRepository.markUndone).toHaveBeenCalledWith(mockCompletionId);
      expect(habitStreakService.recalculateStreak).toHaveBeenCalledWith(
        mockHabitId,
        mockUserId,
      );
      expect(habitEventPublisher.publishCompletionUndone).toHaveBeenCalledWith(
        expect.objectContaining({
          completionId: mockCompletionId,
          habitId: mockHabitId,
          userId: mockUserId,
        }),
      );
    });

    it('should throw NotFoundException when completion not found', async () => {
      mockCompletionRepository.findByIdAndUser.mockResolvedValue(null);

      await expect(service.undoCompletion(mockCompletionId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when completion already undone', async () => {
      const undoneCompletion = { ...mockCompletion, undoneAt: new Date() };
      mockCompletionRepository.findByIdAndUser.mockResolvedValue(undoneCompletion);

      await expect(service.undoCompletion(mockCompletionId, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when outside undo window', async () => {
      // Set completedAt to more than 24 hours ago
      const oldCompletion = {
        ...mockCompletion,
        completedAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
      };
      mockCompletionRepository.findByIdAndUser.mockResolvedValue(oldCompletion);

      await expect(service.undoCompletion(mockCompletionId, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getCompletionsByHabit', () => {
    it('should return completions for a habit', async () => {
      const completions = [mockCompletion];

      mockHabitRepository.findByIdAndUser.mockResolvedValue(mockHabit);
      mockCompletionRepository.findByHabit.mockResolvedValue(completions);

      const result = await service.getCompletionsByHabit(mockHabitId, mockUserId);

      expect(habitRepository.findByIdAndUser).toHaveBeenCalledWith(mockHabitId, mockUserId);
      expect(completionRepository.findByHabit).toHaveBeenCalledWith(mockHabitId, mockUserId);
      expect(result).toEqual(completions);
    });

    it('should throw NotFoundException when habit not found', async () => {
      mockHabitRepository.findByIdAndUser.mockResolvedValue(null);

      await expect(
        service.getCompletionsByHabit(mockHabitId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTodayScheduledHabits', () => {
    it('should return today schedule with habits', async () => {
      // Use a habit with nextOccurrenceAt in the future (later today)
      const futureTime = new Date();
      futureTime.setHours(futureTime.getHours() + 2);
      const habitWithFutureOccurrence = { ...mockHabit, nextOccurrenceAt: futureTime };
      
      const habits = [habitWithFutureOccurrence];
      const paginatedHabits = { habits, total: 1, page: 1, pageSize: 100, totalPages: 1 };

      mockHabitRepository.findByUser.mockResolvedValue(paginatedHabits);
      mockCompletionRepository.findByUserAndDate.mockResolvedValue([]);
      mockHabitScheduleService.isScheduledForDate.mockReturnValue(true);

      const result = await service.getTodayScheduledHabits(mockUserId);

      expect(result.habits).toHaveLength(1);
      expect(result.summary.total).toBe(1);
      expect(result.summary.pending).toBe(1);
      expect(result.summary.completed).toBe(0);
    });

    it('should properly count completed habits', async () => {
      const habits = [mockHabit];
      const paginatedHabits = { habits, total: 1, page: 1, pageSize: 100, totalPages: 1 };
      const completions = [mockCompletion];

      mockHabitRepository.findByUser.mockResolvedValue(paginatedHabits);
      mockCompletionRepository.findByUserAndDate.mockResolvedValue(completions);
      mockHabitScheduleService.isScheduledForDate.mockReturnValue(true);

      const result = await service.getTodayScheduledHabits(mockUserId);

      expect(result.summary.completed).toBe(1);
      expect(result.summary.pending).toBe(0);
      expect(result.habits[0].completionId).toBe(mockCompletionId);
    });

    it('should only include habits scheduled for today', async () => {
      const scheduledHabit = mockHabit;
      const notScheduledHabit = { ...mockHabit, id: 'habit-not-scheduled' };
      const habits = [scheduledHabit, notScheduledHabit];
      const paginatedHabits = { habits, total: 2, page: 1, pageSize: 100, totalPages: 1 };

      mockHabitRepository.findByUser.mockResolvedValue(paginatedHabits);
      mockCompletionRepository.findByUserAndDate.mockResolvedValue([]);
      mockHabitScheduleService.isScheduledForDate
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      const result = await service.getTodayScheduledHabits(mockUserId);

      expect(result.habits).toHaveLength(1);
      expect(result.habits[0].habit.id).toBe(mockHabitId);
    });

    it('should mark habits as overdue when past scheduled time', async () => {
      const overdueHabit = {
        ...mockHabit,
        nextOccurrenceAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      };
      const habits = [overdueHabit];
      const paginatedHabits = { habits, total: 1, page: 1, pageSize: 100, totalPages: 1 };

      mockHabitRepository.findByUser.mockResolvedValue(paginatedHabits);
      mockCompletionRepository.findByUserAndDate.mockResolvedValue([]);
      mockHabitScheduleService.isScheduledForDate.mockReturnValue(true);

      const result = await service.getTodayScheduledHabits(mockUserId);

      expect(result.habits[0].status).toBe('overdue');
      expect(result.summary.overdue).toBe(1);
    });
  });
});
