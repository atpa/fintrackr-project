module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/backend/**/?(*.)+(spec|test).[jt]s?(x)'],
  collectCoverageFrom: [
    'backend/**/*.js',
    '!backend/data.json',
    '!backend/**/__tests__/**',
  ],
  coverageDirectory: 'coverage',
  clearMocks: true,
};
