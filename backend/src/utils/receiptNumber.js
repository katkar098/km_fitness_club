const moment = require('moment');

const generateReceiptNumber = (prefix = 'RCP') => {
  const date = moment().format('YYMMDD');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}${date}${random}`;
};

const generateInvoiceNumber = (prefix = 'INV') => {
  const date = moment().format('YYMMDD');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}${date}${random}`;
};

const generateMemberId = (prefix = 'MF') => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
};

module.exports = {
  generateReceiptNumber,
  generateInvoiceNumber,
  generateMemberId
};