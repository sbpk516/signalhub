import { 
  fetchResults, 
  fetchResultDetail, 
  searchResults,
  fetchStatusUpdates 
} from './results'

/**
 * Test Results API Integration
 * Run this to verify the results API is working correctly
 */

export const testResultsAPI = async () => {
  console.log('🧪 Testing Results API Integration...')
  
  try {
    // Test 1: Fetch all results
    console.log('\n📋 Test 1: Fetching all results...')
    const results = await fetchResults()
    console.log('✅ Results fetched successfully:', {
      count: results.data.results.length,
      total: results.data.total,
      page: results.data.page
    })
    
    // Test 2: Search results
    console.log('\n🔍 Test 2: Searching results...')
    const searchResults = await searchResults('test')
    console.log('✅ Search completed successfully:', {
      count: searchResults.data.results.length,
      total: searchResults.data.total
    })
    
    // Test 3: Fetch status updates (if we have any results)
    if (results.data.results.length > 0) {
      console.log('\n🔄 Test 3: Fetching status updates...')
      const callIds = results.data.results.slice(0, 3).map(r => r.call_id)
      const statusUpdates = await fetchStatusUpdates(callIds)
      console.log('✅ Status updates fetched successfully:', {
        updatesCount: statusUpdates.length
      })
      
      // Test 4: Fetch result detail (if we have any results)
      console.log('\n📄 Test 4: Fetching result detail...')
      const firstResult = results.data.results[0]
      const detail = await fetchResultDetail(firstResult.call_id)
      console.log('✅ Result detail fetched successfully:', {
        callId: detail.data.call_id,
        hasTranscription: !!detail.data.transcription,
        hasAnalysis: !!detail.data.nlp_analysis
      })
    } else {
      console.log('\n⚠️  No results found - skipping detail tests')
    }
    
    console.log('\n🎉 All Results API tests completed successfully!')
    
  } catch (error) {
    console.error('❌ Results API test failed:', error)
    throw error
  }
}

// Auto-run test if this file is imported
if (typeof window !== 'undefined') {
  // Only run in browser environment
  window.testResultsAPI = testResultsAPI
  console.log('🧪 Results API test function available at window.testResultsAPI()')
}
