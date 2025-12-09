import React, { useState, useEffect } from 'react';
import CreateProjectModal from './CreateProjectModal';
import ProjectTransactions from './ProjectTransactions';
import ProgressCharts from './ProgressCharts';
import AISuggestions from './AISuggestions';
import projectService from '../../services/projectService';
import './ProjectModule.css';

const ProjectDashboard = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('transactions');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await projectService.getAllProjects();
      setProjects(data);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const handleCreateProject = async (projectData) => {
    try {
      const newProject = await projectService.createProject(projectData);
      setProjects([...projects, newProject]);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const calculateProgress = (project) => {
    const totalIncome = project.income.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = project.expenses.reduce((sum, item) => sum + item.amount, 0);
    const budget = project.budget || 1;
    return Math.min((totalIncome / budget) * 100, 100);
  };

  return (
    <div className="project-dashboard">
      <div className="project-header">
        <h1>Project Management</h1>
        <button 
          className="btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          Create Project
        </button>
      </div>

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateProject}
        />
      )}

      <div className="project-layout">
        <div className="project-sidebar">
          <h3>Your Projects</h3>
          {projects.map(project => (
            <div
              key={project._id}
              className={`project-card ${selectedProject?._id === project._id ? 'active' : ''}`}
              onClick={() => setSelectedProject(project)}
            >
              <h4>{project.name}</h4>
              <p>Budget: ${project.budget?.toLocaleString()}</p>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${calculateProgress(project)}%` }}
                ></div>
              </div>
              <span>{calculateProgress(project).toFixed(1)}% Complete</span>
            </div>
          ))}
        </div>

        <div className="project-content">
          {selectedProject ? (
            <>
              <div className="project-tabs">
                <button
                  className={activeTab === 'transactions' ? 'active' : ''}
                  onClick={() => setActiveTab('transactions')}
                >
                  Transactions
                </button>
                <button
                  className={activeTab === 'progress' ? 'active' : ''}
                  onClick={() => setActiveTab('progress')}
                >
                  Progress
                </button>
                <button
                  className={activeTab === 'ai' ? 'active' : ''}
                  onClick={() => setActiveTab('ai')}
                >
                  AI Suggestions
                </button>
              </div>

              <div className="tab-content">
                {activeTab === 'transactions' && (
                  <ProjectTransactions project={selectedProject} />
                )}
                {activeTab === 'progress' && (
                  <ProgressCharts project={selectedProject} />
                )}
                {activeTab === 'ai' && (
                  <AISuggestions project={selectedProject} />
                )}
              </div>
            </>
          ) : (
            <div className="no-project-selected">
              <h3>Select a project to view details</h3>
              <p>Or create a new project to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDashboard;