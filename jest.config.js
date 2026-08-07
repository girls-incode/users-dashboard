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
  testMatch: ['**/+(*.)+(spec).+(ts)']
};
