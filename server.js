const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors')
const fileUpload = require('express-fileupload')
const app = express();
const cloudinary = require('cloudinary');
// Connect Database
connectDB();

// Init Middleware
app.use(fileUpload());
app.use(cors());
app.use(express.json({ extended: false , limit: '50mb'}));

// Define Routes
app.use('/api/users', require('./routes/signupUsers'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin/posts', require('./routes/adminPosts'));
app.use('/api/admin/users', require('./routes/adminUsers'));
app.use('/api/admin/orders', require('./routes/adminOrders'));

// Serve static assets in production..
// if (process.env.NODE_ENV === 'production') {
//   // Set static folder
//   app.use(express.static('client/build'));

//   app.get('*', (req, res) =>
//     res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'))
//   );
// }
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
