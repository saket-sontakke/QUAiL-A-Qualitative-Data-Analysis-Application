import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Configures the SMTP transporter and sends an email with an embedded logo attachment.
 * Handles ES module path resolution, appends a company logo via CID, and generates
 * a plain-text fallback for the HTML content.
 *
 * @param {string|Array<string>} to - The recipient's email address or list of addresses.
 * @param {string} subject - The subject line of the email.
 * @param {string} htmlContent - The raw HTML string to be included in the email body.
 * @returns {Promise<void>} A promise that resolves when the email is successfully handed off to the SMTP server.
 * @throws {Error} If the SMTP connection fails, authentication is invalid, or attachment files are missing.
 */
const sendEmail = async (to, subject, htmlContent) => {
  // --- Path Resolution ---
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // --- SMTP Configuration ---
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // --- Content Formatting ---
  const htmlWithLogo = `
    ${htmlContent}
    <br>
    <div style="text-align:center;">
      <img src="cid:q_logo" 
           alt="QUAiL Logo" 
           style="width:400px; height:auto; opacity:0.95;" />
    </div>
  `;

  const textContent = htmlContent
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .trim()
    + '\n\n[QUAiL Logo Embedded Below]';

  // --- Mail Construction ---
  const mailOptions = {
    from: `"QUAiL Authentication" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html: htmlWithLogo,
    text: textContent,

    attachments: [
      {
        filename: 'QUAiL.png',
        path: path.join(__dirname, 'QUAiL.png'),
        cid: 'q_logo',
      },
    ],
  };

  // --- Transmission ---
  await transporter.sendMail(mailOptions);
};

export default sendEmail;