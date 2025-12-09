import React, { useState, useEffect, useCallback } from 'react';
import projectService from '../services/projectService';
import authService from '../services/authService';
import CreateProjectModal from '../Components/ProjectModule/CreateProjectModal';
import { Trash2, Plus, RefreshCw, AlertCircle, CheckCircle2, FolderOpen, Briefcase } from 'lucide-react';

const ProjectDashboard = ({ onProjectSelect, userSession }) => {
  const [projects, setProjects] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [authStatus, setAuthStatus] = useState('checking');
  const [serverStatus, setServerStatus] = useState('checking');
  const [retryCount, setRetryCount] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  // Memoized authentication check
  const checkAuthentication = useCallback(() => {
    try {
      const isAuthenticated = authService.isAuthenticated();
      
      if (!isAuthenticated) {
        setAuthStatus('unauthenticated');
        setError('Please login to access your projects');
        return false;
      }

      setAuthStatus('authenticated');
      setError('');
      return true;

    } catch (error) {
      console.error('❌ Auth check error:', error);
      setAuthStatus('error');
      setError('Authentication check failed');
      return false;
    }
  }, []);

  // Memoized server connection check
  const checkServerConnection = useCallback(async () => {
    try {
      setServerStatus('checking');
      const isConnected = await projectService.checkServerConnection();
      setServerStatus(isConnected ? 'connected' : 'disconnected');
      
      if (!isConnected) {
        setError('Server is currently unavailable. Please try again later.');
      } else {
        setError(prev => prev.includes('Server is currently unavailable') ? '' : prev);
      }
      
      return isConnected;
    } catch (error) {
      console.error('❌ Server connection check failed:', error);
      setServerStatus('disconnected');
      setError('Server is currently unavailable. Please try again later.');
      return false;
    }
  }, []);

  // Memoized projects loader - FIXED: removed loading dependency
  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await projectService.getAllProjects();
      
      let projectsArray = [];
      if (Array.isArray(data)) {
        projectsArray = data;
      } else if (data && typeof data === 'object') {
        projectsArray = data.projects || data.data || data.items || [];
      }
      
      setProjects(projectsArray);
      setError('');
      setRetryCount(0);
      
    } catch (error) {
      console.error('❌ Load projects error:', error);
      const errorMessage = error.message || 'Failed to load projects. Please try again.';
      setError(errorMessage);

      if (error.message?.includes('401') || error.message?.includes('Session expired') || error.message?.includes('Authentication required')) {
        setAuthStatus('unauthenticated');
        clearAuthData();
      }
    } finally {
      setLoading(false);
    }
  }, []); // REMOVED: loading dependency

  // Combined server check and projects load
  const checkServerAndLoadProjects = useCallback(async () => {
    const isConnected = await checkServerConnection();
    
    if (isConnected && authStatus === 'authenticated') {
      await loadProjects();
    }
  }, [checkServerConnection, authStatus, loadProjects]);

  // Initialize dashboard
  const initializeDashboard = useCallback(async () => {
    const isAuthenticated = checkAuthentication();
    
    if (isAuthenticated) {
      await checkServerAndLoadProjects();
    } else {
      await checkServerConnection();
    }
  }, [checkAuthentication, checkServerAndLoadProjects, checkServerConnection]);

  useEffect(() => {
    initializeDashboard();
  }, [initializeDashboard]);

  const clearAuthData = () => {
    authService.logout();
  };

  const handleCreateProject = async (projectData) => {
    setCreating(true);
    setError('');
    
    try {
      if (!authService.isAuthenticated()) {
        throw new Error('Authentication lost. Please login again.');
      }
      
      // Validation
      if (!projectData.name?.trim()) {
        throw new Error('Project name is required');
      }
      if (!projectData.budget || projectData.budget <= 0) {
        throw new Error('Valid budget amount is required');
      }

      const budgetValue = typeof projectData.budget === 'string' 
        ? parseFloat(projectData.budget.replace(/,/g, '')) 
        : Number(projectData.budget);

      if (isNaN(budgetValue) || budgetValue <= 0) {
        throw new Error('Please enter a valid budget amount');
      }

      const projectPayload = {
        name: projectData.name.trim(),
        budget: budgetValue,
        description: projectData.description?.trim() || '',
        currency: projectData.currency || 'INR',
      };

      const newProject = await projectService.createProject(projectPayload);
      
      setProjects(prev => [...prev, newProject]);
      setShowCreateModal(false);
      
      setSuccess('Project created successfully!');
      setError('');
      setRetryCount(0);
      
      return newProject;
      
    } catch (error) {
      console.error('❌ Create project error:', error);
      const errorMessage = error.message || 'Failed to create project. Please try again.';
      setError(errorMessage);
      
      setRetryCount(prev => prev + 1);
      
      if (error.message?.includes('Authentication') || error.message?.includes('401')) {
        setAuthStatus('unauthenticated');
      }
      
      throw error;
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProject = async (projectId) => {
    setDeleting(true);
    setError('');
    
    try {
      await projectService.deleteProject(projectId);
      
      const updatedProjects = projects.filter(project => project._id !== projectId);
      setProjects(updatedProjects);
      
      setShowDeleteConfirm(false);
      setProjectToDelete(null);
      setSuccess('Project deleted successfully!');
      
    } catch (error) {
      console.error('❌ Delete project error:', error);
      const errorMessage = error.message || 'Failed to delete project. Please try again.';
      setError(errorMessage);
      
      if (error.message?.includes('Authentication') || error.message?.includes('401')) {
        setAuthStatus('unauthenticated');
      }
    } finally {
      setDeleting(false);
    }
  };

  const confirmDeleteProject = (project) => {
    setProjectToDelete(project);
    setShowDeleteConfirm(true);
  };

  const cancelDeleteProject = () => {
    setShowDeleteConfirm(false);
    setProjectToDelete(null);
  };

  const handleOpenProjectDetails = (project) => {
    console.log('🎯 Opening project:', project.name);
    if (onProjectSelect && typeof onProjectSelect === 'function') {
      onProjectSelect(project);
    } else {
      console.error('❌ onProjectSelect is not a function:', onProjectSelect);
    }
  };

  const calculateProgress = useCallback((project) => {
    if (!project) return 0;
    
    const totalIncome = project.income?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
    const budget = project.budget || 1;
    
    const progress = budget > 0 ? Math.min((totalIncome / budget) * 100, 100) : 0;
    return Math.round(progress * 10) / 10;
  }, []);

  const calculateFinancials = useCallback((project) => {
    const income = project.income || [];
    const expenses = project.expenses || [];
    
    const totalIncome = income.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
    const netAmount = totalIncome - totalExpenses;
    
    return { totalIncome, totalExpenses, netAmount };
  }, []);

  const handleRetry = async () => {
    setError('');
    if (authStatus === 'authenticated') {
      await checkServerAndLoadProjects();
    } else {
      await checkServerConnection();
    }
  };

  const handleClearError = () => {
    setError('');
    setRetryCount(0);
  };

  const handleClearSuccess = () => {
    setSuccess('');
  };

  // Format currency based on project currency
  const formatCurrency = (amount, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Show loading state
  if (loading && projects.length === 0 && authStatus !== 'unauthenticated') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mb-3"></div>
        <p className="text-gray-500 text-sm">Loading projects...</p>
      </div>
    );
  }

  // Show authentication error
  if (authStatus === 'unauthenticated') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <div className="bg-white border border-gray-200 rounded-xl p-8 max-w-md w-full text-center shadow-sm">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-red-500" size={24} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Authentication Required
          </h3>
          <p className="text-gray-600 text-sm mb-6">
            Please login to access your projects
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && projectToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center mr-3">
                <Trash2 className="text-red-500" size={20} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Delete Project</h3>
                <p className="text-gray-600 text-sm">This action cannot be undone.</p>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-700 font-medium text-sm">{projectToDelete.name}</p>
              <p className="text-red-600 text-xs mt-1">
                Budget: {formatCurrency(projectToDelete.budget || 0, projectToDelete.currency)}
              </p>
            </div>

            <p className="text-gray-600 text-sm mb-6">
              All project data including transactions will be permanently deleted.
            </p>

            <div className="flex space-x-2">
              <button
                onClick={() => handleDeleteProject(projectToDelete._id)}
                disabled={deleting}
                className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {deleting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin mr-1.5" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} className="mr-1.5" />
                    Delete
                  </>
                )}
              </button>
              <button
                onClick={cancelDeleteProject}
                disabled={deleting}
                className="flex-1 px-3 py-2 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Centered Heading with Icon */}
          <div className="flex-1 flex justify-center">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-3">
                <Briefcase className="text-indigo-600" size={40} />
                <h1 className="text-2xl font-bold text-gray-900">Project Module</h1>
              </div>
              <p className="text-gray-500 text-sm mt-1">Create and manage your financial projects</p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleRetry}
              disabled={loading || creating || deleting}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button 
              className="flex items-center px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50"
              onClick={() => setShowCreateModal(true)}
              disabled={creating || loading || deleting}
            >
              <Plus size={16} className="mr-1.5" />
              Create Project
            </button>
          </div>
        </div>

        {/* Messages */}
        {success && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle2 className="text-green-500 mr-2" size={16} />
                <p className="text-green-700 text-sm font-medium">{success}</p>
              </div>
              <button 
                onClick={handleClearSuccess}
                className="text-green-600 hover:text-green-800 text-sm"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="text-red-500 mr-2" size={16} />
                <div>
                  <p className="text-red-700 text-sm font-medium">{error}</p>
                  {retryCount > 0 && (
                    <p className="text-xs text-red-600 mt-0.5">
                      Attempt {retryCount} - Please try again
                    </p>
                  )}
                </div>
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={handleRetry}
                  className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
                <button 
                  onClick={handleClearError}
                  className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content - Only Projects List */}
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          {/* Projects Grid */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Your Projects</h2>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                {projects.length} projects
              </span>
            </div>
            
            {projects.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="text-gray-400" size={24} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects yet</h3>
                <p className="text-gray-600 text-sm mb-6">Create your first project to get started</p>
                <button 
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                  onClick={() => setShowCreateModal(true)}
                >
                  Create Project
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map(project => {
                  const progress = calculateProgress(project);
                  const projectFinancials = calculateFinancials(project);
                  const currency = project.currency || 'INR';
                  
                  return (
                    <div
                      key={project._id || project.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-gray-900 text-sm flex-1 truncate mr-2">
                          {project.name}
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDeleteProject(project);
                          }}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                          title="Delete Project"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      
                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>Budget:</span>
                          <span className="font-medium">{formatCurrency(project.budget || 0, currency)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>Income:</span>
                          <span className="text-green-600 font-medium">
                            {formatCurrency(projectFinancials.totalIncome, currency)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>Expenses:</span>
                          <span className="text-red-600 font-medium">
                            {formatCurrency(projectFinancials.totalExpenses, currency)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mb-2">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Progress</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      {/* Stats */}
                      <div className="flex justify-between text-xs text-gray-500 mb-3">
                        <span className="flex items-center">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>
                          {project.income?.length || 0} income
                        </span>
                        <span className="flex items-center">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1"></span>
                          {project.expenses?.length || 0} expenses
                        </span>
                      </div>

                      {/* Open Project Button */}
                      <button
                        onClick={() => handleOpenProjectDetails(project)}
                        className="w-full flex items-center justify-center px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                      >
                        <FolderOpen size={14} className="mr-1.5" />
                        Open Project
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => !creating && setShowCreateModal(false)}
          onCreate={handleCreateProject}
          loading={creating}
        />
      )}
    </div>
  );
};

export default ProjectDashboard;