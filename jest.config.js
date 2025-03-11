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
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+.tsx?$': ['ts-jest', {
      tsconfig: "tsconfig.test.json",
      useESM: true,
      babelConfig: {
        plugins: [
          ["@babel/plugin-proposal-decorators", { version: "2023-11" }],
        ],
      },
    }],
  },
  moduleNameMapper: {
    '(.+)\\.js': '$1'
  },
  verbose: true,
}
