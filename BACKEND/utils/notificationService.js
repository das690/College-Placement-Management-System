// Mock Notification Service for Email and SMS

const sendEmailNotification = async (toEmail, subject, text) => {
  // In a real application, you would configure Nodemailer here:
  // const transporter = nodemailer.createTransport({ ... });
  // await transporter.sendMail({ from, to, subject, text });
  
  console.log(`\n--- MOCK EMAIL SENT ---`);
  console.log(`To: ${toEmail}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${text}`);
  console.log(`-----------------------\n`);
};

const sendSmsNotification = async (phoneNumber, message) => {
  // In a real application, you would configure Twilio here:
  // const client = twilio(accountSid, authToken);
  // await client.messages.create({ body: message, from, to: phoneNumber });

  console.log(`\n--- MOCK SMS SENT ---`);
  console.log(`To: ${phoneNumber}`);
  console.log(`Message: ${message}`);
  console.log(`---------------------\n`);
};

module.exports = { sendEmailNotification, sendSmsNotification };
