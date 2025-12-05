import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Save, Plus, Trash2, Eye, EyeOff, RefreshCw, AlertCircle, CheckCircle, Globe } from 'lucide-react';
import authService from '../services/authService'; // Import AuthService
import API_BASE from '../config/api'; // Use centralized API configuration

// Added onBack prop
const SettingsPage = ({ onBack }) => {
    const [platforms, setPlatforms] = useState([]);
    const [tenantId, setTenantId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const API_URL = `${API_BASE}/api/settings`;

    useEffect(() => {
        fetchSettings();
    }, []);

    const generateTenantId = () => {
        return Math.floor(100000 + Math.random() * 900000).toString();
    };

    const fetchSettings = async () => {
        setLoading(true);
        setError('');
        try {
            // Validate authentication first
            if (!authService.isAuthenticated()) {
                console.warn('🔒 Settings: User not authenticated');
                setLoading(false);
                return;
            }
            
            const tenantId = authService.getTenantId();
            if (!tenantId) {
                throw new Error('No tenant ID available');
            }
            
            const response = await fetch(API_URL, {
                method: 'GET',
                credentials: 'include',
                headers: authService.getAuthHeaders() // Use AuthService for proper headers
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.platforms && data.platforms.length > 0) {
                    // Add UI state fields to platforms
                    const platformsWithUIState = data.platforms.map(platform => ({
                        ...platform,
                        showOptionalFields: false, // Default to hidden
                        showToken: false // Default to hidden
                    }));
                    setPlatforms(platformsWithUIState);
                } else {
                    addNewPlatform(); // Add an empty platform if none exist
                }
                setTenantId(data.tenantId || tenantId);
            } else {
                // If fetching fails or no settings found, initialize with a new tenant ID and empty platform
                setTenantId(tenantId);
                addNewPlatform();
            }
        } catch (err) {
            console.error('Failed to fetch settings:', err);
            setTenantId(authService.getTenantId());
            setError('Failed to fetch settings. Please check the server connection or if the settings document exists.');
            addNewPlatform(); // Add an empty platform even on error to allow user to start fresh
        } finally {
            setLoading(false);
        }
    };

    const addNewPlatform = () => {
        const newPlatform = {
            id: Date.now(), // Unique ID for React key and internal tracking - IMPORTANT: This field is required by the Mongoose schema
            platformName: '',
            apiUrl: '',
            accessToken: '',
            showOptionalFields: false, // UI state
            showToken: false, // UI state
            isActive: false, // Connection status
            extraFields: {} // For additional, platform-specific fields
        };
        setPlatforms(prev => [...prev, newPlatform]);
    };

    const removePlatform = (platformId) => {
        setPlatforms(platforms.filter(platform => platform.id !== platformId));
    };

    const updatePlatform = (platformId, field, value) => {
        setPlatforms(platforms.map(platform =>
            platform.id === platformId ? { ...platform, [field]: value } : platform
        ));
    };

    const updatePlatformExtraField = (platformId, fieldName, value) => {
        setPlatforms(platforms.map(platform =>
            platform.id === platformId
                ? {
                    ...platform,
                    extraFields: { ...platform.extraFields, [fieldName]: value }
                }
                : platform
        ));
    };

    const toggleOptionalFields = (platformId) => {
        updatePlatform(platformId, 'showOptionalFields', 
            !platforms.find(p => p.id === platformId)?.showOptionalFields
        );
    };

    const toggleTokenVisibility = (platformId) => {
        updatePlatform(platformId, 'showToken',
            !platforms.find(p => p.id === platformId)?.showToken
        );
    };

    const normalizeUrl = (url) => {
        if (!url || typeof url !== 'string') return '';
        let normalized = url.trim();
        // Add https if no protocol specified
        if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
            normalized = 'https://' + normalized;
        }
        // Remove trailing slash
        return normalized.replace(/\/+$/, '');
    };

    const testPlatformConnection = async (platform) => {
        if (!platform.platformName.trim()) {
            setError('Please enter a Platform Name.');
            return;
        }
        if (!platform.apiUrl.trim()) {
            setError('Please enter an API URL.');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            // Validate authentication first
            if (!authService.isAuthenticated()) {
                throw new Error('User not authenticated');
            }
            
            const tenantId = authService.getTenantId();
            if (!tenantId) {
                throw new Error('No tenant ID available');
            }
            
            setTenantId(tenantId); // Ensure tenantId is set for the request

            const platformData = {
                ...platform,
                // Normalize apiUrl before sending to backend for specific platform handling
                apiUrl: platform.platformName.toLowerCase().includes('shopify') ? platform.apiUrl.trim() : normalizeUrl(platform.apiUrl)
            };

            const response = await fetch(`${API_URL}/test-connection`, {
                method: 'POST',
                headers: authService.getAuthHeaders(), // Use AuthService for proper headers
                body: JSON.stringify({ 
                    platform: platformData,
                    tenantId: tenantId // Also send in body for consistency
                }),
                credentials: 'include'
            });

            const result = await response.json();

            if (response.ok && result.success) {
                updatePlatform(platform.id, 'isActive', true);
                setSuccess(result.message || `${platform.platformName} connection successful!`);
                setTimeout(() => setSuccess(''), 5000);
            } else {
                updatePlatform(platform.id, 'isActive', false);
                setError(result.error || result.message || `Failed to connect to ${platform.platformName}`);
            }
        } catch (err) {
            console.error('Connection error:', err);
            updatePlatform(platform.id, 'isActive', false);
            setError(`Connection error: ${err.message}. Ensure API URL and credentials are correct.`);
        } finally {
            setLoading(false);
        }
    };

    const normalizePlatformForSave = (platform) => {
        let updated = { ...platform };
        const name = updated.platformName.toLowerCase();
        let apiUrl = normalizeUrl(updated.apiUrl); // General normalization

        if (name.includes('shopify')) {
            let domain = updated.apiUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
            domain = domain.replace(/\.myshopify\.com$/, ''); // Remove .myshopify.com if already present
            updated.apiUrl = `https://${domain}.myshopify.com`; // Store just the base domain for Shopify
        } else if (name.includes('woocommerce')) {
            let storeUrl = updated.extraFields?.storeUrl ? normalizeUrl(updated.extraFields.storeUrl) : apiUrl;
            storeUrl = storeUrl.replace(/\/+$/, '');
            updated.extraFields = {
                ...updated.extraFields,
                storeUrl: storeUrl,
                consumerKey: updated.extraFields?.consumerKey || updated.extraFields?.apiKey || '',
                consumerSecret: updated.extraFields?.consumerSecret || updated.extraFields?.secretKey || ''
            };
            updated.apiUrl = storeUrl; // For WooCommerce, the base URL is sufficient
        } else {
            updated.apiUrl = apiUrl;
        }

        // Remove UI state fields before saving to the database
        const { showOptionalFields, showToken, ...platformWithoutUI } = updated;
        return platformWithoutUI;
    };

    const saveSettings = async () => {
        const platformsWithInvalidData = platforms.filter(platform => 
            platform.platformName.trim() === '' || platform.apiUrl.trim() === ''
        );

        if (platformsWithInvalidData.length > 0) {
            setError('Please fill in all required fields (Platform Name and API URL) for all platforms.');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            // Validate authentication first
            if (!authService.isAuthenticated()) {
                throw new Error('User not authenticated');
            }
            
            const tenantId = authService.getTenantId();
            if (!tenantId) {
                throw new Error('No tenant ID available');
            }

            // Normalize all platforms before saving
            const normalizedPlatforms = platforms.map(normalizePlatformForSave);

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: authService.getAuthHeaders(), // Use AuthService for proper headers
                credentials: 'include',
                body: JSON.stringify({ 
                    platforms: normalizedPlatforms,
                    tenantId: tenantId
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                setSuccess('Settings saved successfully!');
                setTimeout(() => setSuccess(''), 5000);
            } else {
                throw new Error(result.error || result.message || 'Failed to save settings');
            }
        } catch (err) {
            console.error('Save error:', err);
            setError(`Failed to save settings: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const getApiUrlPlaceholder = (platformName) => {
        const name = platformName.toLowerCase();
        if (name.includes('shopify')) {
            return "e.g., mystore (without .myshopify.com)";
        } else if (name.includes('woocommerce')) {
            return "e.g., https://yourstore.com";
        } else {
            return "e.g., https://api.yourplatform.com/v1";
        }
    };

    const getApiUrlHelpText = (platformName) => {
        const name = platformName.toLowerCase();
        if (name.includes('shopify')) {
            return "Enter just your store name (e.g., 'mystore' without .myshopify.com)";
        }
        if (name.includes('woocommerce')) {
            return "Enter the base URL of your WooCommerce store (e.g., 'https://yourstore.com')";
        }
        return "";
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 sm:p-6 font-sans">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-4">
                    {/* --- START: Back Button Implementation --- */}
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-1 p-2 rounded-lg"
                            aria-label="Go back"
                            title="Go Back"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                            Back
                        </button>
                    )}
                    {/* --- END: Back Button Implementation --- */}

                    <div className={`${onBack ? 'flex-grow flex justify-center' : 'w-full flex justify-center'}`}>
                        <h1 className="text-4xl font-extrabold text-gray-900 flex items-center">
                            <Settings className="mr-4 text-blue-600" size={40} />
                            API Settings & Configuration
                        </h1>
                    </div>
                    {/* Optional spacer to align title centrally if onBack is present */}
                    {onBack && <div className="w-16"></div>}
                </div>

                <div className='mb-8'></div> {/* Spacing equivalent to old h1 margin */}

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg flex items-center">
                        <AlertCircle className="mr-2" size={20} />
                        <div>
                            <strong>Error:</strong> {error}
                        </div>
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-r-lg flex items-center">
                        <CheckCircle className="mr-2" size={20} />
                        <div>
                            <strong>Success:</strong> {success}
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 mb-8">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                            <Globe className="mr-3 text-green-600" size={24} />
                            Platform APIs
                        </h2>
                        <button
                            onClick={addNewPlatform}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors"
                            aria-label="Add new platform"
                        >
                            <Plus size={16} />
                            Add Platform
                        </button>
                    </div>

                    {platforms.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                            <p>No platforms added yet. Click "Add Platform" to get started.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {platforms.map((platform) => (
                                <div key={platform.id} className="p-6 bg-gray-50 rounded-xl border border-gray-200 relative">
                                    {platforms.length > 1 && ( // Only show remove button if more than one platform
                                        <button
                                            onClick={() => removePlatform(platform.id)}
                                            className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                                            aria-label={`Remove ${platform.platformName || 'platform'}`}
                                            title="Remove Platform"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label htmlFor={`platformName-${platform.id}`} className="block text-sm font-semibold text-gray-700 mb-2">
                                                Platform Name *
                                            </label>
                                            <input
                                                id={`platformName-${platform.id}`}
                                                type="text"
                                                value={platform.platformName}
                                                onChange={(e) => updatePlatform(platform.id, 'platformName', e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                placeholder="e.g., Shopify, WooCommerce, Stripe"
                                                aria-label="Platform name"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor={`apiUrl-${platform.id}`} className="block text-sm font-semibold text-gray-700 mb-2">
                                                API URL *
                                            </label>
                                            <input
                                                id={`apiUrl-${platform.id}`}
                                                type="text"
                                                value={platform.apiUrl}
                                                onChange={(e) => updatePlatform(platform.id, 'apiUrl', e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                placeholder={getApiUrlPlaceholder(platform.platformName)}
                                                aria-label="API URL"
                                            />
                                            {getApiUrlHelpText(platform.platformName) && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {getApiUrlHelpText(platform.platformName)}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label htmlFor={`accessToken-${platform.id}`} className="block text-sm font-semibold text-gray-700 mb-2">
                                                Access Token {platform.platformName.toLowerCase().includes('shopify') && '*'}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    id={`accessToken-${platform.id}`}
                                                    type={platform.showToken ? "text" : "password"}
                                                    value={platform.accessToken}
                                                    onChange={(e) => updatePlatform(platform.id, 'accessToken', e.target.value)}
                                                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                    placeholder="Enter access token if required"
                                                    aria-label="Access token"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => toggleTokenVisibility(platform.id)}
                                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                    aria-label={platform.showToken ? "Hide access token" : "Show access token"}
                                                    title={platform.showToken ? "Hide Token" : "Show Token"}
                                                >
                                                    {platform.showToken ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                            {platform.platformName.toLowerCase().includes('shopify') && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Required for Shopify - Get from Shopify Admin → Apps → Develop apps → Your app → API credentials
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center">
                                            <button
                                                onClick={() => toggleOptionalFields(platform.id)}
                                                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors mt-6"
                                                aria-label={platform.showOptionalFields ? "Hide optional fields" : "Show optional fields"}
                                                title={platform.showOptionalFields ? "Hide Optional Fields" : "Add Optional Fields"}
                                            >
                                                <Plus size={16} />
                                                {platform.showOptionalFields ? 'Hide' : 'Add'} Optional Fields
                                            </button>
                                        </div>
                                    </div>

                                    {platform.showOptionalFields && (
                                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                            <h5 className="text-sm font-semibold text-blue-800 mb-3">Optional Configuration Fields</h5>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                <div>
                                                    <label htmlFor={`apiKey-${platform.id}`} className="block text-sm font-medium text-gray-700 mb-1">API Key / Consumer Key</label>
                                                    <input
                                                        id={`apiKey-${platform.id}`}
                                                        type="text"
                                                        value={platform.extraFields?.apiKey || platform.extraFields?.consumerKey || ''}
                                                        onChange={(e) => {
                                                            updatePlatformExtraField(platform.id, 'apiKey', e.target.value);
                                                            updatePlatformExtraField(platform.id, 'consumerKey', e.target.value);
                                                        }}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        placeholder="API or consumer key"
                                                        aria-label="API or consumer key"
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor={`secretKey-${platform.id}`} className="block text-sm font-medium text-gray-700 mb-1">Secret Key / Consumer Secret</label>
                                                    <input
                                                        id={`secretKey-${platform.id}`}
                                                        type="password"
                                                        value={platform.extraFields?.secretKey || platform.extraFields?.consumerSecret || ''}
                                                        onChange={(e) => {
                                                            updatePlatformExtraField(platform.id, 'secretKey', e.target.value);
                                                            updatePlatformExtraField(platform.id, 'consumerSecret', e.target.value);
                                                        }}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        placeholder="Secret or consumer secret"
                                                        aria-label="Secret or consumer secret"
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor={`customHeader-${platform.id}`} className="block text-sm font-medium text-gray-700 mb-1">Custom Header</label>
                                                    <input
                                                        id={`customHeader-${platform.id}`}
                                                        type="text"
                                                        value={platform.extraFields?.customHeader || ''}
                                                        onChange={(e) => updatePlatformExtraField(platform.id, 'customHeader', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        placeholder="Custom header value"
                                                        aria-label="Custom header"
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor={`storeId-${platform.id}`} className="block text-sm font-medium text-gray-700 mb-1">Store ID</label>
                                                    <input
                                                        id={`storeId-${platform.id}`}
                                                        type="text"
                                                        value={platform.extraFields?.storeId || ''}
                                                        onChange={(e) => updatePlatformExtraField(platform.id, 'storeId', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        placeholder="Store or merchant ID"
                                                        aria-label="Store ID"
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor={`storeUrl-${platform.id}`} className="block text-sm font-medium text-gray-700 mb-1">Store URL</label>
                                                    <input
                                                        id={`storeUrl-${platform.id}`}
                                                        type="url"
                                                        value={platform.extraFields?.storeUrl || ''}
                                                        onChange={(e) => updatePlatformExtraField(platform.id, 'storeUrl', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        placeholder="e.g., https://yourstore.com"
                                                        aria-label="Store URL"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-end mt-4">
                                        <button
                                            onClick={() => testPlatformConnection(platform)}
                                            disabled={loading || !platform.apiUrl.trim() || !platform.platformName.trim()}
                                            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            aria-label={`Test connection for ${platform.platformName || 'platform'}`}
                                            title="Test Connection"
                                        >
                                            <RefreshCw className={loading ? 'animate-spin' : ''} size={16} />
                                            Connect
                                        </button>
                                    </div>

                                    {platform.isActive && (
                                        <div className="mt-3 flex justify-end">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                Connected
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex justify-center">
                    <button
                        onClick={saveSettings}
                        disabled={loading}
                        className="bg-green-600 text-white px-8 py-3 rounded-lg shadow-lg hover:bg-green-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        aria-label="Save all settings"
                        title="Save All Settings"
                    >
                        {loading ? (
                            <RefreshCw className="animate-spin" size={20} />
                        ) : (
                            <Save size={20} />
                        )}
                        {loading ? 'Saving...' : 'Save All Settings'}
                    </button>
                </div>

                {loading && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 flex items-center space-x-4 shadow-xl">
                            <RefreshCw className="animate-spin text-blue-500" size={24} />
                            <span className="text-gray-700 font-medium">Processing...</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsPage;