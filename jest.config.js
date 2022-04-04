module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
};

process.env = {
  BUCKET_NAME: 'serverless-chat-app-02b32fe43ab4'
}