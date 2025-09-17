import nodemailer from 'nodemailer';

/**
 * Sends an email using a pre-configured Nodemailer transporter for Gmail.
 * This utility relies on EMAIL_USER and EMAIL_PASS environment variables
 * for authentication with the email service.
 *
 * @param {string} to - The recipient's email address.
 * @param {string} subject - The subject line for the email.
 * @param {string} text - The plain text body of the email.
 * @returns {Promise<void>} A promise that resolves upon successful dispatch of the email.
 */
const sendEmail = async (to, subject, text) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"<placeholder> Authentication" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
  };

  await transporter.sendMail(mailOptions);
};

export default sendEmail;
