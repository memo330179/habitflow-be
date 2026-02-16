import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { HabitService } from './habit.service';
import { HabitRepository } from '../repositories/habit.repository';
import { HabitValidationService } from './habit-validation.service';
import { HabitScheduleService } from './habit-schedule.service';
import { HabitEventPublisher } from './habit-event-publisher.service';
import { Habit, HabitFrequencyType, HabitStatus } from '../entities/habit.entity';
import { CreateHabitDto, UpdateHabitDto } from '../dto';

describe('HabitService', () => {
  let service: HabitService;
  let habitRepository: jest.Mocked<HabitRepository>;
  let habitValidationService: jest.Mocked<HabitValidationService>;
  let habitScheduleService: jest.Mocked<HabitScheduleService>;
  let habitEventPublisher: jest.Mocked<HabitEventPublisher>;

  const mockUserId = 'user-123';
  const mockHabitId = 'habit-456';

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
    nextOccurrenceAt: new Date('2026-02-17T07:00:00Z'),
    createdAt: new Date('2026-02-01'),
    updatedAt: new Date('2026-02-16'),
    deletedAt: null,
    user: {} as any,
    version: 1,
  };

  const mockHabitRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndUser: jest.fn(),
    findByUser: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockHabitValidationService = {
    validateHabitName: jest.fn(),
    validateDescription: jest.fn(),
    validateFrequency: jest.fn(),
    validateDuration: jest.fn(),
  };

  const mockHabitScheduleService = {
    getNextOccurrence: jest.fn(),
  };

  const mockHabitEventPublisher = {
    publishHabitCreated: jest.fn(),
    publishHabitUpdated: jest.fn(),
    publishHabitDeleted: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HabitService,
        { provide: HabitRepository, useValue: mockHabitRepository },
        { provide: HabitValidationService, useValue: mockHabitValidationService },
        { provide: HabitScheduleService, useValue: mockHabitScheduleService },
        { provide: HabitEventPublisher, useValue: mockHabitEventPublisher },
      ],
    }).compile();

    service = module.get<HabitService>(HabitService);
    habitRepository = module.get(HabitRepository);
    habitValidationService = module.get(HabitValidationService);
    habitScheduleService = module.get(HabitScheduleService);
    habitEventPublisher = module.get(HabitEventPublisher);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
      const createdHabit = { ...mockHabit, nextOccurrenceAt: null };
      const updatedHabit = { ...mockHabit };
      const nextOccurrence = new Date('2026-02-17T07:00:00Z');

      mockHabitRepository.create.mockResolvedValue(createdHabit);
      mockHabitScheduleService.getNextOccurrence.mockReturnValue(nextOccurrence);
      mockHabitRepository.update.mockResolvedValue(updatedHabit);

      const result = await service.createHabit(mockUserId, createDto);

      expect(habitValidationService.validateHabitName).toHaveBeenCalledWith(createDto.name);
      expect(habitValidationService.validateDescription).toHaveBeenCalledWith(createDto.description);
      expect(habitValidationService.validateFrequency).toHaveBeenCalledWith(
        createDto.frequencyType,
        createDto.frequencyDetails,
      );
      expect(habitValidationService.validateDuration).toHaveBeenCalledWith(createDto.durationMinutes);
      expect(habitRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: mockUserId,
        name: createDto.name,
        frequencyType: createDto.frequencyType,
      }));
      expect(habitEventPublisher.publishHabitCreated).toHaveBeenCalled();
      expect(result).toEqual(updatedHabit);
    });

    it('should create a habit without description', async () => {
      const dtoWithoutDescription = { ...createDto, description: undefined };
      const createdHabit = { ...mockHabit, description: null };

      mockHabitRepository.create.mockResolvedValue(createdHabit);
      mockHabitScheduleService.getNextOccurrence.mockReturnValue(null);

      const result = await service.createHabit(mockUserId, dtoWithoutDescription);

      expect(habitValidationService.validateDescription).not.toHaveBeenCalled();
      expect(result).toEqual(createdHabit);
    });

    it('should create a habit without duration', async () => {
      const dtoWithoutDuration = { ...createDto, durationMinutes: undefined };
      const createdHabit = { ...mockHabit, durationMinutes: null };

      mockHabitRepository.create.mockResolvedValue(createdHabit);
      mockHabitScheduleService.getNextOccurrence.mockReturnValue(null);

      const result = await service.createHabit(mockUserId, dtoWithoutDuration);

      expect(habitValidationService.validateDuration).not.toHaveBeenCalled();
      expect(result.durationMinutes).toBeNull();
    });
  });

  describe('getUserHabits', () => {
    it('should return paginated habits', async () => {
      const paginatedResult = {
        habits: [mockHabit],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      };

      mockHabitRepository.findByUser.mockResolvedValue(paginatedResult);

      const result = await service.getUserHabits(mockUserId, { page: 1, pageSize: 10 });

      expect(habitRepository.findByUser).toHaveBeenCalledWith(mockUserId, expect.any(Object));
      expect(result).toEqual(paginatedResult);
    });

    it('should apply filters when provided', async () => {
      const filters = {
        status: HabitStatus.ACTIVE,
        frequencyType: HabitFrequencyType.DAILY,
        search: 'meditation',
        page: 1,
        pageSize: 10,
      };

      mockHabitRepository.findByUser.mockResolvedValue({
        habits: [mockHabit],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });

      await service.getUserHabits(mockUserId, filters);

      expect(habitRepository.findByUser).toHaveBeenCalledWith(mockUserId, expect.objectContaining({
        status: HabitStatus.ACTIVE,
        frequencyType: HabitFrequencyType.DAILY,
        search: 'meditation',
      }));
    });
  });

  describe('getHabitById', () => {
    it('should return a habit when found', async () => {
      mockHabitRepository.findByIdAndUser.mockResolvedValue(mockHabit);

      const result = await service.getHabitById(mockUserId, mockHabitId);

      expect(habitRepository.findByIdAndUser).toHaveBeenCalledWith(mockHabitId, mockUserId);
      expect(result).toEqual(mockHabit);
    });

    it('should throw NotFoundException when habit not found', async () => {
      mockHabitRepository.findByIdAndUser.mockResolvedValue(null);

      await expect(service.getHabitById(mockUserId, mockHabitId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateHabit', () => {
    const updateDto: UpdateHabitDto = {
      name: 'Evening Meditation',
      description: 'Updated description',
    };

    it('should update a habit successfully', async () => {
      const updatedHabit = { ...mockHabit, name: 'Evening Meditation' };

      mockHabitRepository.findByIdAndUser.mockResolvedValue(mockHabit);
      mockHabitRepository.update.mockResolvedValue(updatedHabit);
      mockHabitRepository.findById.mockResolvedValue(updatedHabit);

      const result = await service.updateHabit(mockUserId, mockHabitId, updateDto);

      expect(habitValidationService.validateHabitName).toHaveBeenCalledWith(updateDto.name);
      expect(habitValidationService.validateDescription).toHaveBeenCalledWith(updateDto.description);
      expect(habitRepository.update).toHaveBeenCalledWith(mockHabitId, expect.objectContaining({
        name: 'Evening Meditation',
      }));
      expect(habitEventPublisher.publishHabitUpdated).toHaveBeenCalled();
      expect(result.name).toBe('Evening Meditation');
    });

    it('should recalculate next occurrence when frequency changes', async () => {
      const frequencyUpdateDto: UpdateHabitDto = {
        frequencyType: HabitFrequencyType.WEEKLY,
        frequencyDetails: { days: [1, 3, 5], time: '08:00' },
      };
      const newNextOccurrence = new Date('2026-02-18T08:00:00Z');

      mockHabitRepository.findByIdAndUser.mockResolvedValue(mockHabit);
      mockHabitRepository.update.mockResolvedValue({ ...mockHabit, ...frequencyUpdateDto });
      mockHabitRepository.findById.mockResolvedValue({ ...mockHabit, ...frequencyUpdateDto });
      mockHabitScheduleService.getNextOccurrence.mockReturnValue(newNextOccurrence);

      await service.updateHabit(mockUserId, mockHabitId, frequencyUpdateDto);

      expect(habitScheduleService.getNextOccurrence).toHaveBeenCalled();
      expect(habitRepository.update).toHaveBeenCalledWith(mockHabitId, { nextOccurrenceAt: newNextOccurrence });
    });

    it('should throw NotFoundException when habit not found', async () => {
      mockHabitRepository.findByIdAndUser.mockResolvedValue(null);

      await expect(service.updateHabit(mockUserId, mockHabitId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteHabit', () => {
    it('should soft delete a habit', async () => {
      mockHabitRepository.findByIdAndUser.mockResolvedValue(mockHabit);
      mockHabitRepository.softDelete.mockResolvedValue(undefined);

      await service.deleteHabit(mockUserId, mockHabitId);

      expect(habitRepository.softDelete).toHaveBeenCalledWith(mockHabitId);
      expect(habitEventPublisher.publishHabitDeleted).toHaveBeenCalledWith(
        expect.objectContaining({
          habitId: mockHabitId,
          userId: mockUserId,
          name: mockHabit.name,
        }),
      );
    });

    it('should throw NotFoundException when habit not found', async () => {
      mockHabitRepository.findByIdAndUser.mockResolvedValue(null);

      await expect(service.deleteHabit(mockUserId, mockHabitId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('pauseHabit', () => {
    it('should pause an active habit', async () => {
      const pausedHabit = { ...mockHabit, status: HabitStatus.PAUSED, nextOccurrenceAt: null };

      mockHabitRepository.findByIdAndUser.mockResolvedValue(mockHabit);
      mockHabitRepository.update.mockResolvedValue(pausedHabit);

      const result = await service.pauseHabit(mockUserId, mockHabitId);

      expect(habitRepository.update).toHaveBeenCalledWith(mockHabitId, {
        status: HabitStatus.PAUSED,
        nextOccurrenceAt: null,
      });
      expect(result.status).toBe(HabitStatus.PAUSED);
    });

    it('should return habit unchanged if already paused', async () => {
      const alreadyPausedHabit = { ...mockHabit, status: HabitStatus.PAUSED };

      mockHabitRepository.findByIdAndUser.mockResolvedValue(alreadyPausedHabit);

      const result = await service.pauseHabit(mockUserId, mockHabitId);

      expect(habitRepository.update).not.toHaveBeenCalled();
      expect(result.status).toBe(HabitStatus.PAUSED);
    });

    it('should throw ConflictException when trying to pause archived habit', async () => {
      const archivedHabit = { ...mockHabit, status: HabitStatus.ARCHIVED };

      mockHabitRepository.findByIdAndUser.mockResolvedValue(archivedHabit);

      await expect(service.pauseHabit(mockUserId, mockHabitId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('resumeHabit', () => {
    it('should resume a paused habit', async () => {
      const pausedHabit = { ...mockHabit, status: HabitStatus.PAUSED, nextOccurrenceAt: null };
      const resumedHabit = { ...mockHabit, status: HabitStatus.ACTIVE };
      const nextOccurrence = new Date('2026-02-17T07:00:00Z');

      mockHabitRepository.findByIdAndUser.mockResolvedValue(pausedHabit);
      mockHabitScheduleService.getNextOccurrence.mockReturnValue(nextOccurrence);
      mockHabitRepository.update.mockResolvedValue(resumedHabit);

      const result = await service.resumeHabit(mockUserId, mockHabitId);

      expect(habitRepository.update).toHaveBeenCalledWith(mockHabitId, {
        status: HabitStatus.ACTIVE,
        nextOccurrenceAt: nextOccurrence,
      });
      expect(result.status).toBe(HabitStatus.ACTIVE);
    });

    it('should return habit unchanged if already active', async () => {
      mockHabitRepository.findByIdAndUser.mockResolvedValue(mockHabit);

      const result = await service.resumeHabit(mockUserId, mockHabitId);

      expect(habitRepository.update).not.toHaveBeenCalled();
      expect(result.status).toBe(HabitStatus.ACTIVE);
    });

    it('should throw ConflictException when trying to resume archived habit', async () => {
      const archivedHabit = { ...mockHabit, status: HabitStatus.ARCHIVED };

      mockHabitRepository.findByIdAndUser.mockResolvedValue(archivedHabit);

      await expect(service.resumeHabit(mockUserId, mockHabitId)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
