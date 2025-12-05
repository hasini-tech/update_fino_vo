  import React, { useState, useCallback, useEffect } from 'react';
  import ProjectDashboard from './ProjectDashboard';
  import ProjectDetails from './ProjectDetails';

  const ProjectModule = ({ userSession }) => {
    const [currentView, setCurrentView] = useState('dashboard');
    const [selectedProject, setSelectedProject] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleProjectSelect = useCallback((project) => {
      console.log('🔄 Opening project:', project.name);
      setSelectedProject(project);
      setCurrentView('details');
    }, []);

    const handleBackToDashboard = useCallback(() => {
      console.log('🔄 Returning to dashboard');
      setSelectedProject(null);
      setCurrentView('dashboard');
    }, []);

    // Log state changes only when they actually change
    useEffect(() => {
      console.log('🔍 ProjectModule State Update:', {
        currentView,
        selectedProject: selectedProject?.name || 'None',
        isLoading
      });
    }, [currentView, selectedProject, isLoading]);

    return (
      <div className="project-module">
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner">Loading...</div>
          </div>
        )}
        
        {currentView === 'dashboard' && (
          <ProjectDashboard 
            onProjectSelect={handleProjectSelect}
            userSession={userSession}
            onLoadingStateChange={setIsLoading}
          />
        )}
        
        {currentView === 'details' && selectedProject && (
          <ProjectDetails 
            project={selectedProject} 
            onBack={handleBackToDashboard}
            userSession={userSession}
            onLoadingStateChange={setIsLoading}
          />
        )}
      </div>
    );
  };

  export default ProjectModule;