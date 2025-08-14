import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, ChevronDown, Zap, Upload, Calculator, DollarSign, MapPin, Shield } from 'lucide-react';
import api from '../../services/api';
import { getLocationContext, getQuickActionsForLocation } from '../../services/locationService';
import './AIAssistant.css';

const BASE_QUICK_ACTIONS = [
  {
    id: 'analyze_satellite',
    icon: Zap,
    title: 'Satellite Analysis',
    description: 'Analyze roof from satellite/aerial images',
    prompt: 'Help me analyze this roof using satellite or aerial imagery to estimate size and complexity.'
  },
  {
    id: 'analyze_photos',
    icon: Upload,
    title: 'Analyze Photos',
    description: 'Upload roof photos for AI analysis',
    prompt: 'Help me analyze roof photos to extract measurements and identify damage areas.'
  },
  {
    id: 'calculate_materials',
    icon: Calculator,
    title: 'Calculate Materials',
    description: 'Get material estimates based on measurements',
    prompt: 'Calculate the materials needed for this roof replacement project.'
  },
  {
    id: 'price_lookup',
    icon: DollarSign,
    title: 'Price Lookup',
    description: 'Find current material prices',
    prompt: 'Look up current pricing for roofing materials in my area.'
  },
  {
    id: 'location_requirements',
    icon: MapPin,
    title: 'Local Requirements',
    description: 'Check building codes and permits',
    prompt: 'What are the local building codes and permit requirements for this roofing project?'
  },
  {
    id: 'compliance_check',
    icon: Shield,
    title: 'Compliance Check',
    description: 'Verify code compliance',
    prompt: 'Help me ensure this proposal meets all local building codes and requirements.'
  }
];

