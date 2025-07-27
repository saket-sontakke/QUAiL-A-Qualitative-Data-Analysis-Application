// jest.config.js
export default {
  testEnvironment: 'node',
  verbose: true,
  testPathIgnorePatterns: [
    '/node_modules/', 
    'db.setup.js',
],
};
