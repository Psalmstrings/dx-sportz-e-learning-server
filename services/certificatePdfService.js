const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

/**
 * Generate a professional landscape A4 PDF Certificate
 * Width: 841.89 pt, Height: 595.28 pt
 */
const generateCertificatePDF = async ({
  certificateId,
  studentName,
  programTitle,
  programLevel = 'Professional',
  issuedDate = new Date(),
  signatoryName = 'Academy Director',
  signatoryTitle = 'Head of Technical Development',
  verificationUrl
}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const certsDir = path.join(__dirname, '..', 'uploads', 'certificates');
      if (!fs.existsSync(certsDir)) {
        fs.mkdirSync(certsDir, { recursive: true });
      }

      const filePath = path.join(certsDir, `${certificateId}.pdf`);
      const writeStream = fs.createWriteStream(filePath);

      // Generate QR Code Buffer
      const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
        width: 140,
        margin: 1,
        color: {
          dark: '#000b3d',
          light: '#ffffff'
        }
      });
      const qrBase64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
      const qrBuffer = Buffer.from(qrBase64Data, 'base64');

      // Create landscape A4 document
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 30, bottom: 30, left: 30, right: 30 }
      });

      doc.pipe(writeStream);

      const width = doc.page.width;
      const height = doc.page.height;

      // 1. Background fill
      doc.rect(0, 0, width, height).fill('#000726');

      // 2. Decorative Outer Border (Gold)
      doc.rect(20, 20, width - 40, height - 40)
        .lineWidth(3)
        .stroke('#d6bc66');

      // Inner thin border (White / gold subtle)
      doc.rect(28, 28, width - 56, height - 56)
        .lineWidth(1)
        .stroke('rgba(214, 188, 102, 0.4)');

      // Corner decorative accents
      const corners = [
        [32, 32],
        [width - 52, 32],
        [32, height - 52],
        [width - 52, height - 52]
      ];
      corners.forEach(([cx, cy]) => {
        doc.rect(cx, cy, 20, 20)
          .lineWidth(1.5)
          .stroke('#d6bc66');
      });

      // 3. Top Header Bar Accent
      doc.rect(30, 30, width - 60, 45).fill('#000b3d');

      // Header Brand Text
      doc.fillColor('#d6bc66')
        .font('Helvetica-Bold')
        .fontSize(16)
        .text('DX SPORTS FOOTBALL ACADEMY', 30, 45, {
          align: 'center',
          characterSpacing: 2
        });

      doc.fillColor('#94A3B8')
        .font('Helvetica')
        .fontSize(8)
        .text('CENTRE FOR ELITE FOOTBALL COACHING & SPORTS ADMINISTRATION', 30, 62, {
          align: 'center',
          characterSpacing: 1.5
        });

      // 4. Main Certificate Title
      doc.moveDown(2);
      doc.fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(28)
        .text('CERTIFICATE OF COMPLETION', 0, 110, {
          align: 'center',
          characterSpacing: 3
        });

      // Gold divider line
      doc.moveTo(width / 2 - 120, 145)
        .lineTo(width / 2 + 120, 145)
        .lineWidth(2)
        .stroke('#d6bc66');

      // Subtitle
      doc.fillColor('#CBD5E1')
        .font('Helvetica-Oblique')
        .fontSize(12)
        .text('THIS IS TO OFFICIALLY CERTIFY THAT', 0, 165, {
          align: 'center',
          characterSpacing: 1
        });

      // 5. Student Full Name (Hero Element)
      doc.fillColor('#d6bc66')
        .font('Helvetica-Bold')
        .fontSize(32)
        .text(studentName.toUpperCase(), 0, 195, {
          align: 'center',
          characterSpacing: 1
        });

      // Name underline
      const nameWidth = Math.min(doc.widthOfString(studentName.toUpperCase()), 500);
      doc.moveTo(width / 2 - nameWidth / 2 - 10, 235)
        .lineTo(width / 2 + nameWidth / 2 + 10, 235)
        .lineWidth(1)
        .stroke('rgba(214, 188, 102, 0.6)');

      // 6. Completion Text
      doc.fillColor('#FFFFFF')
        .font('Helvetica')
        .fontSize(11)
        .text(
          'has successfully completed all academic coursework, practical coaching assessments, and tactical modules for',
          60,
          255,
          { align: 'center', lineGap: 3 }
        );

      // 7. Program Title
      doc.fillColor('#F0D98C')
        .font('Helvetica-Bold')
        .fontSize(18)
        .text(programTitle.toUpperCase(), 60, 280, {
          align: 'center',
          characterSpacing: 1
        });

      doc.fillColor('#94A3B8')
        .font('Helvetica')
        .fontSize(10)
        .text(`Program Level: ${programLevel} | Certified by DX Sports Technical Directorate`, 60, 305, {
          align: 'center'
        });

      // 8. Bottom Section: Signatory, Official Seal, and QR Verification
      const bottomY = 385;

      // Left Column: Certificate ID & Date Issued
      doc.fillColor('#94A3B8').font('Helvetica').fontSize(9);
      doc.text('CERTIFICATE ID:', 70, bottomY);
      doc.fillColor('#d6bc66').font('Helvetica-Bold').fontSize(11);
      doc.text(certificateId, 70, bottomY + 14);

      doc.fillColor('#94A3B8').font('Helvetica').fontSize(9);
      doc.text('DATE ISSUED:', 70, bottomY + 34);
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(10);
      const dateStr = new Date(issuedDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      doc.text(dateStr, 70, bottomY + 48);

      // Center: Official Digital Signatory
      const sigCenterX = width / 2;
      doc.moveTo(sigCenterX - 90, bottomY + 35)
        .lineTo(sigCenterX + 90, bottomY + 35)
        .lineWidth(1)
        .stroke('#d6bc66');

      doc.fillColor('#d6bc66')
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(signatoryName, sigCenterX - 110, bottomY + 42, { width: 220, align: 'center' });

      doc.fillColor('#94A3B8')
        .font('Helvetica')
        .fontSize(8.5)
        .text(signatoryTitle, sigCenterX - 110, bottomY + 56, { width: 220, align: 'center' });

      doc.fillColor('#10B981')
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .text('✓ DIGITALLY AUTHENTICATED & APPROVED', sigCenterX - 110, bottomY + 70, { width: 220, align: 'center' });

      // Right: QR Code & Verification Note
      const qrSize = 75;
      const qrX = width - 70 - qrSize;
      const qrY = bottomY - 5;

      // QR Code container box
      doc.rect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8)
        .fillAndStroke('#FFFFFF', '#d6bc66');

      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

      doc.fillColor('#94A3B8')
        .font('Helvetica')
        .fontSize(7)
        .text('SCAN TO VERIFY AUTHENTICITY', qrX - 25, qrY + qrSize + 8, {
          width: qrSize + 50,
          align: 'center'
        });

      // 9. Footer Security Watermark
      doc.fillColor('rgba(255,255,255,0.25)')
        .font('Helvetica')
        .fontSize(6.5)
        .text(
          `Document Hash: SEC-${Buffer.from(certificateId + studentName).toString('base64').substring(0, 16)} | Official Electronic Certificate issued by DX Sports Academy`,
          0,
          height - 24,
          { align: 'center' }
        );

      doc.end();

      writeStream.on('finish', () => {
        resolve({
          filePath,
          fileName: `${certificateId}.pdf`,
          verificationUrl
        });
      });

      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateCertificatePDF
};
