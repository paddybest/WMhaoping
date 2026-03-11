// Simple test to verify merchant frontend integration
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

async function testAPI() {
  console.log('Testing API connection...');

  try {
    // Test health check
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✓ Health check passed:', healthResponse.data);

    // Test WeChat login
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/wechat-login`, {
      code: 'test123'
    });
    console.log('✓ WeChat login successful');
    console.log('User:', loginResponse.data.data.user);

    // Test product API with auth
    const token = loginResponse.data.data.token;
    const productsResponse = await axios.get(`${API_BASE_URL}/products`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✓ Products API successful:', productsResponse.data.data.length, 'products');

    console.log('\\n🎉 All tests passed! Merchant frontend integration is working.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testAPI();