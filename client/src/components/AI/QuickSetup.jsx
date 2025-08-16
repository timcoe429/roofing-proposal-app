import React, { useState } from 'react';
import { ChevronRight, Upload, Zap, CheckCircle } from 'lucide-react';
import './QuickSetup.css';

const QuickSetup = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [setupData, setSetupData] = useState({
    hasImages: false,
    materialType: '',
    projectType: '',
    urgency: '',
    specialRequirements: []
  });

  const steps = [
    {
      id: 1,
      title: "Do you have photos or measurements?",
      type: "choice",
      options: [
        { value: "photos", label: "📸 I have photos to upload", icon: Upload },
        { value: "measurements", label: "📐 I have measurements", icon: Zap },
        { value: "neither", label: "❌ Neither - help me get started", icon: CheckCircle }
      ]
    },
    {
      id: 2,
      title: "What type of roofing material?",
      type: "choice",
      options: [
        { value: "shingles", label: "🏠 Asphalt Shingles" },
        { value: "metal", label: "🔧 Metal Roofing" },
        { value: "tile", label: "🧱 Tile Roofing" },
        { value: "other", label: "❓ Other/Not Sure" }
      ]
    },
    {
      id: 3,
      title: "What's the project scope?",
      type: "choice",
      options: [
        { value: "replacement", label: "🔄 Full Roof Replacement" },
        { value: "repair", label: "🔨 Repair Work" },
        { value: "inspection", label: "🔍 Inspection/Assessment" },
        { value: "maintenance", label: "🧹 Maintenance" }
      ]
    }
  ];

  const handleChoice = (value) => {
    const currentStepData = steps[currentStep - 1];
    
    setSetupData(prev => ({
      ...prev,
      [currentStepData.id === 1 ? 'hasImages' : 
       currentStepData.id === 2 ? 'materialType' : 'projectType']: value
    }));

    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete setup
      const finalData = {
        ...setupData,
        [currentStepData.id === 1 ? 'hasImages' : 
         currentStepData.id === 2 ? 'materialType' : 'projectType']: value
      };
      
      onComplete(finalData);
    }
  };

  const currentStepData = steps[currentStep - 1];

  return (
    <div className="quick-setup-overlay">
      <div className="quick-setup-modal">
        <div className="setup-header">
          <h2>🚀 Quick Project Setup</h2>
          <p>Let's gather some basic info to get you started faster</p>
          
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>
          
          <div className="step-indicator">
            Step {currentStep} of {steps.length}
          </div>
        </div>

        <div className="setup-content">
          <h3>{currentStepData.title}</h3>
          
          <div className="setup-options">
            {currentStepData.options.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => handleChoice(option.value)}
                  className="setup-option"
                >
                  {Icon && <Icon size={20} />}
                  <span>{option.label}</span>
                  <ChevronRight size={16} className="option-arrow" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="setup-footer">
          <button onClick={onSkip} className="skip-btn">
            Skip Setup - Start Chatting
          </button>
          
          {currentStep > 1 && (
            <button 
              onClick={() => setCurrentStep(currentStep - 1)}
              className="back-btn"
            >
              ← Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickSetup;
