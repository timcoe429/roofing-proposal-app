import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, ChevronDown, Zap, Upload, Calculator, DollarSign, MapPin, Shield, Plus, Package } from 'lucide-react';
import api from '../../services/api';
import { getLocationContext, getQuickActionsForLocation } from '../../services/locationService';
import './AIAssistant.css';

const BASE_QUICK_ACTIONS = [
  {
    id: 'add_item',
    icon: Plus,
    title: 'Add Item',
    description: 'Add materials, labor, or costs',
    prompt: 'Add a new item to this proposal.'
  },
  {
    id: 'adjust_margins',
    icon: DollarSign,
    title: 'Adjust Margins',
    description: 'Change overhead/profit percentages',
    prompt: 'Adjust the overhead and profit margins for this proposal.'
  },
  {
    id: 'apply_discount',
    icon: Calculator,
    title: 'Apply Discount',
    description: 'Add discount or price adjustment',
    prompt: 'Apply a discount to this proposal.'
  },
  {
    id: 'duplicate_item',
    icon: Package,
    title: 'Duplicate Item',
    description: 'Copy existing item with changes',
    prompt: 'Duplicate an existing item in this proposal with modifications.'
  },
  {
    id: 'bulk_adjust',
    icon: Zap,
    title: 'Bulk Adjust',
    description: 'Adjust multiple items at once',
    prompt: 'Make bulk adjustments to multiple items in this proposal.'
  },
  {
    id: 'compare_options',
    icon: Shield,
    title: 'Compare Options',
    description: 'Show different material/pricing options',
    prompt: 'Show me different material or pricing options for this project.'
  },
  {
    id: 'timeline_costs',
    icon: MapPin,
    title: 'Timeline & Costs',
    description: 'Adjust timeline and labor costs',
    prompt: 'Help me adjust the project timeline and associated labor costs.'
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

  // Get quick actions (no more location-specific nonsense)
  const getQuickActions = () => {
    return BASE_QUICK_ACTIONS;
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

    // Check if project details are complete
    const isProjectComplete = proposalData.clientName && 
                             proposalData.propertyAddress && 
                             proposalData.projectType && 
                             proposalData.materialType;

    if (!isProjectComplete) {
      const incompleteMessage = {
        id: Date.now(),
        type: 'assistant',
        content: "👋 Hi! I'd love to help, but I need some basic project information first.\n\nPlease complete the **Project Details** tab (it should show a red indicator) with:\n• Client name and property address\n• Project type (replacement, repair, etc.)\n• Material type preference\n\nOnce that's filled out, I'll have all the context I need to provide accurate estimates and recommendations! 🎯",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, {
        id: Date.now() - 1,
        type: 'user',
        content: message,
        timestamp: new Date()
      }, incompleteMessage]);
      
      setInputValue('');
      setPastedImages([]);
      return;
    }

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

    // Extract data from user message too
    const userDataUpdates = extractProposalData(message);
    if (Object.keys(userDataUpdates).length > 0) {
      console.log('Extracting data from user message:', userDataUpdates);
      onUpdateProposal(prev => ({
        ...prev,
        ...userDataUpdates
      }));
    }

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
${JSON.stringify(proposalData, null, 2)}

=== CURRENT PRICING SETTINGS ===
Overhead Percentage: ${proposalData.overheadPercent || 15}%
Profit Percentage: ${proposalData.profitPercent || 20}%
Discount Amount: $${proposalData.discountAmount || 0}`;

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

IMPORTANT: 
- Extract and populate proposal data automatically from conversations
- PRESERVE existing proposal data - only ADD or MODIFY what's requested
- When adding items (like crew housing), ADD them to existing materials/labor
- When modifying items, UPDATE the specific item mentioned
- Be concise and direct - avoid asking too many questions
- When you have enough info, provide estimates immediately
- Format estimates clearly with line items and totals
- Include labor breakdown and material specifications
- Always show the COMPLETE updated proposal after making changes`;

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

      // Parse detailed data with AI (asynchronous enhancement)
      console.log('🚀 Starting intelligent AI parsing...');
      try {
        const detailedData = await parseAIResponseWithAI(response.response);
        if (Object.keys(detailedData).length > 0) {
          console.log('✅ Applying detailed AI parsing results:', detailedData);
          onUpdateProposal(prev => ({
            ...prev,
            ...detailedData
          }));
        }
      } catch (error) {
        console.error('❌ Detailed AI parsing failed:', error);
        // No problem - basic extraction already worked
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

  // Parse AI response with AI for detailed extraction
  const parseAIResponseWithAI = async (response) => {
    try {
      const parsingPrompt = `You are helping update a roofing proposal. Extract ONLY the NEW or MODIFIED items mentioned in this response.

CURRENT PROPOSAL DATA:
${JSON.stringify(proposalData, null, 2)}

AI RESPONSE TO PARSE:
${response}

Extract ONLY new/modified items and return a JSON object with this structure:

{
  "materials": [
    {"name": "Material Name", "quantity": 30, "unit": "squares", "unitPrice": 450, "total": 13500}
  ],
  "labor": [
    {"name": "Labor Description", "quantity": 30, "unit": "squares", "unitPrice": 150, "total": 4500}
  ],
  "additionalCosts": [
    {"name": "Cost Name", "cost": 1000}
  ],
  "overheadPercent": 15,
  "profitPercent": 20,
  "discountAmount": 0,
  "timeline": "5-7 working days"
}

IMPORTANT: 
- Only include items that are NEW or being MODIFIED
- Do not include existing items unless they're being changed
- If adding to existing materials, only return the new items
- If modifying quantities/prices, return the modified item

Return ONLY the JSON object, no other text.`;

      console.log('🤖 Sending AI response for intelligent parsing...');
      const parseResponse = await api.chatWithAI(parsingPrompt);
      
      try {
        // Try to extract JSON from the response
        let jsonText = parseResponse.response;
        
        // Clean up the response - sometimes AI adds extra text
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonText = jsonMatch[0];
        }
        
        const parsedData = JSON.parse(jsonText);
        
        // Add IDs to items for React keys
        if (parsedData.materials) {
          parsedData.materials = parsedData.materials.map(item => ({
            ...item,
            id: Date.now() + Math.random(),
            category: 'material'
          }));
        }
        
        if (parsedData.labor) {
          parsedData.labor = parsedData.labor.map(item => ({
            ...item,
            id: Date.now() + Math.random(),
            category: 'labor'
          }));
        }
        
        if (parsedData.additionalCosts) {
          parsedData.additionalCosts = parsedData.additionalCosts.map(item => ({
            ...item,
            id: Date.now() + Math.random(),
            category: 'additional'
          }));
        }
        
        const updates = {};
        
        // Combine materials and labor for backward compatibility
        const allItems = [...(parsedData.materials || []), ...(parsedData.labor || [])];
        if (allItems.length > 0) {
          // PRESERVE existing materials - only add new ones
          const existingMaterials = proposalData.materials || [];
          updates.materials = [...existingMaterials, ...allItems];
        }
        
        // Store structured data - PRESERVE existing structured data
        if (parsedData.materials || parsedData.labor || parsedData.additionalCosts) {
          const existingStructured = proposalData.structuredPricing || { materials: [], labor: [], additionalCosts: [] };
          updates.structuredPricing = {
            materials: [...(existingStructured.materials || []), ...(parsedData.materials || [])],
            labor: [...(existingStructured.labor || []), ...(parsedData.labor || [])],
            additionalCosts: [...(existingStructured.additionalCosts || []), ...(parsedData.additionalCosts || [])]
          };
        }
        
        // Set total amount from AI - this is the authoritative total
        if (parsedData.totalAmount) {
          updates.totalAmount = parsedData.totalAmount;
        }
        
        // Set timeline
        if (parsedData.timeline) {
          updates.timeline = parsedData.timeline;
        }
        
        // Set overhead/profit percentages if specified
        if (parsedData.overheadPercent !== undefined) {
          updates.overheadPercent = parsedData.overheadPercent;
        }
        
        if (parsedData.profitPercent !== undefined) {
          updates.profitPercent = parsedData.profitPercent;
        }
        
        if (parsedData.discountAmount !== undefined) {
          updates.discountAmount = parsedData.discountAmount;
        }
        
        console.log('✅ AI successfully parsed estimate data:', parsedData);
        return updates;
        
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', parseError);
        console.log('AI parsing response was:', parseResponse.response);
        return {};
      }
      
    } catch (aiError) {
      console.error('AI parsing request failed:', aiError);
      return {};
    }
  };

  // Extract proposal data from AI response (synchronous basic extraction)
  const extractProposalData = (response) => {
    const updates = {};
    
    // Extract client information
    const addressMatch = response.match(/(?:Address|Property Address|Located at|Location).*?(\d+[^,\n]+(?:,\s*[^,\n]+)*)/i);
    if (addressMatch) {
      updates.propertyAddress = addressMatch[1].trim();
    }
    
    // Extract client name - more flexible patterns
    const nameMatch = response.match(/(?:Client|Customer|Name):\s*([A-Za-z\s]+)|Client:\s*([A-Za-z\s]+)|Customer:\s*([A-Za-z\s]+)/i);
    if (nameMatch) {
      updates.clientName = (nameMatch[1] || nameMatch[2] || nameMatch[3]).trim();
    }
    
    // Extract phone number - more flexible patterns
    const phoneMatch = response.match(/(?:Phone|Tel|Call).*?(\(\d{3}\)\s*\d{3}-\d{4}|\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/i);
    if (phoneMatch) {
      updates.clientPhone = phoneMatch[1].trim();
    }
    
    // Extract email - more flexible patterns
    const emailMatch = response.match(/(?:Email|E-mail).*?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (emailMatch) {
      updates.clientEmail = emailMatch[1].trim();
    }
    
    // Extract measurements - ENHANCED VERSION
    const measurements = { ...proposalData.measurements };
    
    // Extract roof area (can be in sq. ft. or squares)
    const roofAreaMatch = response.match(/(?:Total\s+)?(?:roof\s+)?area[:\s]+([0-9,]+(?:\.\d+)?)\s*(?:sq\.?\s*ft\.?|square\s*feet)/i);
    if (roofAreaMatch) {
      const sqFt = parseFloat(roofAreaMatch[1].replace(/,/g, ''));
      measurements.roofArea = sqFt;
      measurements.totalSquares = sqFt / 100; // Convert to roofing squares
    } else {
      const squaresMatch = response.match(/(\d+(?:\.\d+)?)\s*squares?/i);
      if (squaresMatch) {
        measurements.totalSquares = parseFloat(squaresMatch[1]);
        measurements.roofArea = measurements.totalSquares * 100;
      }
    }
    
    // Extract pitch (6/12, 8:12, etc.)
    const pitchMatch = response.match(/(?:roof\s+)?pitch[:\s]+(\d+[/:]\d+)/i) || 
                       response.match(/(\d+[/:]\d+)\s*pitch/i);
    if (pitchMatch) {
      measurements.pitch = pitchMatch[1].replace(':', '/');
    }
    
    // Extract number of facets/slopes
    const facetsMatch = response.match(/(?:facets?|slopes?)[:\s]+(\d+)/i) ||
                       response.match(/(\d+)\s+(?:facets?|slopes?)/i);
    if (facetsMatch) {
      measurements.facets = parseInt(facetsMatch[1]);
    }
    
    // Extract ridge line
    const ridgeMatch = response.match(/(?:ridge\s*(?:line)?|longest\s+ridge)[:\s]+([0-9,]+(?:\.\d+)?)\s*(?:ft\.?|feet)/i);
    if (ridgeMatch) {
      measurements.ridgeLength = parseFloat(ridgeMatch[1].replace(/,/g, ''));
    }
    
    // Extract valleys
    const valleyCountMatch = response.match(/(?:number\s+of\s+)?valleys?[:\s]+(\d+)/i) ||
                            response.match(/(\d+)\s+valleys?/i);
    if (valleyCountMatch) {
      measurements.valleys = parseInt(valleyCountMatch[1]);
    }
    
    const valleyLengthMatch = response.match(/valley.*?(?:total\s+)?length[:\s]+([0-9,]+(?:\.\d+)?)\s*(?:ft\.?|feet)/i);
    if (valleyLengthMatch) {
      measurements.valleyLength = parseFloat(valleyLengthMatch[1].replace(/,/g, ''));
    }
    
    // Extract hips
    const hipsMatch = response.match(/(?:number\s+of\s+)?hips?[:\s]+(\d+)/i) ||
                     response.match(/(\d+)\s+hips?/i);
    if (hipsMatch) {
      measurements.hips = parseInt(hipsMatch[1]);
    }
    
    // Extract eave length
    const eaveMatch = response.match(/eave\s*(?:length)?[:\s]+([0-9,]+(?:\.\d+)?)\s*(?:ft\.?|feet)/i);
    if (eaveMatch) {
      measurements.eaveLength = parseFloat(eaveMatch[1].replace(/,/g, ''));
    }
    
    // Extract rake/gable edges
    const rakeMatch = response.match(/(?:rake|gable)\s*(?:edges?)?[:\s]+([0-9,]+(?:\.\d+)?)\s*(?:ft\.?|feet)/i);
    if (rakeMatch) {
      measurements.rakeLength = parseFloat(rakeMatch[1].replace(/,/g, ''));
    }
    
    // Extract materials
    const currentMaterialMatch = response.match(/current\s+(?:material|roofing)[:\s]+([^\n,]+)/i);
    if (currentMaterialMatch) {
      measurements.currentMaterial = currentMaterialMatch[1].trim();
    }
    
    const desiredMaterialMatch = response.match(/(?:desired|replacement|new)\s+(?:material|roofing)[:\s]+([^\n,]+)/i);
    if (desiredMaterialMatch) {
      measurements.desiredMaterial = desiredMaterialMatch[1].trim();
    }
    
    // Extract waste factor
    const wasteMatch = response.match(/waste\s*(?:factor|percentage)?[:\s]+(\d+(?:\.\d+)?)\s*%?/i);
    if (wasteMatch) {
      measurements.wasteFactor = parseFloat(wasteMatch[1]);
    }
    
    // Extract tear-off info
    const tearOffMatch = response.match(/tear[\s-]?off\s*(?:required)?[:\s]+(yes|no|true|false)/i);
    if (tearOffMatch) {
      measurements.tearOffRequired = tearOffMatch[1].toLowerCase() === 'yes' || tearOffMatch[1].toLowerCase() === 'true';
    }
    
    const layersMatch = response.match(/(?:existing\s+)?layers?[:\s]+(\d+)/i);
    if (layersMatch) {
      measurements.existingLayers = parseInt(layersMatch[1]);
    }
    
    // Only update measurements if we found any new data
    if (Object.keys(measurements).length > Object.keys(proposalData.measurements || {}).length) {
      updates.measurements = measurements;
    }
    
    // Basic extraction - extract total amount with simple pattern
    const totalMatch = response.match(/(?:Total|Subtotal|TOTAL).*?\$([0-9,]+(?:\.[0-9]{2})?)/i);
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
      const totalSquares = data.measurements?.totalSquares || (data.measurements?.roofArea ? data.measurements.roofArea / 100 : 0);
      const pitch = data.measurements?.pitch || 'Not specified';
      const currentMaterial = data.measurements?.currentMaterial || 'Not specified';
      const desiredMaterial = data.measurements?.desiredMaterial || 'Architectural asphalt shingles';
      const wasteFactor = (data.measurements?.wasteFactor || 10) / 100;
      
      // Calculate materials with waste factor
      const shinglesNeeded = Math.ceil(totalSquares * (1 + wasteFactor));
      const underlaymentNeeded = Math.ceil(totalSquares * (1 + wasteFactor * 0.5)); // Less waste for underlayment
      const ridgeCapNeeded = data.measurements?.ridgeLength || Math.ceil(totalSquares * 3);
      const valleyMaterial = data.measurements?.valleyLength || 0;
      const eaveProtection = data.measurements?.eaveLength || 0;
      
      let materialsContent = `I'll calculate the materials for your project!\n\n**Current Project:**\n`;
      materialsContent += `- Roof Area: ${totalSquares.toFixed(1)} squares (${(totalSquares * 100).toFixed(0)} sq. ft.)\n`;
      materialsContent += `- Pitch: ${pitch}\n`;
      materialsContent += `- Current Material: ${currentMaterial}\n`;
      materialsContent += `- Desired Material: ${desiredMaterial}\n`;
      
      if (data.measurements?.tearOffRequired) {
        materialsContent += `- Tear-off Required: Yes (${data.measurements?.existingLayers || 1} layer${(data.measurements?.existingLayers || 1) > 1 ? 's' : ''})\n`;
      }
      
      materialsContent += `\n**Calculated Materials (with ${(wasteFactor * 100).toFixed(0)}% waste factor):**\n`;
      materialsContent += `- ${desiredMaterial}: ${shinglesNeeded} squares\n`;
      materialsContent += `- Synthetic Underlayment: ${underlaymentNeeded} squares\n`;
      materialsContent += `- Ridge Cap Shingles: ${ridgeCapNeeded} linear feet\n`;
      
      if (valleyMaterial > 0) {
        materialsContent += `- Valley Material (Ice & Water Shield): ${valleyMaterial} linear feet\n`;
      }
      if (eaveProtection > 0) {
        materialsContent += `- Eave Ice & Water Shield: ${eaveProtection} linear feet\n`;
      }
      if (data.measurements?.valleys > 0) {
        materialsContent += `- Valley Flashing: ${data.measurements.valleys} valleys\n`;
      }
      if (data.measurements?.hips > 0) {
        materialsContent += `- Hip Starter Shingles: ${data.measurements.hips} hips\n`;
      }
      
      materialsContent += `\n**Additional Materials:**\n`;
      materialsContent += `- Drip Edge: ${(data.measurements?.eaveLength || 0) + (data.measurements?.rakeLength || 0)} linear feet\n`;
      materialsContent += `- Roofing Nails: ~${Math.ceil(shinglesNeeded * 2.5)} lbs\n`;
      materialsContent += `- Pipe Boot Flashings: ${data.measurements?.plumbingStacks || 3} units\n`;
      
      if (data.measurements?.tearOffRequired) {
        const dumpsterSize = totalSquares < 20 ? '10-yard' : totalSquares < 35 ? '20-yard' : '30-yard';
        materialsContent += `\n**Disposal:**\n`;
        materialsContent += `- Dumpster: 1x ${dumpsterSize}\n`;
      }
      
      materialsContent += `\nWould you like me to:\n1. Apply your pricing sheet?\n2. Add these to the materials list?\n3. Calculate labor costs?`;
      
      return {
        content: materialsContent,
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
          materials: [...(prev.materials || []), ...action.materials]
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
