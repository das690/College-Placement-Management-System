const sendEmail = async (options) => {
  // We use native fetch (available in modern Node.js) to send an HTTP POST request to Brevo
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: { 
        email: process.env.EMAIL_USER, // Your verified Brevo/Gmail address
        name: "Security System" 
      },
      to: [
        { email: options.email }
      ],
      subject: options.subject,
      textContent: options.message
    })
  });

  // If Brevo returns an error, catch it so it prints to the Render logs
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Brevo API Error: ${JSON.stringify(errorData)}`);
  }
};

module.exports = sendEmail;