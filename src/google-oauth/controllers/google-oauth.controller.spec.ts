import { Test, TestingModule } from '@nestjs/testing';
import { GoogleOAuthController } from './google-oauth.controller';
import { GoogleOAuthService } from '../services/google-oauth.service';
import { User } from '../../user/user.entity';
import { SelectCalendarDto } from '../dto/select-calendar.dto';

describe('GoogleOAuthController', () => {
  let controller: GoogleOAuthController;
  let googleOAuthService: GoogleOAuthService;

  const mockGoogleOAuthService = {
    getConnectionStatus: jest.fn(),
    disconnect: jest.fn(),
    listCalendars: jest.fn(),
    selectCalendar: jest.fn(),
  };

  const mockUser: Partial<User> = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockConnection = {
    userId: 'user-123',
    connectedAt: new Date(),
    selectedCalendarId: 'calendar-1',
    lastSyncAt: new Date(),
  };

  const mockCalendarList = {
    calendars: [
      {
        id: 'calendar-1',
        summary: 'Primary Calendar',
        description: 'My calendar',
        primary: true,
        accessRole: 'owner',
      },
      {
        id: 'calendar-2',
        summary: 'Work Calendar',
        description: 'Work events',
        primary: false,
        accessRole: 'owner',
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GoogleOAuthController],
      providers: [
        {
          provide: GoogleOAuthService,
          useValue: mockGoogleOAuthService,
        },
      ],
    }).compile();

    controller = module.get<GoogleOAuthController>(GoogleOAuthController);
    googleOAuthService = module.get<GoogleOAuthService>(GoogleOAuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getConnectionStatus', () => {
    it('should return connected status when connection exists', async () => {
      mockGoogleOAuthService.getConnectionStatus.mockResolvedValue(mockConnection);

      const result = await controller.getConnectionStatus(mockUser as User);

      expect(googleOAuthService.getConnectionStatus).toHaveBeenCalledWith(
        mockUser.id,
      );
      expect(result).toEqual({
        connected: true,
        connectedAt: mockConnection.connectedAt,
        selectedCalendarId: mockConnection.selectedCalendarId,
        lastSyncAt: mockConnection.lastSyncAt,
      });
    });

    it('should return disconnected status when no connection exists', async () => {
      mockGoogleOAuthService.getConnectionStatus.mockResolvedValue(null);

      const result = await controller.getConnectionStatus(mockUser as User);

      expect(googleOAuthService.getConnectionStatus).toHaveBeenCalledWith(
        mockUser.id,
      );
      expect(result).toEqual({
        connected: false,
        connectedAt: undefined,
        selectedCalendarId: undefined,
        lastSyncAt: undefined,
      });
    });
  });

  describe('disconnect', () => {
    it('should disconnect Google Calendar', async () => {
      mockGoogleOAuthService.disconnect.mockResolvedValue(undefined);

      await controller.disconnect(mockUser as User);

      expect(googleOAuthService.disconnect).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('listCalendars', () => {
    it('should return list of calendars', async () => {
      mockGoogleOAuthService.listCalendars.mockResolvedValue(mockCalendarList);

      const result = await controller.listCalendars(mockUser as User);

      expect(googleOAuthService.listCalendars).toHaveBeenCalledWith(
        mockUser.id,
      );
      expect(result).toEqual(mockCalendarList);
      expect(result.calendars).toHaveLength(2);
    });
  });

  describe('selectCalendar', () => {
    it('should select a calendar', async () => {
      const selectCalendarDto: SelectCalendarDto = {
        calendarId: 'calendar-1',
      };

      mockGoogleOAuthService.selectCalendar.mockResolvedValue(undefined);

      const result = await controller.selectCalendar(
        mockUser as User,
        selectCalendarDto,
      );

      expect(googleOAuthService.selectCalendar).toHaveBeenCalledWith(
        mockUser.id,
        selectCalendarDto.calendarId,
      );
      expect(result).toEqual({
        message: 'Calendar selected successfully',
        calendarId: selectCalendarDto.calendarId,
      });
    });
  });
});
