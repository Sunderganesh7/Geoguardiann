// backend/services/emailService.js
import nodemailer from "nodemailer";

/**
 * Send email alert for high severity changes
 */
export const sendChangeAlert = async (userEmail, analysisData) => {
  try {
    console.log(`📧 Sending alert email to: ${userEmail}`);
    console.log(`📊 Analysis data:`, analysisData);

    // Validate and provide defaults for missing fields
    const data = {
      changePercentage: analysisData?.changePercentage || 0,
      severity: analysisData?.severity || 'unknown',
      changedPixels: analysisData?.changedPixels || 0,
      totalPixels: analysisData?.totalPixels || 0,
      changeType: analysisData?.changeType || 'Unknown Change',
      summary: analysisData?.summary || 'Environmental change detected',
      date: analysisData?.date || new Date().toLocaleDateString(),
      location: analysisData?.location || 'Monitored Area',
    };

    console.log(`📧 Formatted email data:`, data);

    // Create transporter (using Gmail as example)
    // For production, use SendGrid, AWS SES, or similar
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // Your Gmail
        pass: process.env.EMAIL_PASSWORD, // App password (not regular password)
      },
    });

    const severityEmoji = {
      high: "🔴",
      medium: "🟠",
      low: "🟢",
      unknown: "⚪",
    };

    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .alert-box { background: ${getSeverityColor(data.severity)}; 
                       color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
          .stat-card { background: white; padding: 15px; border-radius: 8px; text-align: center; 
                       border: 2px solid #ddd; }
          .stat-value { font-size: 28px; font-weight: bold; color: #667eea; }
          .stat-label { font-size: 12px; color: #666; margin-top: 5px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px;
                    text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🛰️ GeoGuardian Alert</h1>
            <p>Environmental Change Detected</p>
          </div>
          
          <div class="content">
            <div class="alert-box">
              <h2>${severityEmoji[data.severity] || '⚪'} ${data.severity.toUpperCase()} SEVERITY ALERT</h2>
              <p style="margin: 10px 0; font-size: 16px;">${data.summary}</p>
            </div>

            <h3>📊 Change Detection Results</h3>
            
            <div class="stats">
              <div class="stat-card">
                <div class="stat-value">${data.changePercentage}%</div>
                <div class="stat-label">Change Detected</div>
              </div>
              
              <div class="stat-card">
                <div class="stat-value">${data.severity.toUpperCase()}</div>
                <div class="stat-label">Severity Level</div>
              </div>
              
              <div class="stat-card">
                <div class="stat-value">${data.changedPixels.toLocaleString()}</div>
                <div class="stat-label">Pixels Changed</div>
              </div>
            </div>

            <h3>📋 Additional Details</h3>
            <p><strong>Date Analyzed:</strong> ${data.date}</p>
            <p><strong>Change Type:</strong> ${data.changeType}</p>
            <p><strong>Region:</strong> ${data.location}</p>
            <p><strong>Total Pixels:</strong> ${data.totalPixels.toLocaleString()}</p>

            <div style="text-align: center;">
              <a href="http://localhost:3000/analysis-history" class="button">
                View Full Analysis →
              </a>
            </div>

            <div class="footer">
              <p>This is an automated alert from GeoGuardian Environmental Monitoring System</p>
              <p>Powered by Sentinel-2 Satellite Data</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"GeoGuardian Alerts" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `🚨 ${data.severity.toUpperCase()} Severity Alert: ${data.changePercentage}% Change Detected`,
      html: emailHTML,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Email send error:", error.message);
    console.error("Stack trace:", error.stack);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Get color based on severity
 */
const getSeverityColor = (severity) => {
  switch (severity) {
    case "high":
      return "#f44336";
    case "medium":
      return "#ff9800";
    case "low":
      return "#4caf50";
    default:
      return "#2196f3";
  }
};

/**
 * Send test email
 */
export const sendTestEmail = async (userEmail) => {
  try {
    console.log(`📧 Sending test email to: ${userEmail}`);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"GeoGuardian" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: "✅ GeoGuardian Email Alerts - Test Successful",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; 
                        background: #f9f9f9; border-radius: 8px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; padding: 30px; text-align: center; border-radius: 8px; 
                      margin-bottom: 20px; }
            .content { background: white; padding: 30px; border-radius: 8px; }
            .success-icon { font-size: 48px; text-align: center; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🛰️ GeoGuardian</h1>
            </div>
            <div class="content">
              <div class="success-icon">✅</div>
              <h2 style="text-align: center; color: #4caf50;">Email Alerts Configured Successfully!</h2>
              <p>You will now receive alerts when high severity environmental changes are detected in your monitored areas.</p>
              <p><strong>What happens next?</strong></p>
              <ul>
                <li>🔍 We continuously monitor your selected regions</li>
                <li>📊 Analysis runs automatically on new satellite data</li>
                <li>🚨 You receive instant alerts for significant changes</li>
                <li>📧 Detailed reports delivered directly to your inbox</li>
              </ul>
              <p style="text-align: center; margin-top: 30px;">
                <a href="http://localhost:3000/dashboard" 
                   style="display: inline-block; background: #667eea; color: white; 
                          padding: 12px 30px; text-decoration: none; border-radius: 6px;">
                  Go to Dashboard
                </a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Test email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Test email error:", error.message);
    throw error;
  }
};