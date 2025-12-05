import axios from 'axios';
import authService from './authService';
import API_BASE from '../config/api';

const API_BASE_URL = `${process.env.REACT_APP_API_BASE || 'http://localhost:5000'}/api`;

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor to add auth tokens
apiClient.interceptors.request.use(
  (config) => {
    try {
      const token = authService.getToken();
      const tenantId = authService.getTenantId();
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      if (tenantId) {
        config.headers['X-Tenant-ID'] = tenantId;
      }
      
      console.log('🔐 API Request:', {
        url: config.url,
        method: config.method,
        hasToken: !!token,
        hasTenantId: !!tenantId
      });
      
      return config;
    } catch (error) {
      console.error('❌ Request interceptor error:', error);
      
      // If auth error, redirect to login
      if (error.code === 'AUTH_REQUIRED') {
        authService.logout();
        window.location.href = '/login';
      }
      
      return Promise.reject(error);
    }
  },
  (error) => {
    console.error('❌ Request interceptor setup error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data ? 'data received' : 'no data'
    });
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message
    });
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.log('🔐 Authentication error, logging out...');
      authService.logout();
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    }
    
    return Promise.reject(error);
  }
);

// Local Storage Manager for Projects
class LocalProjectManager {
  constructor() {
    this.storageKey = 'local_projects';
    this.projectDataKey = 'project_data';
  }

  getTenantKey() {
    const tenantId = authService.getTenantId();
    return `${this.storageKey}_${tenantId}`;
  }

  getProjectDataKey(projectId) {
    const tenantId = authService.getTenantId();
    return `${this.projectDataKey}_${tenantId}_${projectId}`;
  }

  getAllProjects() {
    try {
      const key = this.getTenantKey();
      const projects = localStorage.getItem(key);
      return projects ? JSON.parse(projects) : [];
    } catch (error) {
      console.error('Error reading local projects:', error);
      return [];
    }
  }

