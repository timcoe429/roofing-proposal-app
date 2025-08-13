import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Upload, Calculator, FileText, Zap, DollarSign } from 'lucide-react';
import './AIAssistant.css';

const QUICK_ACTIONS = [
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
    id: 'generate_proposal',
    icon: FileText,
    title: 'Generate Proposal',
    description: 'Create a complete proposal document',
    prompt: 'Generate a professional roofing proposal based on the current project data.'
  },
  {
    id: 'price_lookup',
    icon: DollarSign,
    title: 'Price Lookup',
    description: 'Find current material prices',
    prompt: 'Look up current pricing for roofing materials in my area.'
  }
];

const SAMPLE_CONVERSATIONS = [
  {
    user: "I need to create a proposal for a 2,500 sq ft house with asphalt shingles",
    assistant: "I'll help you create that proposal! Let me break this down:\n\n**Roof Area**: 2,500 sq ft = 25 squares\n**Material**: Asphalt shingles\n\nTo give you an accurate estimate, I need a few more details:\n1. What's the roof pitch?\n2. How many layers need to be removed?\n3. Any special features (chimneys, skylights, etc.)?\n\nI can also help you:\n- Calculate exact material quantities\n- Apply your pricing sheet\n- Generate a professional proposal\n\nWould you like me to start with material calculations?"
  },
  {
    user: "The roof has a 6/12 pitch, 2 layers to remove, 1 chimney, and 3 skylights",
    assistant: "Perfect! Here's what I'm calculating:\n\n**Materials Needed:**\n- Shingles: 27 squares (25 + 8% waste)\n- Underlayment: 27 squares\n- Ridge cap: ~80 linear feet\n- Flashing: Chimney + 3 skylights\n- Tear-off: 2 layers (extra labor/disposal)\n\n**Labor Factors:**\n- 6/12 pitch: Standard difficulty\n- 2-layer tear-off: +40% labor time\n- Features: +2 hours for chimney/skylights\n\nShall I:\n1. Apply your pricing sheet to get exact costs?\n2. Generate the full proposal?\n3. Show you the material breakdown first?"
  }
];

export default function AIAssistant({ proposalData, onUpdateProposal, onTabChange }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      content: "👋 Hi! I'm your AI roofing assistant. I can help you:\n\n• Analyze roof photos and measurements\n• Calculate materials and pricing\n• Generate professional proposals\n• Look up current material prices\n• Apply your custom pricing sheets\n\nWhat would you like to work on today?",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = generateAIResponse(message, proposalData);
      const assistantMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: aiResponse.content,
        timestamp: new Date(),
        actions: aiResponse.actions
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);

      // Execute any actions
      if (aiResponse.actions) {
        aiResponse.actions.forEach(action => executeAction(action));
      }
    }, 1000 + Math.random() * 2000);
  };

  const generateAIResponse = (userMessage, data) => {
    const message = userMessage.toLowerCase();
    
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
    handleSendMessage(action.prompt);
  };

  return (
    <div className="ai-assistant">
      <div className="ai-header">
        <div className="ai-title">
          <Bot size={20} />
          <span>AI Roofing Assistant</span>
        </div>
        <div className="ai-status">
          <div className="status-dot"></div>
          <span>Online</span>
        </div>
      </div>

      <div className="quick-actions">
        <h4>Quick Actions</h4>
        <div className="actions-grid">
          {QUICK_ACTIONS.map(action => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action)}
                className="quick-action-btn"
                title={action.description}
              >
                <Icon size={16} />
                <span>{action.title}</span>
              </button>
            );
          })}
        </div>
      </div>

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
                <div className="message-time">
                  {message.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
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

        <div className="chat-input">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask me anything about your roofing project..."
            disabled={isTyping}
          />
          <button 
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isTyping}
            className="send-btn"
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      <div className="project-summary">
        <h4>Project Status</h4>
        <div className="status-items">
          <div className="status-item">
            <span>Measurements</span>
            <span className={proposalData.measurements?.totalSquares ? 'complete' : 'incomplete'}>
              {proposalData.measurements?.totalSquares ? 'Complete' : 'Pending'}
            </span>
          </div>
          <div className="status-item">
            <span>Materials</span>
            <span className={proposalData.materials?.length ? 'complete' : 'incomplete'}>
              {proposalData.materials?.length || 0} items
            </span>
          </div>
          <div className="status-item">
            <span>Client Info</span>
            <span className={proposalData.clientName ? 'complete' : 'incomplete'}>
              {proposalData.clientName ? 'Complete' : 'Pending'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
