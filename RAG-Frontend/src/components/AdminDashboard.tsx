import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Trash2, Download, Search, MoreHorizontal, Sun, Moon, Settings, Palette, LogOut, User, Shield, AlertCircle, CheckCircle, X, Eye, Calendar, FileType, HardDrive } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Types for documents and admin interface
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

interface AdminStats {
  totalDocuments: number;
  totalSize: string;
  successfulUploads: number;
  failedUploads: number;
}

const darkTheme = {
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
};

const AdminInterface = () => {
  const navigate = useNavigate();
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [adminStats, setAdminStats] = useState<AdminStats>({
    totalDocuments: 0,
    totalSize: '0 MB',
    successfulUploads: 0,
    failedUploads: 0
  });

  const [isUploading, setIsUploading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeNavItem, setActiveNavItem] = useState('documents');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [documentsToDelete, setDocumentsToDelete] = useState<number[]>([]);
  const [showUploadSuccess, setShowUploadSuccess] = useState(false);
  const [uploadSuccessCount, setUploadSuccessCount] = useState(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [uploadDescription, setUploadDescription] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch documents from API
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      
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
        size: 'Unknown', // API doesn't provide size, so we'll show Unknown
        status: 'ready' // Assuming all fetched documents are ready
      }));

      setDocuments(transformedDocuments);
      
      // Update admin stats based on fetched data
      setAdminStats({
        totalDocuments: transformedDocuments.length,
        totalSize: `${transformedDocuments.length} documents`,
        successfulUploads: transformedDocuments.length,
        failedUploads: 0
      });
      
    } catch (error) {
      console.error('Error fetching documents:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  // Fetch documents on component mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    // Remove token from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Redirect to login page
    navigate('/signin');
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files as FileList);
    if (files.length === 0) return;

    setIsUploading(true);

    // Create documents for each file with initial processing status
    const newDocs: Document[] = files.map(file => ({
      id: Date.now() + Math.random(),
      title: file.name,
      description: uploadDescription || undefined,
      type: file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN',
      size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      uploaded_at: new Date().toLocaleString('en-CA', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      }).replace(',', ''),
      status: 'processing'
    }));

    // Add all documents to the list immediately
    setDocuments(prev => [...newDocs, ...prev]);

    // Upload each file to the server
    let successCount = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const doc = newDocs[i];

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('description', uploadDescription);

        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3000/api/admin/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData,
        });

        if (response.ok) {
          // Update document status to ready
          setDocuments(prev => prev.map(docItem => 
            docItem.id === doc.id 
              ? { ...docItem, status: 'ready' }
              : docItem
          ));
          successCount++;
        } else {
          // Update document status to error
          setDocuments(prev => prev.map(docItem => 
            docItem.id === doc.id 
              ? { ...docItem, status: 'error' }
              : docItem
          ));
        }
      } catch (error) {
        console.error('Upload error:', error);
        // Update document status to error
        setDocuments(prev => prev.map(docItem => 
          docItem.id === doc.id 
            ? { ...docItem, status: 'error' }
            : docItem
        ));
      }
    }

    setIsUploading(false);
    
    // Show success notification if any files uploaded successfully
    if (successCount > 0) {
      setUploadSuccessCount(successCount);
      setShowUploadSuccess(true);
      setTimeout(() => setShowUploadSuccess(false), 5000);
      
      // Refresh the documents list to show the newly uploaded documents
      setTimeout(() => {
        fetchDocuments();
      }, 1000);
    }
    
    // Reset file input and description
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setUploadDescription('');
  };

  const handleDeleteDocuments = (docIds: number[]) => {
    setDocumentsToDelete(docIds);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Delete each document from the server
      for (const docId of documentsToDelete) {
        const response = await fetch(`http://localhost:3000/api/admin/delete/${docId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to delete document ${docId}: ${response.status}`);
        }

        const result = await response.json();
        console.log(`Delete response for document ${docId}:`, result);
      }

      // Remove deleted documents from local state
      setDocuments(prev => prev.filter(doc => !documentsToDelete.includes(doc.id)));
      setSelectedDocuments([]);
      setShowDeleteConfirm(false);
      setDocumentsToDelete([]);
      
      // Show success message
      alert(`Successfully deleted ${documentsToDelete.length} document(s)`);
      
    } catch (error) {
      console.error('Error deleting documents:', error);
      alert(`Error deleting documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setDocumentsToDelete([]);
  };

  const handleSelectDocument = (docId: number) => {
    setSelectedDocuments(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const handleSelectAll = () => {
    const filteredDocs = documents.filter(doc => 
      doc.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (selectedDocuments.length === filteredDocs.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(filteredDocs.map(doc => doc.id));
    }
  };

  const filteredDocuments = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (status: Document['status']) => {
    switch (status) {
      case 'ready':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'processing':
        return (
          <div className="flex items-center space-x-1">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        );
      case 'error':
        return <AlertCircle size={16} className="text-red-400" />;
      default:
        return <FileText size={16} className="text-gray-400" />;
    }
  };

  const getStatusText = (status: Document['status']) => {
    switch (status) {
      case 'ready':
        return 'Ready';
      case 'processing':
        return 'Processing...';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  const navItems = [
    { id: 'documents', icon: FileText, label: 'Documents' },
    { id: 'storage', icon: HardDrive, label: 'Storage' },
    { id: 'analytics', icon: FileType, label: 'Analytics' },
    { id: 'theme', icon: Palette, label: 'Theme' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  // Theme classes
  const themeClasses = {
    background: isDarkMode ? 'bg-gray-900' : 'bg-gray-50',
    sidebar: isDarkMode ? 'bg-gray-800' : 'bg-white',
    border: isDarkMode ? 'border-gray-700' : 'border-gray-200',
    text: isDarkMode ? 'text-white' : 'text-gray-900',
    secondaryText: isDarkMode ? 'text-gray-400' : 'text-gray-600',
    input: isDarkMode ? 'bg-gray-700 text-white placeholder-gray-400' : 'bg-white text-gray-900 placeholder-gray-500',
    button: isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100',
    card: isDarkMode ? 'bg-gray-800' : 'bg-white',
    table: isDarkMode ? 'bg-gray-800' : 'bg-white',
    tableRow: isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50',
    selectedRow: isDarkMode ? 'bg-blue-900' : 'bg-blue-50'
  };

  return (
    <div className={`flex h-screen ${themeClasses.background} ${themeClasses.text}`}>
        {/* Left Navigation Sidebar */}
        <div className={`w-16 ${themeClasses.sidebar} border-r ${themeClasses.border} flex flex-col items-center py-4`}>
          {/* Admin Avatar */}
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center mb-6 cursor-pointer">
            <Shield size={20} className="text-white" />
          </div>

          {/* Navigation Items */}
          <div className="flex-1 flex flex-col space-y-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveNavItem(item.id)}
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

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          <div className={`p-4 border-b ${themeClasses.border} ${themeClasses.sidebar}`}>
            <div className="flex items-center justify-between">
              <h2 className={`text-lg font-semibold ${themeClasses.text}`}>
                UCS Admin Panel
              </h2>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className={themeClasses.secondaryText}>System Online</span>
              </div>
            </div>
          </div>

          <div className={`flex-1 overflow-y-auto p-6 ${themeClasses.background}`}>
            {activeNavItem !== 'documents' ? (
              <div className="flex items-center justify-center h-full">
                <div className={`text-center ${themeClasses.secondaryText}`}>
                  <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    {React.createElement(navItems.find(item => item.id === activeNavItem)?.icon || FileText, { size: 32, className: "text-white" })}
                  </div>
                  <p className={`text-lg font-medium mb-2 ${themeClasses.text}`}>
                    {navItems.find(item => item.id === activeNavItem)?.label || 'Dashboard'}
                  </p>
                  <p className="text-sm">This section is under development.</p>
                </div>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className={`text-lg font-medium ${themeClasses.text}`}>Loading documents...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className={`text-lg font-medium ${themeClasses.text} mb-2`}>Error loading documents</p>
                  <p className={`text-sm ${themeClasses.secondaryText} mb-4`}>{error}</p>
                  <button
                    onClick={fetchDocuments}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className={`${themeClasses.card} p-4 rounded-lg border ${themeClasses.border}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm ${themeClasses.secondaryText}`}>Total Documents</p>
                        <p className={`text-2xl font-bold ${themeClasses.text}`}>{adminStats.totalDocuments}</p>
                      </div>
                      <FileText className="text-emerald-500" size={24} />
                    </div>
                  </div>
                  <div className={`${themeClasses.card} p-4 rounded-lg border ${themeClasses.border}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm ${themeClasses.secondaryText}`}>Total Size</p>
                        <p className={`text-2xl font-bold ${themeClasses.text}`}>{adminStats.totalSize}</p>
                      </div>
                      <HardDrive className="text-blue-500" size={24} />
                    </div>
                  </div>
                  <div className={`${themeClasses.card} p-4 rounded-lg border ${themeClasses.border}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm ${themeClasses.secondaryText}`}>Successful</p>
                        <p className={`text-2xl font-bold text-green-400`}>{adminStats.successfulUploads}</p>
                      </div>
                      <CheckCircle className="text-green-500" size={24} />
                    </div>
                  </div>
                  <div className={`${themeClasses.card} p-4 rounded-lg border ${themeClasses.border}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm ${themeClasses.secondaryText}`}>Failed</p>
                        <p className={`text-2xl font-bold text-red-400`}>{adminStats.failedUploads}</p>
                      </div>
                      <AlertCircle className="text-red-500" size={24} />
                    </div>
                  </div>
                </div>

                {/* Upload Section */}
                <div className={`${themeClasses.card} p-6 rounded-lg border ${themeClasses.border} mb-6`}>
                  <h3 className={`text-lg font-semibold mb-4 ${themeClasses.text}`}>Upload Documents</h3>
                  
                  {/* Description Input */}
                  <div className="mb-4">
                    <label htmlFor="upload-description" className={`block text-sm font-medium mb-2 ${themeClasses.text}`}>
                      Document Description (Optional)
                    </label>
                    <textarea
                      id="upload-description"
                      value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                      placeholder="Enter a description for the documents being uploaded..."
                      rows={3}
                      className={`w-full px-3 py-2 ${themeClasses.input} rounded-lg border ${themeClasses.border} focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none`}
                      disabled={isUploading}
                    />
                  </div>
                  
                  <div className="mb-4">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      multiple
                      accept=".pdf,.txt,.docx,.md,.doc"
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className={`w-full p-6 ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 border-gray-600' : 'bg-gray-100 hover:bg-gray-200 border-gray-300'} rounded-lg border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center space-y-2 ${isUploading ? 'opacity-50 cursor-not-allowed border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'cursor-pointer hover:border-emerald-400'}`}
                    >
                      <div className="relative">
                        <Upload size={32} className={`transition-all duration-300 ${isUploading ? 'animate-bounce text-emerald-500' : ''}`} />
                        {isUploading && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-ping"></div>
                        )}
                      </div>
                      <span className={`text-lg font-medium transition-colors duration-300 ${isUploading ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                        {isUploading ? 'Uploading Documents...' : 'Click to Upload Documents'}
                      </span>
                      <span className={`text-sm ${themeClasses.secondaryText}`}>
                        Supports PDF, TXT, DOCX, MD files
                      </span>
                      {isUploading && (
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                          <div className="bg-emerald-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                        </div>
                      )}
                    </button>
                  </div>
                  
                  {/* Upload Progress Indicator */}
                  {isUploading && (
                    <div className={`mt-4 p-4 ${isDarkMode ? 'bg-emerald-900/20' : 'bg-emerald-50'} rounded-lg border border-emerald-200 dark:border-emerald-800`}>
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className={`text-sm font-medium ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                          Uploading to server...
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Document Management Section */}
                <div className={`${themeClasses.card} rounded-lg border ${themeClasses.border}`}>
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`text-lg font-semibold ${themeClasses.text}`}>Document Library</h3>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={fetchDocuments}
                          disabled={loading}
                          className={`px-3 py-2 ${themeClasses.button} rounded-lg transition-colors flex items-center space-x-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title="Refresh documents"
                        >
                          <div className={`w-4 h-4 ${loading ? 'border-2 border-emerald-500 border-t-transparent rounded-full animate-spin' : ''}`}></div>
                          <span>Refresh</span>
                        </button>
                        {selectedDocuments.length > 0 && (
                          <button
                            onClick={() => handleDeleteDocuments(selectedDocuments)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                          >
                            <Trash2 size={16} />
                            <span>Delete Selected ({selectedDocuments.length})</span>
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="relative flex justify-center my-4">
  <div className=" relative">
    <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${themeClasses.secondaryText}`} size={16} />
    <input
      type="text"
      placeholder="Search documents..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className={`w-full pl-10 pr-4 py-2 ${themeClasses.input} rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500`}
      style={{ minWidth: 320 }}
    />
  </div>
</div>
</div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <tr>
                          <th className="px-6 py-3 text-left">
                            <input
                              type="checkbox"
                              checked={selectedDocuments.length === filteredDocuments.length && filteredDocuments.length > 0}
                              onChange={handleSelectAll}
                              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                            />
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium ${themeClasses.secondaryText} uppercase tracking-wider`}>
                            Document Name
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium ${themeClasses.secondaryText} uppercase tracking-wider`}>
                            Type
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium ${themeClasses.secondaryText} uppercase tracking-wider`}>
                            Size
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium ${themeClasses.secondaryText} uppercase tracking-wider`}>
                            Upload Date
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium ${themeClasses.secondaryText} uppercase tracking-wider`}>
                            Status
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium ${themeClasses.secondaryText} uppercase tracking-wider`}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredDocuments.map((doc) => (
                          <tr 
                            key={doc.id} 
                            className={`${themeClasses.tableRow} ${selectedDocuments.includes(doc.id) ? themeClasses.selectedRow : ''}`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedDocuments.includes(doc.id)}
                                onChange={() => handleSelectDocument(doc.id)}
                                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-3">
                                <FileText size={16} className={themeClasses.secondaryText} />
                                <span className={`text-sm font-medium ${themeClasses.text}`}>{doc.title}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                doc.type === 'PDF' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                doc.type === 'DOCX' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                doc.type === 'TXT' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                              }`}>
                                {doc.type}
                              </span>
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${themeClasses.secondaryText}`}>
                              {doc.size}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${themeClasses.secondaryText}`}>
                              {doc.uploaded_at}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(doc.status)}
                                <span className={`text-sm ${
                                  doc.status === 'ready' ? 'text-green-400' :
                                  doc.status === 'processing' ? 'text-blue-400' :
                                  doc.status === 'error' ? 'text-red-400' :
                                  themeClasses.secondaryText
                                }`}>
                                  {getStatusText(doc.status)}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleDeleteDocuments([doc.id])}
                                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors text-red-600"
                                  title="Delete Document"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`${themeClasses.card} p-6 rounded-lg border ${themeClasses.border} max-w-md w-full mx-4`}>
              <div className="flex items-center space-x-3 mb-4">
                <AlertCircle className="text-red-500" size={24} />
                <h3 className={`text-lg font-semibold ${themeClasses.text}`}>Confirm Deletion</h3>
              </div>
              <p className={`text-sm ${themeClasses.secondaryText} mb-6`}>
                Are you sure you want to delete {documentsToDelete.length} document(s)? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={cancelDelete}
                  className={`px-4 py-2 ${themeClasses.button} rounded-lg transition-colors`}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Success Notification */}
        {showUploadSuccess && (
          <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
            <div className="bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3">
              <CheckCircle size={20} />
              <div>
                <p className="font-medium">Upload Successful!</p>
                <p className="text-sm opacity-90">{uploadSuccessCount} document(s) uploaded successfully</p>
              </div>
              <button
                onClick={() => setShowUploadSuccess(false)}
                className="ml-4 hover:bg-green-600 rounded-full p-1 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Logout Confirmation Modal */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`${themeClasses.card} p-6 rounded-lg border ${themeClasses.border} max-w-md w-full mx-4`}>
              <div className="flex items-center space-x-3 mb-4">
                <LogOut className="text-red-500" size={24} />
                <h3 className={`text-lg font-semibold ${themeClasses.text}`}>Confirm Logout</h3>
              </div>
              <p className={`text-sm ${themeClasses.secondaryText} mb-6`}>
                Are you sure you want to logout? You will need to login again to access the admin panel.
              </p>
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={cancelLogout}
                  className={`px-4 py-2 ${themeClasses.button} rounded-lg transition-colors`}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLogout}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      
    </div>
  );
};

export default AdminInterface;