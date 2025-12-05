import React, { useState, useEffect } from 'react';
import API_BASE from '../config/api';
import authService from '../services/authService';

const API_BASE_URL = `${API_BASE.replace(/\/$/, '')}/api`;

// Enhanced API call utility
const makeApiCall = async (url, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    'x-tenant-id': localStorage.getItem('tenantId') || authService.getTenantId() || ('fallback-' + Math.random().toString(36).substr(2, 9)),
    ...options.headers,
  };

  try {
    // Prefer authService (handles multiple storage keys) then fallback to localStorage
    const token = authService.getToken() || localStorage.getItem('token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('⚠️ No auth token found for API call to', url);
    }
  } catch (err) {
    console.warn('Could not read auth token', err);
  }

  try {
    console.log(`🌐 Making API call: ${options.method || 'GET'} ${url}`);
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = await response.text() || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ API call failed: ${url}`, error);
    throw error;
  }
};

const showWebNotification = (title, body) => {
  if (!("Notification" in window)) return;

  if (Notification.permission === "granted") {
    new Notification(title, { body });
    return;
  }

  if (Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        new Notification(title, { body });
      }
    });
  }
};

// Enhanced error handler
const handleApiError = (error, defaultMessage = 'An error occurred') => {
  console.error('API Error:', error);
  
  if (error.message.includes('Failed to fetch')) {
    return 'Network error: Unable to connect to server. Please check your internet connection.';
  }
  
  if (error.message.includes('404')) {
    return 'Server endpoint not found. Please contact support.';
  }
  
  if (error.message.includes('401')) {
    return 'Authentication failed. Please log in again.';
  }
  
  if (error.message.includes('400')) {
    return error.message.replace('Error: ', '');
  }
  
  if (error.message.includes('500')) {
    return 'Server error. Please try again later.';
  }
  
  return error.message || defaultMessage;
};

const MonthPage = () => {
  const [monthlyBills, setMonthlyBills] = useState([]);
  const [categories, setCategories] = useState(['Rent', 'Utilities', 'Subscription', 'Food', 'Internet', 'Insurance']);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('bills');
  const [serverStatus, setServerStatus] = useState('checking');

  const tenantId = localStorage.getItem('tenantId') || authService.getTenantId() || ('fallback-' + Math.random().toString(36).substr(2, 9));

  const initialNewBillState = {
    name: '',
    amount: '',
    dueDate: '',
    category: categories[0] || ''
  };
  const [newBill, setNewBill] = useState(initialNewBillState);

  // Check server status on component mount
  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (response.ok) {
          setServerStatus('online');
          console.log('✅ Server is online');
        } else {
          setServerStatus('error');
          console.log('❌ Server health check failed');
        }
      } catch (error) {
        setServerStatus('offline');
        console.error('❌ Server is offline:', error);
      }
    };

    checkServerStatus();
  }, []);

  useEffect(() => {
    const fetchBills = async () => {
      if (serverStatus !== 'online') return;

      try {
        console.log('🔄 Fetching bills...');
        
        const billsData = await makeApiCall(`${API_BASE_URL}/bills`);
        setMonthlyBills(billsData.map(bill => ({
          ...bill,
          dueDate: bill.dueDate ? String(bill.dueDate).split('T')[0] : ''
        })));

        // Check for upcoming notifications
        checkUpcomingNotifications(billsData);

      } catch (error) {
        console.error("Fetch error:", error);
        const errorMessage = handleApiError(error, 'Failed to load data');
        alert(errorMessage);
      }
    };

    fetchBills();
  }, [serverStatus]);

  // Check for upcoming notifications
  const checkUpcomingNotifications = (bills) => {
    const today = new Date();
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(today.getDate() + 2);

    const upcomingBills = bills.filter(bill => {
      if (bill.paid) return false;
      
      const dueDate = new Date(bill.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      twoDaysFromNow.setHours(0, 0, 0, 0);
      
      return dueDate.getTime() === twoDaysFromNow.getTime();
    });

    if (upcomingBills.length > 0) {
      upcomingBills.forEach(bill => {
        const notificationMessage = `🔔 Reminder: ${bill.name} of ₹${bill.amount} is due in 2 days (${new Date(bill.dueDate).toLocaleDateString()})`;
        
        // Show browser notification
        showWebNotification('Bill Due Soon!', notificationMessage);
        
        // Also show in-app alert for immediate visibility
        if (!bill.notificationShown) {
          alert(notificationMessage);
          // Mark as shown to avoid duplicate alerts
          bill.notificationShown = true;
        }
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewBill((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddBill = async (e) => {
    e.preventDefault();

    if (!newBill.name || !newBill.amount || !newBill.dueDate || !newBill.category) {
      alert('Please fill out all required fields.');
      return;
    }

    setLoading(true);
    try {
      const billToSend = {
        name: newBill.name,
        amount: parseFloat(newBill.amount),
        dueDate: newBill.dueDate,
        category: newBill.category
      };

      const addedBill = await makeApiCall(`${API_BASE_URL}/bills`, {
        method: 'POST',
        body: JSON.stringify(billToSend),
      });

      const derivedDueDate = addedBill.dueDate
        ? (typeof addedBill.dueDate === 'string' ? addedBill.dueDate.split('T')[0] : new Date(addedBill.dueDate).toISOString().split('T')[0])
        : billToSend.dueDate;

      setMonthlyBills((prev) => [...prev, {
        ...addedBill,
        dueDate: derivedDueDate,
        amount: parseFloat(addedBill.amount),
        name: addedBill.name
      }]);

      const notificationMessage = `Bill: ${addedBill.name} of ₹${parseFloat(addedBill.amount).toFixed(2)} is due on ${derivedDueDate}. You'll get a notification 2 days before.`;

      showWebNotification('Bill Saved!', notificationMessage);
      setNewBill(initialNewBillState);

    } catch (error) {
      console.error('Failed to add bill:', error);
      const errorMessage = handleApiError(error, 'Failed to add bill');
      alert(`Error adding bill: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBill = async (id) => {
    if (window.confirm('Are you sure you want to delete this bill?')) {
      try {
        await makeApiCall(`${API_BASE_URL}/bills/${id}`, {
          method: 'DELETE',
        });

        setMonthlyBills((prev) => prev.filter((bill) => bill._id !== id));
        alert('Bill deleted successfully.');
      } catch (error) {
        console.error('Failed to delete bill:', error);
        const errorMessage = handleApiError(error, 'Failed to delete bill');
        alert(`Error deleting bill: ${errorMessage}`);
      }
    }
  };

  const toggleBillPaid = async (id, currentPaidStatus) => {
    try {
      const updatedBill = await makeApiCall(`${API_BASE_URL}/bills/${id}/toggle`, {
        method: 'PUT',
      });

      setMonthlyBills((prev) =>
        prev.map((bill) =>
          bill._id === updatedBill._id ? {
            ...updatedBill,
            dueDate: updatedBill.dueDate ? String(updatedBill.dueDate).split('T')[0] : bill.dueDate,
          } : bill
        )
      );
    } catch (error) {
      console.error('Failed to toggle bill:', error);
      const errorMessage = handleApiError(error, 'Failed to update bill status');
      alert(`Error updating bill status: ${errorMessage}`);
    }
  };

  const handleSaveCategory = () => {
    const trimmedName = newCategoryName.trim();
    if (trimmedName === '') {
      setIsAddingCategory(false);
      return;
    }

    if (categories.includes(trimmedName)) {
      alert('Category already exists');
      return;
    }

    setCategories((prev) => [...prev, trimmedName]);
    setNewCategoryName('');
    setIsAddingCategory(false);
    setNewBill((prev) => ({ ...prev, category: trimmedName }));
  };

  const totalAmount = monthlyBills.reduce((sum, bill) => sum + parseFloat(bill.amount), 0);
  const paidAmount = monthlyBills
    .filter(bill => bill.paid)
    .reduce((sum, bill) => sum + parseFloat(bill.amount), 0);
  const pendingAmount = totalAmount - paidAmount;

  const upcomingBills = monthlyBills.filter(bill => {
    if (bill.paid) return false;
    const dueDate = new Date(bill.dueDate);
    const today = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);
    return dueDate >= today && dueDate <= sevenDaysFromNow;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Server Status Indicator */}
        <div className={`text-center mb-4 p-2 rounded-lg ${
          serverStatus === 'online' ? 'bg-green-100 text-green-800' :
          serverStatus === 'offline' ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          Server Status: {serverStatus === 'online' ? '✅ Online' : serverStatus === 'offline' ? '❌ Offline' : '🔄 Checking...'}
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            💰 Bill Manager
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Manage your monthly bills and get notifications before due dates
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Bills</p>
                <p className="text-3xl font-bold text-gray-800">{monthlyBills.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Amount</p>
                <p className="text-3xl font-bold text-gray-800">₹{totalAmount.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Pending</p>
                <p className="text-3xl font-bold text-gray-800">₹{pendingAmount.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">⏰</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Upcoming</p>
                <p className="text-3xl font-bold text-gray-800">{upcomingBills.length}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🔔</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-lg mb-8">
          <div className="p-6">
            {/* Bills Section */}
            <div className="space-y-8">
              {/* Add Bill Form */}
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-8 text-white">
                <h2 className="text-2xl font-bold mb-6">Add New Bill</h2>
                <form onSubmit={handleAddBill} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Bill Name</label>
                    <input
                      type="text"
                      name="name"
                      value={newBill.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
                      placeholder="Electricity Bill"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Amount (₹)</label>
                    <input
                      type="number"
                      name="amount"
                      value={newBill.amount}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
                      placeholder="1500.00"
                      step="0.01"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Due Date</label>
                    <input
                      type="date"
                      name="dueDate"
                      value={newBill.dueDate}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Category</label>
                    <div className="flex gap-2">
                      <select
                        name="category"
                        value={newBill.category}
                        onChange={handleInputChange}
                        className="flex-1 px-4 py-3 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
                        required
                        disabled={loading}
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat} className="text-gray-800">{cat}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setIsAddingCategory(true)}
                        className="px-4 py-3 bg-white/30 hover:bg-white/40 rounded-lg transition-colors duration-200"
                        disabled={loading}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-white text-blue-600 hover:bg-gray-100 font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                    >
                      {loading ? 'Adding...' : 'Add Bill'}
                    </button>
                  </div>
                </form>

                {isAddingCategory && (
                  <div className="mt-4 p-4 bg-white/20 rounded-lg backdrop-blur-sm">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="flex-1 px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white"
                        placeholder="New category name"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveCategory}
                        className="px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setIsAddingCategory(false)}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bills List */}
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-800">Your Bills</h3>
                  <div className="text-sm text-gray-600">
                    {monthlyBills.filter(b => !b.paid).length} unpaid • {monthlyBills.filter(b => b.paid).length} paid
                  </div>
                </div>
                {monthlyBills.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
                    <div className="text-6xl mb-4">📄</div>
                    <p className="text-xl text-gray-600 mb-4">No bills added yet</p>
                    <p className="text-gray-500">Add your first bill using the form above</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {monthlyBills.map((bill) => (
                      <div key={bill._id} className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500 hover:shadow-xl transition-all duration-300">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-2">
                              <h4 className="text-xl font-semibold text-gray-800">{bill.name}</h4>
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                bill.paid 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {bill.paid ? 'Paid' : 'Unpaid'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                              <span>Category: {bill.category}</span>
                              <span>Due: {bill.dueDate}</span>
                              <span className="font-semibold text-lg text-gray-800">₹{parseFloat(bill.amount).toFixed(2)}</span>
                            </div>
                            {!bill.paid && bill.daysUntilDue <= 2 && bill.daysUntilDue >= 0 && (
                              <div className="mt-2">
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                                  ⚠ Due in {bill.daysUntilDue} day(s)
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => toggleBillPaid(bill._id, bill.paid)}
                              className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                                bill.paid
                                  ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                                  : 'bg-green-500 hover:bg-green-600 text-white'
                              }`}
                            >
                              {bill.paid ? 'Mark Unpaid' : 'Mark Paid'}
                            </button>
                            <button
                              onClick={() => handleDeleteBill(bill._id)}
                              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors duration-300"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Notification Info Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Notification System</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">Automatic Notifications</h4>
                  <p className="text-gray-600 text-sm">System checks for bills due in 2 days automatically</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-green-600 font-bold">2</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">Browser Alerts</h4>
                  <p className="text-gray-600 text-sm">Get browser notifications for upcoming bills</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-600 font-bold">3</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">In-App Warnings</h4>
                  <p className="text-gray-600 text-sm">See visual warnings on bills due soon</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-orange-600 font-bold">4</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">No SMS Required</h4>
                  <p className="text-gray-600 text-sm">All notifications are in-app and browser-based</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthPage;