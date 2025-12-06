const PDFDocument = require('pdfkit');

/**
 * Generate a certificate PDF buffer using pdfkit.
 * @param {Object} options
 * @param {string} options.employeeName
 * @param {string} options.employeeEmail
 * @param {string} options.courseName
 * @param {Date} options.completionDate
 * @param {string} options.certificateId
 * @returns {Promise<Buffer>}
 */
function generateCertificatePdf({
  employeeName,
  employeeEmail,
  courseName,
  completionDate,
  certificateId
}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      // ========= BACKGROUND & BRAND STRIPES (approximate the provided design) =========

      // Left colored bar
      doc
        .save()
        .rect(0, 0, 120, pageHeight)
        .fill('#1b1c2b')
        .restore();

      // Accent bar at bottom
      doc
        .save()
        .rect(0, pageHeight - 80, pageWidth, 80)
        .fill('#111827')
        .restore();

      // Top title background bar
      doc
        .save()
        .rect(140, 60, pageWidth - 180, 4)
        .fill('#d1006f')
        .restore();

      // ========= HEADER =========

      // Logo placeholder (top-right)
      doc
        .fontSize(18)
        .fillColor('#1b1c2b')
        .text('VISTA', pageWidth - 180, 40, { width: 140, align: 'right' });

      doc
        .fontSize(9)
        .fillColor('#6b7280')
        .text('Innovation @ work', pageWidth - 180, 62, { width: 140, align: 'right' });

      // Main title
      doc
        .fontSize(32)
        .fillColor('#111827')
        .text('CERTIFICATE', 140, 70, { align: 'left' });

      // Subtitle bar
      const subtitleText = 'OF PRE TEST IN E-LEARNING PLATFORM';
      doc
        .save()
        .rect(140, 115, 330, 24)
        .fill('#d1006f')
        .restore();

      doc
        .fillColor('#ffffff')
        .fontSize(11)
        .text(subtitleText, 150, 120, { width: 310, align: 'left' });

      // ========= BODY CONTENT =========

      let y = 170;

      doc
        .fontSize(11)
        .fillColor('#4b5563')
        .text('This is to acknowledge that', 160, y);

      y += 30;

      // Employee name (centered, bold)
      doc
        .fontSize(20)
        .fillColor('#111827')
        .text(employeeName || 'Employee Name', 140, y, {
          width: pageWidth - 200,
          align: 'center'
        });

      y += 40;

      // Horizontal line under name
      doc
        .moveTo(160, y)
        .lineTo(pageWidth - 80, y)
        .strokeColor('#9ca3af')
        .lineWidth(0.7)
        .stroke();

      y += 30;

      // Body text
      const courseText =
        `has successfully completed the Pre-Test for the ${courseName || 'Training'} ` +
        'Training Program on eLearning Platform.';

      doc
        .fontSize(12)
        .fillColor('#111827')
        .text(courseText, 140, y, {
          width: pageWidth - 200,
          align: 'left'
        });

      // ========= FOOTER (DATE & DIRECTOR) =========

      const footerY = pageHeight - 150;

      // Date line
      doc
        .moveTo(160, footerY)
        .lineTo(260, footerY)
        .strokeColor('#9ca3af')
        .lineWidth(0.7)
        .stroke();

      doc
        .fontSize(10)
        .fillColor('#111827')
        .text('DATE', 160, footerY + 8);

      const formattedDate = completionDate
        ? new Date(completionDate).toLocaleDateString()
        : new Date().toLocaleDateString();

      doc
        .fontSize(9)
        .fillColor('#4b5563')
        .text(formattedDate, 160, footerY - 18, { width: 120, align: 'left' });

      // Director line
      const directorLineX = pageWidth - 260;
      doc
        .moveTo(directorLineX, footerY)
        .lineTo(pageWidth - 80, footerY)
        .strokeColor('#9ca3af')
        .lineWidth(0.7)
        .stroke();

      doc
        .fontSize(10)
        .fillColor('#111827')
        .text('DIRECTOR', directorLineX, footerY + 8, {
          width: 180,
          align: 'center'
        });

      // ========= BOTTOM BRANDING =========

      const bottomY = pageHeight - 50;

      doc
        .fontSize(8)
        .fillColor('#e5e7eb')
        .text('www.vistaes.com   |   info@vistaes.com', 80, bottomY, {
          width: pageWidth - 160,
          align: 'center'
        });

      // Optional: certificate ID at bottom-left
      if (certificateId) {
        doc
          .fontSize(8)
          .fillColor('#9ca3af')
          .text(`Certificate ID: ${certificateId}`, 40, bottomY, {
            width: 200,
            align: 'left'
          });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generateCertificatePdf
};



