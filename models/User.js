const mongoose = require('mongoose');
const crypto = require('crypto');

const UserSchema = mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  admin:{
    type: Boolean,
    default : false
  },
  isBlocked : {
    type: Boolean,
    default : false
  },
  picture : {
    type: String,
    default : "https://res.cloudinary.com/rajith/image/upload/v1626406581/feed%20the%20need/download_bovubh.jpg"
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date
});


// Generate password reset token
UserSchema.methods.getResetPasswordToken = function () {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash and set to resetPasswordToken
  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex')

  // Set token expire time
  this.resetPasswordExpire = Date.now() + 30 * 60 * 1000

  return resetToken

}

module.exports = mongoose.model('user', UserSchema);
