import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Sends an email with both HTML and Text versions and appends the embedded logo at the bottom.
 * @param {string} to - Recipient email.
 * @param {string} subject - Subject line.
 * @param {string} htmlContent - Main HTML content of the email.
 */
const sendEmail = async (to, subject, htmlContent) => {
  // Fix __dirname for ES modules
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Configure SMTP transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true', // true for 465
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Append logo image at the bottom using CID
  const htmlWithLogo = `
    ${htmlContent}
    <br>
    <div style="text-align:center;">
      <img src="cid:q_logo" 
           alt="QUAiL Logo" 
           style="width:400px; height:auto; opacity:0.95;" />
    </div>
  `;

  // Plain-text fallback
  const textContent = htmlContent
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .trim()
    + '\n\n[QUAiL Logo Embedded Below]';

  const mailOptions = {
    from: `"QUAiL Authentication" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html: htmlWithLogo,
    text: textContent,

    // Attach embedded image using cid:q_logo
    attachments: [
      {
        filename: 'QUAiL.png',
        path: path.join(__dirname, 'QUAiL.png'),
        cid: 'q_logo', // MUST match the <img src="cid:q_logo">
      },
    ],
  };

  await transporter.sendMail(mailOptions);
};

export default sendEmail;
