const PDFDocument = require('pdfkit');
const { query } = require('../config/db');
const { supabaseAdmin } = require('../config/supabase');

function makePdf(receipt) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.fontSize(22).text('KM FITNESS CLUB', { align: 'center' });
    doc.fontSize(13).text(receipt.receipt_type === 'renewal' ? 'Membership Renewal Receipt' : 'New Membership Receipt', { align: 'center' }).moveDown();
    doc.fontSize(10).text(`Receipt No: ${receipt.receipt_number}`, { align: 'right' });
    doc.text(`Date: ${new Date(receipt.paid_at).toLocaleString('en-IN')}`, { align: 'right' }).moveDown();
    doc.fontSize(13).text('Member Details').fontSize(10);
    doc.text(`Name: ${receipt.full_name}`).text(`Member ID: ${receipt.member_code}`).text(`Phone: ${receipt.phone || '-'}`).moveDown();
    doc.fontSize(13).text('Membership Details').fontSize(10);
    doc.text(`Plan: ${receipt.plan_name}`).text(`Start date: ${receipt.start_date}`).text(`End date: ${receipt.end_date}`).moveDown();
    doc.fontSize(13).text('Payment Details').fontSize(10);
    doc.text(`Amount paid: INR ${Number(receipt.amount).toFixed(2)}`).text(`Method: ${receipt.payment_method}`).text('Status: Paid').moveDown(2);
    doc.text('This is a computer-generated receipt.', { align: 'center' });
    doc.end();
  });
}

async function getReceipt(receiptNumber) {
  const { rows } = await query(`select r.*, pay.amount,pay.payment_method,pay.paid_at,m.full_name,m.member_code,m.phone,p.name as plan_name,ms.start_date,ms.end_date
    from receipts r join payments pay on pay.id=r.payment_id join members m on m.id=pay.member_id join memberships ms on ms.id=pay.membership_id join membership_plans p on p.id=ms.plan_id where r.receipt_number=$1`, [receiptNumber]);
  return rows[0];
}

async function generateReceiptPdf(receiptNumber) {
  const receipt = await getReceipt(receiptNumber);
  if (!receipt) throw Object.assign(new Error('Receipt not found'), { statusCode: 404 });
  const path = `receipts/${receipt.receipt_number}.pdf`;
  const { error } = await supabaseAdmin.storage.from('receipts').upload(path, await makePdf(receipt), { contentType: 'application/pdf', upsert: true });
  if (error) throw error;
  await query('update receipts set pdf_path=$2 where id=$1', [receipt.id, path]);
  return path;
}

async function receiptDownloadUrl(receiptNumber) {
  const receipt = await getReceipt(receiptNumber);
  if (!receipt) throw Object.assign(new Error('Receipt not found'), { statusCode: 404 });
  if (!receipt.pdf_path) await generateReceiptPdf(receiptNumber);
  const { data, error } = await supabaseAdmin.storage.from('receipts').createSignedUrl(receipt.pdf_path || `receipts/${receiptNumber}.pdf`, 60);
  if (error) throw error;
  return data.signedUrl;
}

module.exports = { getReceipt, generateReceiptPdf, receiptDownloadUrl };
