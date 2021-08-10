const { validationResult } = require('express-validator');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
var nodemailer = require('nodemailer');
const crypto = require('crypto')

const getLoggedInUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
}

// Update user
const updateUser = async (req, res) => {
  const { name, image } = req.body;
  // Build user object
  const postFields = {};
  if (name) postFields.name = name;
  if (image) postFields.image = image;

  try {
    let user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ status_code: 404, success: false, msg: 'User not found' });

    // Make sure user owns user
    if (user.user_id.toString() !== req.user.id) {
      return res.status(401).json({ status_code: 401, success: false, msg: 'Not authorized' });
    }

    user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: postFields },
      { new: true },
    );

    res.json({ success: true, user });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

const authUserGetToken = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {


    let user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ status_code: 400, success: false, msg: 'Invalid Credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ status_code: 400, success: false, msg: 'Invalid Credentials' });
    }


    const payload = {
      user: {
        id: user.id,
        name:user.name,
        admin: user.admin,
        isBlocked: user.isBlocked
      },
    };

    jwt.sign(
      payload,
      process.env.jwtSecret,
      {
        expiresIn: 360000,
      },
      (err, token) => {
        if (err) throw err;
        const decoded = jwt.verify(token, process.env.jwtSecret);
        if (decoded.user.isBlocked) {
          return res.status(403).json({ status_code: 403, success: false, msg: 'You have been blocked, please contact administator.' });
        }
        res.json({ success: true, token });
      },
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};


const forgotPassword = async (req, res) => {

  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return res.status(404).json({ status_code: 400, success: false, msg: 'User not found with this email' });
  }

  // Get reset token
  const resetToken = user.getResetPasswordToken();

  await user.save({ validateBeforeSave: false });

  // Create reset password url
  const resetUrl = `https://feed-the-need.s3.ca-central-1.amazonaws.com/index.html#/password/reset/${resetToken}`;

  const message = `Your password reset url is as follow:\n\n${resetUrl}\n\nIf you have not requested this email, then ignore it.`

  try {
    var transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.email,
        pass: process.env.password
      }
    });

    var mailOptions = {
      from: 'Feed the Need <rvg0627@gmail.com>',
      to: req.body.email,
      subject: 'Do not reply - Password Reset',
      text: message
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });


    res.status(200).json({
      status_code: 200,
      success: true,
      message: `Email sent to: ${user.email}`
    })

  } catch (err) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    console.error("err", err.message);
    res.status(500).send('Server Error');
    await user.save({ validateBeforeSave: false });
  }
}

const resetPassword = async (req, res) => {
  try {
    // Hash URL token
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex')

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    })

    if (!user) {
      return res.status(404).json({ status_code: 404, success: false, msg: 'This link has expired. Please try again by clicking Forgot password.' });
    }

    if (req.body.password !== req.body.confirmPassword) {
      return res.status(400).json({ status_code: 400, success: false, msg: 'Password does not match' });
    }

    // Setup new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(req.body.password, salt);

    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({
      status_code: 200,
      success: true,
      message: `Password successfully changed.`
    })
  }
  catch (err) {
    console.error("err", err.message);
    res.status(500).send('Server Error');
    await user.save({ validateBeforeSave: false });
  }

}

module.exports = {
  getLoggedInUser,
  authUserGetToken,
  forgotPassword,
  resetPassword
}