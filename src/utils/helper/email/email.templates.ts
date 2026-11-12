/**
 * 1. ARCHITECTURE OVERVIEW:
 * Centralized email template generator. This module isolates all HTML string
 * construction from the business logic, ensuring consistent branding,
 * layouts, and footers across all outgoing transactional emails.
 * 
 * 2. HIERARCHY & PRIORITY:
 * - Global Constants: Footer and common styles are defined globally.
 * - Safe Value Handling: Null/undefined values are handled gracefully before insertion.
 * - Template Methods: Each method returns a standardized { subject, text } object.
 * 
 * 3. IMPLEMENTATION EXAMPLES:
 * - const { subject, text } = EmailTemplates.generateAgentCredentialsEmail("John", "john123", "pass");
 * - await sendEmail(email, subject, null, text);
 */

import logger from "../../../config/logs/winston.config.js";

const algor_website_url = process.env.ALGOR_LIVE_URL ?? 'https://www.chat.com';

const footer_text = `
<table style="width: 100%; max-width: 600px; border-top: 1px solid #ccc; padding-top: 10px; margin-top: 20px; font-family: Arial, sans-serif; font-size: 14px; color: #333;">
  <tr>
    <td colspan="2" style="padding-bottom: 10px;">
      <p style="margin: 0; font-weight: bold;">Best Regards,</p>
      <p style="margin: 0; font-weight: bold; color:#0d3d4f;">Ballard Pier Ops Team</p>
    </td>
  </tr>
  <tr>
    <td style="width: 30%; vertical-align: middle;">
      <img src="cid:company-logo" alt="Company Logo" style="max-width: 100px; height: auto;">
    </td>
    <td style="width: 70%; vertical-align: middle;">
      <p style="margin: 5px 0;">Godrej Coliseum, 801 - C Wing, Everard Nagar, Sion East, <br>
      Mumbai 400 022, Maharashtra, India</p>
      <p style="margin: 5px 0;">
        Email: <a href="mailto:ops@chat.com" style="color: #004080;">ops@chat.com</a> | 
        W: <a href="${algor_website_url}" style="color: #004080;">www.chat.com</a>
      </p>
    </td>
  </tr>
</table>
`;

const safeValue = (value: any): string => {
  return value === null || value === undefined ? "" : String(value);
};

export interface EmailTemplateResponse {
  subject: string;
  text: string;
}

