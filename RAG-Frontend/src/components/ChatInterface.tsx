import React, { useState, useRef, useEffect } from 'react';
import { Send, FileText, Bot, User, Plus, MoreHorizontal, Sun, Moon, MessageSquare, Bookmark, LogOut, Settings, Palette, ThumbsUp, ThumbsDown, Copy, Check, CheckCircle } from 'lucide-react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { useNavigate } from 'react-router-dom';

// Add types for messages and documents

type MessageType = 'user' | 'bot' | 'system' | 'error';

interface Message {
  id: number;
  type: MessageType;
  content: string | Array<{
    name?: string;
    description?: string;
    sources?: Array<{
      file_name?: string;
      page_no?: number;
    }>;
  }>;
  timestamp: string;
  sources?: string[];
}

interface Document {
  id: number;
  title: string;
  description?: string;
  uploaded_at: string;
  type?: string;
  size?: string;
  status?: 'uploaded' | 'processing' | 'ready' | 'error';
  path?: string;
}

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#7aa2f7', // blue accent for user
    },
    secondary: {
      main: '#a6adc8', // subtle accent
    },
    background: {
      default: '#18181b', // deep dark
      paper: '#23232a', // slightly lighter for panels
    },
    text: {
      primary: '#e4e4e4',
      secondary: '#a6adc8',
    },
  },
  typography: {
    fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
  },
});

