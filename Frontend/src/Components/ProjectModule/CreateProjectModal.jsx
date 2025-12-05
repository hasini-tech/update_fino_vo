import React, { useState } from 'react';

const CreateProjectModal = ({ onClose, onCreate, loading }) => {
  const [formData, setFormData] = useState({
    name: '',
    budget: '',
    description: ''
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'budget') {
      // Allow only numbers and commas for formatting
      const formattedValue = value.replace(/[^\d,]/g, '');
      
      // Format with commas as user types
      const numericValue = formattedValue.replace(/,/g, '');
      if (numericValue === '') {
        setFormData(prev => ({ ...prev, [name]: '' }));
      } else {
        const formatted = new Intl.NumberFormat('en-IN').format(Number(numericValue));
        setFormData(prev => ({ ...prev, [name]: formatted }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    }
    
    if (!formData.budget) {
      newErrors.budget = 'Budget is required';
    } else {
      const numericBudget = parseFloat(formData.budget.replace(/,/g, ''));
      if (isNaN(numericBudget) || numericBudget <= 0) {
        newErrors.budget = 'Please enter a valid budget amount';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      // Convert formatted budget back to number for API
      const projectData = {
        ...formData,
        budget: formData.budget.replace(/,/g, '')
      };
      
      await onCreate(projectData);
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Create New Project</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              disabled={loading}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              } disabled:opacity-50`}
              placeholder="Enter project name"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Budget (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                ₹
              </span>
              <input
                type="text"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                disabled={loading}
                className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.budget ? 'border-red-500' : 'border-gray-300'
                } disabled:opacity-50`}
                placeholder="50,000"
              />
            </div>
            {errors.budget && (
              <p className="text-red-500 text-sm mt-1">{errors.budget}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Enter amount in Indian Rupees (e.g., 50,000)
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              disabled={loading}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              placeholder="Enter project description (optional)"
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;