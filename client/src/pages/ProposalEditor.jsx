import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';

// Components
import Header from '../components/Layout/Header';
import Navigation from '../components/Layout/Navigation';
import FileUpload from '../components/Upload/FileUpload';
import MeasurementsPanel from '../components/Measurements/MeasurementsPanel';
import MaterialsList from '../components/Materials/MaterialsList';
import ClientInfo from '../components/ProjectDetails/ClientInfo';
import CompanySettings from '../components/Branding/CompanySettings';
import AIAssistant from '../components/AI/AIAssistant';
import PricingManager from '../components/Pricing/PricingManager';
import ProposalPreview from '../components/Preview/ProposalPreview';

// Services
import api from '../services/api';

// Styles
import './ProposalEditor.css';

const ProposalEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNewProposal = !id;
  
  const [activeTab, setActiveTab] = useState('upload');
  const [proposalData, setProposalData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    propertyAddress: '',
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
    timeline: '2-3 days, weather permitting',
    warranty: '50-Year Manufacturer Warranty, 10-Year Workmanship',
    notes: '',
    uploadedFiles: []
  });

  // Company settings state
  const [companyData, setCompanyData] = useState({
    name: 'Your Company Name',
    address: 'Company Address',
    phone: 'Company Phone',
    email: 'Company Email',
    website: 'Company Website',
    license: 'License Number',
    insurance: 'Insurance Policy',
    logo: null,
    primaryColor: '#2563eb',
    secondaryColor: '#1e40af',
    termsConditions: {
      paymentTerms: [
        '50% deposit required to begin work',
        'Remaining balance due upon completion',
        'Payment accepted via check, cash, or credit card'
      ],
      workGuarantee: [
        'All work guaranteed against defects in workmanship',
        'Materials covered by manufacturer warranty',
        'Free repairs for workmanship issues within warranty period'
      ],
      weatherPolicy: [
        'Work may be delayed due to inclement weather',
        'Safety is our top priority',
        'Client will be notified of any delays'
      ]
    }
  });

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
    try {
      await saveMutation.mutateAsync(proposalData);
      if (!isAutoSave) {
        toast.success('Proposal saved!');
      }
    } catch (error) {
      if (!isAutoSave) {
        toast.error('Failed to save proposal');
      }
    }
  }, [saveMutation, proposalData]);

  // Auto-save draft
  useEffect(() => {
    const autoSaveTimer = setTimeout(() => {
      if (proposalData.clientName) {
        handleSave(true);
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearTimeout(autoSaveTimer);
  }, [proposalData, handleSave]);

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
        {/* AI Chat Sidebar */}
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
            {activeTab === 'upload' && (
              <FileUpload 
                files={proposalData.uploadedFiles}
                onFilesChange={(files) => updateField('uploadedFiles', files)}
                onProcessComplete={(data) => {
                  if (data.measurements) {
                    updateProposalData('measurements', data.measurements);
                  }
                  if (data.damageAreas) {
                    updateField('damageAreas', data.damageAreas);
                  }
                  setActiveTab('measurements');
                }}
              />
            )}
            
            {activeTab === 'measurements' && (
              <MeasurementsPanel
                measurements={proposalData.measurements}
                damageAreas={proposalData.damageAreas}
                onMeasurementsChange={(measurements) => updateProposalData('measurements', measurements)}
                onDamageAreasChange={(areas) => updateField('damageAreas', areas)}
              />
            )}
            
            {activeTab === 'materials' && (
              <MaterialsList
                materials={proposalData.materials}
                laborHours={proposalData.laborHours}
                laborRate={proposalData.laborRate}
                addOns={proposalData.addOns}
                onMaterialsChange={(materials) => updateField('materials', materials)}
                onLaborChange={(labor) => {
                  updateField('laborHours', labor.hours);
                  updateField('laborRate', labor.rate);
                }}
                onAddOnsChange={(addOns) => updateField('addOns', addOns)}
              />
            )}
            
            {activeTab === 'details' && (
              <ClientInfo
                clientData={{
                  clientName: proposalData.clientName,
                  clientEmail: proposalData.clientEmail,
                  clientPhone: proposalData.clientPhone,
                  clientAddress: proposalData.clientAddress,
                  propertyAddress: proposalData.propertyAddress,
                  timeline: proposalData.timeline,
                  warranty: proposalData.warranty,
                  notes: proposalData.notes
                }}
                onClientDataChange={(updatedData) => {
                  setProposalData(prev => ({
                    ...prev,
                    ...updatedData
                  }));
                }}
              />
            )}
            
            {activeTab === 'branding' && (
              <CompanySettings 
                companyData={companyData}
                onCompanyDataChange={setCompanyData}
              />
            )}
            
            {activeTab === 'pricing' && (
              <PricingManager />
            )}
            
            {activeTab === 'preview' && (
              <ProposalPreview 
                proposalData={proposalData} 
                companyData={companyData}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProposalEditor;
