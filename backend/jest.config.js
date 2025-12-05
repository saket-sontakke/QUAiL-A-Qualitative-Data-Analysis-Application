export default {
  testEnvironment: 'node',
  verbose: true,
  testPathIgnorePatterns: [
    '/node_modules/',
    'db.setup.js', // Exclude the setup utility itself from being run as a test
  ],
  // This line tells Jest to run your setup file before the tests
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // This can help with some common Mongoose/Jest timeout issues
  testTimeout: 10000,
  // Transform configuration for ES modules
  transform: {}
};