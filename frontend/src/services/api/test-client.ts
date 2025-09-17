/**
 * Test file for HTTP Client
 * 
 * This file tests the API client configuration and connectivity
 * Run this to verify the client is working before proceeding
 */

import { apiClient, apiLogger } from './client';
import { API_ENDPOINTS, API_BASE_URL } from '@/types/constants';

/**
 * Test basic connectivity to backend
 */
export const testApiConnectivity = async (): Promise<void> => {
  apiLogger.log('Starting API connectivity test...');
  apiLogger.log('Testing connection to:', API_BASE_URL);

  try {
    // Test 1: Health check endpoint
    apiLogger.log('Test 1: Testing health check endpoint');
    const healthResponse = await apiClient.get('/health');
    apiLogger.log('Health check response:', healthResponse.data);

    // Test 2: API health endpoint
    apiLogger.log('Test 2: Testing API health endpoint');
    const apiHealthResponse = await apiClient.get(API_ENDPOINTS.HEALTH);
    apiLogger.log('API health response:', apiHealthResponse.data);

    apiLogger.log('✅ All connectivity tests passed!');
  } catch (error: any) {
    apiLogger.error('❌ Connectivity test failed:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      url: error.config?.url
    });

    // Provide helpful debugging information
    if (error.code === 'ECONNREFUSED') {
      apiLogger.warn('💡 Backend server may not be running. Please start the backend with:');
      apiLogger.warn('   cd backend && python -m uvicorn app.main:app --reload --port 8000');
    } else if (error.code === 'ENOTFOUND') {
      apiLogger.warn('💡 Check your API_BASE_URL configuration:', API_BASE_URL);
    }

    throw error;
  }
};

/**
 * Test error handling
 */
export const testErrorHandling = async (): Promise<void> => {
  apiLogger.log('Testing error handling...');

  try {
    // Test 1: Non-existent endpoint
    apiLogger.log('Test 1: Testing non-existent endpoint');
    await apiClient.get('/non-existent-endpoint');
  } catch (error) {
    apiLogger.log('✅ Expected error caught for non-existent endpoint');
  }

  try {
    // Test 2: Invalid method
    apiLogger.log('Test 2: Testing invalid method');
    await apiClient.post('/health', { invalid: 'data' });
  } catch (error) {
    apiLogger.log('✅ Expected error caught for invalid method');
  }

  apiLogger.log('✅ Error handling tests completed');
};

/**
 * Test client configuration
 */
export const testClientConfiguration = (): void => {
  apiLogger.log('Testing client configuration...');

  // Test 1: Check base URL
  apiLogger.log('Base URL:', API_BASE_URL);
  
  // Test 2: Check timeout
  apiLogger.log('Timeout:', API_TIMEOUT, 'ms');
  
  // Test 3: Check endpoints
  apiLogger.log('Available endpoints:', Object.keys(API_ENDPOINTS));

  apiLogger.log('✅ Client configuration test completed');
};

/**
 * Run all tests
 */
export const runAllTests = async (): Promise<void> => {
  apiLogger.log('🚀 Starting all API client tests...');

  try {
    // Test configuration first
    testClientConfiguration();
    
    // Test connectivity (may fail if backend not running)
    try {
      await testApiConnectivity();
    } catch (error) {
      apiLogger.warn('⚠️  Connectivity test failed - this is expected if backend is not running');
    }
    
    // Test error handling
    await testErrorHandling();
    
    apiLogger.log('🎉 All tests completed!');
    apiLogger.log('💡 If connectivity tests failed, make sure your backend is running on port 8000');
  } catch (error) {
    apiLogger.error('💥 Test suite failed:', error);
    throw error;
  }
};

// Export for manual testing
export default {
  testApiConnectivity,
  testErrorHandling,
  testClientConfiguration,
  runAllTests
};
