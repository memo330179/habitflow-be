// Global setup for e2e tests
beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = 'test';
});

afterAll(async () => {
  // Allow cleanup
  await new Promise((resolve) => setTimeout(resolve, 500));
});
