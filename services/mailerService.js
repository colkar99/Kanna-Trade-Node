const nodemailer = require('nodemailer');
var moment = require('moment'); // require


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MAIL_FROM,
      pass: process.env.MAIL_FROM_PASSWORD
    }
  });






  exports.sendMail = async(methodName,inputDate,error) => {
    let data = {date: moment().format(),methodName,inputDate,error};
    const mailOptions = {
        from: 'colkar99car@gmail.com',
        to: 'colkar99@gmail.com',
        subject: 'Error Happend',
        text: JSON.stringify(data)
      };

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
       console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
          // do something useful
        }
      });
  }