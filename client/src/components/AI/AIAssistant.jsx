import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, ChevronDown, Zap, Upload, Calculator, DollarSign, MapPin, Shield, Plus, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { getLocationContext, getQuickActionsForLocation } from '../../services/locationService';
import { calculations } from '../../utils/calculations';
import { getValidationReport, compareAICalculation } from '../../utils/mathValidator';
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

export default function AIAssistant({ proposalData, onUpdateProposal, onTabChange, projectVariables = {}, onUpdateProjectVariables }) {
  const initializedForProposalIdRef = useRef(null);

  const persistChatHistoryToProposal = (nextMessages) => {
    if (!onUpdateProposal) return;

    const sanitized = (nextMessages || [])
      .filter(m => m && (m.type === 'user' || m.type === 'assistant') && typeof m.content === 'string')
      .map(m => ({
        type: m.type,
        content: m.content,
        // Store timestamp as ISO string for DB persistence
        timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : (m.timestamp || new Date().toISOString())
      }))
      .slice(-150);

    onUpdateProposal(prev => ({
      ...prev,
      aiChatHistory: sanitized
    }));
  };

  // Format AI responses with proper HTML
  const formatAIResponse = (text) => {
    // FIRST: Remove JSON code blocks and standalone JSON objects from display
    let cleanedText = text
      // Remove ```json ... ``` blocks
      .replace(/```json\s*[\s\S]*?```/gi, '')
      // Remove ``` ... ``` blocks that contain JSON-like content
      .replace(/```[\s\S]*?```/g, (match) => {
        // If it looks like JSON (has { and } and quotes), remove it
        if (match.includes('{') && match.includes('}') && match.includes('"')) {
          return '';
        }
        return match; // Keep other code blocks
      })
      // Remove standalone JSON objects on their own lines
      .replace(/^\s*\{[\s\S]*?\}\s*$/gm, '')
      // Clean up excessive whitespace from removals
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Split into paragraphs
    const paragraphs = cleanedText.split('\n\n');
    
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

  // Filter pricing options based on question context
  const filterPricingByQuestion = (question, category, pricingCategory) => {
    const sheets = getPricingSheets();
    if (sheets.length === 0) return [];

    const options = [];
    const questionLower = question.toLowerCase();
    
    // Keywords to match for different question types
    const categoryKeywords = {
      roofing_system: ['roofing', 'shingle', 'tile', 'shake', 'metal', 'system'],
      underlayment: ['underlayment', 'felt', 'synthetic', 'psu', 'versashield', 'sharkskin'],
      tear_off: ['tear', 'removal', 'dumpster', 'disposal'],
      metal: ['metal', 'copper', 'aluminum', 'flashing', 'edge'],
      penetrations: ['penetration', 'vent', 'pipe', 'boot', 'jack'],
      ice_water: ['ice', 'water', 'shield', 'eave', 'protection']
    };

    for (const sheet of sheets) {
      const csvData = sheet.extractedData?.csvData || '';
      const lines = csvData.split('\n');
      
      // Skip header row
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Parse CSV line (simple split, handle quoted values)
        const cells = [];
        let currentCell = '';
        let inQuotes = false;
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            cells.push(currentCell.trim());
            currentCell = '';
          } else {
            currentCell += char;
          }
        }
        cells.push(currentCell.trim());
        
        if (cells.length < 2) continue;
        
        // Get item name (usually column 1 or 2)
        const itemName = cells[1] || cells[0];
        if (!itemName) continue;
        
        // Get category (if available)
        const itemCategory = cells[0] || '';
        
        // Filter logic
        let shouldInclude = false;
        
        // If pricingCategory is specified, match by category
        if (pricingCategory && itemCategory.toUpperCase().includes(pricingCategory.toUpperCase())) {
          shouldInclude = true;
        }
        
        // If category keywords exist, match by keywords
        if (!shouldInclude && category && categoryKeywords[category]) {
          const keywords = categoryKeywords[category];
          const itemLower = itemName.toLowerCase();
          if (keywords.some(keyword => itemLower.includes(keyword))) {
            shouldInclude = true;
          }
        }
        
        // Match by question text keywords
        if (!shouldInclude) {
          const itemLower = itemName.toLowerCase();
          // Extract key terms from question
          const questionTerms = questionLower.split(/\s+/).filter(term => term.length > 3);
          if (questionTerms.some(term => itemLower.includes(term))) {
            shouldInclude = true;
          }
        }
        
        if (shouldInclude && !options.includes(itemName)) {
          options.push(itemName);
        }
      }
    }
    
    return options.slice(0, 10); // Limit to 10 options
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

  // Build proposal context for AI - reusable helper function
  const buildProposalContext = () => {
    const fullAddress = `${proposalData.propertyAddress || ''}, ${proposalData.propertyCity || ''}, ${proposalData.propertyState || ''} ${proposalData.propertyZip || ''}`.trim();
    const locationContext = fullAddress ? getLocationContext(fullAddress) : null;
    
    return {
      client: {
        name: proposalData.clientName || null,
        email: proposalData.clientEmail || null,
        phone: proposalData.clientPhone || null,
        address: proposalData.clientAddress || null
      },
      property: {
        address: proposalData.propertyAddress || null,
        city: proposalData.propertyCity || null,
        state: proposalData.propertyState || null,
        zip: proposalData.propertyZip || null,
        fullAddress: fullAddress || null,
        type: proposalData.propertyType || null
      },
      project: {
        type: proposalData.projectType || null,
        materialType: proposalData.materialType || null,
        urgency: proposalData.urgency || null,
        timeline: proposalData.timeline || null,
        warranty: proposalData.warranty || null,
        notes: proposalData.notes || null
      },
      measurements: proposalData.measurements || {},
      materials: proposalData.materials || [],
      addOns: proposalData.addOns || [],
      pricing: {
        overheadPercent: proposalData.overheadPercent || 15,
        profitPercent: proposalData.profitPercent || 20,
        overheadCostPercent: proposalData.overheadCostPercent || 10,
        netMarginTarget: proposalData.netMarginTarget || 20,
        discountAmount: proposalData.discountAmount || 0,
        laborHours: proposalData.laborHours || 0,
        laborRate: proposalData.laborRate || 75
      },
      location: locationContext || null
    };
  };

  // Build conversation history for AI - reusable helper function
  const buildConversationHistory = () => {
    return messages
      .filter(msg => msg.type === 'user' || msg.type === 'assistant')
      .map(msg => ({ 
        role: msg.type === 'user' ? 'user' : 'assistant', 
        content: msg.content 
      }))
      .slice(-10); // Last 10 messages (5 exchanges) for context
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
  const [pendingChanges, setPendingChanges] = useState(null); // { changes: {...}, messageId: number }
  const [currentQuestion, setCurrentQuestion] = useState(null); // { question: string, category: string, pricingRelevant: boolean, pricingCategory: string, messageId: number }
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

  // Load saved chat history for this proposal (text-only). Do NOT persist images in chat.
  useEffect(() => {
    const proposalIdKey = proposalData?.id ?? 'new';
    if (initializedForProposalIdRef.current === proposalIdKey) return;

    const saved = proposalData?.aiChatHistory;
    if (Array.isArray(saved) && saved.length > 0) {
      const restored = saved
        .filter(m => m && (m.type === 'user' || m.type === 'assistant') && typeof m.content === 'string')
        .map((m, idx) => ({
          id: Date.now() + idx,
          type: m.type,
          content: m.content,
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
        }));
      setMessages(restored);
    }

    initializedForProposalIdRef.current = proposalIdKey;
  }, [proposalData?.id, proposalData?.aiChatHistory]);

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

    setMessages(prev => {
      const next = [...prev, userMessage];
      persistChatHistoryToProposal(next);
      return next;
    });
    setInputValue('');
    setPastedImages([]);
    setIsTyping(true);
    // Clear current question when user sends a message (they're answering)
    if (currentQuestion) {
      setCurrentQuestion(null);
    }

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
      // Get conversation history and proposal context
      const conversationHistory = buildConversationHistory();
      const proposalContext = buildProposalContext();

      let response;
      let userMessageText = message;
      
      // If images are included, use GPT Vision first, then Claude for analysis
      if (pastedImages.length > 0) {
        try {
          console.log('📷 Processing images with GPT Vision:', pastedImages.length);
          
          // Convert images to base64 for GPT Vision
          const imageBase64Array = pastedImages.map(img => img.dataUrl);
          
          // Use GPT Vision to analyze the images
          const visionResponse = await api.processImages(imageBase64Array, 'roofing_analysis');
          
          console.log('✅ Vision analysis received:', visionResponse?.analysis ? 'Yes' : 'No');
          
          // Add vision analysis to the message
          userMessageText = `${message}\n\n[Image analysis: ${visionResponse.analysis || visionResponse}]`;

          console.log('📤 Sending to AI API (with images):', {
            message: userMessageText.substring(0, 100) + '...',
            messageLength: userMessageText.length,
            hasProposalContext: !!proposalContext,
            conversationHistoryLength: conversationHistory.length
          });

          // Send to Claude with structured context
          response = await api.chatWithAI(userMessageText, conversationHistory, proposalContext);
          
          console.log('📥 AI API Response received (with images):', {
            hasResponse: !!response,
            responseType: typeof response,
            responseKeys: response ? Object.keys(response) : null
          });
        } catch (visionError) {
          console.error('Vision analysis failed:', visionError);
          // Fallback to text-only if vision fails
          response = await api.chatWithAI(userMessageText + '\n\n(Note: Image analysis failed, proceeding with text only)', conversationHistory, proposalContext);
        }
      } else {
        // Text-only message with structured context
        console.log('📤 Sending to AI API:', {
          message: userMessageText.substring(0, 100) + (userMessageText.length > 100 ? '...' : ''),
          messageLength: userMessageText.length,
          hasProposalContext: !!proposalContext,
          conversationHistoryLength: conversationHistory.length,
          proposalContextKeys: proposalContext ? Object.keys(proposalContext) : null
        });
        
        response = await api.chatWithAI(userMessageText, conversationHistory, proposalContext);
        
        console.log('📥 AI API Response received:', {
          hasResponse: !!response,
          responseType: typeof response,
          responseKeys: response ? Object.keys(response) : null,
          responseText: response?.response ? response.response.substring(0, 100) + '...' : 'No response text',
          fullResponse: response
        });
      }
      
      // Handle response format - API returns { success: true, response: <string>, actions: <object> }
      const aiResponseText = response?.response || (typeof response === 'string' ? response : 'I apologize, but I had trouble processing that. Could you try rephrasing?');
      const structuredActions = response?.actions || null;
      
      console.log('✅ AI Response text extracted:', aiResponseText ? aiResponseText.substring(0, 100) + '...' : 'No text');
      console.log('✅ Structured actions:', structuredActions ? 'Present' : 'Not present');
      
      // Check if AI is asking a question
      let questionData = null;
      if (structuredActions?.actions?.askQuestions && structuredActions.actions.askQuestions.length > 0) {
        const firstQuestion = structuredActions.actions.askQuestions[0];
        // Handle both old format (string) and new format (object)
        if (typeof firstQuestion === 'object' && firstQuestion.question) {
          questionData = {
            question: firstQuestion.question,
            category: firstQuestion.category || null,
            pricingRelevant: firstQuestion.pricingRelevant !== false,
            pricingCategory: firstQuestion.pricingCategory || null,
            messageId: Date.now() + 1
          };
        } else if (typeof firstQuestion === 'string') {
          // Legacy format - just a string question
          questionData = {
            question: firstQuestion,
            category: null,
            pricingRelevant: true,
            pricingCategory: null,
            messageId: Date.now() + 1
          };
        }
      }
      
      const assistantMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: aiResponseText,
        timestamp: new Date(),
        actions: extractActions(aiResponseText, proposalData),
        questionData: questionData
      };
      
      // Set current question if one exists
      if (questionData) {
        setCurrentQuestion(questionData);
      } else {
        // Clear question if AI is not asking one
        setCurrentQuestion(null);
      }

      setMessages(prev => {
        const next = [...prev, assistantMessage];
        persistChatHistoryToProposal(next);
        return next;
      });

      // Execute any actions
      if (assistantMessage.actions) {
        assistantMessage.actions.forEach(action => executeAction(action));
      }

      // Process structured actions from Claude (if available) - SHOW PREVIEW, DON'T AUTO-APPLY
      console.log('🚀 Processing Claude structured actions...');
      try {
        const detailedData = structuredActions ? await processStructuredActions(structuredActions) : await parseAIResponseWithAI(aiResponseText);
        if (Object.keys(detailedData).length > 0) {
          console.log('✅ AI suggests these changes:', detailedData);
          
          // Calculate preview of what will change
          let previewProposal = {
            ...proposalData,
            ...detailedData
          };
          
          // Migrate laborHours/laborRate to labor array if needed
          let labor = previewProposal.labor || [];
          if (!Array.isArray(labor) || labor.length === 0) {
            const laborHours = previewProposal.laborHours || 0;
            const laborRate = previewProposal.laborRate || 75;
            if (laborHours > 0 || laborRate > 0) {
              labor = [{
                id: Date.now(),
                name: 'Roofing Labor',
                hours: laborHours,
                rate: laborRate,
                total: laborHours * laborRate
              }];
            }
          }
          
          // Calculate preview total
          const breakdown = calculations.getCostBreakdown(
            previewProposal.materials || [],
            labor,
            previewProposal.addOns || [],
            previewProposal.overheadPercent || 15,
            previewProposal.profitPercent || 20,
            previewProposal.overheadCostPercent || 10,
            previewProposal.netMarginTarget || 20,
            previewProposal.discountAmount || 0
          );
          
          // Store pending changes for user to review
          setPendingChanges({
            changes: detailedData,
            messageId: assistantMessage.id,
            previewTotal: breakdown.finalTotal,
            previewBreakdown: breakdown
          });
          
          // Update assistant message to show preview
          const previewContent = buildPreviewMessage(detailedData, breakdown);
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessage.id 
              ? { ...msg, content: aiResponseText + '\n\n' + previewContent, hasPendingChanges: true }
              : msg
          ));
        }
      } catch (error) {
        console.error('❌ Detailed AI parsing failed:', error);
        // No problem - basic extraction already worked
      }

    } catch (error) {
      console.error('❌ Error getting AI response:', error);
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      console.error('Error response status:', error.response?.status);
      console.error('Request config:', error.config);
      
      // Show actual error to user with more details
      const errorDetails = error.response?.data?.details || error.response?.data?.error || error.message || 'Unknown error';
      const errorMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: `I'm sorry, I encountered an error: ${errorDetails}\n\nCould you try asking again? If the problem persists, please check that the AI service is properly configured.`,
        timestamp: new Date(),
        isError: true
      };

      setMessages(prev => {
        const next = [...prev, errorMessage];
        persistChatHistoryToProposal(next);
        return next;
      });
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
    
    if (response.toLowerCase().includes('preview') || 
        response.toLowerCase().includes('proposal') ||
        response.toLowerCase().includes('total project') ||
        response.toLowerCase().includes('complete estimate') ||
        response.toLowerCase().includes('final price') ||
        response.toLowerCase().includes('customer price')) {
      actions.push({ type: 'navigate', tab: 'preview' });
    }

    // Extract proposal data from AI response
    const proposalUpdates = extractProposalData(response);
    if (Object.keys(proposalUpdates).length > 0) {
      actions.push({ type: 'updateProposal', data: proposalUpdates });
    }

    return actions;
  };

  // Helper function to match materials by name (fuzzy matching)
  const matchMaterialByName = (newName, existingMaterials) => {
    if (!existingMaterials || existingMaterials.length === 0) return null;
    
    const normalizedNewName = newName.toLowerCase().trim();
    
    // First try exact match (case-insensitive)
    let match = existingMaterials.find(m => 
      m.name && m.name.toLowerCase().trim() === normalizedNewName
    );
    if (match) return match;
    
    // Try fuzzy matching - check if new name contains key words from existing materials
    // or vice versa (handles variations like "Grace Ice and Water Shield" vs "Ice & Water Shield")
    const newWords = normalizedNewName.split(/\s+/).filter(w => w.length > 2);
    
    for (const existing of existingMaterials) {
      if (!existing.name) continue;
      const existingName = existing.name.toLowerCase().trim();
      const existingWords = existingName.split(/\s+/).filter(w => w.length > 2);
      
      // Check if most key words match (at least 60% match)
      const matchingWords = newWords.filter(nw => 
        existingWords.some(ew => ew.includes(nw) || nw.includes(ew))
      );
      
      if (matchingWords.length >= Math.max(2, Math.ceil(newWords.length * 0.6))) {
        return existing;
      }
      
      // Also check if one name contains the other (handles abbreviations)
      if (normalizedNewName.includes(existingName) || existingName.includes(normalizedNewName)) {
        return existing;
      }
    }
    
    return null;
  };

  // Build preview message showing what changes will be made
  const buildPreviewMessage = (changes, breakdown) => {
    const parts = [];
    parts.push('**📋 Preview of Changes:**\n');
    
    if (changes.materials && changes.materials.length > 0) {
      parts.push(`➕ **Add ${changes.materials.length} material(s):**`);
      changes.materials.forEach(m => {
        parts.push(`  - ${m.name}: ${m.quantity || 0} ${m.unit || ''} @ $${m.unitPrice || 0} = $${m.total || 0}`);
      });
    }
    
    if (changes.labor && changes.labor.length > 0) {
      parts.push(`\n➕ **Add ${changes.labor.length} labor item(s):**`);
      changes.labor.forEach(l => {
        parts.push(`  - ${l.name}: ${l.hours || 0} hours @ $${l.rate || 0}/hr = $${l.total || 0}`);
      });
    }
    
    if (changes.addOns && changes.addOns.length > 0) {
      parts.push(`\n➕ **Add ${changes.addOns.length} add-on(s):**`);
      changes.addOns.forEach(a => {
        parts.push(`  - ${a.name}: $${a.price || 0}`);
      });
    }
    
    if (changes.removals && changes.removals.length > 0) {
      parts.push(`\n🗑️ **Remove ${changes.removals.length} item(s):**`);
      changes.removals.forEach(r => parts.push(`  - ${r}`));
    }
    
    if (changes.updates && changes.updates.length > 0) {
      parts.push(`\n🔄 **Update ${changes.updates.length} item(s):**`);
      changes.updates.forEach(u => {
        const updates = Object.keys(u).filter(k => k !== 'name').join(', ');
        parts.push(`  - ${u.name}: ${updates}`);
      });
    }
    
    parts.push(`\n💰 **New Total: $${breakdown.finalTotal.toFixed(2)}**`);
    parts.push('\n*Click "Apply Changes" to confirm or "Cancel" to reject.*');
    
    return parts.join('\n');
  };
  
  // Apply pending changes when user confirms
  const applyPendingChanges = () => {
    if (!pendingChanges) return;
    
    const { changes } = pendingChanges;
    
    // Migrate labor if needed
    let updatedProposal = {
      ...proposalData,
      ...changes
    };
    
    let labor = updatedProposal.labor || [];
    if (!Array.isArray(labor) || labor.length === 0) {
      const laborHours = updatedProposal.laborHours || 0;
      const laborRate = updatedProposal.laborRate || 75;
      if (laborHours > 0 || laborRate > 0) {
        labor = [{
          id: Date.now(),
          name: 'Roofing Labor',
          hours: laborHours,
          rate: laborRate,
          total: laborHours * laborRate
        }];
      }
    }
    
    // Validate before applying
    const validation = getValidationReport(updatedProposal);
    const realErrors = validation.errors.filter(e => e.type !== 'total_mismatch');
    
    if (realErrors.length > 0) {
      const validationMessage = {
        id: Date.now() + 2,
        type: 'assistant',
        content: `⚠️ **Math Validation Alert:**\n\nI found ${realErrors.length} calculation error(s):\n${realErrors.map(e => `- ${e.message || e.type}`).join('\n')}\n\nPlease review the calculations.`,
        timestamp: new Date(),
        isValidationWarning: true
      };
      setMessages(prev => {
        const next = [...prev, validationMessage];
        persistChatHistoryToProposal(next);
        return next;
      });
    }
    
    // Apply changes
    onUpdateProposal(prev => ({
      ...prev,
      ...updatedProposal
    }));
    
    // Update message to remove preview
    setMessages(prev => prev.map(msg => 
      msg.id === pendingChanges.messageId 
        ? { ...msg, hasPendingChanges: false, changesApplied: true }
        : msg
    ));
    
    // Clear pending changes
    setPendingChanges(null);
  };
  
  // Cancel pending changes
  const cancelPendingChanges = () => {
    if (!pendingChanges) return;
    
    // Update message to remove preview
    setMessages(prev => prev.map(msg => 
      msg.id === pendingChanges.messageId 
        ? { ...msg, hasPendingChanges: false, changesCancelled: true }
        : msg
    ));
    
    setPendingChanges(null);
  };
  
  // Process structured actions from Claude's intelligent analysis
  const processStructuredActions = async (actions) => {
    if (!actions || !actions.actions) {
      return {};
    }
    
    const actionData = actions.actions;
    const updates = {};
    const existingMaterials = proposalData.materials || [];
    const existingAddOns = proposalData.addOns || [];
    
    // Process setProjectVariables - update project variables state
    if (actionData.setProjectVariables && onUpdateProjectVariables) {
      console.log('🔧 Setting project variables from Claude:', actionData.setProjectVariables);
      onUpdateProjectVariables(prev => ({ ...prev, ...actionData.setProjectVariables }));
      // Also update proposal data measurements if needed
      if (actionData.setProjectVariables.roof_sqft || actionData.setProjectVariables.roof_sq) {
        const roofSq = actionData.setProjectVariables.roof_sq || (actionData.setProjectVariables.roof_sqft / 100);
        updates.measurements = {
          ...proposalData.measurements,
          totalSquares: roofSq
        };
      }
    }
    
    // Process askQuestions - display questions to user (handled in UI, not here)
    if (actionData.askQuestions && actionData.askQuestions.length > 0) {
      console.log('❓ AI is asking questions:', actionData.askQuestions);
      // Questions will be displayed in the chat response
    }
    
    // Process addMaterials - AI suggests materials by name, code calculates everything
    if (actionData.addMaterials && actionData.addMaterials.length > 0) {
      console.log('➕ Processing addMaterials from Claude (names only):', actionData.addMaterials);
      
      try {
        // Extract material names
        const materialNames = actionData.addMaterials.map(m => m.name || m);
        
        // Call calculation API to get calculated line items
        const calculatedResponse = await api.calculateMaterials(
          materialNames,
          { ...projectVariables, ...(actionData.setProjectVariables || {}) },
          {}
        );
        
        if (calculatedResponse.success && calculatedResponse.lineItems) {
          console.log(`✅ Calculated ${calculatedResponse.lineItems.length} line items`);
          
          const updatedMaterials = [...(updates.materials || existingMaterials)];
          
          calculatedResponse.lineItems.forEach(lineItem => {
            // Check if it already exists
            const existingIndex = updatedMaterials.findIndex(m => 
              m.name && m.name.toLowerCase().trim() === lineItem.name.toLowerCase().trim()
            );
            
            if (existingIndex >= 0) {
              // Update existing
              updatedMaterials[existingIndex] = {
                ...updatedMaterials[existingIndex],
                ...lineItem,
                id: updatedMaterials[existingIndex].id
              };
              console.log(`🔄 Updated existing material: ${lineItem.name}`);
            } else {
              // Add new
              updatedMaterials.push({
                ...lineItem,
                id: Date.now() + Math.random()
              });
              console.log(`➕ Added calculated material: ${lineItem.name} (qty: ${lineItem.quantity}, total: $${lineItem.total})`);
            }
          });
          
          updates.materials = updatedMaterials;
        } else {
          console.warn('⚠️ Calculation API returned no line items');
        }
      } catch (error) {
        console.error('❌ Error calculating materials:', error);
        toast.error('Failed to calculate material prices. Please try again.');
      }
    }
    
    // Process addCustomItems - custom items not in pricing sheet
    if (actionData.addCustomItems && actionData.addCustomItems.length > 0) {
      console.log('➕ Processing addCustomItems from Claude:', actionData.addCustomItems);
      
      const updatedMaterials = [...(updates.materials || existingMaterials)];
      
      for (const customItem of actionData.addCustomItems) {
        try {
          // Call custom item API to calculate total
          const customResponse = await api.addCustomItem(customItem);
          
          if (customResponse.success && customResponse.lineItem) {
            updatedMaterials.push({
              ...customResponse.lineItem,
              id: Date.now() + Math.random()
            });
            console.log(`➕ Added custom item: ${customItem.name}`);
          }
        } catch (error) {
          console.error(`❌ Error adding custom item ${customItem.name}:`, error);
          // Fallback: add with manual calculation
          const total = (customItem.unitPrice || 0) * (customItem.quantity || 0);
          updatedMaterials.push({
            name: customItem.name,
            unit: customItem.unit || 'each',
            quantity: customItem.quantity || 0,
            unitPrice: customItem.unitPrice || 0,
            total: Math.round(total * 100) / 100,
            category: customItem.category || 'MISC',
            description: customItem.description || '',
            isCustom: true,
            id: Date.now() + Math.random()
          });
        }
      }
      
      updates.materials = updatedMaterials;
    }
    
    // Process removals (exact name matching, case-insensitive)
    if (actionData.removals && actionData.removals.length > 0) {
      console.log('🗑️ Processing removals from Claude:', actionData.removals);
      
      // Filter out removals using exact name matching
      const updatedMaterials = (updates.materials || existingMaterials).filter(m => {
        if (!m.name) return true;
        const shouldRemove = actionData.removals.some(removalName => 
          m.name.toLowerCase().trim() === removalName.toLowerCase().trim()
        );
        if (shouldRemove) {
          console.log(`🗑️ Removing material: ${m.name}`);
          return false;
        }
        return true;
      });
      
      updates.materials = updatedMaterials;
    }
    
    // Process updates (materials with changed quantities - code recalculates price/total)
    if (actionData.updates && actionData.updates.length > 0) {
      console.log('🔄 Processing updates from Claude:', actionData.updates);
      
      const updatedMaterials = [...(updates.materials || existingMaterials)];
      
      actionData.updates.forEach(update => {
        const index = updatedMaterials.findIndex(m => 
          m.name && m.name.toLowerCase().trim() === update.name.toLowerCase().trim()
        );
        
        if (index >= 0) {
          // Update existing material (code will recalculate total if quantity changes)
          const existing = updatedMaterials[index];
          updatedMaterials[index] = {
            ...existing,
            ...update,
            id: existing.id, // Keep original ID
            // Recalculate total if quantity or unitPrice changed
            total: update.quantity !== undefined && update.unitPrice !== undefined
              ? Math.round((update.quantity * update.unitPrice) * 100) / 100
              : (update.total !== undefined ? update.total : existing.total)
          };
          console.log(`🔄 Updated material: ${update.name}`);
        }
      });
      
      updates.materials = updatedMaterials;
    }
    
    // Process new add-ons (keep existing logic)
    if (actionData.addOns && actionData.addOns.length > 0) {
      console.log('➕ Processing new add-ons from Claude:', actionData.addOns);
      
      const updatedAddOns = [...existingAddOns];
      
      actionData.addOns.forEach(newAddOn => {
        // Check if it already exists
        const existingIndex = updatedAddOns.findIndex(a => 
          a.name && a.name.toLowerCase().trim() === newAddOn.name.toLowerCase().trim()
        );
        
        if (existingIndex >= 0) {
          // Update existing
          updatedAddOns[existingIndex] = {
            ...updatedAddOns[existingIndex],
            ...newAddOn,
            id: updatedAddOns[existingIndex].id
          };
        } else {
          // Add new
          updatedAddOns.push({
            ...newAddOn,
            id: Date.now() + Math.random()
          });
        }
      });
      
      updates.addOns = updatedAddOns;
    }
    
    // Process new labor items (keep existing logic)
    if (actionData.labor && actionData.labor.length > 0) {
      console.log('➕ Processing new labor from Claude:', actionData.labor);
      
      const existingLabor = proposalData.labor || [];
      const updatedLabor = [...existingLabor];
      
      actionData.labor.forEach(newLabor => {
        // Check if it already exists
        const existingIndex = updatedLabor.findIndex(l => 
          l.name && l.name.toLowerCase().trim() === newLabor.name.toLowerCase().trim()
        );
        
        if (existingIndex >= 0) {
          // Update existing
          updatedLabor[existingIndex] = {
            ...updatedLabor[existingIndex],
            ...newLabor,
            id: updatedLabor[existingIndex].id,
            total: newLabor.total !== undefined ? newLabor.total : 
              ((newLabor.hours || updatedLabor[existingIndex].hours || 0) * 
               (newLabor.rate || updatedLabor[existingIndex].rate || 0))
          };
        } else {
          // Add new
          updatedLabor.push({
            ...newLabor,
            id: Date.now() + Math.random(),
            total: newLabor.total !== undefined ? newLabor.total : 
              ((newLabor.hours || 0) * (newLabor.rate || 0))
          });
        }
      });
      
      updates.labor = updatedLabor;
    }
    
    // Process pricing updates
    if (actionData.overheadPercent !== undefined) updates.overheadPercent = actionData.overheadPercent;
    if (actionData.profitPercent !== undefined) updates.profitPercent = actionData.profitPercent;
    if (actionData.overheadCostPercent !== undefined) updates.overheadCostPercent = actionData.overheadCostPercent;
    if (actionData.netMarginTarget !== undefined) updates.netMarginTarget = actionData.netMarginTarget;
    if (actionData.discountAmount !== undefined) updates.discountAmount = actionData.discountAmount;
    // totalAmount removed - always calculate from current data, never store
    
    return updates;
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
  "overheadCostPercent": 10,
  "netMarginTarget": 20,
  "discountAmount": 0,
  "totalAmount": 22770,
  "timeline": "5-7 working days"
}

