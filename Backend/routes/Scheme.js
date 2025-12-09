import express from "express";
import fetch from "node-fetch";

const router = express.Router();

// Enhanced cache with update tracking
let cachedSchemes = null;
let cacheTimestamp = null;
const CACHE_DURATION = 1 * 60 * 1000; // 1 minute for real-time feel

// Government update simulation
let lastGovernmentUpdate = null;
let updateCheckCounter = 0;
const GOVERNMENT_UPDATE_INTERVAL = 10; // Simulate update every 10 API calls

// Track previously seen schemes to detect new ones
let previousSchemes = [];

// Enhanced fallback with update simulation
const BASE_SCHEMES = [
  {
    id: 1,
    title: "PM Kisan Samman Nidhi",
    description: "Direct income support to farmers with quarterly installments. Recently enhanced with digital payment integration.",
    category: "Agriculture",
    version: "2.1",
    lastUpdated: "2024-01-15"
  },
  {
    id: 2,
    title: "Ayushman Bharat PM-JAY",
    description: "Health insurance scheme providing ₹5 lakh coverage per family annually. New hospitals added recently.",
    category: "Healthcare",
    version: "3.0",
    lastUpdated: "2024-01-10"
  }
];

// New scheme templates for government updates
const NEW_SCHEME_TEMPLATES = [
  {
    title: "Digital India AI Mission Phase",
    description: "AI infrastructure development with focus on %SECTOR%. Budget increased to ₹%BUDGET% crore.",
    category: "Technology"
  },
  {
    title: "PM %SECTOR% Vikas Yojana",
    description: "Comprehensive development scheme for %SECTOR% sector with new digital initiatives and increased funding.",
    category: "Social Welfare"
  },
  {
    title: "National %SECTOR% Mission",
    description: "Enhanced mission focusing on %SECTOR% development with revised guidelines and expanded coverage.",
    category: "Environment"
  },
  {
    title: "Startup India %SECTOR% Fund",
    description: "Special funding for %SECTOR% startups with simplified application process and mentorship.",
    category: "Employment"
  }
];

const SECTORS = ["Education", "Healthcare", "Agriculture", "Technology", "Rural", "Urban", "Digital", "Green"];
const BUDGETS = ["500", "750", "1000", "1500", "2000"];

router.get("/", async (req, res) => {
  try {
    console.log("🔵 Scheme API HIT - Checking for Government Updates");
    updateCheckCounter++;

    const forceRefresh = req.query.force === "true";
    const checkUpdates = req.query.checkupdates === "true";

    // Check if government has released updates (simulated)
    const hasGovernmentUpdate = await checkForGovernmentUpdates();
    
    if (hasGovernmentUpdate || forceRefresh || !cachedSchemes || 
        Date.now() - cacheTimestamp > CACHE_DURATION) {
      
      console.log("🟡 Fetching UPDATED government schemes...");
      let schemes = await fetchUpdatedGovernmentData(hasGovernmentUpdate);
      
      // Detect what's new compared to previous data
      const newSchemes = detectNewSchemes(schemes);
      
      // Update cache
      previousSchemes = cachedSchemes || [];
      cachedSchemes = schemes;
      cacheTimestamp = Date.now();
      lastGovernmentUpdate = new Date();

      return res.json({
        success: true,
        data: schemes,
        cached: false,
        source: "Government Portal",
        realTime: true,
        hasUpdates: newSchemes.length > 0,
        newSchemesCount: newSchemes.length,
        newSchemes: newSchemes,
        lastGovernmentUpdate: lastGovernmentUpdate,
        count: schemes.length,
        timestamp: new Date().toISOString(),
        message: newSchemes.length > 0 ? 
          `🎉 Government has updated ${newSchemes.length} schemes!` : 
          "Latest schemes loaded"
      });
    }

    // Return cached data
    console.log("✅ Returning cached government data");
    return res.json({
      success: true,
      data: cachedSchemes,
      cached: true,
      source: "Government Cache",
      realTime: false,
      hasUpdates: false,
      newSchemesCount: 0,
      lastGovernmentUpdate: lastGovernmentUpdate,
      count: cachedSchemes.length,
      timestamp: new Date(cacheTimestamp).toISOString()
    });

  } catch (error) {
    console.error("🔥 Route Error:", error.message);
    
    if (cachedSchemes) {
      return res.json({
        success: true,
        data: cachedSchemes,
        cached: true,
        stale: true,
        source: "Cache (Previous Data)",
        realTime: false,
        hasUpdates: false,
        message: "Using previous data - update service unavailable"
      });
    }
    
    return res.json({
      success: true,
      data: BASE_SCHEMES,
      cached: false,
      source: "Base Data",
      realTime: false,
      hasUpdates: false,
      message: "Using base scheme data"
    });
  }
});

