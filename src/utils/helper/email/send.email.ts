/**
 * 1. ARCHITECTURE OVERVIEW:
 * A centralized email dispatch utility wrapping Nodemailer. Handles the construction
 * of email payloads, including inline CIDs for branding and base64 attachments, 
 * and securely dispatches them using environment-configured SMTP credentials.
 * 
 * 2. HIERARCHY & PRIORITY:
 * - Attachment Building: Always appends the inline company logo. Appends extra attachments if provided.
 * - Dispatch & Response: Wraps the Nodemailer callback in a Promise returning a boolean status.
 * - Security: Uses environment variables for SMTP credentials instead of hardcoded strings.
 * 
 * 3. IMPLEMENTATION EXAMPLES:
 * - await sendEmail("user@test.com", "Subject", null, "<html>...</html>", {});
 * - await sendEmail(["user1@test.com", "user2@test.com"], "Alert", "Text", null, { attachmentBase64: "...", attachmentFileNmae: "doc.pdf" });
 */

import nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer'; // <-- Correct type import
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Resolve current directory safely in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2. Define the static path for the inline email logo
const imagePath = path.join(__dirname, "email_images/email.png");

export interface EmailAttachmentConfig {
    attachmentBase64?: string | null;
    attachmentFileNmae?: string | null; 
}

async function sendEmail(
    to: string | string[],
    subject: string,
    text: string | null,
    html: string | null,
    { attachmentBase64 = null, attachmentFileNmae = null }: EmailAttachmentConfig = {}
): Promise<boolean> {
    try {
        // 3. Initialize attachment array with the required inline logo
        const attachments: Mail.Attachment[] = [
            {
                filename: "email.png",
                path: imagePath,
                cid: "company-logo" // Content ID mapped in HTML templates
            }
        ];

        // 4. Append dynamic attachments if explicitly provided
        if (attachmentBase64 && attachmentFileNmae) {
            attachments.push({
                filename: attachmentFileNmae,
                content: attachmentBase64,
                encoding: 'base64'
            });
        }

        // 5. Format recipient list safely (handle both single string or array)
        const recipients = Array.isArray(to) ? to.join(', ') : to;

        // 6. Construct email payload
        const mailOptions = {
            from: process.env.SMTP_FROM || 'noreply@theballardpier.com',
            to: recipients,
            subject: subject,
            text: text ?? undefined, // Nodemailer prefers undefined over null for empty fields
            html: html ?? undefined,
            attachments: attachments
        };

        // 7. Configure SMTP transporter (Secure by Default: Using ENV variables)
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.SMTP_USER || '',
                pass: process.env.SMTP_PASS || ''
            }
        });

        // 8. Wrap the callback-based sendMail in a Promise for async/await consumption
        return new Promise((resolve) => {
            transporter.sendMail(mailOptions, (error) => {
                if (error) {
                    console.error("Email Dispatch Error:", error);
                    return resolve(false); // Graceful fallback on failure
                }
                return resolve(true); // Return true on success
            });
        });
            
    } catch (error) {
        console.error("Email Generation Error:", error);
        throw error;
    }
}

export default sendEmail;