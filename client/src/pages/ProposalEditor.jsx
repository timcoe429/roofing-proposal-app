import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

// Components
import Header from '../components/Layout/Header';

import AIAssistant from '../components/AI/AIAssistant';
import LivePreviewPanel from '../components/Preview/LivePreviewPanel';
import { exportProposalToCSV } from '../utils/csvExporter';

// Services
import api from '../services/api';

// Styles
import './ProposalEditor.css';

const ProposalEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNewProposal = !id;
  
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
    uploadedFiles: [],
    // Persisted AI chat history for this proposal (text-only, capped in the AI component)
    aiChatHistory: []
  });

  const [lastSavedData, setLastSavedData] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const initializedRef = React.useRef(false); // Prevent re-initialization loops
  
  // Project variables for pricing engine calculations
  const [projectVariables, setProjectVariables] = useState({
    roof_sqft: 0,
    roof_sq: 0,
    roof_system: '',
    eave_If: 0,
    ridge_If: 0,
    hip_lf: 0,
    valley_lf: 0,
    penetrations: 0,
    skylights: 0,
    tear_off: false,
    ice_water: false,
    metal_type: '',
    low_slope_sq: 0,
    boot_type: '',
    snow_zone: false,
    labor_crew: ''
  });

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
      
      // Update project variables from proposal
      if (proposalFromApi.projectVariables) {
        setProjectVariables(prev => ({ ...prev, ...proposalFromApi.projectVariables }));
      }
      
      // Also extract from measurements if projectVariables not set
      if (proposalFromApi.measurements) {
        const measurements = proposalFromApi.measurements;
        setProjectVariables(prev => ({
          ...prev,
          roof_sqft: (measurements.totalSquares || 0) * 100,
          roof_sq: measurements.totalSquares || 0,
          ridge_If: measurements.ridgeLength || 0,
          valley_lf: measurements.valleyLength || 0,
          penetrations: measurements.penetrations || 0,
          skylights: measurements.skylights || 0
        }));
      }
      
      console.log('✅ setProposalData called');
    } else {
      console.log('❌ NOT setting proposal data');
      console.log('Reason: proposalFromApi exists?', !!proposalFromApi);
      console.log('Reason: is NOT new proposal?', !isNewProposal);
    }
  }, [proposalFromApi, isNewProposal]);
  
  // Update project variables when measurements change
  useEffect(() => {
    if (proposalData.measurements) {
      const measurements = proposalData.measurements;
      setProjectVariables(prev => ({
        ...prev,
        roof_sqft: (measurements.totalSquares || 0) * 100,
        roof_sq: measurements.totalSquares || 0,
        ridge_If: measurements.ridgeLength || 0,
        valley_lf: measurements.valleyLength || 0,
        eave_If: measurements.edgeLength || 0,
        penetrations: measurements.penetrations || 0,
        skylights: measurements.skylights || 0
      }));
    }
  }, [proposalData.measurements]);

  // Save proposal mutation
  const saveMutation = useMutation({
    mutationFn: (data) => {
      return isNewProposal 
        ? api.createProposal(data)
        : api.updateProposal(id, data);
    },
    onSuccess: (response) => {
      // Update last saved data to track changes
      setLastSavedData(JSON.stringify(proposalData));
      setHasUnsavedChanges(false);
      
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


  const handleSave = useCallback(async (isAutoSave = false) => {
    console.log('handleSave called with proposalData:', proposalData);
    console.log('isNewProposal:', isNewProposal);
    console.log('proposalId:', id);
    
    // Include project variables in save
    const dataToSave = {
      ...proposalData,
      projectVariables: projectVariables
    };
    
    try {
      const result = await saveMutation.mutateAsync(dataToSave);
      console.log('Save successful, result:', result);
      
      // Only show toast for manual saves, not auto-saves
      if (!isAutoSave) {
        toast.success('Proposal saved!');
      }
    } catch (error) {
      console.error('Save failed with error:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      
      // Show errors for both manual and auto saves (but different messages)
      if (!isAutoSave) {
        toast.error(`Failed to save proposal: ${error.response?.data?.error || error.message || 'Unknown error'}`);
      } else {
        console.warn('Auto-save failed (will retry):', error.message);
      }
    }
  }, [saveMutation, proposalData, projectVariables, isNewProposal, id]);

  // Track changes and trigger auto-save
  useEffect(() => {
    const currentData = JSON.stringify(proposalData);
    
    // Check if data has changed (only after initialization)
    if (lastSavedData && currentData !== lastSavedData) {
      setHasUnsavedChanges(true);
    }
    
    // Initialize lastSavedData ONCE (prevents infinite loops)
    if (!initializedRef.current && !lastSavedData) {
      if (proposalFromApi) {
        // Existing proposal: use API data as baseline
        setLastSavedData(JSON.stringify(proposalFromApi));
        initializedRef.current = true;
      } else if (isNewProposal) {
        // New proposal: use initial state as baseline so changes are detected
        setLastSavedData(currentData);
        initializedRef.current = true;
      }
    }
  }, [proposalData, lastSavedData, proposalFromApi, isNewProposal]);

  // Silent auto-save with debouncing
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    
    const autoSaveTimer = setTimeout(() => {
      console.log('🔄 Auto-saving proposal...');
      handleSave(true); // isAutoSave = true (no popup)
    }, 10000); // 10 seconds after changes

    return () => clearTimeout(autoSaveTimer);
  }, [hasUnsavedChanges, handleSave]);

  // Save before leaving page
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);


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

  const handleExportCSV = () => {
    try {
      exportProposalToCSV(proposalData);
      toast.success('CSV exported successfully!');
    } catch (error) {
      console.error('CSV export error:', error);
      toast.error('Failed to export CSV');
    }
  };

  return (
    <div className="proposal-workspace">
      <div className="workspace-header">
        <Header 
          onSave={() => handleSave(false)}
          isSaving={saveMutation.isLoading}
          hasUnsavedChanges={hasUnsavedChanges}
        />
      </div>
      
      <div className="workspace-content split-pane">
        {/* Chat Panel - 60% */}
        <div className="chat-panel">
          <AIAssistant 
            proposalData={proposalData}
            onUpdateProposal={setProposalData}
            projectVariables={projectVariables}
            onUpdateProjectVariables={setProjectVariables}
          />
        </div>
        
        {/* Preview Panel - 40% */}
        <div className="preview-panel">
          <LivePreviewPanel 
            proposalData={proposalData}
            onExportCSV={handleExportCSV}
            onUpdateProposal={setProposalData}
          />
        </div>
      </div>
    </div>
  );
};

export default ProposalEditor;
