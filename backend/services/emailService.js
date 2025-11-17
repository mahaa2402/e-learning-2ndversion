const nodemailer = require('nodemailer');

let transporter = null;

const initializeEmailService = () => {
  try {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL } = process.env;
    
    // Log email configuration (without sensitive data)
    console.log('📧 Email Configuration:');
    console.log('  SMTP_HOST:', SMTP_HOST ? 'Set' : 'Missing');
    console.log('  SMTP_PORT:', SMTP_PORT || 'Missing');
    console.log('  SMTP_USER:', SMTP_USER ? SMTP_USER : 'Missing');
    console.log('  FROM_EMAIL:', FROM_EMAIL || 'Not set (will use SMTP_USER)');
    
    if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT),
        secure: SMTP_PORT === '465', // true for 465, false for other ports
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS
        }
      });

      console.log('✅ Email service initialized');
      return true;
    } else {
      console.log('⚠️ Email service not configured. OTPs will be logged to console.');
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to initialize email service:', error.message);
    return false;
  }
};

const sendOTPEmail = async (email, otp, purpose = 'signup') => {
  try {
    const emailConfigured = transporter !== null;

    if (emailConfigured) {
      // Read FROM_EMAIL fresh from process.env each time (in case .env was updated)
      const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER;
      
      const mailOptions = {
        from: fromEmail,
        to: email,
        subject: getOTPSubject(purpose),
        html: getOTPContent(otp, purpose)
      };

      console.log(`📧 Sending email from: ${fromEmail} to: ${email}`);
      await transporter.sendMail(mailOptions);
      console.log(`✅ OTP email sent to ${email} from ${fromEmail}`);
      return true;
    } else {
      // Development mode: log OTP to console
      console.log('\n========================================');
      console.log(`📧 OTP Email (${purpose}) - ${email}`);
      console.log(`🔐 OTP Code: ${otp}`);
      console.log(`⏰ Expires in: 10 minutes`);
      console.log('========================================\n');
      return true;
    }
  } catch (error) {
    console.error('❌ Failed to send OTP email:', error.message);
    throw error;
  }
};

const getOTPSubject = (purpose) => {
  const subjects = {
    signup: 'Verify Your Email - E-learning Platform',
    'password-reset': 'Reset Your Password - E-learning Platform',
    'email-verification': 'Verify Your Email Address - E-learning Platform'
  };
  return subjects[purpose] || 'Your OTP Code - E-learning Platform';
};

const getOTPContent = (otp, purpose) => {
  const messages = {
    signup: {
      title: 'Welcome! Verify Your Email',
      body: 'Thank you for signing up! Please use the following OTP to verify your email address:'
    },
    'password-reset': {
      title: 'Reset Your Password',
      body: 'You requested to reset your password. Please use the following OTP:'
    },
    'email-verification': {
      title: 'Verify Your Email',
      body: 'Please use the following OTP to verify your email address:'
    }
  };

  const message = messages[purpose] || messages['email-verification'];

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .otp-box { background-color: #fff; border: 2px solid #007bff; padding: 20px; text-align: center; margin: 20px 0; }
        .otp-code { font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 5px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${message.title}</h1>
        </div>
        <div class="content">
          <p>${message.body}</p>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
          </div>
          <p><strong>This OTP will expire in 10 minutes.</strong></p>
          <p>If you didn't request this OTP, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>E-learning Platform</p>
          <p>This is an automated email, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = {
  initializeEmailService,
  sendOTPEmail
};

