export class CalendarItemDto {
  id: string;
  summary: string;
  description?: string;
  primary: boolean;
  accessRole: string;

  constructor(
    id: string,
    summary: string,
    primary: boolean,
    accessRole: string,
    description?: string,
  ) {
    this.id = id;
    this.summary = summary;
    this.description = description;
    this.primary = primary;
    this.accessRole = accessRole;
  }
}

export class CalendarListDto {
  calendars: CalendarItemDto[];

  constructor(calendars: CalendarItemDto[]) {
    this.calendars = calendars;
  }
}
