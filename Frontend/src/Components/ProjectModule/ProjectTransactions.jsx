import React, { useState } from 'react';
import { Plus, Search, Filter, Download, Upload, FileText, X } from 'lucide-react';
import projectService from '../../services/projectService';

const ProjectTransactions = ({ project }) => {
  const [activeTransactionType, setActiveTransactionType] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [localProject, setLocalProject] = useState(project); // ✅ local project state

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'income',
    date: new Date().toISOString().split('T')[0],
    category: ''
  });

  const allTransactions = [
    ...(localProject.income?.map(t => ({ ...t, type: 'income' })) || []),
    ...(localProject.expenses?.map(t => ({ ...t, type: 'expense' })) || []),
    ...(localProject.tax?.map(t => ({ ...t, type: 'tax' })) || [])
  ].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

  const filteredTransactions = activeTransactionType === 'all' 
    ? allTransactions 
    : allTransactions.filter(t => t.type === activeTransactionType);

  // ✅ FIXED handleAddTransaction
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!formData.description.trim()) {
        throw new Error('Description is required');
      }
      if (!formData.amount || formData.amount <= 0) {
        throw new Error('Valid amount is required');
      }

      const transactionData = {
        description: formData.description.trim(),
        amount: parseFloat(formData.amount),
        date: formData.date,
        category: formData.category || 'general'
      };

      console.log('💰 Adding transaction:', transactionData);
      
      // Add to DB
      await projectService.addTransaction(project._id, transactionData, formData.type);

      // ✅ Update local state instead of reloading
      setLocalProject(prev => {
        const updated = { ...prev };
        if (formData.type === 'income') {
          updated.income = [...(updated.income || []), transactionData];
        } else if (formData.type === 'expense') {
          updated.expenses = [...(updated.expenses || []), transactionData];
        } else if (formData.type === 'tax') {
          updated.tax = [...(updated.tax || []), transactionData];
        }
        return updated;
      });

      setSuccess(`${formData.type === 'income' ? 'Income' : formData.type === 'expense' ? 'Expense' : 'Tax'} added successfully!`);
      setFormData({
        description: '',
        amount: '',
        type: 'income',
        date: new Date().toISOString().split('T')[0],
        category: ''
      });
      setShowAddForm(false);
      
      // ✅ No reload here — page stays same and updates instantly

    } catch (err) {
      console.error('❌ Error adding transaction:', err);
      setError(err.message || 'Failed to add transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'income': return 'text-green-600 bg-green-50 border-green-200';
      case 'expense': return 'text-red-600 bg-red-50 border-red-200';
      case 'tax': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'income': return 'Income';
      case 'expense': return 'Expense';
      case 'tax': return 'Tax';
      default: return 'Unknown';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">All Transactions</h3>
          <p className="text-sm text-gray-600">Manage and track all project transactions</p>
        </div>
        
        <div className="flex space-x-2">
          <button className="flex items-center px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Upload size={16} className="mr-2" />
            Import
          </button>
          <button className="flex items-center px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Download size={16} className="mr-2" />
            Export
          </button>
          <button 
            onClick={() => setShowAddForm(true)}
            className="flex items-center px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <Plus size={16} className="mr-2" />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Add Transaction Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add New Transaction</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}
              
              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-green-700 text-sm">{success}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transaction Type
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                  <option value="tax">Tax</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter transaction description"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category (Optional)
                </label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  placeholder="e.g., Salary, Materials, Office Supplies"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Adding...
                    </>
                  ) : (
                    'Add Transaction'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {['all', 'income', 'expense', 'tax'].map(type => (
            <button
              key={type}
              onClick={() => setActiveTransactionType(type)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTransactionType === type
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {type === 'all' ? 'All' : getTypeLabel(type)}
            </button>
          ))}
        </div>

        <div className="flex space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search transactions..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button className="flex items-center px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Filter size={16} className="mr-2" />
            Filter
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {filteredTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((transaction, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {transaction.description || `Transaction ${index + 1}`}
                      </div>
                      {transaction.category && (
                        <div className="text-xs text-gray-500 mt-1">
                          {transaction.category}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTypeColor(transaction.type)}`}>
                        {getTypeLabel(transaction.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.date ? new Date(transaction.date).toLocaleDateString() : 'No date'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount || 0)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Completed
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="text-gray-400" size={24} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No transactions found</h3>
            <p className="text-gray-600 text-sm mb-6">
              {activeTransactionType === 'all' 
                ? 'Get started by adding your first transaction' 
                : `No ${activeTransactionType} transactions found`}
            </p>
            <button 
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              <Plus size={16} className="mr-2 inline" />
              Add Transaction
            </button>
          </div>
        )}
      </div>

      {/* Summary */}
      {filteredTransactions.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Showing {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
            </p>
            <div className="flex space-x-4 text-sm">
              <span className="text-green-600 font-medium">
                Income: {formatCurrency(
                  filteredTransactions
                    .filter(t => t.type === 'income')
                    .reduce((sum, t) => sum + (t.amount || 0), 0)
                )}
              </span>
              <span className="text-red-600 font-medium">
                Expenses: {formatCurrency(
                  filteredTransactions
                    .filter(t => t.type === 'expense')
                    .reduce((sum, t) => sum + (t.amount || 0), 0)
                )}
              </span>
              <span className="text-yellow-600 font-medium">
                Tax: {formatCurrency(
                  filteredTransactions
                    .filter(t => t.type === 'tax')
                    .reduce((sum, t) => sum + (t.amount || 0), 0)
                )}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectTransactions;
