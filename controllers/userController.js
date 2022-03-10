const bcrypt = require('bcrypt');
const _ = require('lodash');
const otpGenerator = require('otp-generator');

const { User } = require('../models/userModel');
const { Otp } = require('../models/otpModel');

module.exports.signUp = async (req, res) => {
  console.log('Method', 'signUp');
  const user = await User.findOne({
    number: req.body.number,
  });
  if (user) return res.status(400).send('User already registered!');
  const OTP = otpGenerator.generate(6, {
    digits: true,
    alphabets: false,
    uppercase: false,
    specialChars: false,
  });
  const number = req.body.number;
  console.log(OTP);

  /** Send SMS */
  const accountSid = process.env.ACCOUNT_SID;
  const authToken = process.env.AUTH_TOKEN;
  const client = require('twilio')(accountSid, authToken);

  client.messages
    .create({
      body: `Verification Code ${OTP}`,
      messagingServiceSid: process.env.MESSAGING_SERVICE_SID,
      to: `+${number}`,
    })
    .then((message) => console.log(message.sid))
    .done();
  /** End Send SMS */

  const otp = new Otp({ number: number, otp: OTP });
  const salt = await bcrypt.genSalt(10);
  otp.otp = await bcrypt.hash(otp.otp, salt);
  const result = await otp.save();
  res.status(200).send('Otp send successfully!');
};

module.exports.verifyOtp = async (req, res) => {
  const otpHolder = await Otp.find({
    number: req.body.number,
  });
  if (otpHolder.length === 0) {
    res.status(400).send('You use an Expired OTP');
    return;
  }
  const rightOptFind = otpHolder[otpHolder.length - 1];
  const validUser = await bcrypt.compare(req.body.otp, rightOptFind.otp);

  if (rightOptFind.number === req.body.number && validUser) {
    const user = new User(_.pick(req.body, ['number']));
    const token = user.generateJWT();
    const result = await user.save();
    const OTPDelete = await Otp.deleteMany({
      number: rightOptFind.number,
    });
    res.status(200).send({
      message: 'User Registration Successfull',
      token: token,
      data: result,
    });
  } else {
    res.status(400).send('Your OTP was wrong');
  }
};
