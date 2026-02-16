import { Test, TestingModule } from '@nestjs/testing';
import { HabitCompletionsController } from './habit-completions.controller';
import { HabitCompletionService } from '../services/habit-completion.service';
import { User } from '../../user/user.entity';
import { HabitCompletion } from '../entities/habit-completion.entity';
import { Habit, HabitFrequencyType, HabitStatus } from '../entities/habit.entity';
import { CreateCompletionDto, TodayScheduleResponseDto } from '../dto';

describe('HabitCompletionsController', () => {
  let controller: HabitCompletionsController;
  let habitCompletionService: jest.Mocked<HabitCompletionService>;

  const mockUser: Partial<User> = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockHabitId = 'habit-456';
  const mockCompletionId = 'completion-789';

  const mockHabit: Habit = {
    id: mockHabitId,
    userId: mockUser.id!,
    name: 'Morning Meditation',
    description: 'Daily meditation practice',
    frequencyType: HabitFrequencyType.DAILY,
    frequencyDetails: { time: '07:00' },
    durationMinutes: 15,
    status: HabitStatus.ACTIVE,
    timezone: 'America/New_York',
    nextOccurrenceAt: new Date('2026-02-17T07:00:00Z'),
    createdAt: new Date('2026-02-01'),
    updatedAt: new Date('2026-02-16'),
    deletedAt: null,
    user: mockUser as User,
    version: 1,
  };

  const mockCompletion: HabitCompletion = {
    id: mockCompletionId,
    habitId: mockHabitId,
    userId: mockUser.id!,
    completedAt: new Date('2026-02-16T07:30:00Z'),
    scheduledFor: new Date('2026-02-16'),
    notes: 'Great session',
    undoneAt: null,
    createdAt: new Date('2026-02-16T07:30:00Z'),
    habit: mockHabit,
    user: mockUser as User,
  };

  const mockHabitCompletionService = {
    markComplete: jest.fn(),
    undoCompletion: jest.fn(),
    getCompletionsByHabit: jest.fn(),
    getTodayScheduledHabits: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HabitCompletionsController],
      providers: [
        { provide: HabitCompletionService, useValue: mockHabitCompletionService },
      ],
    }).compile();

    controller = module.get<HabitCompletionsController>(HabitCompletionsController);
    habitCompletionService = module.get(HabitCompletionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('markCompletion', () => {
    const createCompletionDto: CreateCompletionDto = {
      scheduledFor: '2026-02-16',
      notes: 'Great session',
    };

    it('should mark a habit as complete successfully', async () => {
      mockHabitCompletionService.markComplete.mockResolvedValue(mockCompletion);

      const result = await controller.markCompletion(
        mockUser as User,
        mockHabitId,
        createCompletionDto,
      );

      expect(habitCompletionService.markComplete).toHaveBeenCalledWith(
        mockHabitId,
        mockUser.id,
        createCompletionDto,
      );
      expect(result.id).toBe(mockCompletionId);
      expect(result.habitId).toBe(mockHabitId);
      expect(result.notes).toBe('Great session');
    });

    it('should mark completion without notes', async () => {
      const dtoWithoutNotes: CreateCompletionDto = { scheduledFor: '2026-02-16' };
      const completionWithoutNotes = { ...mockCompletion, notes: null };

      mockHabitCompletionService.markComplete.mockResolvedValue(completionWithoutNotes);

      const result = await controller.markCompletion(
        mockUser as User,
        mockHabitId,
        dtoWithoutNotes,
      );

      expect(result.notes).toBeNull();
    });
  });

  describe('undoCompletion', () => {
    it('should undo a completion successfully', async () => {
      mockHabitCompletionService.undoCompletion.mockResolvedValue(undefined);

      const result = await controller.undoCompletion(
        mockUser as User,
        mockCompletionId,
      );

      expect(habitCompletionService.undoCompletion).toHaveBeenCalledWith(
        mockCompletionId,
        mockUser.id,
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('getCompletionsByHabit', () => {
    it('should return completions for a habit', async () => {
      mockHabitCompletionService.getCompletionsByHabit.mockResolvedValue([mockCompletion]);

      const result = await controller.getCompletionsByHabit(
        mockUser as User,
        mockHabitId,
      );

      expect(habitCompletionService.getCompletionsByHabit).toHaveBeenCalledWith(
        mockHabitId,
        mockUser.id,
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockCompletionId);
    });

    it('should return empty array when no completions', async () => {
      mockHabitCompletionService.getCompletionsByHabit.mockResolvedValue([]);

      const result = await controller.getCompletionsByHabit(
        mockUser as User,
        mockHabitId,
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('getTodayScheduledHabits', () => {
    it('should return today schedule with habits', async () => {
      const mockTodaySchedule: TodayScheduleResponseDto = {
        date: '2026-02-16',
        habits: [
          {
            habit: {
              id: mockHabitId,
              name: 'Morning Meditation',
              description: 'Daily meditation practice',
              frequencyType: HabitFrequencyType.DAILY,
              frequencyDetails: { time: '07:00' },
              durationMinutes: 15,
              status: HabitStatus.ACTIVE,
              timezone: 'America/New_York',
              nextOccurrenceAt: new Date('2026-02-17T07:00:00Z'),
              createdAt: new Date('2026-02-01'),
              updatedAt: new Date('2026-02-16'),
            },
            status: 'pending',
          },
        ],
        summary: {
          total: 1,
          completed: 0,
          pending: 1,
          overdue: 0,
        },
      };

      mockHabitCompletionService.getTodayScheduledHabits.mockResolvedValue(mockTodaySchedule);

      const result = await controller.getTodayScheduledHabits(mockUser as User);

      expect(habitCompletionService.getTodayScheduledHabits).toHaveBeenCalledWith(mockUser.id);
      expect(result.date).toBe('2026-02-16');
      expect(result.habits).toHaveLength(1);
      expect(result.summary.total).toBe(1);
    });

    it('should return empty schedule when no habits', async () => {
      const emptySchedule: TodayScheduleResponseDto = {
        date: '2026-02-16',
        habits: [],
        summary: {
          total: 0,
          completed: 0,
          pending: 0,
          overdue: 0,
        },
      };

      mockHabitCompletionService.getTodayScheduledHabits.mockResolvedValue(emptySchedule);

      const result = await controller.getTodayScheduledHabits(mockUser as User);

      expect(result.habits).toHaveLength(0);
      expect(result.summary.total).toBe(0);
    });
  });
});
