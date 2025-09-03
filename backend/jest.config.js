/**
 * @file jest.config.js
 * @description Configuration file for the Jest testing framework.
 * This setup specifies a Node.js environment for running backend tests,
 * enables verbose output for detailed test results, and excludes certain
 * paths, such as the `node_modules` directory and database setup files,
 * from test runs.
 */
export default {
  testEnvironment: 'node',
  verbose: true,
  testPathIgnorePatterns: [
    '/node_modules/',
    'db.setup.js',
  ],
};