module.exports = {
  testEnvironment: 'node',
  verbose: true,
  roots: ['<rootDir>/backend'],
  testMatch: ['**/__tests__/**/*.test.js'],
  clearMocks: true,
  setupFilesAfterEnv: ['./jest.setup.js'], // Add this line
};
