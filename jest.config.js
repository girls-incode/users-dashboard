module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(ts|mjs|js|html|svg)$': '<rootDir>/jest-preset-angular.transformer.js'
  },
  moduleFileExtensions: ['ts','js','html','json'],
  moduleNameMapper: {
    '\\.(css|scss)$': 'identity-obj-proxy'
  },
  testMatch: ['**/+(*.)+(spec).+(ts)'],
  // e2e/ holds Playwright specs (run via `npm run e2e`, not Jest) — without this, Jest's testMatch
  // glob above also picks them up and fails trying to run @playwright/test inside jsdom.
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/e2e/']
};