CRITICAL EXTRACTION RULES:
- If the user asks to CHANGE or UPDATE an existing material's price, include that material with the NEW price
- If the user asks to CHANGE quantity, include the material with the NEW quantity
- ALWAYS include overheadPercent: 15, profitPercent: 20, overheadCostPercent: 10, and netMarginTarget: 20
- ALWAYS extract totalAmount if any final pricing is mentioned
- Extract ALL materials, labor, permits, disposal costs mentioned
- Include timeline, warranty, and any project details
- Extract brand recommendations and specifications
- Materials and labor should be base costs BEFORE overhead/profit
- When updating prices, preserve the existing quantity unless explicitly changed

AUTO-NAVIGATION TRIGGERS:
- If complete estimate provided, this will auto-navigate to preview tab
- Extract ALL data to populate a complete proposal

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
        
        // Process materials and labor - UPDATE existing ones, ADD new ones
        const existingMaterials = proposalData.materials || [];
        const existingStructured = proposalData.structuredPricing || { materials: [], labor: [], additionalCosts: [] };
        
        // Start with existing materials (removals are handled by Claude's structured output)
        let updatedMaterials = [...existingMaterials];
        let updatedStructuredMaterials = [...(existingStructured.materials || [])];
        
        // THEN: Process updates and additions (existing logic continues...)
        
        if (parsedData.materials && parsedData.materials.length > 0) {
          parsedData.materials.forEach(newMaterial => {
            // Try to find existing material by name
            const existingMatch = matchMaterialByName(newMaterial.name, existingMaterials);
            const existingStructuredMatch = matchMaterialByName(newMaterial.name, existingStructured.materials || []);
            
            if (existingMatch) {
              // UPDATE existing material
              console.log(`🔄 Updating existing material: ${newMaterial.name}`);
              const index = updatedMaterials.findIndex(m => m.id === existingMatch.id);
              if (index >= 0) {
                // Preserve quantity if not explicitly changed, preserve other fields
                const updatedMaterial = {
                  ...existingMatch,
                  ...newMaterial,
                  id: existingMatch.id, // Keep original ID
                  quantity: newMaterial.quantity !== undefined ? newMaterial.quantity : existingMatch.quantity,
                  // Recalculate total if unitPrice or quantity changed - preserve decimal precision
                  total: (() => {
                    const qty = parseFloat(newMaterial.quantity !== undefined ? newMaterial.quantity : existingMatch.quantity) || 0;
                    const price = parseFloat(newMaterial.unitPrice !== undefined ? newMaterial.unitPrice : existingMatch.unitPrice) || 0;
                    return Math.round((qty * price) * 100) / 100; // Round to 2 decimals
                  })()
                };
                updatedMaterials[index] = updatedMaterial;
              }
            } else {
              // ADD new material
              console.log(`➕ Adding new material: ${newMaterial.name}`);
              updatedMaterials.push(newMaterial);
            }
            
            // Same for structured pricing
            if (existingStructuredMatch) {
              const structuredIndex = updatedStructuredMaterials.findIndex(m => m.id === existingStructuredMatch.id);
              if (structuredIndex >= 0) {
                const updatedStructuredMaterial = {
                  ...existingStructuredMatch,
                  ...newMaterial,
                  id: existingStructuredMatch.id,
                  quantity: newMaterial.quantity !== undefined ? newMaterial.quantity : existingStructuredMatch.quantity,
                  // Preserve decimal precision
                  total: (() => {
                    const qty = parseFloat(newMaterial.quantity !== undefined ? newMaterial.quantity : existingStructuredMatch.quantity) || 0;
                    const price = parseFloat(newMaterial.unitPrice !== undefined ? newMaterial.unitPrice : existingStructuredMatch.unitPrice) || 0;
                    return Math.round((qty * price) * 100) / 100; // Round to 2 decimals
                  })()
                };
                updatedStructuredMaterials[structuredIndex] = updatedStructuredMaterial;
              }
            } else {
              updatedStructuredMaterials.push(newMaterial);
            }
          });
        }
        
        // Process labor - same logic
        const updatedStructuredLabor = [...(existingStructured.labor || [])];
        if (parsedData.labor && parsedData.labor.length > 0) {
          parsedData.labor.forEach(newLabor => {
            const existingMatch = matchMaterialByName(newLabor.name, existingStructured.labor || []);
            if (existingMatch) {
              console.log(`🔄 Updating existing labor: ${newLabor.name}`);
              const index = updatedStructuredLabor.findIndex(l => l.id === existingMatch.id);
              if (index >= 0) {
                const updatedLabor = {
                  ...existingMatch,
                  ...newLabor,
                  id: existingMatch.id,
                  quantity: newLabor.quantity !== undefined ? newLabor.quantity : existingMatch.quantity,
                  // Preserve decimal precision
                  total: (() => {
                    const qty = parseFloat(newLabor.quantity !== undefined ? newLabor.quantity : existingMatch.quantity) || 0;
                    const price = parseFloat(newLabor.unitPrice !== undefined ? newLabor.unitPrice : existingMatch.unitPrice) || 0;
                    return Math.round((qty * price) * 100) / 100; // Round to 2 decimals
                  })()
                };
                updatedStructuredLabor[index] = updatedLabor;
              }
            } else {
              console.log(`➕ Adding new labor: ${newLabor.name}`);
              updatedStructuredLabor.push(newLabor);
              // Also add to materials array for backward compatibility
              updatedMaterials.push(newLabor);
            }
          });
        }
        
        // Process additional costs
        const updatedAdditionalCosts = [...(existingStructured.additionalCosts || [])];
        if (parsedData.additionalCosts && parsedData.additionalCosts.length > 0) {
          parsedData.additionalCosts.forEach(newCost => {
            const existingMatch = matchMaterialByName(newCost.name, existingStructured.additionalCosts || []);
            if (existingMatch) {
              console.log(`🔄 Updating existing additional cost: ${newCost.name}`);
              const index = updatedAdditionalCosts.findIndex(c => c.id === existingMatch.id);
              if (index >= 0) {
                updatedAdditionalCosts[index] = {
                  ...existingMatch,
                  ...newCost,
                  id: existingMatch.id
                };
              }
            } else {
              console.log(`➕ Adding new additional cost: ${newCost.name}`);
              updatedAdditionalCosts.push(newCost);
            }
          });
        }
        
        // Set the updated arrays
        if (updatedMaterials.length > 0 || parsedData.materials || parsedData.labor) {
          updates.materials = updatedMaterials;
        }
        
        if (parsedData.materials || parsedData.labor || parsedData.additionalCosts) {
          updates.structuredPricing = {
            materials: updatedStructuredMaterials,
            labor: updatedStructuredLabor,
            additionalCosts: updatedAdditionalCosts
          };
        }
        
        // Set total amount from AI - this is the authoritative total
        // totalAmount removed - always calculate from current data
        
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
        
        // Set overhead costs and NET margin if specified
        if (parsedData.overheadCostPercent !== undefined) {
          updates.overheadCostPercent = parsedData.overheadCostPercent;
        }
        
        if (parsedData.netMarginTarget !== undefined) {
          updates.netMarginTarget = parsedData.netMarginTarget;
        }
        
        if (parsedData.discountAmount !== undefined) {
          updates.discountAmount = parsedData.discountAmount;
        }
        
        // Auto-calculate total using calculation utilities if we have materials/labor
        if (updates.materials || parsedData.materials || parsedData.labor) {
          const materialsForCalc = updates.materials || proposalData.materials || [];
          // Migrate laborHours/laborRate to labor array if needed
          let labor = updates.labor || proposalData.labor || [];
          if (!Array.isArray(labor) || labor.length === 0) {
            const laborHours = proposalData.laborHours || 0;
            const laborRate = proposalData.laborRate || 75;
            if (laborHours > 0 || laborRate > 0) {
              labor = [{
                id: Date.now(),
                name: 'Roofing Labor',
                hours: laborHours,
                rate: laborRate,
                total: laborHours * laborRate
              }];
            }
          }
          
          const addOns = proposalData.addOns || [];
          const overheadPercent = updates.overheadPercent || proposalData.overheadPercent || 15;
          const profitPercent = updates.profitPercent || proposalData.profitPercent || 20;
          const overheadCostPercent = updates.overheadCostPercent || proposalData.overheadCostPercent || 10;
          const netMarginTarget = updates.netMarginTarget || proposalData.netMarginTarget || 20;
          const discountAmount = updates.discountAmount || proposalData.discountAmount || 0;
          
          // Calculate final total using the calculation utilities with NET margin
          const costBreakdown = calculations.getCostBreakdown(
            materialsForCalc,
            labor,
            addOns,
            overheadPercent,
            profitPercent,
            overheadCostPercent,
            netMarginTarget,
            discountAmount,
            false
          );
          
          // totalAmount removed - always calculate from current data
          // Still calculate breakdown for validation, but don't store calculated fields
          console.log('🔢 Calculated breakdown - finalTotal:', costBreakdown.finalTotal);
          console.log('📊 NET Margin:', costBreakdown.netMarginActual.toFixed(2) + '%');
        }
        
        console.log('✅ AI successfully parsed estimate data:', parsedData);
        console.log('📊 Material update summary:', {
          existingMaterialsCount: existingMaterials.length,
          newMaterialsCount: parsedData.materials?.length || 0,
          finalMaterialsCount: updates.materials?.length || existingMaterials.length,
          structuredMaterialsCount: updates.structuredPricing?.materials?.length || existingStructured.materials?.length || 0
        });
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
    
    // Extract client information - more specific regex to avoid matching measurements like "6/12 pitch"
    // Only match actual addresses (street numbers followed by street names with street type indicators)
    const addressMatch = response.match(/(?:Address|Property Address|Located at|Location)[:\s]+(\d+\s+[A-Za-z0-9\s]+(?:Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Drive|Dr|Boulevard|Blvd|Court|Ct|Place|Pl|Way|Circle|Cir|Apt|Apartment|Unit|Suite|#)[^,\n]*(?:,\s*[^,\n]+)*)/i);
    if (addressMatch) {
      const address = addressMatch[1].trim();
      // Only update if it looks like a real address (has street number followed by letters)
      if (address.match(/\d+\s+[A-Za-z]/)) {
        updates.propertyAddress = address;
      }
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
      // totalAmount removed - always calculate from current data
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
        // Tabs were removed in redesign, but keep this for backwards compatibility
        if (onTabChange && typeof onTabChange === 'function') {
          onTabChange(action.tab);
        } else {
          console.log('Navigation requested to:', action.tab, '(tabs removed in redesign)');
        }
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
                
                {/* Show question with pricing options if this message has a question */}
                {message.questionData && message.questionData.messageId === message.id && (
                  <div className="question-flow">
                    <div className="question-text">{message.questionData.question}</div>
                    {message.questionData.pricingRelevant && (() => {
                      const pricingOptions = filterPricingByQuestion(
                        message.questionData.question,
                        message.questionData.category,
                        message.questionData.pricingCategory
                      );
                      return pricingOptions.length > 0 ? (
                        <div className="pricing-options">
                          {pricingOptions.map((option, idx) => (
                            <button
                              key={idx}
                              className="pricing-option-btn"
                              onClick={async () => {
                                // Send the option as user's answer
                                const answerMessage = option;
                                setInputValue('');
                                setCurrentQuestion(null);
                                
                                // Create user message
                                const userMessage = {
                                  id: Date.now(),
                                  type: 'user',
                                  content: answerMessage,
                                  timestamp: new Date()
                                };
                                
                                setMessages(prev => {
                                  const next = [...prev, userMessage];
                                  persistChatHistoryToProposal(next);
                                  return next;
                                });
                                
                                // Send to AI
                                setIsTyping(true);
                                try {
                                  const conversationHistory = buildConversationHistory();
                                  const proposalContext = buildProposalContext();
                                  
                                  const response = await api.chatWithAI(answerMessage, conversationHistory, proposalContext);
                                  const aiResponseText = response?.response || '';
                                  const structuredActions = response?.actions || null;
                                  
                                  // Check for new question
                                  let questionData = null;
                                  if (structuredActions?.actions?.askQuestions && structuredActions.actions.askQuestions.length > 0) {
                                    const firstQuestion = structuredActions.actions.askQuestions[0];
                                    if (typeof firstQuestion === 'object' && firstQuestion.question) {
                                      questionData = {
                                        question: firstQuestion.question,
                                        category: firstQuestion.category || null,
                                        pricingRelevant: firstQuestion.pricingRelevant !== false,
                                        pricingCategory: firstQuestion.pricingCategory || null,
                                        messageId: Date.now() + 1
                                      };
                                    }
                                  }
                                  
                                  const assistantMessage = {
                                    id: Date.now() + 1,
                                    type: 'assistant',
                                    content: aiResponseText,
                                    timestamp: new Date(),
                                    actions: extractActions(aiResponseText, proposalData),
                                    questionData: questionData
                                  };
                                  
                                  setMessages(prev => {
                                    const next = [...prev, assistantMessage];
                                    persistChatHistoryToProposal(next);
                                    return next;
                                  });
                                  
                                  if (questionData) {
                                    setCurrentQuestion(questionData);
                                  }
                                  
                                  // Process structured actions
                                  if (structuredActions?.actions) {
                                    const detailedData = await processStructuredActions(structuredActions);
                                    if (Object.keys(detailedData).length > 0) {
                                      onUpdateProposal(prev => ({ ...prev, ...detailedData }));
                                    }
                                  }
                                } catch (error) {
                                  console.error('Error sending answer:', error);
                                  toast.error('Failed to send answer. Please try again.');
                                } finally {
                                  setIsTyping(false);
                                }
                              }}
                            >
                              {option}
                            </button>
                          ))}
                          <button
                            className="pricing-option-btn custom"
                            onClick={() => {
                              // Focus input for custom answer
                              textareaRef.current?.focus();
                              setCurrentQuestion(message.questionData);
                            }}
                          >
                            Add Custom
                          </button>
                        </div>
                      ) : null;
                    })()}
                    {currentQuestion && currentQuestion.messageId === message.id && (
                      <div className="question-input-hint">
                        Type your answer below or select an option above
                      </div>
                    )}
                  </div>
                )}
                
                {/* Show Apply/Cancel buttons for pending changes */}
                {message.hasPendingChanges && pendingChanges && pendingChanges.messageId === message.id && (
                  <div className="pending-changes-actions">
                    <button 
                      onClick={applyPendingChanges}
                      className="btn-apply"
                    >
                      ✓ Apply Changes
                    </button>
                    <button 
                      onClick={cancelPendingChanges}
                      className="btn-cancel"
                    >
                      ✕ Cancel
                    </button>
                  </div>
                )}
                
                {/* Show confirmation message */}
                {message.changesApplied && (
                  <div className="changes-applied">
                    ✓ Changes applied successfully
                  </div>
                )}
                
                {message.changesCancelled && (
                  <div className="changes-cancelled">
                    ✕ Changes cancelled
                  </div>
                )}
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
