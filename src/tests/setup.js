// Mock environment variables for tests
process.env.APPLE_WEBHOOK_SECRET = 'test-apple-secret';
process.env.GOOGLE_WEBHOOK_SECRET = 'test-google-secret';
process.env.JWT_SECRET = 'test-jwt-secret';

// Mock the logger to avoid console output during tests
jest.mock('../../src/utils/logger', () => ({
  default: {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  }
}));

// Reset mocks before each test
global.beforeEach = (fn) => {
  fn();
};

// Clear mocks immediately
jest.clearAllMocks();
