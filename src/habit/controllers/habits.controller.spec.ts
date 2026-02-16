import { Test, TestingModule } from '@nestjs/testing';
import { HabitsController } from './habits.controller';
import { HabitService } from '../services/habit.service';
import { HabitSearchService } from '../services/habit-search.service';
import { HabitStreakService } from '../services/habit-streak.service';
import { User } from '../../user/user.entity';
import { Habit, HabitFrequencyType, HabitStatus } from '../entities/habit.entity';
import { CreateHabitDto, UpdateHabitDto, HabitFilterDto } from '../dto';

describe('HabitsController', () => {
  let controller: HabitsController;
  let habitService: jest.Mocked<HabitService>;
  let habitSearchService: jest.Mocked<HabitSearchService>;
  let habitStreakService: jest.Mocked<HabitStreakService>;

  const mockUser: Partial<User> = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockHabit: Habit = {
    id: 'habit-456',
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

  const mockStreak = {
    currentStreak: 5,
    longestStreak: 10,
    totalCompletions: 30,
  };

  const mockHabitService = {
    createHabit: jest.fn(),
    getUserHabits: jest.fn(),
    getHabitById: jest.fn(),
    updateHabit: jest.fn(),
    deleteHabit: jest.fn(),
    pauseHabit: jest.fn(),
    resumeHabit: jest.fn(),
  };

  const mockHabitSearchService = {
    search: jest.fn(),
  };

  const mockHabitStreakService = {
    getStreakSummary: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HabitsController],
      providers: [
        { provide: HabitService, useValue: mockHabitService },
        { provide: HabitSearchService, useValue: mockHabitSearchService },
        { provide: HabitStreakService, useValue: mockHabitStreakService },
      ],
    }).compile();

    controller = module.get<HabitsController>(HabitsController);
    habitService = module.get(HabitService);
    habitSearchService = module.get(HabitSearchService);
    habitStreakService = module.get(HabitStreakService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createHabit', () => {
    const createDto: CreateHabitDto = {
      name: 'Morning Meditation',
      description: 'Daily meditation practice',
      frequencyType: HabitFrequencyType.DAILY,
      frequencyDetails: { time: '07:00' },
      durationMinutes: 15,
      timezone: 'America/New_York',
    };

    it('should create a habit successfully', async () => {
      mockHabitService.createHabit.mockResolvedValue(mockHabit);
      mockHabitStreakService.getStreakSummary.mockResolvedValue(mockStreak);

      const result = await controller.createHabit(mockUser as User, createDto);

      expect(habitService.createHabit).toHaveBeenCalledWith(mockUser.id, createDto);
      expect(habitStreakService.getStreakSummary).toHaveBeenCalledWith(mockHabit.id, mockUser.id);
      expect(result.name).toBe(createDto.name);
      expect(result.streak).toEqual(mockStreak);
    });
  });

  describe('getHabits', () => {
    it('should return paginated habits', async () => {
      const filters: HabitFilterDto = { page: 1, pageSize: 10 };
      const paginatedResult = {
        habits: [mockHabit],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      };

      mockHabitService.getUserHabits.mockResolvedValue(paginatedResult);
      mockHabitStreakService.getStreakSummary.mockResolvedValue(mockStreak);

      const result = await controller.getHabits(mockUser as User, filters);

      expect(habitService.getUserHabits).toHaveBeenCalledWith(mockUser.id, filters);
      expect(result.habits).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should apply filters when getting habits', async () => {
      const filters: HabitFilterDto = {
        status: HabitStatus.ACTIVE,
        frequencyType: HabitFrequencyType.DAILY,
        search: 'meditation',
        page: 1,
        pageSize: 10,
      };

      mockHabitService.getUserHabits.mockResolvedValue({
        habits: [mockHabit],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });
      mockHabitStreakService.getStreakSummary.mockResolvedValue(mockStreak);

      await controller.getHabits(mockUser as User, filters);

      expect(habitService.getUserHabits).toHaveBeenCalledWith(mockUser.id, filters);
    });
  });

  describe('getHabitById', () => {
    it('should return a habit with streak', async () => {
      mockHabitService.getHabitById.mockResolvedValue(mockHabit);
      mockHabitStreakService.getStreakSummary.mockResolvedValue(mockStreak);

      const result = await controller.getHabitById(mockUser as User, mockHabit.id);

      expect(habitService.getHabitById).toHaveBeenCalledWith(mockUser.id, mockHabit.id);
      expect(result.id).toBe(mockHabit.id);
      expect(result.streak).toEqual(mockStreak);
    });
  });

  describe('updateHabit', () => {
    const updateDto: UpdateHabitDto = {
      name: 'Evening Meditation',
      description: 'Updated description',
    };

    it('should update a habit successfully', async () => {
      const updatedHabit = { ...mockHabit, name: 'Evening Meditation' };
      mockHabitService.updateHabit.mockResolvedValue(updatedHabit);
      mockHabitStreakService.getStreakSummary.mockResolvedValue(mockStreak);

      const result = await controller.updateHabit(mockUser as User, mockHabit.id, updateDto);

      expect(habitService.updateHabit).toHaveBeenCalledWith(mockUser.id, mockHabit.id, updateDto);
      expect(result.name).toBe('Evening Meditation');
    });
  });

  describe('deleteHabit', () => {
    it('should delete a habit successfully', async () => {
      mockHabitService.deleteHabit.mockResolvedValue(undefined);

      await controller.deleteHabit(mockUser as User, mockHabit.id);

      expect(habitService.deleteHabit).toHaveBeenCalledWith(mockUser.id, mockHabit.id);
    });
  });

  describe('pauseHabit', () => {
    it('should pause a habit successfully', async () => {
      const pausedHabit = { ...mockHabit, status: HabitStatus.PAUSED, nextOccurrenceAt: null };
      mockHabitService.pauseHabit.mockResolvedValue(pausedHabit);
      mockHabitStreakService.getStreakSummary.mockResolvedValue(mockStreak);

      const result = await controller.pauseHabit(mockUser as User, mockHabit.id);

      expect(habitService.pauseHabit).toHaveBeenCalledWith(mockUser.id, mockHabit.id);
      expect(result.status).toBe(HabitStatus.PAUSED);
    });
  });

  describe('resumeHabit', () => {
    it('should resume a habit successfully', async () => {
      mockHabitService.resumeHabit.mockResolvedValue(mockHabit);
      mockHabitStreakService.getStreakSummary.mockResolvedValue(mockStreak);

      const result = await controller.resumeHabit(mockUser as User, mockHabit.id);

      expect(habitService.resumeHabit).toHaveBeenCalledWith(mockUser.id, mockHabit.id);
      expect(result.status).toBe(HabitStatus.ACTIVE);
    });
  });
});
