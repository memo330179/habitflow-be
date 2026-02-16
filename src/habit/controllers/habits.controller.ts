import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { HabitService } from '../services/habit.service';
import { HabitSearchService } from '../services/habit-search.service';
import { HabitStreakService } from '../services/habit-streak.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../user/user.entity';
import {
  CreateHabitDto,
  UpdateHabitDto,
  HabitFilterDto,
  HabitResponseDto,
  PaginatedHabitResponseDto,
} from '../dto';

/**
 * Habits Controller
 * Handles habit CRUD operations
 */
@ApiTags('habits')
@Controller('habits')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class HabitsController {
  constructor(
    private readonly habitService: HabitService,
    private readonly habitSearchService: HabitSearchService,
    private readonly habitStreakService: HabitStreakService,
  ) {}

  /**
   * Create a new habit
   * POST /habits
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new habit' })
  @ApiBody({ type: CreateHabitDto })
  @ApiResponse({ status: 201, description: 'Habit created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createHabit(
    @CurrentUser() user: User,
    @Body() createHabitDto: CreateHabitDto,
  ): Promise<HabitResponseDto> {
    const habit = await this.habitService.createHabit(user.id, createHabitDto);
    const streak = await this.habitStreakService.getStreakSummary(habit.id, user.id);
    return HabitResponseDto.fromEntity(habit, streak);
  }

  /**
   * Get user's habits with filters
   * GET /habits
   */
  @Get()
  @ApiOperation({ summary: 'Get user habits with filters and pagination' })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'PAUSED', 'ARCHIVED'] })
  @ApiQuery({ name: 'frequencyType', required: false, enum: ['DAILY', 'WEEKLY', 'CUSTOM'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'sort', required: false, enum: ['NEXT_OCCURRENCE', 'NAME', 'STATUS'] })
  @ApiResponse({ status: 200, description: 'Habits retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getHabits(
    @CurrentUser() user: User,
    @Query() filters: HabitFilterDto,
  ): Promise<PaginatedHabitResponseDto> {
    const result = await this.habitService.getUserHabits(user.id, filters);

    // Get streaks for each habit
    const habitsWithStreaks = await Promise.all(
      result.habits.map(async (habit) => {
        const streak = await this.habitStreakService.getStreakSummary(habit.id, user.id);
        return HabitResponseDto.fromEntity(habit, streak);
      }),
    );

    return {
      habits: habitsWithStreaks,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    };
  }

  /**
   * Get a specific habit by ID
   * GET /habits/:habitId
   */
  @Get(':habitId')
  @ApiOperation({ summary: 'Get habit details by ID' })
  @ApiParam({ name: 'habitId', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Habit retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Habit not found' })
  async getHabitById(
    @CurrentUser() user: User,
    @Param('habitId', ParseUUIDPipe) habitId: string,
  ): Promise<HabitResponseDto> {
    const habit = await this.habitService.getHabitById(user.id, habitId);
    const streak = await this.habitStreakService.getStreakSummary(habit.id, user.id);
    return HabitResponseDto.fromEntity(habit, streak);
  }

  /**
   * Update a habit
   * PATCH /habits/:habitId
   */
  @Patch(':habitId')
  @ApiOperation({ summary: 'Update a habit' })
  @ApiParam({ name: 'habitId', type: String, format: 'uuid' })
  @ApiBody({ type: UpdateHabitDto })
  @ApiResponse({ status: 200, description: 'Habit updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Habit not found' })
  async updateHabit(
    @CurrentUser() user: User,
    @Param('habitId', ParseUUIDPipe) habitId: string,
    @Body() updateHabitDto: UpdateHabitDto,
  ): Promise<HabitResponseDto> {
    const habit = await this.habitService.updateHabit(user.id, habitId, updateHabitDto);
    const streak = await this.habitStreakService.getStreakSummary(habit.id, user.id);
    return HabitResponseDto.fromEntity(habit, streak);
  }

  /**
   * Delete a habit (soft delete)
   * DELETE /habits/:habitId
   */
  @Delete(':habitId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a habit (soft delete)' })
  @ApiParam({ name: 'habitId', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Habit deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Habit not found' })
  async deleteHabit(
    @CurrentUser() user: User,
    @Param('habitId', ParseUUIDPipe) habitId: string,
  ): Promise<{ success: boolean }> {
    await this.habitService.deleteHabit(user.id, habitId);
    return { success: true };
  }

  /**
   * Pause a habit
   * POST /habits/:habitId/pause
   */
  @Post(':habitId/pause')
  @ApiOperation({ summary: 'Pause a habit' })
  @ApiParam({ name: 'habitId', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Habit paused successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Habit not found' })
  @ApiResponse({ status: 409, description: 'Conflict - habit already paused or archived' })
  async pauseHabit(
    @CurrentUser() user: User,
    @Param('habitId', ParseUUIDPipe) habitId: string,
  ): Promise<HabitResponseDto> {
    const habit = await this.habitService.pauseHabit(user.id, habitId);
    const streak = await this.habitStreakService.getStreakSummary(habit.id, user.id);
    return HabitResponseDto.fromEntity(habit, streak);
  }

  /**
   * Resume a paused habit
   * POST /habits/:habitId/resume
   */
  @Post(':habitId/resume')
  @ApiOperation({ summary: 'Resume a paused habit' })
  @ApiParam({ name: 'habitId', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Habit resumed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Habit not found' })
  @ApiResponse({ status: 409, description: 'Conflict - habit not paused' })
  async resumeHabit(
    @CurrentUser() user: User,
    @Param('habitId', ParseUUIDPipe) habitId: string,
  ): Promise<HabitResponseDto> {
    const habit = await this.habitService.resumeHabit(user.id, habitId);
    const streak = await this.habitStreakService.getStreakSummary(habit.id, user.id);
    return HabitResponseDto.fromEntity(habit, streak);
  }
}
