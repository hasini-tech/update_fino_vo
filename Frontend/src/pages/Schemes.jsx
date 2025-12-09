import React, { useState, useEffect, useRef } from "react";
import styled, { keyframes } from "styled-components";

// Animations
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const bounce = keyframes`
  0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
  40% {transform: translateY(-10px);}
  60% {transform: translateY(-5px);}
`;

const glow = keyframes`
  0% { box-shadow: 0 0 5px rgba(81, 207, 102, 0.5); }
  50% { box-shadow: 0 0 20px rgba(81, 207, 102, 0.8); }
  100% { box-shadow: 0 0 5px rgba(81, 207, 102, 0.5); }
`;

// Styled Components
const SchemesWrapper = styled.div`
  padding: 2rem;
  text-align: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  border-radius: 20px;
  min-height: 500px;
  max-width: 1200px;
  margin: 0 auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  animation: ${fadeIn} 0.8s ease-out;
`;

const Title = styled.h1`
  font-size: 3rem;
  background: linear-gradient(45deg, #667eea, #764ba2, #f093fb);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.5rem;
  font-weight: 700;
`;

const Subtitle = styled.p`
  color: #b8b8b8;
  font-size: 1.2rem;
  margin-bottom: 2rem;
`;

const GovernmentAlert = styled.div`
  background: linear-gradient(45deg, #51cf66, #2ecc71);
  color: white;
  padding: 1.5rem;
  border-radius: 12px;
  margin: 1rem 0;
  animation: ${glow} 2s infinite, ${fadeIn} 0.5s ease-out;
  border: 2px solid rgba(255, 255, 255, 0.3);
`;

const AlertTitle = styled.h3`
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const AlertMessage = styled.p`
  font-size: 1.1rem;
  opacity: 0.9;
  margin: 0;