const emailTemplatesFiles = {
  generateAgentCredentialsEmail: (agentName: string, username: string, password: string): EmailTemplateResponse => {
    try {
      const subject = "Your Username and Password Information";
      const text = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Created</title>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; color: #333; margin: 0; padding: 0; }
    .email-container { max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); border: 1px solid #e1e1e1; }
    h2 { color: #333; }
    p { line-height: 1.6; color: #666; }
    .credentials { margin: 20px 0; padding: 10px; background-color: #f9f9f9; border-left: 4px solid #007BFF; }
    .credentials p { margin: 5px 0; color: #333; }
  </style>
</head>
<body>
  <div class="email-container">
    <h2>Hello ${safeValue(agentName)},</h2>
    <p>We are pleased to inform you that your account has been successfully created. Below are your login credentials:</p>
    <div class="credentials">
      <p><strong>Username:</strong> ${safeValue(username)}</p>
      <p><strong>Password:</strong> ${safeValue(password)}</p>
    </div>
    <p>Please keep this information secure and do not share it with anyone. If you have any concerns regarding your account security or need further assistance, please do not hesitate to contact us.</p>
    ${footer_text}
  </div>
</body>
</html>`;

      return { subject, text };
    } catch (error) {
      logger.error(`Error generating agent credentials email: ${error}`);
      throw new Error("Failed to generate agent credentials email");
    }
  },

  generateEmailTemplateOtpResetPassword: (otp: string | number, time: string): EmailTemplateResponse => {
    const subject = "Reset Account OTP";
    const text = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset OTP</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9f9f9; color: #333; margin: 0; padding: 0; }
    .email-container { max-width: 600px; margin: 40px auto; background-color: #ffffff; padding: 20px; border-radius: 10px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); border: 1px solid #ddd; }
    h2 { color: #0056b3; margin-bottom: 10px; }
    p { line-height: 1.8; color: #555; margin: 10px 0; }
    .otp-container { margin: 20px 0; padding: 15px; background-color: #f3f9ff; border-left: 5px solid #0056b3; border-radius: 5px; }
    .otp-container pre { font-size: 1.4em; font-family: 'Courier New', Courier, monospace; background-color: #eef7ff; padding: 10px; margin: 0; border-radius: 5px; text-align: center; color: #0056b3; }
  </style>
</head>
<body>
  <div class="email-container">
    <h2>Password Reset Request</h2>
    <p>Dear User,</p>
    <p>We have received your request to reset your password. Please find the OTP below to complete the process. Note that the OTP is valid for only <strong>10 minutes</strong> and will expire at <strong>${safeValue(time)}</strong>.</p>
    <div class="otp-container">
      <p><strong>Your One-Time Password (OTP):</strong></p>
      <pre>${safeValue(otp)}</pre>
    </div>
    <p>If you did not request a password reset, please disregard this email or contact our support team immediately.</p>
    ${footer_text}
  </div>
</body>
</html>`;

    return { subject, text };
  },

  passwordUpdatedSuccessfullyTemplte: (name: string, email_id: string): EmailTemplateResponse => {
    const subject = "Password Updated Confirmation";
    const text = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Updated Confirmation</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9f9f9; color: #333; margin: 0; padding: 0; }
    .email-container { max-width: 600px; margin: 40px auto; background-color: #ffffff; padding: 20px; border-radius: 10px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); border: 1px solid #ddd; }
    h2 { color: #0056b3; margin-bottom: 10px; }
    p { line-height: 1.8; color: #555; margin: 10px 0; }
    h3 { color: #333; margin-top: 20px; }
    a { color: #0056b3; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="email-container">
    <h2>Password Updated Successfully</h2>
    <p>Dear ${safeValue(name)},</p>
    <p>This is a confirmation that the password for your account associated with the email <strong>${safeValue(email_id)}</strong> has been successfully updated.</p>
    <p>If you made this change, no further action is required. If you did not authorize this change, please contact our support team immediately to secure your account.</p>
    <h3>Need Assistance?</h3>
    <p>If you have any questions or require help, feel free to reach out to our support team at <a href="mailto:support@theballardpier.com">support@theballardpier.com</a>. We are here to assist you.</p>
    <p>Your security is our top priority, and we are committed to ensuring the safety of your account.</p>
    ${footer_text}
  </div>
</body>
</html>`;

    return { subject, text };
  },

  generateAEmailForServiceRequest: (dataObject: Record<string, any>, agent_name: string): EmailTemplateResponse => {
    let tableRows = "";
    for (const [key, value] of Object.entries(dataObject)) {
      const formattedKey = key.replace(/_/g, " ");
      tableRows += `
        <tr>
          <td style="border: 1px solid #dddddd; text-align: left; padding: 8px;">${formattedKey}</td>
          <td style="border: 1px solid #dddddd; text-align: left; padding: 8px;">${safeValue(value)}</td>
        </tr>
      `;
    }

    const subject = `New Service Requested By Agent ${agent_name} BY Algor`;
    const text = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.8; color: #333; max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
      <h2 style="color: #0056b3; font-weight: 600; margin-top: 0;">Additional Service Requested</h2>
      
      <p style="margin-top: 20px; color: #555;">
        The agent <strong>${safeValue(agent_name)}</strong> has requested an additional service. Please find the details below and take the necessary actions.
        Should you have any questions or need further information, feel free to reach out to us.
      </p>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 0.95em;">
        <thead>
          <tr>
            <th style="border: 1px solid #ddd; text-align: left; padding: 10px; background-color: #f9f9f9; color: #333;">Field</th>
            <th style="border: 1px solid #ddd; text-align: left; padding: 10px; background-color: #f9f9f9; color: #333;">Value</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    
      <p style="margin-top: 20px; color: #555;">
        Thank you for your prompt attention to this request. If you have any questions or require further assistance, please do not hesitate to contact us.
      </p>
      
      ${footer_text}
    </div>
    `;

    return { subject, text };
  },

  updateEmailForServiceRequest: (dataObject: Record<string, any>, agent_name: string, job_no: string): EmailTemplateResponse => {
    let tableRows = "";
    for (const [key, value] of Object.entries(dataObject)) {
      const formattedKey = key.replace(/_/g, " ");
      tableRows += `
        <tr>
          <td style="border: 1px solid #dddddd; text-align: left; padding: 8px;">${formattedKey}</td>
          <td style="border: 1px solid #dddddd; text-align: left; padding: 8px;">${safeValue(value)}</td>
        </tr>
      `;
    }

    const subject = `Updated Service Requested By Agent ${agent_name} BY Algor`;
    const text = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.8; color: #333; max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
      <h2 style="color: #0056b3; font-weight: 600; margin-top: 0;">Updated Additional Service Request for ${safeValue(job_no)}</h2>
      
      <p style="margin-top: 20px; color: #555;">
        The agent <strong>${safeValue(agent_name)}</strong> has <strong style="color: #007bff;">UPDATED</strong> the request for an additional service. Please find the details below and take the necessary actions. If you have any questions or need further assistance, feel free to reach out.
      </p>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 0.95em;">
        <thead>
          <tr>
            <th style="border: 1px solid #ddd; text-align: left; padding: 10px; background-color: #f9f9f9; color: #333;">Field</th>
            <th style="border: 1px solid #ddd; text-align: left; padding: 10px; background-color: #f9f9f9; color: #333;">Value</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    
      <p style="margin-top: 20px; color: #555;">
        Thank you for your prompt attention to this request.
      </p>
      
      ${footer_text}
    </div>
    `;

    return { subject, text };
  }
};

export default emailTemplatesFiles;