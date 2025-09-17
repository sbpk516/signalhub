/**
 * Simple test script for API client
 * Run this to test the HTTP client configuration
 */

// Import the test functions
import('./src/services/api/test-client.js')
  .then(({ runAllTests }) => {
    console.log('🧪 Running API client tests...');
    return runAllTests();
  })
  .then(() => {
    console.log('✅ All tests completed successfully!');
  })
  .catch((error) => {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  });
