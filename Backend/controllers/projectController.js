const Project = require('../models/Project');

// Create a new project
exports.createProject = async (req, res) => {
  try {
    const { name, description, budget } = req.body;
    
    const project = new Project({
      name,
      description,
      budget,
      createdBy: req.userId // Assuming you have authentication middleware
    });

    await project.save();
    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all projects for user
exports.getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find({ createdBy: req.userId })
      .sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single project
exports.getProject = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      createdBy: req.userId
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add transaction to project
exports.addTransaction = async (req, res) => {
  try {
    const { projectId, type } = req.params;
    const transactionData = req.body;

    const project = await Project.findOne({
      _id: projectId,
      createdBy: req.userId
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Add to appropriate array based on type
    project[type].push(transactionData);
    await project.save();

    res.json(project);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get AI suggestions for project
exports.getAISuggestions = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.projectId,
      createdBy: req.userId
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const totalIncome = project.income.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = project.expenses.reduce((sum, item) => sum + item.amount, 0);
    const netBalance = totalIncome - totalExpenses;
    const progress = Math.min((totalIncome / project.budget) * 100, 100);

    // AI Analysis Logic
    const suggestions = [];

    // Expense reduction suggestions
    if (totalExpenses > totalIncome * 0.6) {
      suggestions.push({
        type: 'expense_reduction',
        title: 'Reduce High Expenses',
        description: `Your expenses represent ${((totalExpenses / totalIncome) * 100).toFixed(1)}% of your income. Consider optimizing recurring costs.`,
        priority: 'high'
      });
    }

    // Income optimization
    if (progress < 50) {
      suggestions.push({
        type: 'income_boost',
        title: 'Boost Income Sources',
        description: `You're at ${progress.toFixed(1)}% of your budget goal. Explore additional income streams to reach your target faster.`,
        priority: 'medium'
      });
    }

    // Tax optimization
    const estimatedTax = totalIncome * 0.15;
    suggestions.push({
      type: 'tax_optimization',
      title: 'Tax Planning',
      description: `Estimated tax liability: $${estimatedTax.toFixed(2)}. Consider tax-deductible expenses to optimize your tax position.`,
      priority: 'medium'
    });

    // Budget alignment
    if (netBalance < project.budget * 0.1) {
      suggestions.push({
        type: 'budget_alignment',
        title: 'Budget Review Needed',
        description: 'Your current net balance is low relative to your budget. Review your financial plan.',
        priority: 'high'
      });
    }

    res.json({
      projectSummary: {
        totalIncome,
        totalExpenses,
        netBalance,
        progress,
        budget: project.budget
      },
      suggestions,
      riskAssessment: netBalance < 0 ? 'high' : netBalance < project.budget * 0.2 ? 'medium' : 'low'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update project
exports.updateProject = async (req, res) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.userId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete project
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.userId
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};