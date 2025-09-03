import axios from 'axios';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
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
  (error) => {
    console.error('API Error:', error.config?.method?.toUpperCase(), error.config?.url, error.response?.status, error.response?.data);
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
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
  updateProfile: (data) => apiClient.put('/auth/profile', data),
  changePassword: (data) => apiClient.put('/auth/change-password', data),

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
  chatWithAI: (message, conversationHistory = []) => 
    apiClient.post('/ai/chat', { message, conversationHistory }),
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
};

export default api;
