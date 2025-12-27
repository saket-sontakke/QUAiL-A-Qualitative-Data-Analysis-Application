import express from 'express';
import nodemailer from 'nodemailer';
import dns from 'dns';
import { promisify } from 'util';

// --- Router Initialization ---
const router = express.Router();
const resolveMx = promisify(dns.resolveMx);

/**
 * Handles incoming POST requests for the contact form.
 * Validates the user input and email domain validity before sending an email
 * to the administrator via SMTP.
 *
 * @param {express.Request} req - The Express request object containing name, email, and message in the body.
 * @param {express.Response} res - The Express response object used to return status and JSON data.
 * @returns {Promise<void>} Returns a JSON response indicating success or failure.
 */
router.post('/', async (req, res) => {
  // --- Input Extraction ---
  const { name, email, message } = req.body;

  // --- Input Presence Validation ---
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Please fill in all fields' });
  }

  // --- Email Syntax Validation ---
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address format.' });
  }

  // --- Domain MX Record Verification ---
  const domain = email.split('@')[1];
  try {
    const addresses = await resolveMx(domain);
    if (!addresses || addresses.length === 0) {
        throw new Error('No MX records');
    }
  } catch (error) {
    return res.status(400).json({ error: `The domain "@${domain}" does not appear to accept emails.` });
  }

  try {
    // --- SMTP Transporter Configuration ---
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // --- Message Payload Construction ---
    const mailOptions = {
      from: `"QUAiL Contact Form" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      cc: [process.env.CC_EMAIL, process.env.CC_EMAIL_2],
      replyTo: email,
      subject: `QUAiL Inquiry: ${name}`,
      text: `
        Name: ${name}
        Email: ${email}
        
        Message:
        ${message}
      `,
      html: `
        <h3>New Contact Form Submission</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <div style="padding: 15px; background-color: #f4f4f4; border-left: 4px solid #FF7E39;">
          <p>${message.replace(/\n/g, '<br>')}</p>
        </div>
      `,
    };

    // --- Transmission ---
    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    // --- Error Handling ---
    console.error('Contact Form Error:', error);
    res.status(500).json({ error: 'Failed to send email. Please try again later.' });
  }
});

export default router;