const { validationResult } = require('express-validator');
var nodemailer = require('nodemailer');
const Post = require('../models/Post');
const Pusher = require("pusher");

const pusher = new Pusher({
  appId: process.env.PUSHER_APPID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

// Get all posts
const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find({"userBlocked" : false, "ordered" : false,"isApproved" : true, user_id: {$ne : req.user.id},  }).sort({
      date: -1,
    });
    res.json({status_code : 200,success: true,posts});
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
}

// Get all posts per user
const getAllPostsPerUser = async (req, res) => {
  try {
    const posts = await Post.find({ user_id: req.user.id }).sort({
      date: -1,
    });
    res.json({status_code : 200,success: true,posts});
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
}

// Create post
const createPost = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description, image, location, postedByName, postedByEmail } = req.body;

  try {
    const newPost = new Post({
      name,
      description,
      image,
      location,
      user_id: req.user.id,
      postedByName,
      postedByEmail
    });

    const post = await newPost.save();

    var transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.email,
        pass: process.env.password
      }
    });
  
    var mailOptions = {
      from: "Feed the Need <rvg0627@gmail.com>",
      to: ["feedtheneed@mailinator.com","meghakb06@gmail.com"],
      subject: 'New post!',
      text: `Approval pending for ${name} posted by ${postedByName}.`
    };
  
    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });
  
    pusher.trigger(process.env.PUSHER_APPID, "re-render", {
      type: "post",
      message: "New post created",
      username: postedByName
    }); 

    res.json({status_code : 201,success: true, post});
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Delete post
const deletePost = async (req, res) => {
  try {
    let post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({status_code : 404,success:false, msg: 'Post not found' });

    // Make sure user owns post
    if (post.user_id.toString() !== req.user.id) {
      return res.status(401).json({status_code : 401,success:false, msg: 'Not authorized' });
    }

    await Post.findByIdAndRemove(req.params.id);
    
    pusher.trigger(process.env.PUSHER_APPID, "re-render", {
      message: "deleted"
    });
    
    res.json({success:true, msg: 'Post removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Update post
const updatePost = async (req, res) => {
  const { name, description, image, location } = req.body;
  // Build post object
  const postFields = {};
  if (name) postFields.name = name;
  if (description) postFields.description = description;
  if (image) postFields.image = image;
  if (location) postFields.location = location;

  try {
    let post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({status_code : 404,success:false, msg: 'Post not found' });

    // Make sure user owns post
    if (post.user_id.toString() !== req.user.id) {
      return res.status(401).json({status_code : 401,success:false, msg: 'Not authorized' });
    }

    post = await Post.findByIdAndUpdate(
      req.params.id,
      { $set: postFields },
      { new: true },
    );

    pusher.trigger(process.env.PUSHER_APPID, "re-render", {
      message: "updated"
    });

    res.json({success:true,post});
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Get single post
const getSinglePost = async (req, res) => {
  try {
    let post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({status_code : 404,success:false, msg: 'Post not found' });
    // // Make sure user owns post
    // if (post.user_id.toString() !== req.user.id) {
    //   return res.status(401).json({status_code : 401,success:false, msg: 'Not authorized' });
    // }

    post = await Post.findById(req.params.id);

    res.json({success:true, post});
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

module.exports = {
  getAllPosts,
  getAllPostsPerUser,
  createPost,
  deletePost,
  updatePost,
  getSinglePost
}