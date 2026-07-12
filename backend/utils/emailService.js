import nodemailer from 'nodemailer';
import Driver from '../models/Driver.js';

// Setup mail transporter
// In production, configure SMTP credentials via environment variables
let transporter;

const setupTransporter = async () => {
  if (transporter) return transporter;

  const mailHost = process.env.SMTP_HOST || 'smtp.ethereal.email';
  const mailPort = parseInt(process.env.SMTP_PORT || '587');
  const mailUser = process.env.SMTP_USER;
  const mailPass = process.env.SMTP_PASS;

  if (mailUser && mailPass) {
    transporter = nodemailer.createTransport({
      host: mailHost,
      port: mailPort,
      secure: mailPort === 465,
      auth: {
        user: mailUser,
        pass: mailPass
      }
    });
  } else {
    // Fallback: Generate a test account at Ethereal
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log(`✉️ Nodemailer setup completed using Ethereal Test Account: ${testAccount.user}`);
    } catch (err) {
      console.warn('⚠️ Failed to create Ethereal test account. Falling back to stdout logger.', err.message);
      transporter = {
        sendMail: async (options) => {
          console.log(`---------------- MOCK EMAIL ----------------\nTo: ${options.to}\nSubject: ${options.subject}\nBody:\n${options.text || options.html}\n--------------------------------------------`);
          return { messageId: 'mock-id-' + Date.now() };
        }
      };
    }
  }

  return transporter;
};

// Check for expiring licenses and send alert emails
export const sendLicenseExpiryAlerts = async () => {
  const mailTransporter = await setupTransporter();
  const today = new Date();
  const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Find drivers whose licenses expire within the next 30 days
  const expiringDrivers = await Driver.find({
    licenseExpiry: { $gte: today, $lte: thirtyDaysLater }
  });

  const logs = [];

  for (const driver of expiringDrivers) {
    const daysLeft = Math.ceil((new Date(driver.licenseExpiry) - today) / (1000 * 60 * 60 * 24));
    const recipient = driver.email || 'safety@transitops.com';

    const mailOptions = {
      from: '"TransitOps Compliance Alert" <compliance@transitops.com>',
      to: recipient,
      subject: `⚠️ License Expiration Warning: ${driver.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #d97706;">TransitOps Driver Compliance Alert</h2>
          <p>Hello,</p>
          <p>This is a system reminder that driver <strong>${driver.name}</strong>'s driving license (No: <strong>${driver.licenseNumber}</strong>) is expiring in <strong>${daysLeft} days</strong>.</p>
          <ul>
            <li><strong>Expiry Date:</strong> ${new Date(driver.licenseExpiry).toLocaleDateString()}</li>
            <li><strong>Category:</strong> ${driver.licenseCategory}</li>
            <li><strong>Contact:</strong> ${driver.contact}</li>
          </ul>
          <p>Please update their profile in the Driver Management panel before it expires to prevent trip dispatches from being blocked.</p>
          <br>
          <p>Best regards,<br>TransitOps Automation Service</p>
        </div>
      `
    };

    try {
      const info = await mailTransporter.sendMail(mailOptions);
      const url = nodemailer.getTestMessageUrl(info);
      const logMsg = `Alert sent to ${recipient} for driver ${driver.name} (${daysLeft} days left).`;
      console.log(logMsg + (url ? ` Preview: ${url}` : ''));
      logs.push({
        driverName: driver.name,
        email: recipient,
        success: true,
        message: logMsg,
        previewUrl: url || null
      });
    } catch (err) {
      console.error(`❌ Failed to send email alert for ${driver.name}:`, err);
      logs.push({
        driverName: driver.name,
        email: recipient,
        success: false,
        error: err.message
      });
    }
  }

  return logs;
};