export default function AIAssistant({ proposalData, onUpdateProposal, onTabChange }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      content: "👋 Hi! I'm your AI roofing assistant. How can I help with your project?",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Generate dynamic quick actions based on location
  const getQuickActions = () => {
    let actions = [...BASE_QUICK_ACTIONS];
    
    // Add location-specific actions if we have location data
    if (proposalData.propertyState) {
      const locationActions = getQuickActionsForLocation(proposalData.propertyState);
      actions = [...actions, ...locationActions.map(action => ({
        ...action,
        icon: MapPin,
        description: `Location-specific for ${proposalData.propertyState}`
      }))];
    }
    
    return actions;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [inputValue]);



  const handleSendMessage = async (message = inputValue) => {
    if (!message.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      // Get conversation history for context
      const conversationHistory = messages
        .filter(msg => msg.type === 'user')
        .map(msg => ({ role: 'user', content: msg.content }))
        .slice(-5); // Last 5 user messages for context

      // Send to Claude AI
      const response = await api.chatWithAI(message, conversationHistory);
      
      const assistantMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: response.response,
        timestamp: new Date(),
        actions: extractActions(response.response, proposalData)
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Execute any actions
      if (assistantMessage.actions) {
        assistantMessage.actions.forEach(action => executeAction(action));
      }

    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Fallback to intelligent response
      const fallbackResponse = generateFallbackResponse(message, proposalData);
      const assistantMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: fallbackResponse.content,
        timestamp: new Date(),
        actions: fallbackResponse.actions
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (fallbackResponse.actions) {
        fallbackResponse.actions.forEach(action => executeAction(action));
      }
    } finally {
      setIsTyping(false);
    }
  };

  const extractActions = (response, data) => {
    const actions = [];
    
    // Check for navigation requests
    if (response.toLowerCase().includes('measurements') || response.toLowerCase().includes('measure')) {
      actions.push({ type: 'navigate', tab: 'measurements' });
    }
    
    if (response.toLowerCase().includes('materials') || response.toLowerCase().includes('calculate')) {
      actions.push({ type: 'navigate', tab: 'materials' });
    }
    
    if (response.toLowerCase().includes('client') || response.toLowerCase().includes('details')) {
      actions.push({ type: 'navigate', tab: 'details' });
    }
    
    if (response.toLowerCase().includes('pricing') || response.toLowerCase().includes('price')) {
      actions.push({ type: 'navigate', tab: 'pricing' });
    }
    
    if (response.toLowerCase().includes('preview') || response.toLowerCase().includes('proposal')) {
      actions.push({ type: 'navigate', tab: 'preview' });
    }

    return actions;
  };

  const generateFallbackResponse = (userMessage, data) => {
    const message = userMessage.toLowerCase();
    
    if (message.includes('satellite') || message.includes('aerial') || message.includes('imagery') || message.includes('measure')) {
      return {
        content: `I can help with roof measurements using multiple methods!\n\n**📐 Measurement Options:**\n\n**1. 🛰️ Satellite Analysis**\n- Good for: Permits, planning, complexity assessment\n- Upload aerial image + house dimensions\n- ~80% accuracy for initial estimates\n\n**2. 📋 Professional Reports**\n- EagleView, HOVER, Pictometry reports\n- Upload PDF/images for data extraction\n- Contractor-grade accuracy\n\n**3. ✋ Manual Measurement**\n- Traditional tape measure method\n- Ground measurements + pitch calculations\n- Most accurate when done properly\n\n**4. 🏠 House Footprint Method**\n- Use property records for base dimensions\n- Apply pitch multipliers\n- Quick ballpark for simple roofs\n\n**Which method works best for your situation?**\n- Need permit drawings? → Satellite\n- Ordering materials? → Professional report\n- On-site now? → Manual measurement\n- Quick estimate? → House footprint`,
        actions: [
          { type: 'navigate', tab: 'measurements' }
        ]
      };
    }
    
    if (message.includes('material') || message.includes('calculate')) {
      return {
        content: `I'll calculate the materials for your project!\n\n**Current Project:**\n- Roof Area: ${data.measurements?.totalSquares || 0} squares\n- Pitch: ${data.measurements?.pitch || 'Not specified'}\n- Current Material: ${data.measurements?.currentMaterial || 'Not specified'}\n\n**Recommended Materials:**\n- Asphalt Shingles: ${Math.ceil((data.measurements?.totalSquares || 0) * 1.1)} squares\n- Underlayment: ${data.measurements?.totalSquares || 0} squares\n- Ridge Cap: ~${Math.ceil((data.measurements?.totalSquares || 0) * 3)} linear feet\n\nWould you like me to:\n1. Apply your pricing sheet?\n2. Add these to the materials list?\n3. Calculate labor costs?`,
        actions: [
          { type: 'navigate', tab: 'materials' },
          { type: 'update_materials', materials: generateMaterialsList(data) }
        ]
      };
    }

    if (message.includes('proposal') || message.includes('generate')) {
      return {
        content: `I'll generate a professional proposal for you!\n\n**Project Summary:**\n- Client: ${data.clientName || 'Not specified'}\n- Property: ${data.propertyAddress || 'Not specified'}\n- Scope: Roof replacement (${data.measurements?.totalSquares || 0} squares)\n\n**Next Steps:**\n1. Complete client information\n2. Finalize material selections\n3. Review pricing and margins\n4. Generate PDF proposal\n\nShall I guide you through each step?`,
        actions: [
          { type: 'navigate', tab: 'details' }
        ]
      };
    }

    if (message.includes('price') || message.includes('cost')) {
      return {
        content: `I can help you with pricing! Here are your options:\n\n**Pricing Sources:**\n1. **Your Pricing Sheets** - Upload custom supplier pricing\n2. **Market Lookup** - I'll find current market prices\n3. **Historical Data** - Based on recent projects\n\n**Current Market Prices (estimated):**\n- Asphalt Shingles: $120-180/square\n- Underlayment: $25-35/square\n- Labor: $75-125/hour\n\nWould you like me to:\n- Set up a pricing sheet?\n- Look up specific material prices?\n- Calculate project totals?`,
        actions: [
          { type: 'navigate', tab: 'pricing' }
        ]
      };
    }

    // Default response
    return {
      content: `I understand you're asking about "${userMessage}". Here's how I can help:\n\n**I can assist with:**\n• Photo analysis and measurements\n• Material calculations and pricing\n• Proposal generation and formatting\n• Client information management\n• Custom pricing sheet setup\n\n**Current Project Status:**\n- Measurements: ${data.measurements?.totalSquares ? 'Complete' : 'Incomplete'}\n- Materials: ${data.materials?.length || 0} items selected\n- Client Info: ${data.clientName ? 'Complete' : 'Incomplete'}\n\nWhat specific task would you like help with?`
    };
  };

  const generateMaterialsList = (data) => {
    const squares = data.measurements?.totalSquares || 0;
    return [
      {
        id: Date.now(),
        name: 'Asphalt Shingles',
        quantity: Math.ceil(squares * 1.1),
        unit: 'square',
        unitPrice: 150,
        total: Math.ceil(squares * 1.1) * 150
      },
      {
        id: Date.now() + 1,
        name: 'Underlayment',
        quantity: squares,
        unit: 'square',
        unitPrice: 30,
        total: squares * 30
      }
    ];
  };

  const executeAction = (action) => {
    switch (action.type) {
      case 'navigate':
        onTabChange(action.tab);
        break;
      case 'update_materials':
        onUpdateProposal(prev => ({
          ...prev,
          materials: action.materials
        }));
        break;
      default:
        break;
    }
  };

  const handleQuickAction = (action) => {
    setInputValue(action.prompt);
    setShowQuickActions(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="ai-assistant">
      <div className="chat-container">
        <div className="messages">
          {messages.map(message => (
            <div key={message.id} className={`message ${message.type}`}>
              <div className="message-avatar">
                {message.type === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className="message-content">
                <div className="message-text">
                  {message.content.split('\n').map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="message assistant">
              <div className="message-avatar">
                <Bot size={16} />
              </div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-container">
          <div className="textarea-wrapper">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about your roofing project..."
              disabled={isTyping}
              rows={1}
              className="chat-textarea"
            />
          </div>
          
          <div className="input-controls">
            <div className="quick-actions-dropdown">
              <button 
                className="quick-actions-trigger"
                onClick={() => setShowQuickActions(!showQuickActions)}
              >
                <span>Quick Actions</span>
                <ChevronDown size={16} className={showQuickActions ? 'rotated' : ''} />
              </button>
              
              {showQuickActions && (
                <div className="quick-actions-menu">
                  {QUICK_ACTIONS.map(action => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.id}
                        onClick={() => handleQuickAction(action)}
                        className="quick-action-item"
                      >
                        <Icon size={16} />
                        <div className="action-content">
                          <span className="action-title">{action.title}</span>
                          <span className="action-description">{action.description}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            
            <button 
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isTyping}
              className="send-btn"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
