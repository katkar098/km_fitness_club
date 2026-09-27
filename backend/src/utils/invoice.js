const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

const generateInvoice = (data) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const filename = `invoice-${data.invoiceNumber || Date.now()}.pdf`;
      const filepath = path.join(__dirname, '../../uploads/receipts', filename);
      
      const writeStream = fs.createWriteStream(filepath);
      doc.pipe(writeStream);

      // Header
      doc.fontSize(20)
         .text('KM FITNESS CLUB', { align: 'center' })
         .fontSize(14)
         .text('Gym Management System', { align: 'center' })
         .moveDown();

      // Invoice Details
      doc.fontSize(12)
         .text(`Invoice #: ${data.invoiceNumber || 'N/A'}`, { align: 'right' })
         .text(`Date: ${moment(data.date || Date.now()).format('DD/MM/YYYY')}`, { align: 'right' })
         .moveDown();

      // Member Details
      doc.fontSize(14)
         .text('Member Details', { underline: true })
         .fontSize(12)
         .text(`Name: ${data.memberName || 'N/A'}`)
         .text(`Member ID: ${data.memberId || 'N/A'}`)
         .text(`Email: ${data.memberEmail || 'N/A'}`)
         .text(`Phone: ${data.memberPhone || 'N/A'}`)
         .moveDown();

      // Membership Details
      doc.fontSize(14)
         .text('Membership Details', { underline: true })
         .fontSize(12)
         .text(`Plan: ${data.planName || 'N/A'}`)
         .text(`Duration: ${data.duration || 'N/A'}`)
         .text(`Start Date: ${moment(data.startDate).format('DD/MM/YYYY')}`)
         .text(`End Date: ${moment(data.endDate).format('DD/MM/YYYY')}`)
         .moveDown();

      // Payment Details
      doc.fontSize(14)
         .text('Payment Details', { underline: true })
         .fontSize(12)
         .text(`Amount: ₹${data.amount || 0}`)
         .text(`Payment Method: ${data.paymentMethod || 'N/A'}`)
         .text(`Status: ${data.paymentStatus || 'Pending'}`)
         .moveDown();

      // Footer
      doc.fontSize(10)
         .text('Thank you for choosing KM Fitness Club!', { align: 'center' })
         .text('Visit us at: kmfitnessclub.com', { align: 'center' })
         .text('Contact: +91 1234567890', { align: 'center' });

      doc.end();

      writeStream.on('finish', () => {
        resolve({
          filename,
          filepath,
          url: `/uploads/receipts/${filename}`
        });
      });

      writeStream.on('error', (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateInvoice
};