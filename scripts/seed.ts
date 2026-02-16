import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { UserService } from '../src/user/services/user.service';
import { PasswordService } from '../src/auth/services/password.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/user/user.entity';
import { Repository } from 'typeorm';

/**
 * Seed script to populate database with test data
 * Run with: npm run seed
 */
async function bootstrap() {
  console.log('🌱 Starting database seeding...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const userService = app.get(UserService);
  const passwordService = app.get(PasswordService);
  const userRepo = app.get<Repository<User>>(getRepositoryToken(User));

  try {
    // Test users data
    const testUsers = [
      {
        email: 'admin@habitflow.com',
        password: 'Admin123!@#',
        emailVerified: true,
      },
      {
        email: 'user@habitflow.com',
        password: 'User123!@#',
        emailVerified: true,
      },
      {
        email: 'test@habitflow.com',
        password: 'Test123!@#',
        emailVerified: false,
      },
    ];

    // Create users
    for (const userData of testUsers) {
      try {
        const existingUser = await userService.findByEmail(userData.email);
        if (existingUser) {
          console.log(`⏭️  User ${userData.email} already exists, skipping...`);
          continue;
        }

        const hashedPassword = await passwordService.hashPassword(userData.password);
        const user = await userService.create(
          userData.email,
          hashedPassword,
        );

        // Update email verification status if needed
        if (userData.emailVerified) {
          user.emailVerified = true;
          user.acceptedTermsAt = new Date();
          await userRepo.save(user);
        }

        console.log(`✅ Created user: ${user.email} (verified: ${userData.emailVerified})`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Failed to create user ${userData.email}:`, errorMessage);
      }
    }

    console.log('\n🎉 Database seeding completed!\n');
    console.log('Test credentials:');
    console.log('  Admin: admin@habitflow.com / Admin123!@#');
    console.log('  User:  user@habitflow.com / User123!@#');
    console.log('  Test:  test@habitflow.com / Test123!@# (unverified)\n');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