  saveProject(project) {
    try {
      const key = this.getTenantKey();
      const projects = this.getAllProjects();
      
      if (!project._id) {
        project._id = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      if (!project.createdAt) {
        project.createdAt = new Date().toISOString();
      }
      
      project.updatedAt = new Date().toISOString();
      
      // Initialize project structure
      if (!project.income) project.income = [];
      if (!project.expenses) project.expenses = [];
      if (!project.tax) project.tax = [];
      if (!project.status) project.status = 'active';
      if (!project.progressData) project.progressData = this.initializeProgressData();
      if (!project.aiSuggestions) project.aiSuggestions = [];
      if (!project.currency) project.currency = 'INR';
      
      const existingIndex = projects.findIndex(p => p._id === project._id);
      
      if (existingIndex >= 0) {
        projects[existingIndex] = project;
      } else {
        projects.push(project);
      }
      
      localStorage.setItem(key, JSON.stringify(projects));
      
      this.saveProjectData(project._id, {
        transactions: [...project.income, ...project.expenses, ...project.tax],
        progressData: project.progressData,
        aiSuggestions: project.aiSuggestions
      });
      
      return project;
    } catch (error) {
      console.error('Error saving project to local storage:', error);
      throw error;
    }
  }

  initializeProgressData() {
    return {
      timeline: [],
      milestones: [],
      financialProgress: {
        totalBudget: 0,
        spent: 0,
        remaining: 0,
        percentage: 0
      },
      completionRate: 0,
      lastUpdated: new Date().toISOString()
    };
  }

  saveProjectData(projectId, projectData) {
    try {
      const key = this.getProjectDataKey(projectId);
      localStorage.setItem(key, JSON.stringify(projectData));
    } catch (error) {
      console.error(`Error saving project data for ${projectId}:`, error);
    }
  }

  getProjectData(projectId) {
    try {
      const key = this.getProjectDataKey(projectId);
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : {
        transactions: [],
        progressData: this.initializeProgressData(),
        aiSuggestions: []
      };
    } catch (error) {
      console.error(`Error reading project data for ${projectId}:`, error);
      return {
        transactions: [],
        progressData: this.initializeProgressData(),
        aiSuggestions: []
      };
    }
  }

  deleteProject(projectId) {
    try {
      const key = this.getTenantKey();
      const projects = this.getAllProjects();
      const filteredProjects = projects.filter(p => p._id !== projectId);
      localStorage.setItem(key, JSON.stringify(filteredProjects));
      
      const dataKey = this.getProjectDataKey(projectId);
      localStorage.removeItem(dataKey);
      
      return true;
    } catch (error) {
      console.error('Error deleting project from local storage:', error);
      throw error;
    }
  }

  addTransaction(projectId, transactionData, type = 'income') {
    try {
      const key = this.getTenantKey();
      const projects = this.getAllProjects();
      const projectIndex = projects.findIndex(p => p._id === projectId);
      
      if (projectIndex === -1) {
        throw new Error('Project not found');
      }
      
      const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const transaction = {
        _id: transactionId,
        projectId: projectId,
        ...transactionData,
        createdAt: new Date().toISOString(),
        type: type,
        status: 'completed'
      };
      
      if (type === 'income') {
        if (!projects[projectIndex].income) projects[projectIndex].income = [];
        projects[projectIndex].income.push(transaction);
      } else if (type === 'expense') {
        if (!projects[projectIndex].expenses) projects[projectIndex].expenses = [];
        projects[projectIndex].expenses.push(transaction);
      } else if (type === 'tax') {
        if (!projects[projectIndex].tax) projects[projectIndex].tax = [];
        projects[projectIndex].tax.push(transaction);
      }
      
      projects[projectIndex].updatedAt = new Date().toISOString();
      this.updateProjectProgress(projects[projectIndex]);
      
      localStorage.setItem(key, JSON.stringify(projects));
      
      const projectData = this.getProjectData(projectId);
      projectData.transactions = [
        ...(projects[projectIndex].income || []),
        ...(projects[projectIndex].expenses || []),
        ...(projects[projectIndex].tax || [])
      ];
      projectData.progressData = projects[projectIndex].progressData;
      this.saveProjectData(projectId, projectData);
      
      return transaction;
    } catch (error) {
      console.error(`Error adding ${type} transaction:`, error);
      throw error;
    }
  }

  updateProjectProgress(project) {
    if (!project.progressData) {
      project.progressData = this.initializeProgressData();
    }
    
    const totalIncome = project.income?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
    const totalExpenses = project.expenses?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
    const totalTax = project.tax?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
    const netAmount = totalIncome - totalExpenses - totalTax;
    
    project.progressData.financialProgress = {
      totalBudget: project.budget || totalIncome,
      spent: totalExpenses,
      remaining: netAmount,
      percentage: project.budget ? (totalExpenses / project.budget) * 100 : 0
    };
    
    if (project.status === 'completed') {
      project.progressData.completionRate = 100;
    } else if (project.status === 'in-progress') {
      project.progressData.completionRate = 50;
    } else {
      project.progressData.completionRate = 0;
    }
    
    project.progressData.lastUpdated = new Date().toISOString();
    
    return project;
  }

  updateTransaction(projectId, transactionId, transactionData) {
    try {
      const key = this.getTenantKey();
      const projects = this.getAllProjects();
      const projectIndex = projects.findIndex(p => p._id === projectId);
      
      if (projectIndex === -1) {
        throw new Error('Project not found');
      }
      
      const project = projects[projectIndex];
      let transactionIndex = -1;
      let transactionArray = null;
      
      if (project.income) {
        transactionIndex = project.income.findIndex(t => t._id === transactionId);
        if (transactionIndex !== -1) transactionArray = project.income;
      }
      
      if (transactionIndex === -1 && project.expenses) {
        transactionIndex = project.expenses.findIndex(t => t._id === transactionId);
        if (transactionIndex !== -1) transactionArray = project.expenses;
      }
      
      if (transactionIndex === -1 && project.tax) {
        transactionIndex = project.tax.findIndex(t => t._id === transactionId);
        if (transactionIndex !== -1) transactionArray = project.tax;
      }
      
      if (transactionIndex === -1) {
        throw new Error('Transaction not found');
      }
      
      transactionArray[transactionIndex] = {
        ...transactionArray[transactionIndex],
        ...transactionData,
        updatedAt: new Date().toISOString()
      };
      
      project.updatedAt = new Date().toISOString();
      this.updateProjectProgress(project);
      
      localStorage.setItem(key, JSON.stringify(projects));
      
      const projectData = this.getProjectData(projectId);
      projectData.transactions = [
        ...(project.income || []),
        ...(project.expenses || []),
        ...(project.tax || [])
      ];
      projectData.progressData = project.progressData;
      this.saveProjectData(projectId, projectData);
      
      return project;
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  }

  deleteTransaction(projectId, transactionId) {
    try {
      const key = this.getTenantKey();
      const projects = this.getAllProjects();
      const projectIndex = projects.findIndex(p => p._id === projectId);
      
      if (projectIndex === -1) {
        throw new Error('Project not found');
      }
      
      const project = projects[projectIndex];
      let transactionFound = false;
      
      if (project.income) {
        const incomeIndex = project.income.findIndex(t => t._id === transactionId);
        if (incomeIndex !== -1) {
          project.income.splice(incomeIndex, 1);
          transactionFound = true;
        }
      }
      
      if (!transactionFound && project.expenses) {
        const expenseIndex = project.expenses.findIndex(t => t._id === transactionId);
        if (expenseIndex !== -1) {
          project.expenses.splice(expenseIndex, 1);
          transactionFound = true;
        }
      }
      
      if (!transactionFound && project.tax) {
        const taxIndex = project.tax.findIndex(t => t._id === transactionId);
        if (taxIndex !== -1) {
          project.tax.splice(taxIndex, 1);
          transactionFound = true;
        }
      }
      
      if (!transactionFound) {
        throw new Error('Transaction not found');
      }
      
      project.updatedAt = new Date().toISOString();
      this.updateProjectProgress(project);
      
      localStorage.setItem(key, JSON.stringify(projects));
      
      const projectData = this.getProjectData(projectId);
      projectData.transactions = [
        ...(project.income || []),
        ...(project.expenses || []),
        ...(project.tax || [])
      ];
      projectData.progressData = project.progressData;
      this.saveProjectData(projectId, projectData);
      
      return project;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  }

  addAISuggestion(projectId, suggestionData) {
    try {
      const projectData = this.getProjectData(projectId);
      
      const suggestion = {
        _id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        projectId: projectId,
        ...suggestionData,
        createdAt: new Date().toISOString(),
        isApplied: false
      };
      
      if (!projectData.aiSuggestions) {
        projectData.aiSuggestions = [];
      }
      
      projectData.aiSuggestions.push(suggestion);
      this.saveProjectData(projectId, projectData);
      
      return suggestion;
    } catch (error) {
      console.error(`Error adding AI suggestion to project ${projectId}:`, error);
      throw error;
    }
  }

  getAISuggestions(projectId) {
    try {
      const projectData = this.getProjectData(projectId);
      return projectData.aiSuggestions || [];
    } catch (error) {
      console.error(`Error getting AI suggestions for project ${projectId}:`, error);
      return [];
    }
  }

  applyAISuggestion(projectId, suggestionId) {
    try {
      const projectData = this.getProjectData(projectId);
      
      if (!projectData.aiSuggestions) {
        throw new Error('No AI suggestions found for this project');
      }
      
      const suggestionIndex = projectData.aiSuggestions.findIndex(s => s._id === suggestionId);
      if (suggestionIndex === -1) {
        throw new Error('AI suggestion not found');
      }
      
      projectData.aiSuggestions[suggestionIndex].isApplied = true;
      projectData.aiSuggestions[suggestionIndex].appliedAt = new Date().toISOString();
      
      this.saveProjectData(projectId, projectData);
      
      return projectData.aiSuggestions[suggestionIndex];
    } catch (error) {
      console.error(`Error applying AI suggestion for project ${projectId}:`, error);
      throw error;
    }
  }

  getProjectProgress(projectId) {
    try {
      const projectData = this.getProjectData(projectId);
      return projectData.progressData || this.initializeProgressData();
    } catch (error) {
      console.error(`Error getting progress data for project ${projectId}:`, error);
      return this.initializeProgressData();
    }
  }

  updateProjectProgressData(projectId, progressData) {
    try {
      const projectData = this.getProjectData(projectId);
      projectData.progressData = {
        ...projectData.progressData,
        ...progressData,
        lastUpdated: new Date().toISOString()
      };
      
      this.saveProjectData(projectId, projectData);
      
      return projectData.progressData;
    } catch (error) {
      console.error(`Error updating progress data for project ${projectId}:`, error);
      throw error;
    }
  }

  generateAIInsights(projectId) {
    try {
      const projects = this.getAllProjects();
      const project = projects.find(p => p._id === projectId);
      
      if (!project) {
        throw new Error('Project not found');
      }
      
      const totalIncome = project.income?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
      const totalExpenses = project.expenses?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
      const totalTax = project.tax?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
      const netAmount = totalIncome - totalExpenses - totalTax;
      const budgetUtilization = project.budget ? (totalExpenses / project.budget) * 100 : 0;
      
      let healthScore = 50;
      
      if (netAmount > 0) healthScore += 20;
      if (budgetUtilization < 80) healthScore += 15;
      if (project.income?.length > 0) healthScore += 10;
      if (project.expenses?.length > 0) healthScore += 5;
      
      if (netAmount < 0) healthScore -= 25;
      if (budgetUtilization > 95) healthScore -= 20;
      if (!project.income || project.income.length === 0) healthScore -= 10;
      
      healthScore = Math.max(0, Math.min(100, healthScore));
      
      const insights = {
        healthScore: Math.round(healthScore),
        status: healthScore >= 70 ? 'healthy' : healthScore >= 40 ? 'needs_attention' : 'critical',
        summary: this.generateSummary(project, totalIncome, totalExpenses, totalTax, netAmount, budgetUtilization),
        recommendations: this.generateRecommendations(project, totalIncome, totalExpenses, totalTax, netAmount, budgetUtilization),
        financialMetrics: {
          totalIncome,
          totalExpenses,
          totalTax,
          netAmount,
          budgetUtilization,
          profitMargin: totalIncome > 0 ? (netAmount / totalIncome) * 100 : 0
        },
        generatedAt: new Date().toISOString()
      };
      
      return insights;
    } catch (error) {
      console.error(`Error generating AI insights for project ${projectId}:`, error);
      throw error;
    }
  }

  generateSummary(project, totalIncome, totalExpenses, totalTax, netAmount, budgetUtilization) {
    if (netAmount > 0 && budgetUtilization < 80) {
      return `Your project "${project.name}" is performing well with a positive net income of ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(netAmount)} and healthy budget utilization of ${budgetUtilization.toFixed(1)}%.`;
    } else if (netAmount < 0) {
      return `Your project "${project.name}" is currently operating at a loss. Focus on increasing revenue streams and optimizing expenses to achieve profitability.`;
    } else if (budgetUtilization > 90) {
      return `Your project "${project.name}" has high budget utilization (${budgetUtilization.toFixed(1)}%). Consider cost optimization strategies to maintain financial health.`;
    } else {
      return `Your project "${project.name}" shows stable performance. There are opportunities for optimization to improve profitability and efficiency.`;
    }
  }

  generateRecommendations(project, totalIncome, totalExpenses, totalTax, netAmount, budgetUtilization) {
    const recommendations = [];
    
    if (netAmount < 0) {
      recommendations.push({
        type: 'critical',
        title: 'Achieve Profitability',
        description: 'Your project is operating at a loss. Focus on increasing revenue and reducing unnecessary expenses.',
        priority: 'high',
        action: 'review_financials'
      });
    }
    
    if (budgetUtilization > 80) {
      recommendations.push({
        type: 'warning',
        title: 'Optimize Budget Utilization',
        description: `High budget utilization (${budgetUtilization.toFixed(1)}%) may impact financial flexibility. Review expenses and identify optimization opportunities.`,
        priority: 'medium',
        action: 'analyze_expenses'
      });
    }
    
    if (!project.income || project.income.length === 0) {
      recommendations.push({
        type: 'critical',
        title: 'Add Income Sources',
        description: 'No income sources recorded. Start tracking revenue to monitor project financial health.',
        priority: 'high',
        action: 'add_income'
      });
    }
    
    if (totalIncome > 0 && project.income?.length === 1) {
      recommendations.push({
        type: 'suggestion',
        title: 'Diversify Revenue Streams',
        description: 'Consider adding multiple income sources to reduce dependency on a single revenue stream.',
        priority: 'medium',
        action: 'diversify_income'
      });
    }
    
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'positive',
        title: 'Maintain Current Strategy',
        description: 'Your project shows good financial discipline. Continue monitoring and optimizing as needed.',
        priority: 'low',
        action: 'continue_monitoring'
      });
    }
    
    return recommendations;
  }
}

