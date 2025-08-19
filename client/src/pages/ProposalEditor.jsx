import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

// Components
import Header from '../components/Layout/Header';
import Navigation from '../components/Layout/Navigation';

import AIAssistant from '../components/AI/AIAssistant';
// PricingManager moved to Dashboard
import ProposalPreview from '../components/Preview/ProposalPreview';
import ClientInfoTab from '../components/ProjectDetails/ClientInfoTab';

// Services
import api from '../services/api';

// Styles
import './ProposalEditor.css';

const ProposalEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNewProposal = !id;
  
  const [activeTab, setActiveTab] = useState('client');
  const [isDetailedMode, setIsDetailedMode] = useState(true);
  const [proposalData, setProposalData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    propertyAddress: '',
    propertyCity: '',
    propertyState: '',
    propertyZip: '',
    projectType: '',
    materialType: '',
    roofSize: '',
    specialRequirements: '',
    urgency: 'standard',
    measurements: {
      totalSquares: 0,
      ridgeLength: 0,
      valleyLength: 0,
      edgeLength: 0,
      pitch: '',
      layers: 1,
      penetrations: 0,
      skylights: 0
    },
    materials: [],
    laborHours: 0,
    laborRate: 75,
    addOns: [],
    damageAreas: [],
    timeline: '',
    warranty: '',
    notes: '',
    uploadedFiles: []
  });

  // Load company data from localStorage
  const getCompanyData = () => {
    const saved = localStorage.getItem('companyData');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      name: 'Your Company Name',
      address: 'Company Address',
      phone: 'Company Phone',
      email: 'Company Email',
      website: 'Company Website',
      license: 'License Number',
      insurance: 'Insurance Policy',
      logo: null,
      primaryColor: '#2563eb',
      termsConditionsUrl: '',
      privacyPolicyUrl: ''
    };
  };

  const [companyData, setCompanyData] = useState(getCompanyData);

  // Fetch existing proposal if editing
  const { data: proposalFromApi, isLoading, error, isError } = useQuery({
    queryKey: ['proposal', id],
    queryFn: async () => {
      console.log('=== REACT QUERY EXECUTING ===');
      console.log('Calling api.getProposal with id:', id);
      try {
        const result = await api.getProposal(id);
        console.log('✅ API call successful, result:', result);
        return result;
      } catch (error) {
        console.error('❌ API call failed:', error);
        throw error;
      }
    },
    enabled: !isNewProposal,
    retry: 1
  });

  console.log('=== REACT QUERY STATE ===');
  console.log('isLoading:', isLoading);
  console.log('isError:', isError);
  console.log('error:', error);
  console.log('proposalFromApi:', proposalFromApi);

  // Update proposal data when API data is loaded
  useEffect(() => {
    console.log('=== FRONTEND useEffect TRIGGERED ===');
    console.log('proposalFromApi:', proposalFromApi);
    console.log('isNewProposal:', isNewProposal);
    console.log('proposalFromApi type:', typeof proposalFromApi);
    console.log('proposalFromApi keys:', proposalFromApi ? Object.keys(proposalFromApi) : 'null');
    
    if (proposalFromApi && !isNewProposal) {
      console.log('✅ Setting proposal data from API');
      console.log('API data clientName:', proposalFromApi.clientName);
      console.log('Full API data:', JSON.stringify(proposalFromApi, null, 2));
      setProposalData(proposalFromApi);
      console.log('✅ setProposalData called');
    } else {
      console.log('❌ NOT setting proposal data');
      console.log('Reason: proposalFromApi exists?', !!proposalFromApi);
      console.log('Reason: is NOT new proposal?', !isNewProposal);
    }
  }, [proposalFromApi, isNewProposal]);

  // Save proposal mutation
  const saveMutation = useMutation({
    mutationFn: (data) => {
      return isNewProposal 
        ? api.createProposal(data)
        : api.updateProposal(id, data);
    },
    onSuccess: (response) => {
      toast.success('Proposal saved successfully!');
      // Invalidate and refetch proposals list for dashboard
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      if (isNewProposal) {
        navigate(`/proposal/${response.id}`);
      }
    },
    onError: (error) => {
      toast.error('Failed to save proposal');
      console.error(error);
    }
  });

  // Generate PDF mutation
  const generatePdfMutation = useMutation({
    mutationFn: () => {
      return api.generatePdf(id, { isDetailed: isDetailedMode });
    },
    onSuccess: (pdfBlob) => {
      if (!pdfBlob) {
        toast.error('No PDF data received');
        return;
      }
      
      toast.success('PDF generated and downloaded!');
      
      // Create blob URL and trigger download
      const blob = new Blob([pdfBlob], { type: 'application/pdf' });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `proposal-${proposalData.clientName || 'client'}-${Date.now()}.pdf`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    },
    onError: (error) => {
      toast.error('Failed to generate PDF');
      console.error('PDF generation error:', error.message);
    }
  });

  const handleSave = useCallback(async (isAutoSave = false) => {
    console.log('handleSave called with proposalData:', proposalData);
    console.log('isNewProposal:', isNewProposal);
    console.log('proposalId:', id);
    
    try {
      const result = await saveMutation.mutateAsync(proposalData);
      console.log('Save successful, result:', result);
      if (!isAutoSave) {
        toast.success('Proposal saved!');
      }
    } catch (error) {
      console.error('Save failed with error:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      if (!isAutoSave) {
        toast.error(`Failed to save proposal: ${error.response?.data?.error || error.message || 'Unknown error'}`);
      }
    }
  }, [saveMutation, proposalData, isNewProposal, id]);

  // Auto-save disabled per user request

  const handleGeneratePdf = async () => {
    if (!proposalData.clientName) {
      toast.error('Please add client information first');
      return;
    }
    
    // If it's a new proposal, save it first
    if (isNewProposal) {
      try {
        const savedProposal = await saveMutation.mutateAsync(proposalData);
        // Use the saved proposal ID for PDF generation
        api.generatePdf(savedProposal.id, { isDetailed: isDetailedMode }).then(pdfBlob => {
          toast.success('PDF generated and downloaded!');
          
          const blob = new Blob([pdfBlob], { type: 'application/pdf' });
          
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `proposal-${proposalData.clientName || 'client'}-${Date.now()}.pdf`;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          
          // Cleanup
          setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          }, 100);
        }).catch(error => {
          toast.error('Failed to generate PDF');
          console.error('PDF generation error:', error.message);
        });
      } catch (error) {
        toast.error('Please save the proposal first');
        return;
      }
    } else {
      generatePdfMutation.mutate();
    }
  };

  const updateProposalData = (section, data) => {
    setProposalData(prev => ({
      ...prev,
      [section]: { ...prev[section], ...data }
    }));
  };

  const updateField = (field, value) => {
    setProposalData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isNewProposal && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading proposal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="proposal-workspace">
      <div className="workspace-content">
        {/* AI Chat Sidebar - Always Visible */}
        <div className="ai-sidebar">
          <AIAssistant 
            proposalData={proposalData}
            onUpdateProposal={setProposalData}
            onTabChange={setActiveTab}
          />
        </div>
        
        {/* Main Content Area */}
        <div className="main-content">
          <div className="content-header">
            <Header 
              onSave={handleSave}
              onGeneratePdf={handleGeneratePdf}
              isSaving={saveMutation.isLoading}
              isGeneratingPdf={generatePdfMutation.isLoading}
            />
            <Navigation 
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              proposalData={proposalData}
            />
          </div>
          
          <div className="content-body">
            {activeTab === 'preview' && (
              <ProposalPreview
                proposalData={proposalData}
                companyData={companyData}
                isDetailedMode={isDetailedMode}
                onDetailedModeChange={setIsDetailedMode}
              />
            )}
            
            {activeTab === 'client' && (
              <ClientInfoTab
                proposalData={proposalData}
                onUpdateProposal={setProposalData}
                onSave={handleSave}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProposalEditor;
