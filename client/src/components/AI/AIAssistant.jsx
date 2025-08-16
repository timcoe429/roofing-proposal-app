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
  },
  {
    id: 'client_info',
    icon: User,
    title: 'Get Client Info',
    description: 'Collect client contact details',
    prompt: 'I need to collect client information for this proposal. Can you help me gather their name, phone, email, and property address?'
  }
];

export default function AIAssistant({ proposalData, onUpdateProposal, onTabChange }) {
  // Format AI responses with proper HTML
  const formatAIResponse = (text) => {
    // Split into paragraphs first
    const paragraphs = text.split('\n\n');
    
    return paragraphs.map(paragraph => {
      const lines = paragraph.split('\n');
      let result = '';
      let inList = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Check if this is a list item
        if (line.match(/^[-•]\s+(.+)$/) || line.match(/^\d+\.\s+(.+)$/)) {
          if (!inList) {
            result += '<ul>';
            inList = true;
          }
          const content = line.replace(/^[-•]\s+/, '').replace(/^\d+\.\s+/, '');
          result += `<li>${content}</li>`;
        } else {
          // Not a list item
          if (inList) {
            result += '</ul>';
            inList = false;
          }
          if (line) {
            result += line + '<br>';
          }
        }
      }
      
      // Close any open list
      if (inList) {
        result += '</ul>';
      }
      
      // Wrap non-list content in paragraphs
      if (result && !result.includes('<ul>')) {
        result = `<p>${result.replace(/<br>$/, '')}</p>`;
      } else if (result.includes('<br>') && result.includes('<ul>')) {
        // Mixed content - wrap text parts in paragraphs
        result = result.replace(/^([^<]+)<br>/gm, '<p>$1</p>');
        result = result.replace(/<\/ul>([^<]+)<br>/gm, '</ul><p>$1</p>');
      }
      
      return result;
    }).join('');
  };

  // Get pricing sheets from localStorage (now with raw CSV data)
  const getPricingSheets = () => {
    const saved = localStorage.getItem('companyPricingSheets');
    if (!saved) return [];
    
    const sheets = JSON.parse(saved);
    return sheets.filter(sheet => sheet.isActive && sheet.extractedData?.csvData);
  };

  // Get full pricing context for AI
  const getPricingContext = () => {
    const sheets = getPricingSheets();
    if (sheets.length === 0) return '';
    
    let context = '\n\n=== AVAILABLE PRICING DATA ===\n';
    sheets.forEach(sheet => {
      context += `\n--- ${sheet.name} (${sheet.itemCount} items) ---\n`;
      context += sheet.extractedData.csvData;
      context += '\n';
    });
    context += '\n=== END PRICING DATA ===\n';
    
    return context;
  };
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
  const [pastedImages, setPastedImages] = useState([]);
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

  // Handle image paste
  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const imageData = {
              id: Date.now(),
              file: file,
              dataUrl: event.target.result,
              name: file.name || `image-${Date.now()}.png`
            };
            setPastedImages(prev => [...prev, imageData]);
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  };

  // Remove pasted image
  const removeImage = (imageId) => {
    setPastedImages(prev => prev.filter(img => img.id !== imageId));
  };



  const handleSendMessage = async (message = inputValue) => {
    if (!message.trim() && pastedImages.length === 0) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message,
      images: pastedImages.length > 0 ? pastedImages : null,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setPastedImages([]);
    setIsTyping(true);

    try {
      // Get conversation history for context
      const conversationHistory = messages
        .filter(msg => msg.type === 'user')
        .map(msg => ({ role: 'user', content: msg.content }))
        .slice(-5); // Last 5 user messages for context

      // Get full location context with building codes
      const fullAddress = `${proposalData.propertyAddress}, ${proposalData.propertyCity}, ${proposalData.propertyState} ${proposalData.propertyZip}`;
      const locationContext = getLocationContext(fullAddress);
      
      // Build comprehensive context for roofing expert AI
      let expertContext = `

=== ROOFING PROJECT CONTEXT ===
Property Address: ${fullAddress}
Client: ${proposalData.clientName}
Project Type: Roof replacement/repair

=== CURRENT PROJECT DATA ===
${JSON.stringify(proposalData, null, 2)}`;

      if (locationContext) {
        expertContext += `

=== LOCATION & BUILDING CODES ===
State: ${locationContext.state}
City: ${locationContext.city || 'Not specified'}
Building Codes: ${locationContext.buildingCodes}
Climate Zone: ${locationContext.climateZone}

Common Requirements:
${locationContext.commonRequirements.map(req => `- ${req}`).join('\n')}`;

        if (locationContext.citySpecific) {
          expertContext += `

City-Specific Requirements:
${locationContext.citySpecific.specialRequirements?.map(req => `- ${req}`).join('\n') || 'None specified'}

Recommended Materials:
${locationContext.citySpecific.recommendedMaterials?.map(mat => `- ${mat}`).join('\n') || 'Standard materials'}`;
        }
      }

      // Add pricing data
      const pricingContext = getPricingContext();
      expertContext += pricingContext;

      expertContext += `

=== YOUR ROLE ===
You are an expert roofing contractor and estimator. Use the pricing data above to:
1. Recommend appropriate materials based on location and codes
2. Calculate quantities and costs accurately
3. Explain building code requirements
4. Provide professional roofing advice
5. Build detailed proposals conversationally

Be conversational, ask clarifying questions, and explain your recommendations.

IMPORTANT: If you provide an estimate or quote, always ask for missing client information:
- Client name
- Client phone number  
- Client email
- Property address (if different from client address)

Format estimates clearly with line items and totals. Include labor breakdown and material specifications.`;

      let response;
      
      // If images are included, use GPT Vision first, then Claude for analysis
      if (pastedImages.length > 0) {
        try {
          // Convert images to base64 for GPT Vision
          const imageBase64Array = pastedImages.map(img => img.dataUrl);
          
          // Use GPT Vision to analyze the images
          const visionResponse = await api.processImages(imageBase64Array, 'roofing_analysis');
          
          // Combine vision analysis with user message and expert context
          const combinedMessage = `${message}

=== IMAGE ANALYSIS FROM GPT VISION ===
${visionResponse.analysis || visionResponse}

${expertContext}`;

          // Send combined analysis to Claude
          response = await api.chatWithAI(combinedMessage, conversationHistory);
        } catch (visionError) {
          console.error('Vision analysis failed:', visionError);
          // Fallback to text-only if vision fails
          response = await api.chatWithAI(message + expertContext + '\n\n(Note: Image analysis failed, proceeding with text only)', conversationHistory);
        }
      } else {
        // Text-only message
        response = await api.chatWithAI(message + expertContext, conversationHistory);
      }
      
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

    // Extract proposal data from AI response
    const proposalUpdates = extractProposalData(response);
    if (Object.keys(proposalUpdates).length > 0) {
      actions.push({ type: 'updateProposal', data: proposalUpdates });
    }

    return actions;
  };

  // Extract proposal data from AI response
  const extractProposalData = (response) => {
    const updates = {};
    
    // Extract client information
    const addressMatch = response.match(/(?:Address|Property Address|Located at|Location).*?(\d+[^,\n]+(?:,\s*[^,\n]+)*)/i);
    if (addressMatch) {
      updates.propertyAddress = addressMatch[1].trim();
    }
    
    // Extract client name
    const nameMatch = response.match(/(?:Client|Customer|Name):\s*([A-Za-z\s]+)/i);
    if (nameMatch) {
      updates.clientName = nameMatch[1].trim();
    }
    
    // Extract phone number
    const phoneMatch = response.match(/(?:Phone|Tel|Call):\s*([\d\-\(\)\s]+)/i);
    if (phoneMatch) {
      updates.clientPhone = phoneMatch[1].trim();
    }
    
    // Extract email
    const emailMatch = response.match(/(?:Email):\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (emailMatch) {
      updates.clientEmail = emailMatch[1].trim();
    }
    
    // Extract measurements
    const squaresMatch = response.match(/(\d+(?:\.\d+)?)\s*squares?/i);
    if (squaresMatch) {
      updates.measurements = {
        ...proposalData.measurements,
        totalSquares: parseFloat(squaresMatch[1])
      };
    }
    
    const pitchMatch = response.match(/(\d+\/\d+)\s*pitch/i);
    if (pitchMatch) {
      updates.measurements = {
        ...updates.measurements || proposalData.measurements,
        pitch: pitchMatch[1]
      };
    }
    
    // Extract materials and costs
    const materials = [];
    
    // Look for standing seam metal specifically
    const standingSeamMatch = response.match(/Standing Seam Metal.*?(\d+(?:\.\d+)?)\s*squares?\s*×?\s*\$?([\d,]+(?:\.\d{2})?)\s*=?\s*\$?([\d,]+(?:\.\d{2})?)/i);
    if (standingSeamMatch) {
      const quantity = parseFloat(standingSeamMatch[1]);
      const unitPrice = parseFloat(standingSeamMatch[2].replace(/,/g, ''));
      const totalPrice = parseFloat(standingSeamMatch[3].replace(/,/g, ''));
      
      materials.push({
        id: Date.now() + Math.random(),
        name: '24 Gauge Steel Standing Seam',
        quantity: quantity,
        unit: 'squares',
        unitPrice: unitPrice,
        totalPrice: totalPrice
      });
    }
    
    // Look for ice & water shield
    const iceWaterMatch = response.match(/Ice & Water Shield.*?(\d+(?:\.\d+)?)\s*(?:rolls?|squares?)?\s*×?\s*\$?([\d,]+(?:\.\d{2})?)\s*=?\s*\$?([\d,]+(?:\.\d{2})?)/i);
    if (iceWaterMatch) {
      const quantity = parseFloat(iceWaterMatch[1]);
      const unitPrice = parseFloat(iceWaterMatch[2].replace(/,/g, ''));
      const totalPrice = parseFloat(iceWaterMatch[3].replace(/,/g, ''));
      
      materials.push({
        id: Date.now() + Math.random() + 1,
        name: 'Ice & Water Shield',
        quantity: quantity,
        unit: 'rolls',
        unitPrice: unitPrice,
        totalPrice: totalPrice
      });
    }
    
    // Look for snow rail system
    const snowRailMatch = response.match(/Snow Rail System.*?(\d+(?:\.\d+)?)\s*(?:LF|linear feet?|feet?)?\s*×?\s*\$?([\d,]+(?:\.\d{2})?)\s*=?\s*\$?([\d,]+(?:\.\d{2})?)/i);
    if (snowRailMatch) {
      const quantity = parseFloat(snowRailMatch[1]);
      const unitPrice = parseFloat(snowRailMatch[2].replace(/,/g, ''));
      const totalPrice = parseFloat(snowRailMatch[3].replace(/,/g, ''));
      
      materials.push({
        id: Date.now() + Math.random() + 2,
        name: 'Snow Rail System',
        quantity: quantity,
        unit: 'LF',
        unitPrice: unitPrice,
        totalPrice: totalPrice
      });
    }
    
    // Look for tear-off costs (labor)
    const tearOffMatch = response.match(/Tear-off.*?(\d+(?:\.\d+)?)\s*squares?\s*×?\s*\$?([\d,]+(?:\.\d{2})?)\s*=?\s*\$?([\d,]+(?:\.\d{2})?)/i);
    if (tearOffMatch) {
      const quantity = parseFloat(tearOffMatch[1]);
      const unitPrice = parseFloat(tearOffMatch[2].replace(/,/g, ''));
      const totalPrice = parseFloat(tearOffMatch[3].replace(/,/g, ''));
      
      materials.push({
        id: Date.now() + Math.random() + 3,
        name: 'Tear-off Existing Roof',
        quantity: quantity,
        unit: 'squares',
        unitPrice: unitPrice,
        totalPrice: totalPrice
      });
    }
    
    if (materials.length > 0) {
      updates.materials = materials;
    }
    
    // Extract total cost
    const totalMatch = response.match(/Total.*?\$?([\d,]+(?:\.\d{2})?)/i);
    if (totalMatch) {
      updates.totalAmount = parseFloat(totalMatch[1].replace(/,/g, ''));
    }
    
    // Extract timeline
    const timelineMatch = response.match(/Timeline:?\s*([^.\n]+)/i);
    if (timelineMatch) {
      updates.timeline = timelineMatch[1].trim();
    }
    
    return updates;
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
      case 'updateProposal':
        if (onUpdateProposal && action.data) {
          console.log('Updating proposal with:', action.data);
          onUpdateProposal(prev => ({
            ...prev,
            ...action.data
          }));
        }
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
                {/* Show images if present */}
                {message.images && (
                  <div className="message-images">
                    {message.images.map(image => (
                      <img 
                        key={image.id} 
                        src={image.dataUrl} 
                        alt={image.name}
                        className="message-image"
                      />
                    ))}
                  </div>
                )}
                
                <div 
                  className="message-text"
                  dangerouslySetInnerHTML={{ 
                    __html: message.type === 'assistant' 
                      ? formatAIResponse(message.content) 
                      : message.content.replace(/\n/g, '<br>')
                  }}
                />
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
          {/* Show pasted images */}
          {pastedImages.length > 0 && (
            <div className="pasted-images">
              {pastedImages.map(image => (
                <div key={image.id} className="pasted-image">
                  <img src={image.dataUrl} alt={image.name} />
                  <button 
                    onClick={() => removeImage(image.id)}
                    className="remove-image-btn"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="textarea-wrapper">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Ask about roofing or paste an image (Ctrl+V)..."
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
                  {getQuickActions().map(action => {
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
