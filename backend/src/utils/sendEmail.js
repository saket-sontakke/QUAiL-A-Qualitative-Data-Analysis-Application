import nodemailer from 'nodemailer';

/**
 * @desc    A utility function to send an email using Nodemailer and Gmail.
 * This function requires EMAIL_USER and EMAIL_PASS to be set in the environment variables.
 * @param   {string} to - The recipient's email address.
 * @param   {string} subject - The subject line for the email.
 * @param   {string} text - The plain text content of the email.
 * @returns {Promise<void>} A promise that resolves when the email is sent.
 */
const sendEmail = async (to, subject, text) => {
// Create and configure a Gmail transporter for handling email server connection and authentication.
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Define the mail options, including sender, recipient, subject, and body.
  const mailOptions = {
    from: `"ETQDA Authentication" <${process.env.EMAIL_USER}>`, 
    to, 
    subject, 
    text,
  };

  // Send the email using the configured transporter and mail options.
  await transporter.sendMail(mailOptions);
};

export default sendEmail;