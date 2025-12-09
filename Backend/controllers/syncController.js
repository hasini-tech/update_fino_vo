import Transaction from '../models/Transaction.js'; // Adjust path to your Transaction model
import fs from 'fs';
import csv from 'csv-parser';
import xlsx from 'xlsx';

const syncController = {
  // Upload file
  uploadFile: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      res.json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          filename: req.file.filename,
          originalname: req.file.originalname,
          path: req.file.path,
          size: req.file.size
        }
      });
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({
        success: false,
        message: 'File upload failed: ' + error.message
      });
    }
  },

  // Process transactions from uploaded file
  processTransactions: async (req, res) => {
    try {
      const { filename, tenantId } = req.body;
      
      if (!filename) {
        return res.status(400).json({
          success: false,
          message: 'Filename is required'
        });
      }

      const filePath = `uploads/${filename}`;
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }

      let transactions = [];
      const fileExtension = filename.split('.').pop().toLowerCase();

      // Parse different file types
      if (fileExtension === 'csv') {
        transactions = await parseCSV(filePath);
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        transactions = await parseExcel(filePath);
      } else if (fileExtension === 'json') {
        transactions = await parseJSON(filePath);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Unsupported file format'
        });
      }

      // Process and save transactions
      const result = await saveTransactions(transactions, tenantId);

      // Clean up uploaded file
      fs.unlinkSync(filePath);

      res.json({
        success: true,
        message: `Successfully processed ${result.saved} transactions`,
        data: {
          total: transactions.length,
          saved: result.saved,
          duplicates: result.duplicates,
          failed: result.failed
        }
      });

    } catch (error) {
      console.error('Process transactions error:', error);
      res.status(500).json({
        success: false,
        message: 'Processing failed: ' + error.message
      });
    }
  }
};

// Helper function to parse CSV
function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

// Helper function to parse Excel
function parseExcel(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(worksheet);
}

// Helper function to parse JSON
function parseJSON(filePath) {
  const data = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(data);
}

// Helper function to detect category from description
function detectCategory(description) {
  if (!description) return 'Miscellaneous Expenses';
  
  const desc = description.toLowerCase();
  
  if (desc.includes('food') || desc.includes('restaurant') || desc.includes('grocery') || desc.includes('coffee')) {
    return 'Food';
  } else if (desc.includes('travel') || desc.includes('fuel') || desc.includes('transport') || desc.includes('uber')) {
    return 'Travel & Commuting';
  } else if (desc.includes('shopping') || desc.includes('clothing') || desc.includes('saree') || desc.includes('jeans')) {
    return 'Clothing';
  } else if (desc.includes('salary') || desc.includes('employee') || desc.includes('rent') || desc.includes('utility')) {
    return 'Operating Expenses';
  } else if (desc.includes('loan') || desc.includes('interest') || desc.includes('tax')) {
    return 'Non-Operating Expenses';
  } else if (desc.includes('pos') || desc.includes('card') || desc.includes('payment')) {
    return 'POS';
  } else {
    return 'Miscellaneous Expenses';
  }
}

// Helper function to detect payment mode
function detectPaymentMode(description, amount) {
  if (!description) return 'Other';
  
  const desc = description.toLowerCase();
  
  if (desc.includes('cash') || desc.includes('atm')) {
    return 'Cash';
  } else if (desc.includes('transfer') || desc.includes('bank') || desc.includes('upi')) {
    return 'Bank Transfer';
  } else if (desc.includes('card') || desc.includes('debit') || desc.includes('credit')) {
    return 'Card';
  } else if (desc.includes('gpay') || desc.includes('phonepe') || desc.includes('paytm')) {
    return 'GPay';
  } else {
    return 'Other';
  }
}

// Helper function to save transactions with duplicate check
async function saveTransactions(transactions, tenantId) {
  let saved = 0;
  let duplicates = 0;
  let failed = 0;

  for (const transaction of transactions) {
    try {
      // Extract and normalize data
      const amount = Math.abs(parseFloat(transaction.amount) || parseFloat(transaction.debit) || parseFloat(transaction.credit) || 0);
      const description = transaction.description || transaction.narration || transaction.remarks || 'Imported transaction';
      
      // Skip if no valid amount
      if (amount <= 0) {
        failed++;
        continue;
      }

      // Parse date - handle multiple formats
      let date = transaction.date || transaction.transactionDate;
      if (date) {
        // Simple date parsing - you might want to enhance this
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
          date = new Date().toISOString().split('T')[0];
        } else {
          date = parsedDate.toISOString().split('T')[0];
        }
      } else {
        date = new Date().toISOString().split('T')[0];
      }

      // Check for duplicates (same date, amount, and description)
      const existingTransaction = await Transaction.findOne({
        date: date,
        amount: amount,
        description: description,
        tenantId: tenantId
      });

      if (existingTransaction) {
        duplicates++;
        continue;
      }

      // Create new transaction
      const newTransaction = new Transaction({
        date: date,
        type: 'expense',
        category: transaction.category || detectCategory(description),
        subCategory: transaction.subCategory || '',
        description: description,
        amount: amount,
        paymentMode: transaction.paymentMode || detectPaymentMode(description, amount),
        remark: transaction.remark || transaction.notes || '',
        tenantId: tenantId,
        imported: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await newTransaction.save();
      saved++;

    } catch (error) {
      console.error('Error saving transaction:', error);
      failed++;
    }
  }

  return { saved, duplicates, failed };
}

export default syncController;