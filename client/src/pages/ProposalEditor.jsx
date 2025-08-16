import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
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
  const isNewProposal = !id;
  
  const [activeTab, setActiveTab] = useState('client');
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
  const { isLoading } = useQuery({
    queryKey: ['proposal', id],
    queryFn: () => api.getProposal(id),
    enabled: !isNewProposal,
    onSuccess: (data) => {
      setProposalData(data);
    }
  });

  // Save proposal mutation
  const saveMutation = useMutation({
    mutationFn: (data) => {
      return isNewProposal 
        ? api.createProposal(data)
        : api.updateProposal(id, data);
    },
    onSuccess: (response) => {
      toast.success('Proposal saved successfully!');
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
    mutationFn: () => api.generatePdf(id || proposalData),
    onSuccess: (response) => {
      toast.success('PDF generated successfully!');
      // Open PDF in new tab or trigger download
      window.open(response.pdfUrl, '_blank');
    },
    onError: (error) => {
      toast.error('Failed to generate PDF');
      console.error(error);
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

  // Auto-save draft (disabled for now to prevent errors)
  useEffect(() => {
    const autoSaveTimer = setTimeout(() => {
      // Only auto-save if we have complete client info and it's not a new proposal
      if (proposalData.clientName && proposalData.clientEmail && !isNewProposal) {
        handleSave(true);
      }
    }, 60000); // Auto-save every 60 seconds (reduced frequency)

    return () => clearTimeout(autoSaveTimer);
  }, [proposalData, handleSave, isNewProposal]);

  const handleGeneratePdf = async () => {
    if (!proposalData.clientName) {
      toast.error('Please add client information first');
      return;
    }
    
    generatePdfMutation.mutate();
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
