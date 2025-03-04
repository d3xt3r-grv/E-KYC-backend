const path = require('path');

const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const account = require('../config/account.json');

async function sendMail(email, data, fileLocation) {
  async function main() {
    // Generate test SMTP service account from ethereal.email
    // Only needed if you don't have a real mail account for testing
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: account.user,
        pass: account.pass,
      },
    });

    // send mail with defined transport object
    const info = await transporter.sendMail({
      from: '"KYC ADMIN" <kycappeth@gmail.com>', // sender address
      to: email, // list of receivers
      subject: 'Mail From KYC Services', // Subject line
      text: data, // plain text body
      attachments: [
        {
          filename: 'qrcode.png',
          path: fileLocation,
        },
      ],
      // html: "<b>Hello world?</b>" // html body
    });

    console.log('Message sent: %s', info.messageId);
    // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

    // Preview only available when sending through an Ethereal account
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
  }

  main().catch(console.error);
}

exports.qr = (req, res) => {
  const { data } = req.body;
  const { email } = req.body;
  const { bankName } = req.body;
  const { name } = req.body;
  if (data == null || data === '') return res.status(400).json({ success: false, message: 'data is required' });
  if (email == null || email === '') return res.status(400).json({ success: false, message: 'email is required' });
  const filename = Date.now() + email;
  const fileLocation = path.join('./qr', `${filename}.png`);
  QRCode.toFile(fileLocation, data, {
  }, (err) => {
    if (err) return res.status(500).json({ success: false, message: 'error generating qr code' });
    else {
      console.log('done');
      const txt = `Dear ${req.body.name} \n\nYour KYC documents have been verified by ${req.body.bankName} and the kyc key for reference is ${req.body.userId}. Please find the attached QR code to be used for KYC verifications in future.`;
      sendMail(email, txt, fileLocation);
      return res.json({ success: true, message: 'mail sent' });
    }
  });
};