`;

const NewLaunchAlert = styled(GovernmentAlert)`
  background: linear-gradient(45deg, #ff6b6b, #ff8e53);
  animation: ${glow} 1.5s infinite, ${fadeIn} 0.5s ease-out;
`;

const RefreshButton = styled.button`
  background: linear-gradient(45deg, #667eea, #764ba2);
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  margin: 0.5rem;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
  }
`;

const ForceUpdateButton = styled(RefreshButton)`
  background: linear-gradient(45deg, #51cf66, #2ecc71);
  
  &:hover {
    box-shadow: 0 8px 20px rgba(81, 207, 102, 0.4);
    animation: ${pulse} 1s infinite;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin: 1.5rem 0;
  flex-wrap: wrap;
`;

const SchemeList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
`;

const SchemeCard = styled.div`
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
  padding: 2rem;
  border-radius: 16px;
  border: 2px solid ${props => 
    props.isNew ? 'rgba(81, 207, 102, 0.5)' : 
    props.isBrandNew ? 'rgba(255, 107, 107, 0.5)' :
    props.isUpdated ? 'rgba(255, 193, 7, 0.5)' : 
    'rgba(255, 255, 255, 0.15)'};
  transition: all 0.4s ease;
  text-align: left;
  backdrop-filter: blur(10px);
  position: relative;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  }
`;

const NewRibbon = styled.div`
  position: absolute;
  top: 10px;
  right: -10px;
  background: linear-gradient(45deg, #ff6b6b, #ff8e53);
  color: white;
  padding: 0.5rem 1.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  transform: rotate(5deg);
  animation: ${pulse} 2s infinite;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -10px;
    right: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid #ff6b6b;
    border-top: 10px solid transparent;
    border-bottom: 10px solid transparent;
  }
`;

const UpdatedBadge = styled.div`
  position: absolute;
  top: 10px;
  right: -10px;
  background: linear-gradient(45deg, #ffd93d, #ff9a3d);
  color: #333;
  padding: 0.5rem 1rem;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  transform: rotate(5deg);
`;

const SchemeTitle = styled.h3`
  font-size: 1.4rem;
  color: #fff;
  margin-bottom: 1rem;
  padding-right: 80px;
`;

const SchemeDescription = styled.p`
  color: #b8b8b8;
  line-height: 1.6;
  margin-bottom: 1.5rem;
`;

const SchemeMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const SchemeCategory = styled.span`
  background: linear-gradient(45deg, #667eea, #764ba2);
  color: white;
  padding: 0.4rem 1rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
`;

const SchemeVersion = styled.span`
  background: rgba(255, 255, 255, 0.1);
  color: #ccc;
  padding: 0.3rem 0.8rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-family: monospace;
`;

const LaunchDate = styled.span`
  background: linear-gradient(45deg, #ff6b6b, #ff8e53);
  color: white;
  padding: 0.3rem 0.8rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
`;

const StatusBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  padding: 1rem;
  border-radius: 10px;
  margin: 1rem 0;
  flex-wrap: wrap;
  gap: 1rem;
`;

const StatusItem = styled.div`
  color: #b8b8b8;
  font-size: 0.9rem;
  
  strong {
    color: #51cf66;
  }
`;

const LoadingMessage = styled.div`
  color: #4ecdc4;
  font-size: 1.2rem;
  margin: 2rem 0;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  animation: ${fadeIn} 0.5s ease-out;
`;

const DataFreshness = styled.div`
  display: inline-block;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  margin-left: 0.5rem;
  background: ${props => 
    props.isFresh ? 'linear-gradient(45deg, #51cf66, #2ecc71)' : 
    'linear-gradient(45deg, #f9c74f, #f9844a)'};
  color: ${props => props.isFresh ? 'white' : '#333'};
  animation: ${props => props.isFresh ? glow : 'none'} 2s infinite;
`;

const Schemes = () => {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState({});
  const [lastUpdate, setLastUpdate] = useState(null);
  const [newLaunches, setNewLaunches] = useState([]);
  const [showLaunchAlert, setShowLaunchAlert] = useState(false);
  const previousSchemes = useRef([]);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001/api/schemes";

  const detectNewLaunches = (currentSchemes) => {
    if (!previousSchemes.current.length) {
      previousSchemes.current = currentSchemes;
      return [];
    }

    const previousIds = previousSchemes.current.map(s => s.id);
    const launches = currentSchemes.filter(scheme => 
      !previousIds.includes(scheme.id) || scheme.isBrandNew
    );

    previousSchemes.current = currentSchemes;
    return launches;
  };

  const fetchSchemes = async (checkUpdates = false) => {
    try {
      setLoading(true);
      
      const url = checkUpdates ? 
        `${API_URL}?checkupdates=true&force=true` : 
        `${API_URL}?force=true`;
      
      console.log(`🟡 Fetching schemes ${checkUpdates ? 'with update check' : ''}...`);
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const result = await response.json();
      
      console.log("🟢 API Response:", result);

      if (result.success) {
        const currentSchemes = result.data || [];
        
        // Detect new launches
        const detectedLaunches = detectNewLaunches(currentSchemes);
        
        if (detectedLaunches.length > 0) {
          setNewLaunches(detectedLaunches);
          setShowLaunchAlert(true);
          
          // Auto-hide alert after 10 seconds
          setTimeout(() => {
            setShowLaunchAlert(false);
          }, 10000);
        }
        
        setSchemes(currentSchemes);
        setApiStatus({
          source: result.source,
          hasUpdates: result.hasUpdates,
          newSchemesCount: result.newSchemesCount,
          newSchemes: result.newSchemes,
          lastGovernmentUpdate: result.lastGovernmentUpdate,
          realTime: result.realTime,
          cached: result.cached,
          timestamp: result.timestamp
        });
        setLastUpdate(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error("❌ Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const forceGovernmentUpdate = async () => {
    try {
      console.log("🎯 Triggering government update simulation...");
      const response = await fetch(`${API_URL}/force-update`);
      const result = await response.json();
      
      if (result.success) {
        // Refresh schemes after update
        await fetchSchemes(true);
      }
    } catch (error) {
      console.error("❌ Force update failed:", error);
    }
  };

  useEffect(() => {
    fetchSchemes(true);
    
    // Check for government updates every 30 seconds
    const updateInterval = setInterval(() => {
      fetchSchemes(true);
    }, 30000);

    return () => clearInterval(updateInterval);
  }, []);

  // Calculate data freshness
  const getDataFreshness = () => {
    if (!apiStatus.timestamp) return { isFresh: false, message: 'Unknown' };
    
    const now = new Date();
    const dataTime = new Date(apiStatus.timestamp);
    const diffMinutes = Math.floor((now - dataTime) / (1000 * 60));
    
    if (diffMinutes < 1) return { isFresh: true, message: 'Just now' };
    if (diffMinutes < 5) return { isFresh: true, message: `${diffMinutes}m ago` };
    if (diffMinutes < 60) return { isFresh: false, message: `${diffMinutes}m ago` };
    
    const diffHours = Math.floor(diffMinutes / 60);
    return { isFresh: false, message: `${diffHours}h ago` };
  };

  if (loading && schemes.length === 0) {
    return (
      <SchemesWrapper>
        <Title>Government Scheme Updates</Title>
        <LoadingMessage>
          🔄 Checking for latest government scheme updates...
        </LoadingMessage>
      </SchemesWrapper>
    );
  }

  const freshness = getDataFreshness();

  return (
    <SchemesWrapper>
      <Title>Government Scheme Updates</Title>
      <Subtitle>
        Real-time tracking of government scheme announcements and updates
      </Subtitle>

      {/* Government Launch Alert */}
      {showLaunchAlert && newLaunches.length > 0 && (
        <NewLaunchAlert>
          <AlertTitle>
            🚀 NEW GOVERNMENT SCHEMES LAUNCHED!
          </AlertTitle>
          <AlertMessage>
            {newLaunches.length} new scheme(s) have been launched by the government:{" "}
            {newLaunches.map(s => s.title).join(", ")}
          </AlertMessage>
        </NewLaunchAlert>
      )}

      {/* Government Update Alert */}
      {apiStatus.hasUpdates && apiStatus.newSchemesCount > 0 && !showLaunchAlert && (
        <GovernmentAlert>
          <AlertTitle>
            🎉 GOVERNMENT UPDATE DETECTED!
          </AlertTitle>
          <AlertMessage>
            {apiStatus.newSchemesCount} new scheme(s) available. 
            Refresh to see the latest updates.
          </AlertMessage>
        </GovernmentAlert>
      )}

      <ButtonGroup>
        <RefreshButton 
          onClick={() => fetchSchemes(true)} 
          disabled={loading}
        >
          {loading ? '🔄 Checking...' : '📡 Check for Updates'}
        </RefreshButton>
        
        <ForceUpdateButton 
          onClick={forceGovernmentUpdate}
          disabled={loading}
        >
          🎯 Simulate Government Update
        </ForceUpdateButton>
      </ButtonGroup>

      <StatusBar>
        <StatusItem>
          <strong>Data Source:</strong> {apiStatus.source || 'Loading...'}
        </StatusItem>
        <StatusItem>
          <strong>Last Check:</strong> {lastUpdate || 'Never'}
        </StatusItem>
        <StatusItem>
          <strong>Status:</strong> 
          <DataFreshness isFresh={freshness.isFresh}>
            {apiStatus.cached ? '🟡 CACHED' : '🟢 LIVE'} • {freshness.message}
          </DataFreshness>
        </StatusItem>
        {apiStatus.lastGovernmentUpdate && (
          <StatusItem>
            <strong>Last Govt Update:</strong> {new Date(apiStatus.lastGovernmentUpdate).toLocaleTimeString()}
          </StatusItem>
        )}
        <StatusItem>
          <strong>Active Schemes:</strong> {schemes.length}
        </StatusItem>
      </StatusBar>

      <SchemeList>
        {schemes.map((scheme) => (
          <SchemeCard 
            key={scheme.id} 
            isNew={scheme.isNew}
            isBrandNew={scheme.isBrandNew}
            isUpdated={scheme.isUpdated}
          >
            {(scheme.isNew || scheme.isBrandNew) && <NewRibbon>NEW LAUNCH</NewRibbon>}
            {scheme.isUpdated && !scheme.isNew && <UpdatedBadge>UPDATED</UpdatedBadge>}
            
            <SchemeTitle>{scheme.title}</SchemeTitle>
            <SchemeDescription>{scheme.description}</SchemeDescription>
            
            <SchemeMeta>
              <SchemeCategory>{scheme.category}</SchemeCategory>
              <div style={{display: 'flex', gap: '0.5rem'}}>
                <SchemeVersion>v{scheme.version}</SchemeVersion>
                {scheme.launchDate && (
                  <LaunchDate>🚀 {scheme.launchDate}</LaunchDate>
                )}
                {scheme.lastUpdated && (
                  <span style={{color: '#888', fontSize: '0.7rem'}}>
                    📅 {new Date(scheme.lastUpdated).toLocaleDateString()}
                  </span>
                )}
              </div>
            </SchemeMeta>
          </SchemeCard>
        ))}
      </SchemeList>

      {schemes.length > 0 && (
        <div style={{color: '#888', marginTop: '2rem', fontSize: '0.9rem'}}>
          <strong>Live Dashboard:</strong> Displaying {schemes.length} schemes • 
          {newLaunches.length > 0 ? ` 🚀 ${newLaunches.length} new launches today` : ' ✅ All schemes current'} • 
          Last synchronized: {lastUpdate}
        </div>
      )}

      {schemes.length === 0 && !loading && (
        <div style={{color: '#f9c74f', marginTop: '2rem', padding: '2rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px'}}>
          <h3>No Government Schemes Available</h3>
          <p>The government portal might be updating. Please check back in a few minutes.</p>
          <p>Or visit: <a href="https://www.mygov.in/" target="_blank" rel="noopener noreferrer" style={{color: '#4ecdc4'}}>
            Official MyGov Portal
          </a></p>
        </div>
      )}
    </SchemesWrapper>
  );
};

export default Schemes;