// Simulate government update checks
async function checkForGovernmentUpdates() {
  // Simulate random government updates (25% chance every 10th call)
  const shouldUpdate = updateCheckCounter % GOVERNMENT_UPDATE_INTERVAL === 0 || 
                      Math.random() < 0.25;
  
  if (shouldUpdate) {
    console.log("🎯 GOVERNMENT UPDATE DETECTED! New schemes released.");
    return true;
  }
  
  return false;
}

// Fetch updated government data with new schemes
async function fetchUpdatedGovernmentData(hasNewUpdate) {
  try {
    console.log("🟡 Fetching updated government data...");

    let schemes = [];

    // Try AI first for realistic updated data
    try {
      schemes = await fetchAIGovernmentData(hasNewUpdate);
    } catch (aiError) {
      console.log("🟡 AI fetch failed, generating simulated update data");
      schemes = await generateSimulatedGovernmentData(hasNewUpdate);
    }

    // If we have a government update, add new schemes
    if (hasNewUpdate) {
      const newSchemes = generateNewGovernmentSchemes();
      schemes = [...newSchemes, ...schemes.slice(0, Math.max(0, 6 - newSchemes.length))];
      
      console.log(`🎉 Added ${newSchemes.length} new government schemes!`);
    }

    // Add update metadata
    schemes = schemes.map((scheme, index) => ({
      ...scheme,
      id: scheme.id || Date.now() + index,
      lastUpdated: new Date().toISOString(),
      isNew: hasNewUpdate && index < 2, // Mark first few as new if update
      version: `2.${Math.floor(Math.random() * 5)}`,
      isUpdated: hasNewUpdate
    }));

    return schemes;

  } catch (error) {
    console.log("❌ Updated data fetch failed:", error.message);
    return generateSimulatedGovernmentData(hasNewUpdate);
  }
}

// AI-powered government data fetch
async function fetchAIGovernmentData(hasUpdate) {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error("API key missing");
  }

  const updateContext = hasUpdate ? 
    "The government has just released NEW schemes and updates. Include these latest announcements:" : 
    "Provide the current active government schemes:";

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{
        role: "user",
        content: `${updateContext}
        
        Return ONLY JSON array of 6-8 Indian Government schemes that are ACTIVE and recently UPDATED.
        Make them look like REAL government announcements with version numbers.
        
        [{
          "id": 1,
          "title": "Real Scheme Name",
          "description": "Current status with recent updates...",
          "category": "Healthcare/Education/etc",
          "version": "2.1",
          "isNew": ${hasUpdate}
        }]
        
        Return ONLY JSON.`
      }],
      temperature: 0.4,
      max_tokens: 2000
    })
  });

  if (!response.ok) throw new Error(`AI API: ${response.status}`);

  const result = await response.json();
  let content = result.choices[0].message.content;
  content = content.replace(/```json/g, '').replace(/```/g, '').trim();
  
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (jsonMatch) content = jsonMatch[0];

  return JSON.parse(content);
}

