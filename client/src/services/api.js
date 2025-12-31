import axios from 'axios';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper function to check if token is expired or expiring soon
const isTokenExpiringSoon = (token) => {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expirationTime = payload.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const timeUntilExpiry = expirationTime - currentTime;
    
    // Refresh if expired or expires within 1 day (24 hours)
    return timeUntilExpiry < 24 * 60 * 60 * 1000;
  } catch (error) {
    console.error('Error parsing token:', error);
    return true; // If we can't parse it, consider it expired
  }
};

// Helper function to refresh token
const refreshToken = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token to refresh');
    }

    const response = await axios.post(
      `${process.env.REACT_APP_API_URL || '/api'}/auth/refresh`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      return response.data.token;
    }
    
    throw new Error('No token in refresh response');
  } catch (error) {
    console.error('Token refresh failed:', error);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    throw error;
  }
};

// Request interceptor to add auth token and refresh if needed
apiClient.interceptors.request.use(
  async (config) => {
    let token = localStorage.getItem('token');
    
    // Check if token is expiring soon and refresh it
    if (token && isTokenExpiringSoon(token)) {
      try {
        console.log('Token expiring soon, refreshing...');
        token = await refreshToken();
      } catch (error) {
        // If refresh fails, redirect to login
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.config.method.toUpperCase(), response.config.url, response.data);
    
    // For blob responses, return the full response so we can access headers, status, etc.
    if (response.config.responseType === 'blob') {
      return response;
    }
    
    // For other responses, return just the data as before
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle blob error responses - they might be JSON errors
    if (error.config?.responseType === 'blob' && error.response?.data) {
      try {
        // Try to parse the blob as JSON (it might be an error message)
        const text = await error.response.data.text();
        const jsonError = JSON.parse(text);
        console.error('API Error (blob):', error.config?.method?.toUpperCase(), error.config?.url, error.response?.status, jsonError);
        
        // If it's a 403 (expired token), try to refresh
        if (error.response?.status === 403 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const newToken = await refreshToken();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return apiClient(originalRequest);
          } catch (refreshError) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
            return Promise.reject(refreshError);
          }
        }
        
        // If it's a 401, redirect to login
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
        
        return Promise.reject({
          ...error,
          response: {
            ...error.response,
            data: jsonError
          }
        });
      } catch (parseError) {
        // If parsing fails, it's actually a blob error
        console.error('API Error (blob parse failed):', error.config?.method?.toUpperCase(), error.config?.url, error.response?.status);
      }
    }
    
    console.error('API Error:', error.config?.method?.toUpperCase(), error.config?.url, error.response?.status, error.response?.data);
    
    // Handle 403 (expired token) - try to refresh
    if (error.response?.status === 403 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const newToken = await refreshToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    
    // Handle 401 (unauthorized)
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// API methods
const api = {
  // Auth
  login: (credentials) => apiClient.post('/auth/login', credentials),
  register: (userData) => apiClient.post('/auth/register', userData),
  getCurrentUser: () => apiClient.get('/auth/me'),
  
  // Admin endpoints
  getAllUsers: () => apiClient.get('/admin/users'),
  createUser: (userData) => apiClient.post('/admin/users', userData),
  updateUser: (id, userData) => apiClient.put(`/admin/users/${id}`, userData),
  deactivateUser: (id) => apiClient.delete(`/admin/users/${id}`),
  resetUserPassword: (id, password) => apiClient.post(`/admin/users/${id}/reset-password`, { password }),
  updateProfile: (data) => apiClient.put('/auth/profile', data),
  changePassword: (data) => apiClient.put('/auth/change-password', data),
  refreshToken: () => apiClient.post('/auth/refresh'),

  // Proposals
  getProposals: () => apiClient.get('/proposals'),
  getProposal: (id) => apiClient.get(`/proposals/${id}`),
  createProposal: (data) => apiClient.post('/proposals', data),
  updateProposal: (id, data) => apiClient.put(`/proposals/${id}`, data),
  deleteProposal: (id) => apiClient.delete(`/proposals/${id}`),
  acceptProposal: (id, acceptanceData) => apiClient.post(`/proposals/${id}/accept`, acceptanceData),

  // Vision AI (GPT-4 Vision)
  processImages: (images, documentType) => 
    apiClient.post('/vision/analyze', { images, documentType }),
  extractMeasurements: (pdfBase64) => 
    apiClient.post('/vision/extract-measurements', { pdfBase64 }),
  identifyMaterials: (images) => 
    apiClient.post('/vision/identify-materials', { images }),

  // Claude AI Services
  chatWithAI: (message, conversationHistory = [], proposalContext = null) => 
    apiClient.post('/ai/chat', { message, conversationHistory, proposalContext }),
  analyzePricingDocument: (data) => 
    apiClient.post('/ai/analyze-pricing', data),
  getAIRecommendations: (projectData) => 
    apiClient.post('/ai/recommendations', { projectData }),
  processDocumentWithAI: (documentText, documentType, extractionType) => 
    apiClient.post('/ai/process-document', { documentText, documentType, extractionType }),
  checkAIServices: () => apiClient.get('/ai/status'),

  // PDF Generation
  generatePdf: async (proposalId, options = {}) => {
    try {
      // Get company data from localStorage
      const companyData = (() => {
        try {
          const saved = localStorage.getItem('companyData');
          return saved ? JSON.parse(saved) : null;
        } catch (e) {
          return null;
        }
      })();
      
      const response = await apiClient.post(`/pdf/generate/${proposalId}`, {
        companyData,
        pdfOptions: options
      }, {
        responseType: 'blob'
      });
      
      // The response.data should be the blob directly
      if (!response.data || response.data.size === 0) {
        throw new Error('No PDF data received from server');
      }
      
      return response.data;
    } catch (error) {
      console.error('PDF generation failed:', error.message);
      throw error;
    }
  },

  // Company
  getCompanySettings: () => apiClient.get('/company/settings'),
  updateCompanySettings: (data) => apiClient.put('/company/settings', data),
  uploadLogo: (formData) => 
    apiClient.post('/company/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  // Materials
  getMaterials: () => apiClient.get('/materials'),
  createMaterial: (data) => apiClient.post('/materials', data),
  updateMaterial: (id, data) => apiClient.put(`/materials/${id}`, data),
  deleteMaterial: (id) => apiClient.delete(`/materials/${id}`),
  getActivePricingForAI: () => apiClient.get('/materials/ai-pricing'),
  resyncPricingSheet: (id) => apiClient.post(`/materials/${id}/resync`),
  calculateMaterials: (materialNames, projectVariables, options) => 
    apiClient.post('/materials/calculate', { materialNames, projectVariables, options }),
  addCustomItem: (itemData) => apiClient.post('/materials/custom', itemData),
};

export default api;
