import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Add as AddIcon,
  AccountBalanceWallet as WalletIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  Save as SaveIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Paid as PaidIcon,
  RequestQuote as RequestQuoteIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

// API Configuration with central base
import API_BASE from '../config/api';

const getApiConfig = () => {
  const apiBase = API_BASE;
  const possibleEndpoints = [
    process.env.REACT_APP_API_URL,
    `${apiBase}/api`
  ].filter(Boolean);

  return {
    endpoints: possibleEndpoints,
    defaultEndpoint: possibleEndpoints[0] || `${apiBase}/api`,
    tenantId: localStorage.getItem('tenantId') || 'demo-tenant'
  };
};

// Enhanced API fetch function with retry logic
const apiFetch = async (endpoint, options = {}) => {
  const config = getApiConfig();
  let lastError = null;

  for (const baseUrl of config.endpoints) {
    try {
      const url = `${baseUrl}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'tenant-id': config.tenantId,
          ...options.headers,
        },
      });

      if (response.ok) {
        return await response.json();
      }
      
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error;
      continue;
    }
  }

  throw lastError || new Error('All API endpoints failed');
};

// Enhanced Stat Card Component
const StatCard = ({ title, value, subtitle, icon, color = 'primary' }) => {
  const theme = useTheme();
  return (
    <Card sx={{ 
      height: '100%', 
      border: 'none',
      boxShadow: '0 4px 20px 0 rgba(0,0,0,0.1)',
      borderRadius: 3,
      background: `linear-gradient(135deg, ${theme.palette[color].light}15, ${theme.palette.background.paper})`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s ease-in-out',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 8px 30px 0 rgba(0,0,0,0.15)',
      }
    }}>
      <CardContent sx={{ p: 3, '&:last-child': { pb: 3 }, width: '100%' }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2 
        }}>
          <Box sx={{ 
            color: `${color}.main`,
            backgroundColor: `${color}.light}20`,
            borderRadius: 3,
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 1
          }}>
            {React.cloneElement(icon, { fontSize: 'medium' })}
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: `${color}.main`, fontSize: '1.5rem' }}>
            ₹{value?.toLocaleString() || 0}
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.8 }}>
            {subtitle}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

// Enhanced Statistics Component
const MoneyStatistics = ({ statistics, loading }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  if (loading) {
    return (
      <Grid container spacing={3} sx={{ mb: 4, justifyContent: 'center' }}>
        {[1, 2, 3, 4].map((item) => (
          <Grid item xs={12} sm={6} md={3} key={item} sx={{ display: 'flex', justifyContent: 'center' }}>
            <Card sx={{ p: 4, textAlign: 'center', width: '100%', maxWidth: 280, borderRadius: 3 }}>
              <CircularProgress size={30} />
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }
  
  return (
    <Grid container spacing={3} sx={{ mb: 4, justifyContent: 'center' }}>
      <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex', justifyContent: 'center' }}>
        <StatCard
          title="You Owe"
          value={statistics?.totalBorrow || 0}
          subtitle="Total borrowed"
          icon={<ArrowUpwardIcon />}
          color="warning"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex', justifyContent: 'center' }}>
        <StatCard
          title="You're Owed"
          value={statistics?.totalLend || 0}
          subtitle="Total lent"
          icon={<ArrowDownwardIcon />}
          color="success"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex', justifyContent: 'center' }}>
        <StatCard
          title="Overdue"
          value={statistics?.overdueCount || 0}
          subtitle="Pending payments"
          icon={<WarningIcon />}
          color="error"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex', justifyContent: 'center' }}>
        <StatCard
          title="Due Soon"
          value={statistics?.dueSoonCount || 0}
          subtitle="Next 3 days"
          icon={<ScheduleIcon />}
          color="info"
        />
      </Grid>
    </Grid>
  );
};

// Transaction Form Component
const TransactionForm = ({ open, onClose, onSuccess, editTransaction, formType }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    type: 'borrow',
    personName: '',
    amount: '',
    purpose: '',
    transactionDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    upiLink: '',
    notes: '',
    reminderEnabled: true
  });

  useEffect(() => {
    if (open) {
      if (editTransaction) {
        setFormData({
          type: editTransaction.type,
          personName: editTransaction.personName,
          amount: editTransaction.amount.toString(),
          purpose: editTransaction.purpose,
          transactionDate: editTransaction.transactionDate ? new Date(editTransaction.transactionDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          dueDate: editTransaction.dueDate ? new Date(editTransaction.dueDate).toISOString().split('T')[0] : '',
          upiLink: editTransaction.upiLink || '',
          notes: editTransaction.notes || '',
          reminderEnabled: editTransaction.reminderEnabled !== false
        });
      } else {
        setFormData({
          type: formType,
          personName: '',
          amount: '',
          purpose: '',
          transactionDate: new Date().toISOString().split('T')[0],
          dueDate: '',
          upiLink: '',
          notes: '',
          reminderEnabled: true
        });
      }
      setError('');
    }
  }, [open, editTransaction, formType]);

  const handleChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const validateForm = () => {
    if (!formData.personName.trim()) {
      setError(formData.type === 'borrow' ? 'Lender name is required' : 'Borrower name is required');
      return false;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Valid amount is required');
      return false;
    }
    if (!formData.purpose.trim()) {
      setError('Purpose is required');
      return false;
    }
    if (!formData.dueDate) {
      setError('Due date is required');
      return false;
    }
    
    const dueDate = new Date(formData.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dueDate < today) {
      setError('Due date cannot be in the past');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!validateForm()) return;

    setLoading(true);

    try {
      const config = getApiConfig();
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        transactionDate: new Date(formData.transactionDate).toISOString(),
        dueDate: new Date(formData.dueDate).toISOString()
      };

      const endpoint = editTransaction 
        ? `/money/${editTransaction._id}`
        : '/money';
      
      const result = await apiFetch(endpoint, {
        method: editTransaction ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });

      if (result.success) {
        onSuccess();
        onClose();
      } else {
        throw new Error(result.message || 'Failed to save transaction');
      }
    } catch (err) {
      console.error('Error saving transaction:', err);
      setError(err.message || 'Failed to save transaction. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (editTransaction) {
      return `Edit ${editTransaction.type === 'borrow' ? 'Borrowed' : 'Lent'} Money`;
    }
    return formType === 'borrow' ? 'Borrow Money' : 'Lend Money';
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth 
      PaperProps={{ 
        sx: { 
          borderRadius: 3,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        } 
      }}
    >
      <DialogTitle sx={{ pb: 2, textAlign: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', fontWeight: 700, color: 'white', fontSize: '1.25rem' }}>
        {getTitle()}
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 3, pb: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} size="small">
              {error}
            </Alert>
          )}

          <Grid container spacing={2.5}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="medium"
                label={formData.type === 'borrow' ? 'Lender Name *' : 'Borrower Name *'}
                placeholder={formData.type === 'borrow' ? 'Enter lender name' : 'Enter borrower name'}
                value={formData.personName}
                onChange={handleChange('personName')}
                required
                error={!formData.personName.trim()}
                sx={{ borderRadius: 2 }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="medium"
                type="number"
                label="Amount *"
                placeholder="Enter amount"
                value={formData.amount}
                onChange={handleChange('amount')}
                required
                error={!formData.amount || parseFloat(formData.amount) <= 0}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                }}
                sx={{ borderRadius: 2 }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="medium"
                label="Purpose *"
                placeholder="Enter purpose"
                value={formData.purpose}
                onChange={handleChange('purpose')}
                required
                error={!formData.purpose.trim()}
                sx={{ borderRadius: 2 }}
              />
            </Grid>

            <Grid item xs={12} container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  size="medium"
                  type="date"
                  label="From Date *"
                  value={formData.transactionDate}
                  onChange={handleChange('transactionDate')}
                  InputLabelProps={{ shrink: true }}
                  sx={{ borderRadius: 2 }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  size="medium"
                  type="date"
                  label="Due Date *"
                  value={formData.dueDate}
                  onChange={handleChange('dueDate')}
                  required
                  error={!formData.dueDate}
                  InputLabelProps={{ shrink: true }}
                  sx={{ borderRadius: 2 }}
                />
              </Grid>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="medium"
                label="UPI Payment Link"
                placeholder="up://payfpa=example@upi"
                value={formData.upiLink}
                onChange={handleChange('upiLink')}
                sx={{ borderRadius: 2 }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    size="medium"
                    checked={formData.reminderEnabled}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      reminderEnabled: e.target.checked
                    }))}
                    color="primary"
                  />
                }
                label="Set reminder for due date"
                sx={{ mt: 1 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 3, pt: 1, gap: 2 }}>
          <Button 
            onClick={onClose} 
            disabled={loading} 
            size="large"
            variant="outlined"
            sx={{ 
              borderRadius: 2,
              px: 4,
              borderColor: 'grey.300',
              '&:hover': {
                borderColor: 'grey.400',
                backgroundColor: 'grey.50'
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading}
            size="large"
            startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
            sx={{ 
              borderRadius: 2,
              px: 4,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4)'
              }
            }}
          >
            {loading ? 'Saving...' : editTransaction ? 'Update' : 'Save'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

// Enhanced Transaction Item Component
const TransactionItem = ({ transaction, onMenuAction }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const theme = useTheme();

  const handleMenuOpen = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAction = (action) => {
    onMenuAction(transaction, action);
    handleMenuClose();
  };

  const getStatusInfo = () => {
    if (!transaction.dueDate) {
      return { 
        label: 'No Due Date', 
        color: 'default',
        variant: 'outlined',
        overdueText: ''
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dueDate = new Date(transaction.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 3600 * 24));
    const isOverdue = daysUntilDue < 0;

    if (transaction.status === 'completed') {
      return { 
        label: 'Paid', 
        color: 'success',
        variant: 'filled',
        overdueText: ''
      };
    } else if (isOverdue) {
      return { 
        label: 'Overdue', 
        color: 'error',
        variant: 'filled',
        overdueText: `Overdue by ${Math.abs(daysUntilDue)} days`
      };
    } else if (daysUntilDue === 0) {
      return { 
        label: 'Due Today', 
        color: 'warning',
        variant: 'filled',
        overdueText: 'Due today'
      };
    } else if (daysUntilDue <= 3) {
      return { 
        label: `Due in ${daysUntilDue}d`, 
        color: 'warning',
        variant: 'outlined',
        overdueText: `Due in ${daysUntilDue} days`
      };
    } else {
      return { 
        label: 'Pending', 
        color: 'default',
        variant: 'outlined',
        overdueText: `Due in ${daysUntilDue} days`
      };
    }
  };

  const statusInfo = getStatusInfo();
  const formattedDueDate = transaction.dueDate ? new Date(transaction.dueDate).toLocaleDateString('en-GB') : 'No due date';
  const isBorrow = transaction.type === 'borrow';

  return (
    <ListItem 
      sx={{ 
        px: 3, 
        py: 2,
        borderBottom: 1,
        borderColor: 'divider',
        '&:last-child': { borderBottom: 0 },
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          backgroundColor: 'action.hover',
          transform: 'translateX(4px)'
        }
      }}
      secondaryAction={
        <IconButton
          size="medium"
          onClick={handleMenuOpen}
          sx={{ 
            width: 40, 
            height: 40,
            color: 'text.secondary',
            '&:hover': {
              color: 'primary.main',
              backgroundColor: 'primary.light + 20'
            }
          }}
        >
          <MoreVertIcon />
        </IconButton>
      }
    >
      <ListItemAvatar sx={{ minWidth: 56 }}>
        <Avatar 
          sx={{ 
            width: 48, 
            height: 48, 
            bgcolor: isBorrow ? 'warning.main' : 'success.main',
            fontSize: '1rem',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        >
          {isBorrow ? 'B' : 'L'}
        </Avatar>
      </ListItemAvatar>
      
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Typography component="span" variant="h6" sx={{ fontWeight: 600 }}>
              {transaction.personName}
            </Typography>
            <Chip 
              label={statusInfo.label} 
              color={statusInfo.color}
              variant={statusInfo.variant}
              size="medium"
              sx={{ 
                height: 28, 
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            />
          </Box>
        }
        secondary={
          <Box component="span" sx={{ display: 'block' }}>
            <Typography component="span" variant="body1" color="text.primary" sx={{ fontWeight: 500, mb: 1, display: 'block' }}>
              ₹{transaction.amount?.toLocaleString() || '0'} • {transaction.purpose}
            </Typography>
            <Box component="span" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
              <Typography component="span" variant="body2" color="text.secondary">
                Due: {formattedDueDate}
              </Typography>
              {statusInfo.overdueText && (
                <Typography 
                  component="span"
                  variant="body2" 
                  color={statusInfo.color === 'error' ? 'error.main' : 'text.secondary'}
                  sx={{ 
                    fontStyle: 'italic',
                    fontWeight: statusInfo.color === 'error' ? 700 : 500
                  }}
                >
                  {statusInfo.overdueText}
                </Typography>
              )}
            </Box>
            {transaction.upiLink && (
              <Button 
                component="a"
                size="medium" 
                startIcon={<LinkIcon />}
                href={transaction.upiLink}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ 
                  mt: 1, 
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              >
                UPI Pay
              </Button>
            )}
          </Box>
        }
        sx={{ my: 0 }}
      />

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
            mt: 1
          }
        }}
      >
        <MenuItem onClick={() => handleAction('edit')} dense sx={{ py: 1.5 }}>
          <EditIcon sx={{ mr: 2, fontSize: 20, color: 'primary.main' }} />
          Edit
        </MenuItem>
        {transaction.status === 'pending' && (
          <MenuItem onClick={() => handleAction('complete')} dense sx={{ py: 1.5 }}>
            <CheckCircleIcon sx={{ mr: 2, fontSize: 20, color: 'success.main' }} />
            Mark Paid
          </MenuItem>
        )}
        <MenuItem onClick={() => handleAction('delete')} dense sx={{ py: 1.5, color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 2, fontSize: 20 }} />
          Delete
        </MenuItem>
      </Menu>
    </ListItem>
  );
};

// Main SmartBorrowForm Component - Beautiful Centered Layout
const SmartBorrowForm = () => {
  const [formOpen, setFormOpen] = useState(false);
  const [editTransaction, setEditTransaction] = useState(null);
  const [formType, setFormType] = useState('borrow');
  const [borrowTransactions, setBorrowTransactions] = useState([]);
  const [lendTransactions, setLendTransactions] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState('');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [borrowData, lendData] = await Promise.all([
        apiFetch('/money?type=borrow'),
        apiFetch('/money?type=lend')
      ]);

      if (borrowData.success) {
        setBorrowTransactions(borrowData.transactions || []);
      }
      
      if (lendData.success) {
        setLendTransactions(lendData.transactions || []);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err.message || 'Failed to fetch transactions. Please check if the server is running.');
      setBorrowTransactions([]);
      setLendTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      setStatsLoading(true);
      const data = await apiFetch('/money/statistics/summary');
      
      if (data.success) {
        setStatistics(data.statistics);
      }
    } catch (err) {
      console.error('Error fetching statistics:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchStatistics();
  }, []);

  const handleTransactionCreated = () => {
    fetchTransactions();
    fetchStatistics();
  };

  const handleOpenForm = (type) => {
    setFormType(type);
    setEditTransaction(null);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditTransaction(null);
  };

  const handleMenuAction = async (transaction, action) => {
    try {
      switch (action) {
        case 'edit':
          setEditTransaction(transaction);
          setFormType(transaction.type);
          setFormOpen(true);
          break;

        case 'complete':
          const completeResult = await apiFetch(`/money/${transaction._id}/complete`, {
            method: 'PATCH'
          });

          if (completeResult.success) {
            handleTransactionCreated();
          }
          break;

        case 'delete':
          if (window.confirm('Are you sure you want to delete this transaction?')) {
            const deleteResult = await apiFetch(`/money/${transaction._id}`, {
              method: 'DELETE'
            });

            if (deleteResult.success) {
              handleTransactionCreated();
            }
          }
          break;
      }
    } catch (error) {
      console.error('Error performing action:', error);
      alert(`Failed to perform action: ${error.message}`);
    }
  };

  const totalBorrowed = borrowTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalLent = lendTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      py: 4
    }}>
      <Container maxWidth="xl" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Header */}
        <Box sx={{ 
          mb: 6, 
          textAlign: 'center',
          maxWidth: 600,
          mx: 'auto'
        }}>
          <Typography variant="h2" sx={{ 
            fontWeight: 800, 
            mb: 2,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            fontSize: { xs: '2.5rem', md: '3.5rem' }
          }}>
            Money Tracker
          </Typography>
          <Typography variant="h5" color="text.secondary" sx={{ fontWeight: 400, opacity: 0.8 }}>
            Manage borrowed and lent money efficiently
          </Typography>
        </Box>

        {/* Statistics */}
        <Box sx={{ width: '100%', maxWidth: 1200, mb: 6 }}>
          <MoneyStatistics statistics={statistics} loading={statsLoading} />
        </Box>

        {/* Error Alert */}
        {error && (
          <Box sx={{ width: '100%', maxWidth: 800, mb: 4 }}>
            <Alert 
              severity="error" 
              sx={{ 
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
              }} 
              onClose={() => setError('')}
              action={
                <Button 
                  color="inherit" 
                  size="medium" 
                  onClick={() => {
                    fetchTransactions();
                    fetchStatistics();
                  }}
                  startIcon={<RefreshIcon />}
                  sx={{ borderRadius: 2 }}
                >
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          </Box>
        )}

        {/* Main Content - Beautiful Centered Layout */}
        <Box sx={{ 
          width: '100%', 
          maxWidth: 1400,
          display: 'flex', 
          justifyContent: 'center'
        }}>
          <Grid container spacing={4} sx={{ justifyContent: 'center' }}>
            {/* Borrow Money Section */}
            <Grid item xs={12} lg={5.5}>
              <Card sx={{ 
                border: 'none',
                boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
                borderRadius: 4,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: 'white',
                overflow: 'hidden'
              }}>
                <CardContent sx={{ p: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {/* Header */}
                  <Box sx={{ 
                    p: 4, 
                    borderBottom: 1, 
                    borderColor: 'divider',
                    background: 'linear-gradient(135deg, #fffbf0 0%, #fff5e6 100%)'
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.dark' }}>
                        Borrow Money
                      </Typography>
                      <Chip 
                        label={`${borrowTransactions.length} items`} 
                        color="warning"
                        variant="filled"
                        sx={{ 
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          height: 32
                        }}
                      />
                    </Box>
                    <Typography variant="h6" color="text.secondary" sx={{ opacity: 0.8 }}>
                      Track money you've borrowed from others
                    </Typography>
                  </Box>

                  {/* Transactions List */}
                  <Box sx={{ 
                    flex: 1,
                    overflow: 'auto', 
                    minHeight: 400,
                    maxHeight: 500,
                  }}>
                    {loading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                        <CircularProgress size={50} />
                      </Box>
                    ) : borrowTransactions.length === 0 ? (
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        height: 300, 
                        p: 4,
                        textAlign: 'center'
                      }}>
                        <WalletIcon sx={{ 
                          fontSize: 80, 
                          color: 'text.secondary', 
                          mb: 3, 
                          opacity: 0.3 
                        }} />
                        <Typography variant="h5" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
                          No borrowed money
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ opacity: 0.7 }}>
                          Start tracking your borrowed money by adding a transaction
                        </Typography>
                      </Box>
                    ) : (
                      <List sx={{ py: 0 }}>
                        {borrowTransactions.map((transaction) => (
                          <TransactionItem
                            key={transaction._id || transaction.id}
                            transaction={transaction}
                            onMenuAction={handleMenuAction}
                          />
                        ))}
                      </List>
                    )}
                  </Box>

                  {/* Footer Summary and Action Button */}
                  <Box sx={{ 
                    p: 4, 
                    borderTop: 1, 
                    borderColor: 'divider', 
                    background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        Total Borrowed
                      </Typography>
                      <Typography variant="h4" color="warning.main" sx={{ fontWeight: 800 }}>
                        ₹{totalBorrowed.toLocaleString()}
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      startIcon={<RequestQuoteIcon />}
                      onClick={() => handleOpenForm('borrow')}
                      sx={{ 
                        borderRadius: 3,
                        py: 2,
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #ffa726 0%, #fb8c00 100%)',
                        boxShadow: '0 8px 25px rgba(255, 167, 38, 0.3)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #fb8c00 0%, #ffa726 100%)',
                          boxShadow: '0 12px 35px rgba(255, 167, 38, 0.4)',
                          transform: 'translateY(-2px)'
                        }
                      }}
                    >
                      Add Borrowed Money
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Lend Money Section */}
            <Grid item xs={12} lg={5.5}>
              <Card sx={{ 
                border: 'none',
                boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
                borderRadius: 4,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: 'white',
                overflow: 'hidden'
              }}>
                <CardContent sx={{ p: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {/* Header */}
                  <Box sx={{ 
                    p: 4, 
                    borderBottom: 1, 
                    borderColor: 'divider',
                    background: 'linear-gradient(135deg, #f0fff4 0%, #e6fff1 100%)'
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.dark' }}>
                        Lend Money
                      </Typography>
                      <Chip 
                        label={`${lendTransactions.length} items`} 
                        color="success"
                        variant="filled"
                        sx={{ 
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          height: 32
                        }}
                      />
                    </Box>
                    <Typography variant="h6" color="text.secondary" sx={{ opacity: 0.8 }}>
                      Track money you've lent to others
                    </Typography>
                  </Box>

                  {/* Transactions List */}
                  <Box sx={{ 
                    flex: 1,
                    overflow: 'auto', 
                    minHeight: 400,
                    maxHeight: 500,
                  }}>
                    {loading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                        <CircularProgress size={50} />
                      </Box>
                    ) : lendTransactions.length === 0 ? (
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        height: 300, 
                        p: 4,
                        textAlign: 'center'
                      }}>
                        <WalletIcon sx={{ 
                          fontSize: 80, 
                          color: 'text.secondary', 
                          mb: 3, 
                          opacity: 0.3 
                        }} />
                        <Typography variant="h5" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
                          No lent money
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ opacity: 0.7 }}>
                          Start tracking your lent money by adding a transaction
                        </Typography>
                      </Box>
                    ) : (
                      <List sx={{ py: 0 }}>
                        {lendTransactions.map((transaction) => (
                          <TransactionItem
                            key={transaction._id || transaction.id}
                            transaction={transaction}
                            onMenuAction={handleMenuAction}
                          />
                        ))}
                      </List>
                    )}
                  </Box>

                  {/* Footer Summary and Action Button */}
                  <Box sx={{ 
                    p: 4, 
                    borderTop: 1, 
                    borderColor: 'divider', 
                    background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        Total Lent
                      </Typography>
                      <Typography variant="h4" color="success.main" sx={{ fontWeight: 800 }}>
                        ₹{totalLent.toLocaleString()}
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      startIcon={<PaidIcon />}
                      onClick={() => handleOpenForm('lend')}
                      sx={{ 
                        borderRadius: 3,
                        py: 2,
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #66bb6a 0%, #4caf50 100%)',
                        boxShadow: '0 8px 25px rgba(76, 175, 80, 0.3)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
                          boxShadow: '0 12px 35px rgba(76, 175, 80, 0.4)',
                          transform: 'translateY(-2px)'
                        }
                      }}
                    >
                      Add Lent Money
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Container>

      {/* Transaction Form Dialog */}
      <TransactionForm
        open={formOpen}
        onClose={handleCloseForm}
        onSuccess={handleTransactionCreated}
        editTransaction={editTransaction}
        formType={formType}
      />
    </Box>
  );
};

export default SmartBorrowForm;