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

  generateAttendanceReport(data) {
    return new Promise((resolve, reject) => {
      try {
        this.filename = `attendance-${Date.now()}.pdf`;
        this.filepath = path.join(__dirname, '../../uploads/reports', this.filename);
        this.doc = new PDFDocument({ size: 'A4', margin: 50 });
        
        const writeStream = fs.createWriteStream(this.filepath);
        this.doc.pipe(writeStream);

        // Header
        this.addHeader('KM FITNESS CLUB');
        this.addSubHeader('Attendance Report');

        // Report Details
        this.doc.fontSize(11)
           .text(`Report Period: ${data.startDate} to ${data.endDate}`)
           .text(`Generated: ${moment().format('DD/MM/YYYY HH:mm')}`)
           .moveDown();

        // Attendance Table
        this.addAttendanceTable(data.attendance || []);

        // Summary
        this.addAttendanceSummary(data.summary || {});

        this.doc.end();

        writeStream.on('finish', () => {
          resolve({
            filename: this.filename,
            filepath: this.filepath,
            url: `/uploads/reports/${this.filename}`
          });
        });

        writeStream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  addAttendanceTable(attendanceData) {
    this.doc.fontSize(12)
       .text('Attendance Details', { underline: true })
       .moveDown(0.5);

    // Table headers
    const headers = ['Date', 'Member Name', 'Check In', 'Check Out', 'Status'];
    const columnWidths = [80, 100, 80, 80, 60];
    let x = 50;
    let y = this.doc.y;

    // Draw header
    this.doc.fontSize(10);
    headers.forEach((header, index) => {
      this.doc.text(header, x, y, { width: columnWidths[index], align: 'left' });
      x += columnWidths[index];
    });

    y += 20;
    this.doc.moveTo(50, y - 10)
       .lineTo(50 + columnWidths.reduce((a, b) => a + b, 0), y - 10)
       .stroke();

    // Draw rows
    attendanceData.forEach((record, index) => {
      x = 50;
      const rowY = y + (index * 20);
      
      if (rowY > this.doc.page.height - 100) {
        this.doc.addPage();
        y = 50;
      }

      const rowData = [
        moment(record.date).format('DD/MM/YYYY'),
        record.memberName || 'N/A',
        record.checkIn || 'N/A',
        record.checkOut || 'N/A',
        record.status || 'N/A'
      ];

      rowData.forEach((cell, cellIndex) => {
        this.doc.text(cell, x, rowY, { width: columnWidths[cellIndex], align: 'left' });
        x += columnWidths[cellIndex];
      });
    });

    this.doc.moveDown(2);
  }

  addAttendanceSummary(summary) {
    this.doc.fontSize(12)
       .text('Summary', { underline: true })
       .fontSize(11)
       .text(`Total Members: ${summary.totalMembers || 0}`)
       .text(`Total Present: ${summary.totalPresent || 0}`)
       .text(`Total Absent: ${summary.totalAbsent || 0}`)
       .text(`Attendance Rate: ${summary.attendanceRate || 0}%`);
  }
}

module.exports = new PDFGenerator();