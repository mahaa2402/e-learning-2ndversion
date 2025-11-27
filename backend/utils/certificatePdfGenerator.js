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
        margin: 50
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      // Background border
      doc
        .rect(20, 20, doc.page.width - 40, doc.page.height - 40)
        .stroke('#0b5394');

      doc
        .fontSize(28)
        .fillColor('#0b5394')
        .text('Certificate of Completion', {
          align: 'center',
          underline: true
        });

      doc.moveDown(2);

      doc
        .fontSize(14)
        .fillColor('#444')
        .text('This certificate is proudly presented to', {
          align: 'center'
        });

      doc
        .moveDown(0.5)
        .fontSize(24)
        .fillColor('#000')
        .text(employeeName || 'Employee', {
          align: 'center'
        });

      doc
        .moveDown(0.5)
        .fontSize(14)
        .fillColor('#444')
        .text('for successfully completing the course', {
          align: 'center'
        });

      doc
        .moveDown(0.5)
        .fontSize(20)
        .fillColor('#000')
        .text(courseName || 'Course', {
          align: 'center'
        });

      doc.moveDown(2);

      const formattedDate = completionDate
        ? new Date(completionDate).toLocaleDateString()
        : new Date().toLocaleDateString();

      doc
        .fontSize(12)
        .fillColor('#000')
        .text(`Employee Email: ${employeeEmail || 'N/A'}`);

      doc
        .moveDown(0.5)
        .text(`Completion Date: ${formattedDate}`);

      if (certificateId) {
        doc
          .moveDown(0.5)
          .text(`Certificate ID: ${certificateId}`);
      }

      doc.moveDown(3);

      doc
        .fontSize(12)
        .fillColor('#0b5394')
        .text('E-learning Platform', {
          align: 'center'
        });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generateCertificatePdf
};



