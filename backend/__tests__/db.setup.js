/**
 * @file Test Database Setup Utility
 * @description This module provides utility functions to connect to, close, and clear
 * an in-memory MongoDB database instance using `mongodb-memory-server`. This is
 * designed to be used within a Jest testing environment to ensure that tests
 * run against a clean, isolated database, preventing side effects between tests.
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

/**
 * Connects to a new in-memory MongoDB database.
 * This function should be called once before all tests run (e.g., in `beforeAll`).
 * It starts a new MongoMemoryServer instance and establishes a Mongoose connection to it.
 */
export const connect = async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
};

/**
 * Closes the database connection and stops the in-memory MongoDB instance.
 * This function should be called once after all tests have completed (e.g., in `afterAll`).
 * It ensures a clean shutdown by dropping the database, closing the connection,
 * and stopping the underlying server process.
 */
export const closeDatabase = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
};

/**
 * Clears all data from all collections in the test database.
 * This function is designed to be run between tests (e.g., in `afterEach` or `beforeEach`)
 * to ensure that each test starts with a clean slate and is not affected by data
 * created in previous tests.
 */
export const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany();
  }
};
