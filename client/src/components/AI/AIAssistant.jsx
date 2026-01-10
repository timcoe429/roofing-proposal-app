import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, ChevronDown, Zap, Upload, Plus, Package, DollarSign, Calculator, Shield, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
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
  // Track which proposal ID we've loaded chat history for
  const loadedProposalIdRef = useRef(null);
  
  // Persist chat history to proposal (called only when messages change)
  const persistChatHistoryToProposal = useCallback((nextMessages) => {
    if (!onUpdateProposal) return;

    const sanitized = (nextMessages || [])
      .filter(m => m && (m.type === 'user' || m.type === 'assistant') && typeof m.content === 'string')
      .map(m => ({
        type: m.type,
        content: m.content,
        timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : (m.timestamp || new Date().toISOString())
      }))
      .slice(-150);

    onUpdateProposal(prev => ({
      ...prev,
      aiChatHistory: sanitized
    }));
  }, [onUpdateProposal]);

  // Format AI responses with proper HTML
  const formatAIResponse = (text) => {
    // Ensure we have text to format
    if (!text || typeof text !== 'string') {
      return '<p>I processed your request. The changes have been applied.</p>';
    }
    
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
    
    // If cleaning removed everything, use original text
    if (!cleanedText) {
      cleanedText = text.trim();
    }

    // Split into paragraphs
    const paragraphs = cleanedText.split('\n\n');
    
    const formattedResult = paragraphs.map(paragraph => {
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
    
    // Ensure we always return valid HTML
    if (!formattedResult || formattedResult.trim() === '') {
      return '<p>I processed your request. The changes have been applied.</p>';
    }
    
    return formattedResult;
  };

  // Build proposal context for AI - reusable helper function
  const buildProposalContext = () => {
    const fullAddress = `${proposalData.propertyAddress || ''}, ${proposalData.propertyCity || ''}, ${proposalData.propertyState || ''} ${proposalData.propertyZip || ''}`.trim();
    
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
      }
    };
  };

  // Build conversation history for AI - reusable helper function
  const buildConversationHistory = () => {
    return messages
      .filter(msg => (msg.type === 'user' || msg.type === 'assistant') && msg.content && msg.content.trim())
      .map(msg => ({ 
        role: msg.type === 'user' ? 'user' : 'assistant', 
        content: msg.content 
      }))
      .slice(-10); // Last 10 messages (5 exchanges) for context
  };

  // Apply tool actions from Claude's response to update the proposal
  const applyToolActions = (actions) => {
    if (!actions || !Array.isArray(actions) || !onUpdateProposal) return;

    actions.forEach(action => {
      const { tool, input } = action;
      console.log(`🔧 Applying tool: ${tool}`, input);

      switch (tool) {
        case 'set_client_info':
          onUpdateProposal(prev => ({
            ...prev,
            ...(input.clientName && { clientName: input.clientName }),
            ...(input.clientEmail && { clientEmail: input.clientEmail }),
            ...(input.clientPhone && { clientPhone: input.clientPhone }),
            ...(input.clientAddress && { clientAddress: input.clientAddress })
          }));
          toast.success('Updated client info');
          break;

        case 'set_property_info':
          onUpdateProposal(prev => ({
            ...prev,
            ...(input.propertyAddress && { propertyAddress: input.propertyAddress }),
            ...(input.propertyCity && { propertyCity: input.propertyCity }),
            ...(input.propertyState && { propertyState: input.propertyState }),
            ...(input.propertyZip && { propertyZip: input.propertyZip }),
            ...(input.projectType && { projectType: input.projectType }),
            // Explicitly preserve aiChatHistory to prevent it from being lost
            aiChatHistory: prev.aiChatHistory || []
          }));
          toast.success('Updated property info');
          break;

        case 'set_measurements':
          onUpdateProposal(prev => ({
            ...prev,
            measurements: {
              ...prev.measurements,
              ...(input.totalSquares !== undefined && { totalSquares: input.totalSquares }),
              ...(input.ridgeLength !== undefined && { ridgeLength: input.ridgeLength }),
              ...(input.hipLength !== undefined && { hipLength: input.hipLength }),
              ...(input.valleyLength !== undefined && { valleyLength: input.valleyLength }),
              ...(input.eaveLength !== undefined && { eaveLength: input.eaveLength }),
              ...(input.rakeLength !== undefined && { rakeLength: input.rakeLength }),
              ...(input.stepFlashingLength !== undefined && { stepFlashingLength: input.stepFlashingLength }),
              ...(input.headwallLength !== undefined && { headwallLength: input.headwallLength }),
              ...(input.pitch && { pitch: input.pitch }),
              ...(input.layers !== undefined && { existingLayers: input.layers }),
              ...(input.penetrations !== undefined && { penetrations: input.penetrations }),
              ...(input.skylights !== undefined && { skylights: input.skylights }),
              ...(input.roofPlanes !== undefined && { roofPlanes: input.roofPlanes })
            },
            // Explicitly preserve aiChatHistory to prevent it from being lost
            aiChatHistory: prev.aiChatHistory || []
          }));
          toast.success('Updated measurements');
          break;

        case 'add_material':
          onUpdateProposal(prev => ({
            ...prev,
            materials: [
              ...(prev.materials || []),
              {
                id: Date.now() + Math.random(),
                name: input.name,
                category: input.category || 'material',
                quantity: input.quantity,
                unit: input.unit,
                unitPrice: input.unitPrice,
                total: input.quantity * input.unitPrice,
                description: input.description || '',
                isOptional: input.isOptional || false
              }
            ]
          }));
          toast.success(`Added: ${input.name}`);
          break;

        case 'update_material':
          onUpdateProposal(prev => {
            const materials = [...(prev.materials || [])];
            const idx = materials.findIndex(m => 
              m.name.toLowerCase().includes(input.name.toLowerCase()) ||
              input.name.toLowerCase().includes(m.name.toLowerCase())
            );
            if (idx !== -1) {
              const updated = { ...materials[idx] };
              if (input.quantity !== undefined) updated.quantity = input.quantity;
              if (input.unitPrice !== undefined) updated.unitPrice = input.unitPrice;
              if (input.description !== undefined) updated.description = input.description;
              updated.total = updated.quantity * updated.unitPrice;
              materials[idx] = updated;
              toast.success(`Updated: ${updated.name}`);
            } else {
              toast.error(`Could not find item: ${input.name}`);
            }
            return { ...prev, materials };
          });
          break;

        case 'remove_material':
          onUpdateProposal(prev => {
            const materials = (prev.materials || []).filter(m => 
              !m.name.toLowerCase().includes(input.name.toLowerCase()) &&
              !input.name.toLowerCase().includes(m.name.toLowerCase())
            );
            const removed = (prev.materials || []).length - materials.length;
            if (removed > 0) {
              toast.success(`Removed: ${input.name}`);
            } else {
              toast.error(`Could not find item: ${input.name}`);
            }
            return { ...prev, materials };
          });
          break;

        case 'set_margins':
          onUpdateProposal(prev => ({
            ...prev,
            ...(input.overheadPercent !== undefined && { overheadPercent: input.overheadPercent }),
            ...(input.profitPercent !== undefined && { profitPercent: input.profitPercent })
          }));
          toast.success('Updated margins');
          break;

        case 'apply_discount':
          onUpdateProposal(prev => ({
            ...prev,
            discountAmount: input.amount,
            ...(input.reason && { discountReason: input.reason })
          }));
          toast.success(`Applied discount: $${input.amount}`);
          break;

        case 'set_project_details':
          onUpdateProposal(prev => ({
            ...prev,
            ...(input.timeline && { timeline: input.timeline }),
            ...(input.warranty && { warranty: input.warranty }),
            ...(input.notes && { notes: input.notes })
          }));
          toast.success('Updated project details');
          break;

        case 'add_labor':
          onUpdateProposal(prev => ({
            ...prev,
            labor: [
              ...(prev.labor || []),
              {
                id: Date.now() + Math.random(),
                name: input.name,
                hours: input.hours,
                rate: input.rate,
                total: input.hours * input.rate,
                description: input.description || ''
              }
            ]
          }));
          toast.success(`Added labor: ${input.name}`);
          break;

        default:
          console.warn(`Unknown tool action: ${tool}`);
      }
    });
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

  // Load chat history when proposal ID changes
  useEffect(() => {
    const proposalId = proposalData?.id;
    
    // Skip if we've already loaded for this proposal
    if (loadedProposalIdRef.current === proposalId) return;
    
    // Skip if no proposal ID yet (new proposal being created)
    if (!proposalId && loadedProposalIdRef.current === 'new') return;
    
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
    
    // Mark as loaded for this proposal
    loadedProposalIdRef.current = proposalId ?? 'new';
  }, [proposalData?.id]); // Only re-run when proposal ID changes, not on every aiChatHistory change

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

  // Convert PDF pages to images
  const convertPdfToImages = async (file) => {
    try {
      // Dynamically import pdfjs-dist
      const pdfjsLib = await import('pdfjs-dist');
      
      // Set worker source (required for pdfjs-dist)
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const images = [];
      
      // Convert each page to an image
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better quality
        
        // Create canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Render PDF page to canvas
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
        
        // Convert canvas to data URL
        const dataUrl = canvas.toDataURL('image/png');
        
        images.push({
          page: pageNum,
          dataUrl: dataUrl,
          file: null // No original file for PDF pages
        });
      }
      
      return images;
    } catch (error) {
      console.error('Error converting PDF to images:', error);
      toast.error('Failed to convert PDF. Please try converting to images manually.');
      throw error;
    }
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    
    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const oversizedFiles = files.filter(f => f.size > maxSize);
    if (oversizedFiles.length > 0) {
      toast.error(`File size limit is 10MB. Please compress or split your files.`);
      return;
    }
    
    for (const file of files) {
      try {
        if (file.type === 'application/pdf') {
          // Convert PDF pages to images
          toast.loading(`Converting PDF: ${file.name}...`, { id: `pdf-${file.name}` });
          const images = await convertPdfToImages(file);
          
          images.forEach((img, index) => {
            const imageData = {
              id: Date.now() + Math.random() + index,
              file: null,
              dataUrl: img.dataUrl,
              name: `${file.name} - Page ${img.page}`
            };
            setPastedImages(prev => [...prev, imageData]);
          });
          
          toast.success(`Converted ${images.length} page(s) from ${file.name}`, { id: `pdf-${file.name}` });
        } else if (file.type.startsWith('image/')) {
          // Handle images directly
          const reader = new FileReader();
          reader.onload = (e) => {
            const imageData = {
              id: Date.now() + Math.random(),
              file: file,
              dataUrl: e.target.result,
              name: file.name || `image-${Date.now()}.png`
            };
            setPastedImages(prev => [...prev, imageData]);
          };
          reader.readAsDataURL(file);
        } else {
          toast.error(`Unsupported file type: ${file.type}. Please upload PDF or image files.`);
        }
      } catch (error) {
        console.error('Error processing file:', error);
        toast.error(`Failed to process ${file.name}. Please try again.`);
      }
    }
    
    // Reset file input
    event.target.value = '';
  };



  // Compress image before sending
  const compressImage = (dataUrl, maxWidth = 1024, quality = 0.8) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize if too large
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to compressed data URL
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => resolve(dataUrl); // Fallback to original if compression fails
      img.src = dataUrl;
    });
  };

  const handleSendMessage = async (message = inputValue) => {
    if (!message.trim() && pastedImages.length === 0) return;

    // Capture images BEFORE clearing state (important!)
    const imagesToSend = [...pastedImages];
    
    // Compress images before sending
    let imageBase64Array = null;
    if (imagesToSend.length > 0) {
      try {
        const compressedImages = await Promise.all(
          imagesToSend.map(img => compressImage(img.dataUrl))
        );
        imageBase64Array = compressedImages;
      } catch (error) {
        console.error('Error compressing images:', error);
        // Fallback to original images if compression fails
        imageBase64Array = imagesToSend.map(img => img.dataUrl);
      }
    }

    // Default content when sending images without text
    const messageContent = message.trim() || (imagesToSend.length > 0 ? '[Image uploaded]' : '');

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: messageContent,
      images: imagesToSend.length > 0 ? imagesToSend : null,
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
      
      console.log('📤 Sending to AI API:', {
        message: messageContent.substring(0, 100) + (messageContent.length > 100 ? '...' : ''),
        messageLength: messageContent.length,
        hasImages: !!imageBase64Array,
        imageCount: imageBase64Array?.length || 0,
        hasProposalContext: !!proposalContext,
        conversationHistoryLength: conversationHistory.length
      });
      
      // Send message + images directly to Claude (Claude reads images natively)
      response = await api.chatWithAI(messageContent, conversationHistory, proposalContext, imageBase64Array);
      
      console.log('📥 AI API Response received:', {
        hasResponse: !!response,
        responseType: typeof response,
        responseKeys: response ? Object.keys(response) : null,
        responseText: response?.response ? response.response.substring(0, 100) + '...' : 'No response text',
        hasActions: !!response?.actions,
        actionCount: response?.actions?.length || 0,
        fullResponse: response // Debug: log full response structure
      });
      
      // Get Claude's natural response - check multiple possible structures
      let aiResponseText = '';
      if (typeof response === 'string') {
        aiResponseText = response;
      } else if (response?.response && typeof response.response === 'string') {
        aiResponseText = response.response;
      } else if (response?.data?.response && typeof response.data.response === 'string') {
        // Handle case where interceptor didn't unwrap properly
        aiResponseText = response.data.response;
      } else {
        console.error('❌ BUG: Could not extract response text from:', response);
        aiResponseText = 'I processed your request. The changes have been applied.';
      }
      
      // If empty or just whitespace, provide fallback
      if (!aiResponseText || !aiResponseText.trim()) {
        if (response?.actions && Array.isArray(response.actions) && response.actions.length > 0) {
          const toolNames = response.actions.map(a => a.tool.replace(/_/g, ' ')).join(', ');
          aiResponseText = `I've updated the proposal using: ${toolNames}. The changes have been applied.`;
        } else {
          aiResponseText = 'I processed your request. Let me know if you need anything else!';
        }
      }
      
      console.log('✅ AI Response received:', aiResponseText ? aiResponseText.substring(0, 100) + '...' : 'No text');
      
      // Apply tool actions if present
      if (response?.actions && Array.isArray(response.actions)) {
        console.log('🔧 Applying tool actions:', response.actions);
        applyToolActions(response.actions);
      }
      
      // Create assistant message with Claude's natural response
      const assistantMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: aiResponseText.trim(),
        timestamp: new Date()
      };

      setMessages(prev => {
        const next = [...prev, assistantMessage];
        persistChatHistoryToProposal(next);
        return next;
      });

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

  // REMOVED ~700 lines of dead code:
  // - matchMaterialByName (fuzzy matching helper)
  // - buildPreviewMessage (preview UI builder)
  // - processStructuredActions (structured action processor)
  // - parseAIResponseWithAI (AI response parser)
  // These were never called from the main handleSendMessage flow

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
    
    // Extract RoofScope-specific measurements
    
    // Extract slope breakdowns
    const flatSlopeMatch = response.match(/(?:Flat\s+Slope|Flat\s*\([^)]+\))[:\s]+([0-9,]+(?:\.\d+)?)\s*SQ/i);
    if (flatSlopeMatch) {
      measurements.flatSlopeSq = parseFloat(flatSlopeMatch[1].replace(/,/g, ''));
    }
    
    const lowSlopeMatch = response.match(/(?:Low\s+Slope|Low\s*\([^)]+\))[:\s]+([0-9,]+(?:\.\d+)?)\s*SQ/i);
    if (lowSlopeMatch) {
      measurements.lowSlopeSq = parseFloat(lowSlopeMatch[1].replace(/,/g, ''));
    }
    
    const steepSlopeMatch = response.match(/(?:Steep\s+Slope|Steep\s*\([^)]+\))[:\s]+([0-9,]+(?:\.\d+)?)\s*SQ/i);
    if (steepSlopeMatch) {
      measurements.steepSlopeSq = parseFloat(steepSlopeMatch[1].replace(/,/g, ''));
    }
    
    const highSlopeMatch = response.match(/(?:Standard\s+Slope|High\s+Slope|Standard\s*\([^)]+\)|High\s*\([^)]+\))[:\s]+([0-9,]+(?:\.\d+)?)\s*SQ/i);
    if (highSlopeMatch) {
      measurements.highSlopeSq = parseFloat(highSlopeMatch[1].replace(/,/g, ''));
    }
    
    // Extract hip length
    const hipLengthMatch = response.match(/Hip[:\s]+([0-9,]+(?:\.\d+)?)\s*(?:LF|ft|feet)/i);
    if (hipLengthMatch) {
      measurements.hipLength = parseFloat(hipLengthMatch[1].replace(/,/g, ''));
    }
    
    // Extract step flashing length
    const stepFlashingMatch = response.match(/Step\s+Flashing[:\s]+([0-9,]+(?:\.\d+)?)\s*(?:LF|ft|feet)/i);
    if (stepFlashingMatch) {
      measurements.stepFlashingLength = parseFloat(stepFlashingMatch[1].replace(/,/g, ''));
    }
    
    // Extract headwall flashing length
    const headwallFlashingMatch = response.match(/Headwall\s+Flashing[:\s]+([0-9,]+(?:\.\d+)?)\s*(?:LF|ft|feet)/i);
    if (headwallFlashingMatch) {
      measurements.headwallFlashingLength = parseFloat(headwallFlashingMatch[1].replace(/,/g, ''));
    }
    
    // Extract slope change length
    const slopeChangeMatch = response.match(/Slope\s+Change[:\s]+([0-9,]+(?:\.\d+)?)\s*(?:LF|ft|feet)/i);
    if (slopeChangeMatch) {
      measurements.slopeChangeLength = parseFloat(slopeChangeMatch[1].replace(/,/g, ''));
    }
    
    // Extract flat drip edge length
    const flatDripEdgeMatch = response.match(/Flat\s+Drip\s+Edge[:\s]+([0-9,]+(?:\.\d+)?)\s*(?:LF|ft|feet)/i);
    if (flatDripEdgeMatch) {
      measurements.flatDripEdgeLength = parseFloat(flatDripEdgeMatch[1].replace(/,/g, ''));
    }
    
    // Extract total perimeter
    const totalPerimeterMatch = response.match(/Total\s+Perimeter[:\s]+([0-9,]+(?:\.\d+)?)\s*(?:LF|ft|feet)/i);
    if (totalPerimeterMatch) {
      measurements.totalPerimeter = parseFloat(totalPerimeterMatch[1].replace(/,/g, ''));
    }
    
    // Extract roof planes count
    const roofPlanesMatch = response.match(/Roof\s+Planes[:\s]+(\d+)/i);
    if (roofPlanesMatch) {
      measurements.roofPlanes = parseInt(roofPlanesMatch[1]);
    }
    
    // Extract structures count
    const structuresMatch = response.match(/Structures[:\s]+(\d+)/i);
    if (structuresMatch) {
      measurements.structures = parseInt(structuresMatch[1]);
    }
    
    // Extract plane data (if available in response)
    const planesMatch = response.match(/planes?[:\s]*\[([^\]]+)\]/i);
    if (planesMatch) {
      try {
        // Try to parse plane data from JSON-like structure
        const planesData = response.match(/"planes?":\s*\[([^\]]+)\]/i);
        if (planesData) {
          // This would be handled by JSON parsing if response contains JSON
          // For regex extraction, we'll rely on Vision API to provide structured data
        }
      } catch (e) {
        // Plane data extraction will be handled by Vision API JSON response
      }
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
                
                {/* REMOVED: Question flow UI and pending changes UI - used removed state variables */}
                
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
            
            {/* File upload button */}
            <label htmlFor="file-upload-input" className="upload-btn" title="Upload PDF or image files">
              <Upload size={16} />
              <input
                id="file-upload-input"
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </label>
            
          <button 
            onClick={() => handleSendMessage()}
            disabled={(!inputValue.trim() && pastedImages.length === 0) || isTyping}
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
