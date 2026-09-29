const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

class PDFGenerator {
  constructor() {
    this.doc = null;
    this.filename = null;
    this.filepath = null;
  }

  generateMembershipReceipt(data) {
    return new Promise((resolve, reject) => {
      try {
        this.filename = `membership-${data.receiptNumber || Date.now()}.pdf`;
        this.filepath = path.join(__dirname, '../../uploads/receipts', this.filename);
        this.doc = new PDFDocument({ size: 'A4', margin: 50 });
        
        const writeStream = fs.createWriteStream(this.filepath);
        this.doc.pipe(writeStream);

        // Header
        this.addHeader('KM FITNESS CLUB');
        this.addSubHeader('Membership Receipt');

        // Receipt Details
        this.addReceiptDetails(data);

        // Member Details
        this.addMemberDetails(data);

        // Membership Details
        this.addMembershipDetails(data);

        // Payment Details
        this.addPaymentDetails(data);

        // Footer
        this.addFooter();

        this.doc.end();

        writeStream.on('finish', () => {
          resolve({
            filename: this.filename,
            filepath: this.filepath,
            url: `/uploads/receipts/${this.filename}`
          });
        });

        writeStream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  addHeader(title) {
    this.doc.fontSize(24)
       .text(title, { align: 'center' })
       .moveDown(0.5);
  }

  addSubHeader(subtitle) {
    this.doc.fontSize(16)
       .text(subtitle, { align: 'center' })
       .moveDown(0.5);
  }

  addReceiptDetails(data) {
    this.doc.fontSize(11)
       .text(`Receipt #: ${data.receiptNumber || 'N/A'}`, { align: 'right' })
       .text(`Date: ${moment(data.date || Date.now()).format('DD/MM/YYYY HH:mm')}`, { align: 'right' })
       .moveDown();
  }

  addMemberDetails(data) {
    this.doc.fontSize(14)
       .text('Member Details', { underline: true })
       .fontSize(11)
       .text(`Name: ${data.memberName || 'N/A'}`)
       .text(`Member ID: ${data.memberId || 'N/A'}`)
       .text(`Email: ${data.memberEmail || 'N/A'}`)
       .text(`Phone: ${data.memberPhone || 'N/A'}`)
       .moveDown();
  }

  addMembershipDetails(data) {
    this.doc.fontSize(14)
       .text('Membership Details', { underline: true })
       .fontSize(11)
       .text(`Plan: ${data.planName || 'N/A'}`)
       .text(`Duration: ${data.duration || 'N/A'}`)
       .text(`Start Date: ${moment(data.startDate).format('DD/MM/YYYY')}`)
       .text(`End Date: ${moment(data.endDate).format('DD/MM/YYYY')}`)
       .moveDown();
  }

  addPaymentDetails(data) {
    this.doc.fontSize(14)
       .text('Payment Details', { underline: true })
       .fontSize(11)
       .text(`Amount: ₹${data.amount || 0}`)
       .text(`Payment Method: ${data.paymentMethod || 'N/A'}`)
       .text(`Status: ${data.paymentStatus || 'Paid'}`)
       .moveDown();
  }

  addFooter() {
    this.doc.fontSize(10)
       .text('Thank you for choosing KM Fitness Club!', { align: 'center' })
       .text('Visit us at: kmfitnessclub.com', { align: 'center' })
       .text('Contact: +91 1234567890', { align: 'center' })
       .moveDown(0.5)
       .text('This is a computer-generated receipt.', { align: 'center', font: 'Helvetica' });
  }


}

module.exports = new PDFGenerator();