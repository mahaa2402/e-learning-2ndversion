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

const sendTaskAssignmentEmail = async (employeeEmail, employeeName, taskTitle, description, deadline, adminName, priority = 'medium', courseLink = null) => {
  try {
    const emailConfigured = transporter !== null;

    if (emailConfigured) {
      // Read FROM_EMAIL fresh from process.env each time (in case .env was updated)
      const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER;
      
      const deadlineDate = new Date(deadline);
      const formattedDeadline = deadlineDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const priorityColors = {
        high: '#dc3545',
        medium: '#ffc107',
        low: '#28a745'
      };

      const priorityColor = priorityColors[priority] || priorityColors.medium;

      const mailOptions = {
        from: fromEmail,
        to: employeeEmail,
        subject: `New Task Assigned: ${taskTitle} - E-learning Platform`,
        html: getTaskAssignmentContent(employeeName, taskTitle, description, formattedDeadline, adminName, priority, priorityColor, courseLink)
      };

      console.log(`📧 Sending task assignment email from: ${fromEmail} to: ${employeeEmail}`);
      await transporter.sendMail(mailOptions);
      console.log(`✅ Task assignment email sent to ${employeeEmail} from ${fromEmail}`);
      return true;
    } else {
      // Development mode: log to console
      console.log('\n========================================');
      console.log(`📧 Task Assignment Email - ${employeeEmail}`);
      console.log(`👤 Employee: ${employeeName}`);
      console.log(`📋 Task: ${taskTitle}`);
      console.log(`📝 Description: ${description}`);
      console.log(`⏰ Deadline: ${deadline}`);
      console.log(`👨‍💼 Assigned by: ${adminName}`);
      console.log(`⚡ Priority: ${priority}`);
      if (courseLink) console.log(`🔗 Course Link: ${courseLink}`);
      console.log('========================================\n');
      return true;
    }
  } catch (error) {
    console.error('❌ Failed to send task assignment email:', error.message);
    // Don't throw error - we don't want email failure to break task assignment
    return false;
  }
};

const getTaskAssignmentContent = (employeeName, taskTitle, description, deadline, adminName, priority, priorityColor, courseLink = null) => {
  const linkSection = courseLink ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${courseLink}" style="display: inline-block; padding: 14px 28px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
        Start Course Now
      </a>
      <p style="margin-top: 15px; color: #666; font-size: 12px;">
        ⚠️ This link will expire on ${deadline}
      </p>
    </div>
  ` : `
    <p>Please log in to your account to view and start working on this task.</p>
  `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd; }
        .task-box { background-color: #fff; border-left: 4px solid ${priorityColor}; padding: 15px; margin: 20px 0; }
        .task-title { font-size: 20px; font-weight: bold; color: #007bff; margin-bottom: 10px; }
        .task-detail { margin: 10px 0; }
        .task-detail-label { font-weight: bold; color: #555; }
        .priority-badge { display: inline-block; padding: 5px 10px; border-radius: 3px; color: white; background-color: ${priorityColor}; font-weight: bold; text-transform: uppercase; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background-color: #f9f9f9; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Task Assigned</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${employeeName}</strong>,</p>
          <p>You have been assigned a new task. Please review the details below:</p>
          
          <div class="task-box">
            <div class="task-title">${taskTitle}</div>
            <div class="task-detail">
              <span class="task-detail-label">Description:</span><br>
              ${description}
            </div>
            <div class="task-detail">
              <span class="task-detail-label">Deadline:</span> ${deadline}
            </div>
            <div class="task-detail">
              <span class="task-detail-label">Priority:</span> 
              <span class="priority-badge">${priority}</span>
            </div>
            <div class="task-detail">
              <span class="task-detail-label">Assigned by:</span> ${adminName}
            </div>
          </div>
          
          ${linkSection}
          
          <p>If you have any questions, please contact your administrator.</p>
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

const sendCourseCompletionEmail = async (adminEmail, adminName, employeeName, employeeEmail, courseName, completedAt) => {
  try {
    const emailConfigured = transporter !== null;

    if (emailConfigured) {
      // Read FROM_EMAIL fresh from process.env each time (in case .env was updated)
      const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER;
      
      const formattedDate = new Date(completedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const mailOptions = {
        from: fromEmail,
        to: adminEmail,
        subject: `Course Completion Notification: ${courseName} - E-learning Platform`,
        html: getCourseCompletionContent(adminName, employeeName, employeeEmail, courseName, formattedDate)
      };

      console.log(`📧 Sending course completion email from: ${fromEmail} to: ${adminEmail}`);
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Course completion email sendMail result for ${adminEmail}:`, {
        accepted: info.accepted,
        rejected: info.rejected,
        pending: info.pending || [],
        messageId: info.messageId
      });
      return true;
    } else {
      // Development mode: log to console
      console.log('\n========================================');
      console.log(`📧 Course Completion Email - ${adminEmail}`);
      console.log(`👨‍💼 Admin: ${adminName}`);
      console.log(`👤 Employee: ${employeeName} (${employeeEmail})`);
      console.log(`📚 Course: ${courseName}`);
      console.log(`✅ Completed at: ${completedAt}`);
      console.log('========================================\n');
      return true;
    }
  } catch (error) {
    console.error('❌ Failed to send course completion email:', error.message);
    // Don't throw error - we don't want email failure to break the process
    return false;
  }
};

const getCourseCompletionContent = (adminName, employeeName, employeeEmail, courseName, completedAt) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #28a745; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd; }
        .completion-box { background-color: #fff; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; }
        .completion-title { font-size: 20px; font-weight: bold; color: #28a745; margin-bottom: 10px; }
        .detail { margin: 10px 0; }
        .detail-label { font-weight: bold; color: #555; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background-color: #f9f9f9; border-radius: 0 0 5px 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Course Completion Notification</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${adminName}</strong>,</p>
          <p>An employee has successfully completed a course that you assigned. Details below:</p>
          
          <div class="completion-box">
            <div class="completion-title">${courseName}</div>
            <div class="detail">
              <span class="detail-label">Employee Name:</span> ${employeeName}
            </div>
            <div class="detail">
              <span class="detail-label">Employee Email:</span> ${employeeEmail}
            </div>
            <div class="detail">
              <span class="detail-label">Completed At:</span> ${completedAt}
            </div>
          </div>
          
          <p>You can view the employee's certificate and progress in your admin dashboard.</p>
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
  sendOTPEmail,
  sendTaskAssignmentEmail,
  sendCourseCompletionEmail
};

