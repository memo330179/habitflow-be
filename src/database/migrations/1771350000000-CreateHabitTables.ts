import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateHabitTables1771350000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create habit_frequency_type enum
    await queryRunner.query(`
      CREATE TYPE habit_frequency_type AS ENUM ('DAILY', 'WEEKLY', 'CUSTOM')
    `);

    // Create habit_status enum
    await queryRunner.query(`
      CREATE TYPE habit_status AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED')
    `);

    // Create habits table
    await queryRunner.createTable(
      new Table({
        name: 'habits',
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
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'frequencyType',
            type: 'habit_frequency_type',
            default: `'DAILY'`,
          },
          {
            name: 'frequencyDetails',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'durationMinutes',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'habit_status',
            default: `'ACTIVE'`,
          },
          {
            name: 'timezone',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'nextOccurrenceAt',
            type: 'timestamp',
            isNullable: true,
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
            name: 'deletedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'version',
            type: 'int',
            default: 0,
          },
        ],
      }),
      true,
    );

    // Create indexes on habits table
    await queryRunner.createIndex(
      'habits',
      new TableIndex({
        name: 'IDX_habits_userId',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'habits',
      new TableIndex({
        name: 'IDX_habits_userId_status',
        columnNames: ['userId', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'habits',
      new TableIndex({
        name: 'IDX_habits_userId_deletedAt',
        columnNames: ['userId', 'deletedAt'],
      }),
    );

    await queryRunner.createIndex(
      'habits',
      new TableIndex({
        name: 'IDX_habits_nextOccurrenceAt',
        columnNames: ['nextOccurrenceAt'],
      }),
    );

    // Create foreign key for habits.userId -> users.id
    await queryRunner.createForeignKey(
      'habits',
      new TableForeignKey({
        name: 'FK_habits_userId',
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create habit_completions table
    await queryRunner.createTable(
      new Table({
        name: 'habit_completions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'habitId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'completedAt',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'scheduledFor',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'notes',
            type: 'varchar',
            length: '1000',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'undoneAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes on habit_completions table
    await queryRunner.createIndex(
      'habit_completions',
      new TableIndex({
        name: 'IDX_habit_completions_habitId',
        columnNames: ['habitId'],
      }),
    );

    await queryRunner.createIndex(
      'habit_completions',
      new TableIndex({
        name: 'IDX_habit_completions_userId',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'habit_completions',
      new TableIndex({
        name: 'IDX_habit_completions_habitId_scheduledFor',
        columnNames: ['habitId', 'scheduledFor'],
      }),
    );

    await queryRunner.createIndex(
      'habit_completions',
      new TableIndex({
        name: 'IDX_habit_completions_userId_scheduledFor',
        columnNames: ['userId', 'scheduledFor'],
      }),
    );

    await queryRunner.createIndex(
      'habit_completions',
      new TableIndex({
        name: 'IDX_habit_completions_completedAt',
        columnNames: ['completedAt'],
      }),
    );

    // Create foreign keys for habit_completions
    await queryRunner.createForeignKey(
      'habit_completions',
      new TableForeignKey({
        name: 'FK_habit_completions_habitId',
        columnNames: ['habitId'],
        referencedTableName: 'habits',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'habit_completions',
      new TableForeignKey({
        name: 'FK_habit_completions_userId',
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    await queryRunner.dropForeignKey('habit_completions', 'FK_habit_completions_userId');
    await queryRunner.dropForeignKey('habit_completions', 'FK_habit_completions_habitId');
    await queryRunner.dropForeignKey('habits', 'FK_habits_userId');

    // Drop tables
    await queryRunner.dropTable('habit_completions');
    await queryRunner.dropTable('habits');

    // Drop enums
    await queryRunner.query(`DROP TYPE habit_status`);
    await queryRunner.query(`DROP TYPE habit_frequency_type`);
  }
}
