import nodemailer from 'nodemailer';

/**
 * Sends an email with both HTML and Text versions.
 * * @param {string} to - The recipient's email address.
 * @param {string} subject - The subject line.
 * @param {string} htmlContent - The HTML string (with tags).
 * @returns {Promise<void>}
 */
const sendEmail = async (to, subject, htmlContent) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const textContent = htmlContent
    .replace(/<br\s*\/?>/gi, '\n')     // Replace <br> with newline
    .replace(/<\/p>/gi, '\n\n')        // Replace </p> with double newline
    .replace(/<[^>]+>/g, '')           // Strip all other HTML tags
    .trim();                           // Remove leading/trailing whitespace

  const mailOptions = {
    from: `"QUAiL Authentication" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html: htmlContent,
    text: textContent,
  };

  await transporter.sendMail(mailOptions);
};

export default sendEmail;