/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  verbose: true,
  moduleDirectories: [
    'node_modules',
    'src'
  ],
  testMatch: [
    '<rootDir>/src/**/__tests__/*.test.ts',
    '<rootDir>/example/**/*.test.ts'
  ],
  testEnvironment: 'node',
  transform: {
    '^.+.tsx?$': ['ts-jest', {}],
  },
  collectCoverage: true,
  coverageDirectory: './coverage/'
}