const ChatBot = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeNavItem, setActiveNavItem] = useState('chats');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [hoveredMessage, setHoveredMessage] = useState<number | null>(null);
  const [copiedMessage, setCopiedMessage] = useState<number | null>(null);
  const [messageRatings, setMessageRatings] = useState<Record<number, 'up' | 'down' | undefined>>({});
  // Add state for sidebar collapse
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Add state for documents sidebar visibility
  const [showDocumentsSidebar, setShowDocumentsSidebar] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch documents from API
  const fetchDocuments = async () => {
    try {
      setLoadingDocuments(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/user/documents', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform the API response to match our Document interface
      const transformedDocuments: Document[] = data.documents.map((doc: any, index: number) => ({
        id: doc.doc_id || index + 1,
        title: doc.title,
        description: doc.description,
        uploaded_at: doc.uploaded_at,
        type: doc.title?.split('.').pop()?.toUpperCase() || 'UNKNOWN',
        size: 'Unknown',
        status: 'ready'
      }));

      setDocuments(transformedDocuments);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoadingDocuments(false);
    }
  };

  // Fetch documents on component mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now(),
      type: 'user',
      content: inputValue,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');

      const response = await fetch('http://localhost:3000/api/user/query', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          doc_id: selectedDocuments,
          query: inputValue
        })
      });

      if (response.ok) {
      
        const data = await response.json(); // Parse the JSON body

        console.log(data);

        const botMessage: Message = {
          id: Date.now() + 1,
          type: 'bot',
          content: data.results.answer || 'I received your query but got an unexpected response format.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          /* sources: data.content.sources  */
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error(`Failed to get response: ${response.status}`);
      }
    } catch (error) {
      console.error('Query error:', error);
      const errorMessage: Message = {
        id: Date.now() + 1,
        type: 'error',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const newChat = () => {
    setMessages([]);
    setSelectedDocuments([]);
  };

  const handleCopyMessage = async (messageId: number, content: string | Array<{name?: string; description?: string; sources?: Array<{file_name?: string; page_no?: number}>}>) => {
    try {
      const textToCopy = typeof content === 'string' 
        ? content 
        : content.map(item => {
            let itemText = '';
            if (item.name) itemText += `Name: ${item.name}\n`;
            if (item.description) itemText += `Description: ${item.description}\n`;
            if (item.sources && item.sources.length > 0) {
              itemText += 'Sources:\n';
              item.sources.forEach(source => {
                itemText += `  - ${source.file_name || 'Unknown file'}`;
                if (source.page_no) itemText += ` (Page ${source.page_no})`;
                itemText += '\n';
              });
            }
            return itemText.trim();
          }).join('\n\n');
      
      await navigator.clipboard.writeText(textToCopy);
      setCopiedMessage(messageId);
      setTimeout(() => setCopiedMessage(null), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  const handleRateMessage = (messageId: number, rating: 'up' | 'down') => {
    setMessageRatings(prev => ({
      ...prev,
      [messageId]: rating
    }));
    console.log(`Message ${messageId} rated: ${rating}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/signin');
  };

  const handleSelectDocument = (docId: number) => {
    setSelectedDocuments(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const handleSelectAllDocuments = () => {
    if (selectedDocuments.length === documents.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(documents.map(doc => doc.id));
    }
  };

  const navItems = [
    { id: 'profile', icon: User, label: 'Profile' },
    { id: 'chats', icon: MessageSquare, label: 'Chats' },
    { id: 'saved', icon: Bookmark, label: 'Saved' },
    { id: 'theme', icon: Palette, label: 'Theme' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  // Theme classes
  const themeClasses = {
    background: isDarkMode ? 'bg-[#18181b]' : 'bg-gray-50',
    sidebar: isDarkMode ? 'bg-[#23232a]' : 'bg-white',
    border: isDarkMode ? 'border-[#23232a]' : 'border-gray-200',
    text: isDarkMode ? 'text-[#e4e4e4]' : 'text-gray-900',
    secondaryText: isDarkMode ? 'text-[#a6adc8]' : 'text-gray-600',
    input: isDarkMode ? 'bg-[#23232a] text-[#e4e4e4] placeholder-[#a6adc8]' : 'bg-white text-gray-900 placeholder-gray-500',
    button: isDarkMode ? 'hover:bg-[#23232a]' : 'hover:bg-gray-100',
    messageUser: isDarkMode ? 'bg-[#7aa2f7] text-white' : 'bg-blue-500 text-white',
    messageBot: isDarkMode ? 'bg-transparent text-[#e4e4e4]' : 'bg-transparent text-gray-900',
    messageError: isDarkMode ? 'bg-red-600 text-white' : 'bg-red-500 text-white',
    messageSystem: isDarkMode ? 'bg-[#23232a] text-[#e4e4e4]' : 'bg-gray-200 text-gray-900',
    chatItem: isDarkMode ? 'hover:bg-[#23232a]' : 'hover:bg-gray-100',
    activeChat: isDarkMode ? 'bg-[#23232a]' : 'bg-gray-200',
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className={`flex h-screen ${themeClasses.background} ${themeClasses.text}`}>
        {/* Left Navigation Sidebar */}
        <div className={`${sidebarCollapsed ? 'w-12' : 'w-20'} ${themeClasses.sidebar} border-r ${themeClasses.border} flex flex-col items-center py-4 transition-all duration-300`}>
          {/* Collapse/Expand Button */}
          <button
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            className="mb-4 p-2 rounded hover:bg-emerald-700 transition-colors"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <Plus size={20} /> : <MoreHorizontal size={20} />}
          </button>
          {/* Profile Avatar */}
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6 cursor-pointer">
            <User size={20} className="text-white" />
          </div>
          {/* Navigation Items */}
          <div className="flex-1 flex flex-col space-y-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveNavItem(item.id);
                  // Toggle documents sidebar when chat icon is clicked
                  if (item.id === 'chats') {
                    setShowDocumentsSidebar(!showDocumentsSidebar);
                  }
                }}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 ${
                  activeNavItem === item.id
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : `${themeClasses.button} ${themeClasses.secondaryText} hover:text-white`
                }`}
                title={item.label}
              >
                <item.icon size={20} />
              </button>
            ))}
          </div>

          {/* Theme Toggle Slider */}
          <div className="mb-4">
            <div className="flex flex-col items-center space-y-2">
              <div 
                onClick={toggleTheme}
                className={`relative w-12 h-6 rounded-full cursor-pointer transition-colors duration-300 ${
                  isDarkMode ? 'bg-gray-600' : 'bg-blue-400'
                }`}
              >
                <div 
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                    isDarkMode ? 'translate-x-0.5' : 'translate-x-6'
                  }`}
                >
                  <div className="w-full h-full flex items-center justify-center">
                    {isDarkMode ? (
                      <Moon size={12} className="text-gray-600" />
                    ) : (
                      <Sun size={12} className="text-yellow-500" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className={`w-10 h-10 rounded-lg flex items-center justify-center hover:bg-red-600 ${themeClasses.secondaryText} hover:text-white transition-all duration-200 mb-2`}
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>

        {/* Documents Sidebar - Only show when chats is active */}
        {activeNavItem === 'chats' && showDocumentsSidebar && (
          <div className={`w-80 ${themeClasses.sidebar} border-r ${themeClasses.border} flex flex-col`}>
            <div className={`p-4 border-b ${themeClasses.border}`}>
              <div className="flex items-center justify-between mb-4">
                <h1 className={`text-xl font-semibold ${themeClasses.text}`}>Documents</h1>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={newChat}
                    className="p-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                  <button className={`p-2 ${themeClasses.button} rounded-lg transition-colors`}>
                    <MoreHorizontal size={16} />
                  </button>
                </div>
              </div>

              {/* Select All Button */}
              <div className="mb-4">
                <button
                  onClick={handleSelectAllDocuments}
                  className={`w-full p-2 ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} rounded-lg transition-colors flex items-center justify-center space-x-2`}
                >
                  <CheckCircle size={16} />
                  <span>{selectedDocuments.length === documents.length ? 'Deselect All' : 'Select All'}</span>
                </button>
              </div>

              {/* Selected Documents Count */}
              {selectedDocuments.length > 0 && (
                <div className={`mb-4 p-2 ${isDarkMode ? 'bg-emerald-900' : 'bg-emerald-100'} rounded-lg`}>
                  <p className={`text-sm ${isDarkMode ? 'text-emerald-200' : 'text-emerald-800'}`}>
                    {selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loadingDocuments ? (
                <div className="flex items-center justify-center h-32">
                  <div className={`text-center ${themeClasses.secondaryText}`}>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-2"></div>
                    <p className="text-sm">Loading documents...</p>
                  </div>
                </div>
              ) : documents.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <div className={`text-center ${themeClasses.secondaryText}`}>
                    <FileText size={32} className="mx-auto mb-2" />
                    <p className="text-sm">No documents available</p>
                  </div>
                </div>
              ) : (
              <div className="space-y-2">
                  {documents.map((doc) => (
                  <div
                      key={doc.id}
                      onClick={() => handleSelectDocument(doc.id)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                        selectedDocuments.includes(doc.id) 
                          ? `${isDarkMode ? 'bg-emerald-700 border-emerald-500' : 'bg-emerald-100 border-emerald-500'}`
                          : `${themeClasses.chatItem} ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                        <div className={`w-2 h-2 ${selectedDocuments.includes(doc.id) ? 'bg-emerald-500' : 'bg-gray-400'} rounded-full`}></div>
                        <h3 className={`font-medium text-sm ${themeClasses.text}`}>{doc.title}</h3>
                        {selectedDocuments.includes(doc.id) && (
                          <CheckCircle size={14} className="text-emerald-500" />
                        )}
                    </div>
                    {doc.description && (
                      <div className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{doc.description}</div>
                    )}
                      <p className={`text-xs ${themeClasses.secondaryText} mb-1`}>
                        {doc.type} • {doc.size}
                      </p>
                      <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </span>
                  </div>
                ))}
              </div>
              )}
            </div>
          </div>
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          <div className={`p-4 border-b ${themeClasses.border} ${themeClasses.sidebar}`}>
            <div className="flex items-center justify-between">
              <h2 className={`text-lg font-semibold ${themeClasses.text}`}>
                UCS Chatbot
              </h2>
              <div className="flex items-center space-x-2">
                <MoreHorizontal size={20} className={themeClasses.secondaryText} />
              </div>
            </div>
          </div>

          <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${themeClasses.background}`}>
            {activeNavItem !== 'chats' ? (
              <div className="flex items-center justify-center h-full">
                <div className={`text-center ${themeClasses.secondaryText}`}>
                  <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    {React.createElement(navItems.find(item => item.id === activeNavItem)?.icon || MessageSquare, { size: 32, className: "text-white" })}
                  </div>
                  <p className={`text-lg font-medium mb-2 ${themeClasses.text}`}>
                    {navItems.find(item => item.id === activeNavItem)?.label || 'Dashboard'}
                  </p>
                  <p className="text-sm">This section is under development.</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className={`text-center ${themeClasses.secondaryText}`}>
                  <Bot size={48} className="mx-auto mb-4 text-emerald-500" />
                  <p className={`text-lg font-medium mb-2 ${themeClasses.text}`}>Welcome to UCS Chatbot</p>
                  <p className="text-sm">Select documents and start asking questions!</p>
                  {selectedDocuments.length === 0 ? (
                    <p className="text-xs mt-2 text-red-400">Please select at least one document to start chatting.</p>
                  ) : (
                    <div className={`mt-3 p-3 rounded-lg ${isDarkMode ? 'bg-emerald-900/20' : 'bg-emerald-50'} border ${isDarkMode ? 'border-emerald-700' : 'border-emerald-200'}`}>
                      <p className={`text-xs font-medium ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'} mb-1`}>
                        Ready to chat with {selectedDocuments.length} selected document{selectedDocuments.length !== 1 ? 's' : ''}
                      </p>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {documents
                          .filter(doc => selectedDocuments.includes(doc.id))
                          .slice(0, 3)
                          .map(doc => (
                            <span key={doc.id} className={`text-xs px-2 py-1 rounded-full ${isDarkMode ? 'bg-emerald-800 text-emerald-200' : 'bg-emerald-200 text-emerald-800'}`}>
                              {doc.title}
                            </span>
                          ))}
                        {selectedDocuments.length > 3 && (
                          <span className={`text-xs px-2 py-1 rounded-full ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                            +{selectedDocuments.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {/* Centered Query Bar */}
                <div className="mt-10 w-full flex justify-center">
                  <div className={`w-full max-w-xl p-4 rounded-2xl shadow-lg ${isDarkMode ? 'bg-[#23232a] border border-[#23232a]' : 'bg-white border border-gray-200'}`}>
                    <div className="flex space-x-3">
                      <div className="flex-1 relative">
                        <textarea
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder={
                            selectedDocuments.length === 0 
                              ? "Select documents first, then ask questions" 
                              : `Ask questions about ${selectedDocuments.length} selected document${selectedDocuments.length !== 1 ? 's' : ''}...`
                          }
                          className={`w-full p-3 text-base rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 ${themeClasses.input}`}
                          rows={1}
                          style={{ minHeight: '44px', maxHeight: '120px' }}
                          disabled={selectedDocuments.length === 0}
                        />
                      </div>
                      <button
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim() || isLoading || selectedDocuments.length === 0}
                        className="p-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
                  <div className={`flex ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'} w-full`}>
                    <div className={`flex-shrink-0 ${message.type === 'user' ? 'ml-2' : 'mr-2'}`}>
                      {message.type === 'user' ? (
                        <div className="w-8 h-8 bg-[#7aa2f7] rounded-full flex items-center justify-center">
                          <User size={16} className="text-white" />
                        </div>
                      ) : message.type === 'system' ? (
                        <div className="w-8 h-8 bg-[#23232a] rounded-full flex items-center justify-center">
                          <FileText size={16} className="text-[#a6adc8]" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-[#23232a] rounded-full flex items-center justify-center">
                          <Bot size={16} className="text-[#7aa2f7]" />
                        </div>
                      )}
                    </div>
                    <div className={`flex-1 ${message.type === 'user' ? 'flex justify-end' : 'w-full'}`}> {/* user: compact, bot: full width */}
                                              <div
                          className={`p-4 rounded-xl relative group animate-in fade-in duration-300 ${
                            message.type === 'user'
                              ? `${themeClasses.messageUser} rounded-br-md inline-block`
                              : message.type === 'error'
                              ? `${themeClasses.messageError} rounded-bl-md`
                              : message.type === 'system'
                              ? `${themeClasses.messageSystem} rounded-bl-md`
                              : `${themeClasses.messageBot} rounded-bl-md w-full shadow-none`
                          }`}
                        style={{ boxShadow: message.type === 'user' ? '0 2px 8px 0 #0002' : 'none' }}
                      >
                        <div className="text-base whitespace-pre-wrap leading-relaxed">
                          {typeof message.content === 'string' ? (
                            <span dangerouslySetInnerHTML={{
                              __html: message.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            }} />
                          ) : Array.isArray(message.content) ? (
                            <div className="space-y-3">
                              {/* Main content as bullet points */}
                              {message.content.map((item, index) => (
                                <div key={index} className="flex items-start space-x-2">
                                  <div className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${isDarkMode ? 'bg-emerald-400' : 'bg-emerald-500'}`}></div>
                                  <div className="flex-1">
                                    {item.name && (
                                      <div className="mb-1">
                                        <span className={`font-medium ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                                          <span dangerouslySetInnerHTML={{
                                            __html: item.name.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                          }} />
                                        </span>
                                      </div>
                                    )}
                                    {item.description && (
                                      <div>
                                        <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                          <span dangerouslySetInnerHTML={{
                                            __html: item.description.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                          }} />
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                              
                              {/* All sources combined at the bottom */}
                              {(() => {
                                const allSources = message.content
                                  .filter(item => item.sources && item.sources.length > 0)
                                  .flatMap(item => item.sources || []);
                                
                                if (allSources.length > 0) {
                                  return (
                                    <div className={`mt-4 pt-3 border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                                      <div className="flex items-center space-x-2 mb-2">
                                        <FileText size={14} className={`${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                                        <p className={`text-xs font-medium ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                                          Sources
                                        </p>
                                      </div>
                                      <div className="space-y-1">
                                        {allSources.map((source, sourceIndex) => (
                                          <div key={sourceIndex} className="flex items-center space-x-2">
                                            <div className={`w-1 h-1 rounded-full ${isDarkMode ? 'bg-gray-400' : 'bg-gray-500'}`}></div>
                                            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                              {source.file_name && (
                                                <span className="font-medium">
                                                  <span dangerouslySetInnerHTML={{
                                                    __html: source.file_name.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                                  }} />
                                                </span>
                                              )}
                                              {source.page_no && (
                                                <span className={`ml-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                                  (Page {source.page_no})
                                                </span>
                                              )}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          ) : (
                            JSON.stringify(message.content)
                          )}
                        </div>
                        {message.sources && message.sources.length > 0 && (
                          <div className={`mt-3 pt-3 border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                            <div className="flex items-center space-x-2 mb-2">
                              <FileText size={14} className={`${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                              <p className={`text-xs font-medium ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                                Sources & References
                              </p>
                            </div>
                            <div className="space-y-1">
                              {message.sources.map((source, index) => (
                                <div key={index} className={`flex items-start space-x-2 p-2 rounded ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${isDarkMode ? 'bg-emerald-400' : 'bg-emerald-500'}`}></div>
                                  <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                    {source}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Action buttons for bot messages */}
                        {(message.type === 'bot' || message.type === 'system') && hoveredMessage === message.id && (
                          <div className={`absolute -bottom-2 right-2 flex items-center space-x-1 ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'} rounded-lg p-1 shadow-lg border`}>
                            <button
                              onClick={() => handleCopyMessage(message.id, message.content)}
                              className={`p-1.5 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} rounded transition-colors`}
                              title="Copy message"
                            >
                              {copiedMessage === message.id ? (
                                <Check size={14} className="text-green-400" />
                              ) : (
                                <Copy size={14} className={`${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`} />
                              )}
                            </button>
                            <button
                              onClick={() => handleRateMessage(message.id, 'up')}
                              className={`p-1.5 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} rounded transition-colors ${
                                messageRatings[message.id] === 'up' ? 'text-green-400' : `${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
                              }`}
                              title="Good response"
                            >
                              <ThumbsUp size={14} />
                            </button>
                            <button
                              onClick={() => handleRateMessage(message.id, 'down')}
                              className={`p-1.5 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} rounded transition-colors ${
                                messageRatings[message.id] === 'down' ? 'text-red-400' : `${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
                              }`}
                              title="Poor response"
                            >
                              <ThumbsDown size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            {isLoading && activeNavItem === 'chats' && (
              <div className="flex justify-start mb-4">
                <div className="flex flex-row space-x-3 max-w-3xl">
                  <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
                    <Bot size={16} className="text-white" />
                  </div>
                  <div className="flex-1 ml-3">
                    <div className="flex items-center space-x-2 mb-1 justify-start">
                      <span className={`font-medium text-sm ${themeClasses.text}`}>Response</span>
                      <span className={`text-xs ${themeClasses.secondaryText}`}>typing...</span>
                    </div>
                    <div className={`${themeClasses.messageBot} p-3 rounded-lg rounded-bl-sm`}>
                      <div className="flex space-x-1">
                        <div className={`w-2 h-2 ${isDarkMode ? 'bg-gray-400' : 'bg-gray-500'} rounded-full animate-bounce`}></div>
                        <div className={`w-2 h-2 ${isDarkMode ? 'bg-gray-400' : 'bg-gray-500'} rounded-full animate-bounce`} style={{ animationDelay: '0.1s' }}></div>
                        <div className={`w-2 h-2 ${isDarkMode ? 'bg-gray-400' : 'bg-gray-500'} rounded-full animate-bounce`} style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area - Only show for chats */}
          {activeNavItem === 'chats' && messages.length > 0 && (
            <div className={`p-4 border-t ${themeClasses.border} ${themeClasses.sidebar} flex justify-center`}>
              <div className="w-full max-w-6xl flex items-center bg-gray-800 rounded-full shadow-lg px-6 py-3 space-x-3 border border-gray-800">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask anything"
                  className="flex-1 bg-transparent text-[#e4e4e4] placeholder-[#a6adc8] border-none outline-none resize-none text-base px-2 py-1 rounded-full min-h-[36px] max-h-[120px]"
                  rows={1}
                  style={{ minHeight: '36px', maxHeight: '120px' }}
                  disabled={selectedDocuments.length === 0}
                />
                <button
                  className="p-2 rounded-full hover:bg-[#18181b] transition-colors"
                  title="Voice input (not implemented)"
                  disabled
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#a6adc8]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18v2m0 0a4 4 0 01-4-4h8a4 4 0 01-4 4zm0 0v-2m0 0a4 4 0 01-4-4V7a4 4 0 018 0v5a4 4 0 01-4 4z" /></svg>
                </button>
                <button
                  className="p-2 rounded-full hover:bg-[#18181b] transition-colors"
                  title="Waveform (not implemented)"
                  disabled
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#a6adc8]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h2m4 0h2m4 0h2m-6 0v6m0-6V6" /></svg>
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading || selectedDocuments.length === 0}
                  className="p-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:opacity-50 rounded-full transition-colors flex items-center justify-center ml-1"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ThemeProvider>
  );
};

export default ChatBot;