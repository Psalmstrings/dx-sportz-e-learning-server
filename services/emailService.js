const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.init();
  }

  init() {
    const host = process.env.EMAIL_HOST;
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASSWORD;

    if (host && user && pass) {
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port: Number(process.env.EMAIL_PORT) || 587,
          secure: process.env.EMAIL_PORT === '465',
          auth: { user, pass }
        });
        this.isConfigured = true;
        console.log('[EmailService] SMTP email transport configured successfully.');
      } catch (err) {
        console.warn('[EmailService] SMTP init error:', err.message);
      }
    } else {
      console.log('[EmailService] SMTP credentials not set in .env. Emails will be logged to console in developer mode.');
    }
  }

  async sendMail({ to, subject, html, text, attachments = [] }) {
    const from = process.env.EMAIL_FROM || '"DX Football Academy" <academy@dxsportz.com>';

    if (this.isConfigured && this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from,
          to,
          subject,
          text,
          html,
          attachments
        });
        console.log(`[EmailService] Sent email to ${to}: ${subject} (ID: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
      } catch (error) {
        console.error(`[EmailService] Failed to send email to ${to}:`, error.message);
        return { success: false, error: error.message };
      }
    } else {
      // Safe developer mock
      console.log('----------------------------------------------------');
      console.log(`[EmailService MOCK] TO: ${to}`);
      console.log(`[EmailService MOCK] SUBJECT: ${subject}`);
      console.log(`[EmailService MOCK] ATTACHMENTS: ${attachments.length} file(s)`);
      if (text) console.log(`[EmailService MOCK] BODY (text):\n${text}`);
      console.log('----------------------------------------------------');
      return { success: true, mocked: true };
    }
  }

  async sendVerificationEmail(user, token) {
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/academy/verify-email?token=${token}`;
    const html = `
      <div style="font-family: Arial, sans-serif; background-color: #000726; color: #ffffff; padding: 2rem; border-radius: 8px;">
        <h2 style="color: #d6bc66; margin-bottom: 1rem;">Welcome to DX Football Academy</h2>
        <p>Hello ${user.fullName},</p>
        <p>Thank you for registering. Please verify your email address to activate your academy student account:</p>
        <div style="margin: 2rem 0;">
          <a href="${verifyUrl}" style="background-color: #d6bc66; color: #000b3d; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #94A3B8; font-size: 0.9rem;">Or copy and paste this URL into your browser:</p>
        <p style="color: #d6bc66; font-size: 0.85rem; word-break: break-all;">${verifyUrl}</p>
        <p style="margin-top: 2rem; color: #94A3B8; font-size: 0.85rem;">This link expires in 24 hours.</p>
      </div>
    `;
    return this.sendMail({
      to: user.email,
      subject: 'Verify Your DX Football Academy Account',
      html,
      text: `Hello ${user.fullName},\n\nPlease verify your account: ${verifyUrl}`
    });
  }

  async sendApplicationSubmitted(user, application, program) {
    const html = `
      <div style="font-family: Arial, sans-serif; background-color: #000726; color: #ffffff; padding: 2rem; border-radius: 8px;">
        <h2 style="color: #d6bc66;">Application Received - ${application.applicationId}</h2>
        <p>Hello ${user.fullName},</p>
        <p>We have successfully received your application for <strong>${program.title}</strong>.</p>
        <p><strong>Tuition Fee:</strong> ${program.currency} ${program.price.toLocaleString()}</p>
        <p>Please make payment to our designated bank account and upload your payment receipt via your student dashboard.</p>
        <p>Once your payment receipt is verified by our admissions board, full access to your curriculum will be unlocked.</p>
      </div>
    `;
    return this.sendMail({
      to: user.email,
      subject: `Application Received [${application.applicationId}] - DX Football Academy`,
      html,
      text: `Hello ${user.fullName},\n\nYour application for ${program.title} (${application.applicationId}) has been received.`
    });
  }

  async sendApplicationApproved(user, program, enrollment) {
    const expiryFormatted = new Date(enrollment.accessExpiryDate).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    const learnUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/academy/learn/${program.slug}`;

    const html = `
      <div style="font-family: Arial, sans-serif; background-color: #000726; color: #ffffff; padding: 2rem; border-radius: 8px;">
        <h2 style="color: #10B981;">🎉 Application Approved!</h2>
        <p>Hello ${user.fullName},</p>
        <p>Great news! Your application and tuition payment for <strong>${program.title}</strong> have been officially approved.</p>
        <div style="background-color: rgba(5, 20, 84, 0.8); padding: 1.5rem; border-radius: 6px; border: 1px solid #d6bc66; margin: 1.5rem 0;">
          <p style="margin: 0 0 0.5rem 0;"><strong>Course Access Duration:</strong> 30 Days</p>
          <p style="margin: 0;"><strong>Access Expiry Date:</strong> ${expiryFormatted}</p>
        </div>
        <div style="margin: 2rem 0;">
          <a href="${learnUrl}" style="background-color: #d6bc66; color: #000b3d; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">
            Start Learning Now
          </a>
        </div>
      </div>
    `;
    return this.sendMail({
      to: user.email,
      subject: `Course Access Activated: ${program.title} - DX Football Academy`,
      html,
      text: `Hello ${user.fullName},\n\nYour application for ${program.title} is approved. Access expires on ${expiryFormatted}. Start learning: ${learnUrl}`
    });
  }

  async sendCertificateIssued(user, program, certificate, pdfPath) {
    const verifyUrl = certificate.verificationUrl;
    const html = `
      <div style="font-family: Arial, sans-serif; background-color: #000726; color: #ffffff; padding: 2rem; border-radius: 8px;">
        <h2 style="color: #d6bc66;">🎓 Official Certificate of Completion Issued!</h2>
        <p>Dear ${user.fullName},</p>
        <p>Congratulations! You have completed all curriculum requirements for the <strong>${program.title}</strong> program.</p>
        <p>Your official Certificate of Completion has been reviewed, approved, and issued by the Academy Board.</p>
        <div style="background-color: rgba(5, 20, 84, 0.8); padding: 1.5rem; border-radius: 6px; border: 1px solid #d6bc66; margin: 1.5rem 0;">
          <p style="margin: 0 0 0.5rem 0;"><strong>Certificate ID:</strong> ${certificate.certificateId}</p>
          <p style="margin: 0;"><strong>Status:</strong> Valid & Verified</p>
        </div>
        <p>Your official certificate PDF is attached to this email. You can also view and verify it online at:</p>
        <p><a href="${verifyUrl}" style="color: #d6bc66;">${verifyUrl}</a></p>
      </div>
    `;

    const attachments = [];
    if (pdfPath) {
      attachments.push({
        filename: `${certificate.certificateId}.pdf`,
        path: pdfPath
      });
    }

    return this.sendMail({
      to: user.email,
      subject: `Official Certificate Issued: ${program.title} [${certificate.certificateId}]`,
      html,
      text: `Congratulations ${user.fullName}! Your Certificate of Completion for ${program.title} (ID: ${certificate.certificateId}) has been issued. Verify online: ${verifyUrl}`,
      attachments
    });
  }
}

module.exports = new EmailService();
