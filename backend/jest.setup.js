import { connect, closeDatabase, clearDatabase } from './__tests__/db.setup.js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.test
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

// Runs once before all test suites
beforeAll(async () => {
  await connect();
});

// Runs once after all test suites
afterAll(async () => {
  await closeDatabase();
});

// Runs after each test
afterEach(async () => {
  await clearDatabase();
});