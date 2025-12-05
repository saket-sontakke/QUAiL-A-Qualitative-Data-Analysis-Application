import express from 'express';
import nodemailer from 'nodemailer';
import dns from 'dns';
import { promisify } from 'util';

const router = express.Router();
const resolveMx = promisify(dns.resolveMx); 
// @route   POST /api/contact
// @desc    Send a contact form email to the admin
// @access  Public
router.post('/', async (req, res) => {
  const { name, email, message } = req.body;

  // 1. Basic Field Validation
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Please fill in all fields' });
  }

  // 2. Strict Email Regex Validation (Syntax)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address format.' });
  }

  // 3. DNS/MX Record Validation (Existence)
  const domain = email.split('@')[1];
  try {
    const addresses = await resolveMx(domain);
    if (!addresses || addresses.length === 0) {
        throw new Error('No MX records');
    }
  } catch (error) {
    // This catches domains that don't exist (like tert.com might fail if it has no mail server)
    return res.status(400).json({ error: `The domain "@${domain}" does not appear to accept emails.` });
  }

  try {
    // 4. Configure the transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 5. Define email options
    const mailOptions = {
      from: `"QUAiL Contact Form" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
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

    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Contact Form Error:', error);
    res.status(500).json({ error: 'Failed to send email. Please try again later.' });
  }
});

export default router;