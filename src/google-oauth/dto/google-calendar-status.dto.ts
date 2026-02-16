export class GoogleCalendarStatusDto {
  connected: boolean;
  connectedEmail?: string;
  selectedCalendarId?: string | null;
  connectedAt?: Date;
  lastSyncAt?: Date | null;

  constructor(
    connected: boolean,
    connectedEmail?: string,
    selectedCalendarId?: string | null,
    connectedAt?: Date,
    lastSyncAt?: Date | null,
  ) {
    this.connected = connected;
    this.connectedEmail = connectedEmail;
    this.selectedCalendarId = selectedCalendarId;
    this.connectedAt = connectedAt;
    this.lastSyncAt = lastSyncAt;
  }
}
