import React, { useReducer, useEffect, useCallback } from 'react';
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

// Initial state for new proposals
const getInitialProposalData = () => ({
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
  labor: [],
  addOns: [],
  damageAreas: [],
  timeline: '',
  warranty: '',
  notes: '',
  uploadedFiles: [],
  aiChatHistory: []
});

const getInitialProjectVariables = () => ({
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

// Reducer for all proposal state - single source of truth
const proposalReducer = (state, action) => {
  switch (action.type) {
    case 'LOAD_PROPOSAL':
      // Loading from API - this is the saved baseline
      return {
        ...state,
        proposalData: action.payload.proposalData,
        projectVariables: action.payload.projectVariables || state.projectVariables,
        lastSavedData: JSON.stringify(action.payload.proposalData),
        hasUnsavedChanges: false,
        isInitialized: true
      };
    
    case 'INIT_NEW_PROPOSAL':
      // New proposal - mark as initialized with current state as baseline
      return {
        ...state,
        lastSavedData: JSON.stringify(state.proposalData),
        hasUnsavedChanges: false,
        isInitialized: true
      };
    
    case 'UPDATE_PROPOSAL':
      // Update proposal data and mark as changed
      const newProposalData = typeof action.payload === 'function' 
        ? action.payload(state.proposalData)
        : { ...state.proposalData, ...action.payload };
      
      const newDataStr = JSON.stringify(newProposalData);
      const hasChanges = state.isInitialized && newDataStr !== state.lastSavedData;
      
      return {
        ...state,
        proposalData: newProposalData,
        hasUnsavedChanges: hasChanges
      };
    
    case 'UPDATE_PROJECT_VARIABLES':
      return {
        ...state,
        projectVariables: typeof action.payload === 'function'
          ? action.payload(state.projectVariables)
          : action.payload,
        hasUnsavedChanges: true
      };
    
    case 'SAVE_SUCCESS':
      // After successful save, update baseline
      return {
        ...state,
        lastSavedData: JSON.stringify(state.proposalData),
        hasUnsavedChanges: false
      };
    
    case 'SAVE_FAILED':
      // Keep hasUnsavedChanges true so we retry
      return state;
    
    default:
      return state;
  }
};

const ProposalEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNewProposal = !id;
  
  // Single reducer for all state
  const [state, dispatch] = useReducer(proposalReducer, {
    proposalData: getInitialProposalData(),
    projectVariables: getInitialProjectVariables(),
    lastSavedData: null,
    hasUnsavedChanges: false,
    isInitialized: false
  });
  
  const { proposalData, projectVariables, hasUnsavedChanges, isInitialized } = state;

  // Fetch existing proposal if editing
  const { data: proposalFromApi, isLoading } = useQuery({
    queryKey: ['proposal', id],
    queryFn: () => api.getProposal(id),
    enabled: !isNewProposal,
    retry: 1
  });

  // Load proposal data when API returns
  useEffect(() => {
    if (proposalFromApi && !isNewProposal && !isInitialized) {
      dispatch({
        type: 'LOAD_PROPOSAL',
        payload: {
          proposalData: proposalFromApi,
          projectVariables: proposalFromApi.projectVariables
        }
      });
    }
  }, [proposalFromApi, isNewProposal, isInitialized]);

  // Initialize new proposal
  useEffect(() => {
    if (isNewProposal && !isInitialized) {
      dispatch({ type: 'INIT_NEW_PROPOSAL' });
    }
  }, [isNewProposal, isInitialized]);

  // Save proposal mutation
  const saveMutation = useMutation({
    mutationFn: (data) => {
      return isNewProposal 
        ? api.createProposal(data)
        : api.updateProposal(id, data);
    },
    onSuccess: (response) => {
      dispatch({ type: 'SAVE_SUCCESS' });
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      if (isNewProposal) {
        navigate(`/proposal/${response.id}`);
      }
    },
    onError: () => {
      dispatch({ type: 'SAVE_FAILED' });
    }
  });

  const handleSave = useCallback(async (isAutoSave = false) => {
    const dataToSave = {
      ...proposalData,
      projectVariables: projectVariables
    };
    
    try {
      await saveMutation.mutateAsync(dataToSave);
      if (!isAutoSave) {
        toast.success('Proposal saved!');
      }
    } catch (error) {
      if (!isAutoSave) {
        toast.error(`Failed to save proposal: ${error.response?.data?.error || error.message || 'Unknown error'}`);
      }
    }
  }, [saveMutation, proposalData, projectVariables]);

  // Auto-save with debouncing
  useEffect(() => {
    if (!hasUnsavedChanges || !isInitialized) return;
    
    const autoSaveTimer = setTimeout(() => {
      handleSave(true);
    }, 10000);

    return () => clearTimeout(autoSaveTimer);
  }, [hasUnsavedChanges, isInitialized, handleSave]);

  // Warn before leaving page with unsaved changes
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

  // Helper to update proposal - used by child components
  const handleUpdateProposal = useCallback((update) => {
    dispatch({ type: 'UPDATE_PROPOSAL', payload: update });
  }, []);

  // Helper to update project variables
  const handleUpdateProjectVariables = useCallback((update) => {
    dispatch({ type: 'UPDATE_PROJECT_VARIABLES', payload: update });
  }, []);

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
            onUpdateProposal={handleUpdateProposal}
            projectVariables={projectVariables}
            onUpdateProjectVariables={handleUpdateProjectVariables}
          />
        </div>
        
        {/* Preview Panel - 40% */}
        <div className="preview-panel">
          <LivePreviewPanel 
            proposalData={proposalData}
            onExportCSV={handleExportCSV}
            onUpdateProposal={handleUpdateProposal}
          />
        </div>
      </div>
    </div>
  );
};

export default ProposalEditor;
