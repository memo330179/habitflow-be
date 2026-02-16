import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/user/user.entity';
import { GoogleCalendarConnection } from '../src/google-oauth/google-calendar-connection.entity';
import { Repository } from 'typeorm';

/**
 * Reset script to clear all database data
 * Run with: npm run db:reset
 * WARNING: This will delete ALL data!
 */
async function bootstrap() {
  console.log('⚠️  WARNING: This will delete ALL data from the database!\n');

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
    const googleConnectionRepo = app.get<Repository<GoogleCalendarConnection>>(
      getRepositoryToken(GoogleCalendarConnection),
    );

    console.log('🗑️  Deleting Google Calendar connections...');
    await googleConnectionRepo.clear();

    console.log('🗑️  Deleting users...');
    const users = await userRepo.find();
    if (users.length > 0) {
      await userRepo.remove(users);
    }

    console.log('\n✅ Database reset completed!\n');
    console.log('Run "npm run seed" to populate with test data.\n');
  } catch (error) {
    console.error('❌ Reset failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