class ProjectService {
  retryConfig = {
    maxRetries: 2,
    retryDelay: 1000,
    retryCondition: (error) => {
      return !error.response || error.code === 'ECONNABORTED' || error.message.includes('timeout');
    }
  };

  localManager = new LocalProjectManager();
  useLocalStorage = false;

  constructor() {
    this.checkBackendAvailability();
  }

  async checkBackendAvailability() {
    try {
      console.log('🔌 Checking backend availability...');
      
      // Use a simple health check endpoint
      const response = await apiClient.get('/health', {
        timeout: 5000,
        validateStatus: (status) => status < 500 // Consider any non-5xx as available
      });
      
      this.useLocalStorage = false;
      console.log('✅ Backend is available');
      return true;
    } catch (error) {
      this.useLocalStorage = true;
      console.log('📱 Backend unavailable, using local storage');
      return false;
    }
  }

  // Public method to check server connection status
  async checkServerConnection() {
    try {
      console.log('🔌 Checking server connection...');
      
      const response = await apiClient.get('/health', {
        timeout: 5000,
        validateStatus: (status) => status < 500
      });
      
      console.log('✅ Server is connected');
      return true;
    } catch (error) {
      console.error('❌ Server connection check failed:', error.message);
      return false;
    }
  }

  async retryApiCall(apiCall, config = this.retryConfig) {
    let lastError;
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`🔄 Retry attempt ${attempt}...`);
          await new Promise(resolve => setTimeout(resolve, config.retryDelay * attempt));
        }
        
        const result = await apiCall();
        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt < config.maxRetries && config.retryCondition(error)) {
          continue;
        }
        break;
      }
    }
    
    throw lastError;
  }

  // PROJECT MANAGEMENT METHODS WITH PROPER AUTH
  async getAllProjects() {
    try {
      // Validate authentication first
      if (!authService.isAuthenticated()) {
        throw new Error('Authentication required. Please login again.');
      }

      console.log('🔄 Fetching all projects...');
      
      // Always try backend first if available
      if (!this.useLocalStorage) {
        try {
          const endpoints = ['/projects', '/project'];
          
          for (const endpoint of endpoints) {
            try {
              const apiCall = () => apiClient.get(endpoint);
              const response = await this.retryApiCall(apiCall);
              
              if (response.data && Array.isArray(response.data)) {
                console.log(`✅ Retrieved ${response.data.length} projects from backend`);
                
                // Save to local storage for offline use
                response.data.forEach(project => {
                  this.localManager.saveProject(project);
                });
                
                return response.data;
              }
              
              return response.data || [];
            } catch (error) {
              if (error.response?.status === 404) {
                continue; // Try next endpoint
              }
              
              // For auth errors, re-throw
              if (error.response?.status === 401 || error.response?.status === 403) {
                throw error;
              }
              
              console.log('📱 Backend error, will try local storage:', error.message);
              break;
            }
          }
        } catch (backendError) {
          console.log('📱 Backend unavailable, using local storage');
          this.useLocalStorage = true;
        }
      }

      // Fallback to local storage
      const localProjects = this.localManager.getAllProjects();
      console.log(`📱 Using ${localProjects.length} projects from local storage`);
      return localProjects;

    } catch (error) {
      console.error('❌ Error fetching projects:', error);
      
      // Final fallback to local storage
      const localProjects = this.localManager.getAllProjects();
      console.log(`📱 Fallback to ${localProjects.length} local projects`);
      return localProjects;
    }
  }

  async getProjectById(id) {
    try {
      if (!authService.isAuthenticated()) {
        throw new Error('Authentication required. Please login again.');
      }
      
      console.log(`🔄 Fetching project: ${id}`);
      
      // If using local storage or local project
      if (this.useLocalStorage || id.startsWith('local_')) {
        const projects = this.localManager.getAllProjects();
        const project = projects.find(p => p._id === id);
        if (!project) throw new Error('Project not found');
        
        const projectData = this.localManager.getProjectData(id);
        project.transactions = projectData.transactions;
        project.progressData = projectData.progressData;
        project.aiSuggestions = projectData.aiSuggestions;
        
        return project;
      }
      
      // Try backend endpoints
      const endpoints = [`/projects/${id}`, `/project/${id}`];
      
      for (const endpoint of endpoints) {
        try {
          const apiCall = () => apiClient.get(endpoint);
          const response = await this.retryApiCall(apiCall);
          console.log(`✅ Retrieved project from backend: ${id}`);
          return response.data;
        } catch (error) {
          if (error.response?.status === 404) {
            continue; // Try next endpoint
          }
          throw error;
        }
      }
      
      throw new Error('Project not found');
      
    } catch (error) {
      console.error(`❌ Error fetching project ${id}:`, error);
      throw this.handleError(error);
    }
  }

  async createProject(projectData) {
    try {
      if (!authService.isAuthenticated()) {
        throw new Error('Authentication required. Please login again.');
      }
      
      console.log('🔄 Creating project...');
      
      // Always save to local storage first for immediate response
      const localProject = this.localManager.saveProject(projectData);
      console.log('📱 Project saved to local storage');
      
      // Then try to sync with backend if available
      if (!this.useLocalStorage) {
        try {
          const endpoints = ['/projects', '/project'];
          
          for (const endpoint of endpoints) {
            try {
              const apiCall = () => apiClient.post(endpoint, projectData);
              const response = await this.retryApiCall(apiCall);
              
              // Update local storage with backend response
              if (response.data) {
                this.localManager.saveProject(response.data);
                console.log('✅ Project synced with backend');
                return response.data;
              }
            } catch (error) {
              if (error.response?.status === 404) {
                continue; // Try next endpoint
              }
              
              // For auth errors, re-throw
              if (error.response?.status === 401 || error.response?.status === 403) {
                throw error;
              }
              
              console.log('📱 Backend sync failed, using local storage:', error.message);
              break;
            }
          }
        } catch (backendError) {
          console.log('📱 Backend unavailable, using local storage');
          this.useLocalStorage = true;
        }
      }
      
      return localProject;
      
    } catch (error) {
      console.error('❌ Error creating project:', error);
      throw this.handleError(error);
    }
  }

  async updateProject(id, projectData) {
    try {
      if (!authService.isAuthenticated()) {
        throw new Error('Authentication required. Please login again.');
      }
      
      // If using local storage or local project
      if (this.useLocalStorage || id.startsWith('local_')) {
        const projectToUpdate = { ...projectData, _id: id };
        const updatedProject = this.localManager.saveProject(projectToUpdate);
        return updatedProject;
      }
      
      const endpoints = [`/projects/${id}`, `/project/${id}`];
      
      for (const endpoint of endpoints) {
        try {
          const apiCall = () => apiClient.put(endpoint, projectData);
          const response = await this.retryApiCall(apiCall);
          return response.data;
        } catch (error) {
          if (error.response?.status === 404) {
            continue;
          }
          throw error;
        }
      }
      
      throw new Error('No valid project update endpoints found');
      
    } catch (error) {
      console.error(`❌ Error updating project ${id}:`, error);
      throw this.handleError(error);
    }
  }

  async deleteProject(id) {
    try {
      if (!authService.isAuthenticated()) {
        throw new Error('Authentication required. Please login again.');
      }
      
      // Always delete from local storage first
      const localSuccess = this.localManager.deleteProject(id);
      
      // Then try backend if available
      if (!this.useLocalStorage) {
        try {
          const endpoints = [`/projects/${id}`, `/project/${id}`];
          
          for (const endpoint of endpoints) {
            try {
              const apiCall = () => apiClient.delete(endpoint);
              const response = await this.retryApiCall(apiCall);
              return response.data;
            } catch (error) {
              if (error.response?.status === 404) {
                continue;
              }
              // For other errors, we still have local deletion
              console.log('📱 Backend deletion failed, but local deletion succeeded');
              break;
            }
          }
        } catch (backendError) {
          console.log('📱 Backend unavailable, using local storage deletion');
        }
      }
      
      return { 
        success: true, 
        message: 'Project deleted from local storage',
        deletedId: id 
      };
      
    } catch (error) {
      console.error(`❌ Error deleting project ${id}:`, error);
      throw this.handleError(error);
    }
  }

  // TRANSACTION MANAGEMENT METHODS
  async addTransaction(projectId, transactionData, type = 'income') {
    try {
      if (!authService.isAuthenticated()) {
        throw new Error('Authentication required. Please login again.');
      }
      
      console.log(`🔄 Adding ${type} transaction to project: ${projectId}`);
      
      if (!transactionData.amount || transactionData.amount <= 0) {
        throw new Error('Valid amount is required');
      }
      if (!transactionData.description?.trim()) {
        throw new Error('Description is required');
      }
      
      // Add tenant ID to transaction data
      const tenantId = authService.getTenantId();
      if (tenantId) {
        transactionData.tenantId = tenantId;
      }
      
      if (this.useLocalStorage || projectId.startsWith('local_')) {
        const transaction = this.localManager.addTransaction(projectId, transactionData, type);
        return transaction;
      }
      
      const endpoints = [
        `/projects/${projectId}/transactions`,
        `/projects/${projectId}/${type}`,
        `/project/${projectId}/transactions`,
        `/project/${projectId}/${type}`
      ];
      
      for (const endpoint of endpoints) {
        try {
          const apiCall = () => apiClient.post(endpoint, { ...transactionData, type });
          const response = await this.retryApiCall(apiCall);
          return response.data;
        } catch (error) {
          if (error.response?.status === 404) {
            continue;
          }
          throw error;
        }
      }
      
      // Fallback to local storage
      const transaction = this.localManager.addTransaction(projectId, transactionData, type);
      return transaction;
      
    } catch (error) {
      console.error(`❌ Error adding ${type} transaction:`, error);
      throw this.handleError(error);
    }
  }

  async updateTransaction(projectId, transactionId, transactionData) {
    try {
      if (!authService.isAuthenticated()) {
        throw new Error('Authentication required. Please login again.');
      }
      
      if (this.useLocalStorage || projectId.startsWith('local_') || transactionId.startsWith('tx_')) {
        const updatedProject = this.localManager.updateTransaction(projectId, transactionId, transactionData);
        return updatedProject;
      }
      
      const endpoints = [
        `/projects/${projectId}/transactions/${transactionId}`,
        `/project/${projectId}/transactions/${transactionId}`
      ];
      
      for (const endpoint of endpoints) {
        try {
          const apiCall = () => apiClient.put(endpoint, transactionData);
          const response = await this.retryApiCall(apiCall);
          return response.data;
        } catch (error) {
          if (error.response?.status === 404) {
            continue;
          }
          throw error;
        }
      }
      
      throw new Error('No valid transaction update endpoints found');
      
    } catch (error) {
      console.error(`❌ Error updating transaction:`, error);
      throw this.handleError(error);
    }
  }

  async deleteTransaction(projectId, transactionId) {
    try {
      if (!authService.isAuthenticated()) {
        throw new Error('Authentication required. Please login again.');
      }
      
      if (this.useLocalStorage || projectId.startsWith('local_') || transactionId.startsWith('tx_')) {
        const updatedProject = this.localManager.deleteTransaction(projectId, transactionId);
        return updatedProject;
      }
      
      const endpoints = [
        `/projects/${projectId}/transactions/${transactionId}`,
        `/project/${projectId}/transactions/${transactionId}`
      ];
      
      for (const endpoint of endpoints) {
        try {
          const apiCall = () => apiClient.delete(endpoint);
          const response = await this.retryApiCall(apiCall);
          return response.data;
        } catch (error) {
          if (error.response?.status === 404) {
            continue;
          }
          throw error;
        }
      }
      
      throw new Error('No valid transaction deletion endpoints found');
      
    } catch (error) {
      console.error(`❌ Error deleting transaction:`, error);
      throw this.handleError(error);
    }
  }

  // PROJECT-SPECIFIC DATA METHODS
  async getProjectTransactions(projectId) {
    try {
      if (this.useLocalStorage || projectId.startsWith('local_')) {
        const projectData = this.localManager.getProjectData(projectId);
        return projectData.transactions || [];
      }
      
      const project = await this.getProjectById(projectId);
      return [
        ...(project.income || []),
        ...(project.expenses || []),
        ...(project.tax || [])
      ];
    } catch (error) {
      console.error(`❌ Error getting transactions for project ${projectId}:`, error);
      return [];
    }
  }

  async getProjectProgress(projectId) {
    try {
      if (this.useLocalStorage || projectId.startsWith('local_')) {
        return this.localManager.getProjectProgress(projectId);
      }
      
      const project = await this.getProjectById(projectId);
      return project.progressData || this.localManager.initializeProgressData();
    } catch (error) {
      console.error(`❌ Error getting progress for project ${projectId}:`, error);
      return this.localManager.initializeProgressData();
    }
  }

  async updateProjectProgress(projectId, progressData) {
    try {
      if (this.useLocalStorage || projectId.startsWith('local_')) {
        return this.localManager.updateProjectProgressData(projectId, progressData);
      }
      
      throw new Error('Backend progress update not implemented');
    } catch (error) {
      console.error(`❌ Error updating progress for project ${projectId}:`, error);
      throw error;
    }
  }

  // AI SUGGESTIONS METHODS
  async getAISuggestions(projectId) {
    try {
      if (this.useLocalStorage || projectId.startsWith('local_')) {
        return this.localManager.getAISuggestions(projectId);
      }
      
      const endpoints = [
        `/projects/${projectId}/ai-suggestions`,
        `/project/${projectId}/ai-suggestions`
      ];
      
      for (const endpoint of endpoints) {
        try {
          const apiCall = () => apiClient.get(endpoint);
          const response = await this.retryApiCall(apiCall);
          return response.data;
        } catch (error) {
          if (error.response?.status === 404) {
            continue;
          }
          throw error;
        }
      }
      
      return [];
    } catch (error) {
      console.error(`❌ Error getting AI suggestions for project ${projectId}:`, error);
      return [];
    }
  }

  async addAISuggestion(projectId, suggestionData) {
    try {
      if (this.useLocalStorage || projectId.startsWith('local_')) {
        return this.localManager.addAISuggestion(projectId, suggestionData);
      }
      
      const endpoints = [
        `/projects/${projectId}/ai-suggestions`,
        `/project/${projectId}/ai-suggestions`
      ];
      
      for (const endpoint of endpoints) {
        try {
          const apiCall = () => apiClient.post(endpoint, suggestionData);
          const response = await this.retryApiCall(apiCall);
          return response.data;
        } catch (error) {
          if (error.response?.status === 404) {
            continue;
          }
          throw error;
        }
      }
      
      throw new Error('No valid AI suggestion endpoints found');
    } catch (error) {
      console.error(`❌ Error adding AI suggestion for project ${projectId}:`, error);
      throw error;
    }
  }

  async applyAISuggestion(projectId, suggestionId) {
    try {
      if (this.useLocalStorage || projectId.startsWith('local_')) {
        return this.localManager.applyAISuggestion(projectId, suggestionId);
      }
      
      const endpoints = [
        `/projects/${projectId}/ai-suggestions/${suggestionId}/apply`,
        `/project/${projectId}/ai-suggestions/${suggestionId}/apply`
      ];
      
      for (const endpoint of endpoints) {
        try {
          const apiCall = () => apiClient.post(endpoint);
          const response = await this.retryApiCall(apiCall);
          return response.data;
        } catch (error) {
          if (error.response?.status === 404) {
            continue;
          }
          throw error;
        }
      }
      
      throw new Error('No valid AI suggestion apply endpoints found');
    } catch (error) {
      console.error(`❌ Error applying AI suggestion for project ${projectId}:`, error);
      throw error;
    }
  }

  // AI INSIGHTS METHODS
  async getAIInsights(projectId) {
    try {
      if (!authService.isAuthenticated()) {
        throw new Error('Authentication required. Please login again.');
      }
      
      if (this.useLocalStorage || projectId.startsWith('local_')) {
        const insights = this.localManager.generateAIInsights(projectId);
        return insights;
      }
      
      const endpoints = [
        `/projects/${projectId}/insights`,
        `/project/${projectId}/insights`,
        `/projects/${projectId}/ai-insights`,
        `/project/${projectId}/ai-insights`
      ];
      
      for (const endpoint of endpoints) {
        try {
          const apiCall = () => apiClient.get(endpoint);
          const response = await this.retryApiCall(apiCall);
          return response.data;
        } catch (error) {
          if (error.response?.status === 404) {
            continue;
          }
          throw error;
        }
      }
      
      const insights = this.localManager.generateAIInsights(projectId);
      return insights;
      
    } catch (error) {
      console.error(`❌ Error getting AI insights for project ${projectId}:`, error);
      
      if (error.message.includes('Network Error') || error.message.includes('timeout') || error.response?.status === 404) {
        try {
          const insights = this.localManager.generateAIInsights(projectId);
          return insights;
        } catch (localError) {
          throw new Error('Failed to generate AI insights');
        }
      }
      
      throw this.handleError(error);
    }
  }

  handleError(error) {
    console.error('🔴 Service Error:', error);
    
    if (error.response) {
      const status = error.response.status;
      const serverMessage = error.response.data?.message || error.response.data?.error;
      
      switch (status) {
        case 400:
          return new Error(serverMessage || 'Bad request. Please check your input data.');
        case 401:
          authService.logout();
          return new Error('Session expired. Please login again.');
        case 403:
          return new Error('Access forbidden. Tenant ID mismatch or insufficient permissions.');
        case 404:
          return new Error('Resource not found. Using local storage instead.');
        case 500:
          return new Error('Server error. Please try again later.');
        case 502:
        case 503:
        case 504:
          return new Error('Server is temporarily unavailable. Using local storage.');
        default:
          return new Error(serverMessage || `Request failed with status ${status}`);
      }
    } else if (error.request) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        return new Error('Server timeout. Using local storage instead.');
      }
      if (error.code === 'ERR_NETWORK') {
        return new Error('Network error. Cannot connect to server. Using local storage.');
      }
      return new Error('Network error. Using local storage instead.');
    } else {
      return new Error(error.message || 'An unexpected error occurred');
    }
  }
}

export default new ProjectService();