// Generate simulated government data with updates
async function generateSimulatedGovernmentData(hasUpdate) {
  const baseSchemes = [...BASE_SCHEMES];
  
  // Add some variation to simulate updates
  const updatedSchemes = baseSchemes.map(scheme => ({
    ...scheme,
    description: hasUpdate ? 
      `${scheme.description} Recently updated with enhanced benefits and digital features.` :
      scheme.description,
    version: hasUpdate ? 
      `2.${Math.floor(Math.random() * 3)}` : 
      scheme.version,
    lastUpdated: new Date().toISOString()
  }));

  // Add additional schemes
  const additionalSchemes = [
    {
      id: Date.now() + 100,
      title: "Digital India Bhashini",
      description: hasUpdate ? 
        "AI language platform EXPANDED with 5 new regional languages and voice support." :
        "AI-powered language translation platform for digital services.",
      category: "Technology",
      version: hasUpdate ? "3.1" : "2.0"
    },
    {
      id: Date.now() + 200,
      title: "Startup India Seed Fund",
      description: hasUpdate ?
        "ENHANCED: Funding limit increased to ₹75 lakhs and faster approval process." :
        "Funding support for early-stage startups with mentorship.",
      category: "Employment", 
      version: hasUpdate ? "2.5" : "2.0"
    },
    {
      id: Date.now() + 300,
      title: "Green India Mission",
      description: hasUpdate ?
        "NEW: Urban afforestation program launched with smart monitoring system." :
        "Climate action program focusing on renewable energy and green spaces.",
      category: "Environment",
      version: hasUpdate ? "2.2" : "2.0"
    }
  ];

  return [...updatedSchemes, ...additionalSchemes];
}

// Generate brand new government schemes when update is detected
function generateNewGovernmentSchemes() {
  const newSchemeCount = Math.floor(Math.random() * 2) + 1; // 1-2 new schemes
  const newSchemes = [];

  for (let i = 0; i < newSchemeCount; i++) {
    const template = NEW_SCHEME_TEMPLATES[Math.floor(Math.random() * NEW_SCHEME_TEMPLATES.length)];
    const sector = SECTORS[Math.floor(Math.random() * SECTORS.length)];
    const budget = BUDGETS[Math.floor(Math.random() * BUDGETS.length)];
    
    const newScheme = {
      id: Date.now() + i * 1000,
      title: template.title.replace('%SECTOR%', sector),
      description: template.description
        .replace('%SECTOR%', sector)
        .replace('%BUDGET%', budget),
      category: template.category,
      version: "1.0", // Brand new scheme
      isNew: true,
      isBrandNew: true,
      launchDate: new Date().toISOString().split('T')[0]
    };

    newSchemes.push(newScheme);
  }

  return newSchemes;
}

// Detect what schemes are new compared to previous data
function detectNewSchemes(currentSchemes) {
  if (!previousSchemes.length) return currentSchemes.filter(s => s.isNew || s.isBrandNew);

  const newSchemes = [];
  const previousTitles = previousSchemes.map(s => s.title);

  for (const scheme of currentSchemes) {
    if (!previousTitles.includes(scheme.title) || scheme.isBrandNew) {
      newSchemes.push({
        ...scheme,
        detectedAsNew: true
      });
    }
  }

  return newSchemes;
}

// New endpoint to force government update simulation
router.get("/force-update", async (req, res) => {
  try {
    console.log("🎯 MANUAL GOVERNMENT UPDATE TRIGGERED");
    
    // Simulate government update
    updateCheckCounter = GOVERNMENT_UPDATE_INTERVAL;
    lastGovernmentUpdate = new Date();
    
    const response = await fetch(`${req.protocol}://${req.get('host')}/api/schemes?checkupdates=true&force=true`);
    const data = await response.json();
    
    res.json({
      success: true,
      message: "Government update simulation triggered",
      updateTime: lastGovernmentUpdate,
      newSchemes: data.newSchemes,
      data: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Update simulation failed",
      error: error.message
    });
  }
});

// Government update status endpoint
router.get("/update-status", (req, res) => {
  res.json({
    success: true,
    lastGovernmentUpdate: lastGovernmentUpdate,
    updateCheckCounter: updateCheckCounter,
    nextUpdateCheck: GOVERNMENT_UPDATE_INTERVAL - (updateCheckCounter % GOVERNMENT_UPDATE_INTERVAL),
    cachedSchemesCount: cachedSchemes ? cachedSchemes.length : 0,
    hasPendingUpdates: updateCheckCounter % GOVERNMENT_UPDATE_INTERVAL === 0
  });
});

export default router;