/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  collectCoverage: true,
  coverageDirectory: './coverage/',
  moduleDirectories: [
    'node_modules',
    'src'
  ],
  setupFilesAfterEnv: ['./jest.setup.ts'],
  testMatch: [
    '<rootDir>/src/**/__tests__/*.test.ts',
    '<rootDir>/example/**/*.test.ts'
  ],
  testEnvironment: 'node',
  transform: {
    "^.+.tsx?$": ["ts-jest", {
      tsconfig: "tsconfig.test.json"
    }],
  },
  verbose: true,
}
