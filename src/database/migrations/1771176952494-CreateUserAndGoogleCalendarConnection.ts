import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateUserAndGoogleCalendarConnection1771176952494 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'passwordHash',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'emailVerified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'lastLoginAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'loginAttempts',
            type: 'int',
            default: 0,
          },
          {
            name: 'lockedUntil',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'deletedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'acceptedTermsAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes on users table
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_email',
        columnNames: ['email'],
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_deletedAt',
        columnNames: ['deletedAt'],
      }),
    );

    // Create google_calendar_connections table
    await queryRunner.createTable(
      new Table({
        name: 'google_calendar_connections',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'encryptedAccessToken',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'encryptedRefreshToken',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'tokenExpiry',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'selectedCalendarId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'connectedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'lastSyncAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create index on userId
    await queryRunner.createIndex(
      'google_calendar_connections',
      new TableIndex({
        name: 'IDX_google_calendar_connections_userId',
        columnNames: ['userId'],
      }),
    );

    // Create foreign key constraint
    await queryRunner.createForeignKey(
      'google_calendar_connections',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    // Enable uuid extension if not already enabled
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    const table = await queryRunner.getTable('google_calendar_connections');
    if (table) {
      const foreignKey = table.foreignKeys.find((fk) => fk.columnNames.indexOf('userId') !== -1);
      if (foreignKey) {
        await queryRunner.dropForeignKey('google_calendar_connections', foreignKey);
      }
    }

    // Drop google_calendar_connections table
    await queryRunner.dropTable('google_calendar_connections', true);

    // Drop users table
    await queryRunner.dropTable('users', true);
  }
}
