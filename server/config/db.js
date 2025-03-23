const mongoose = require('mongoose');

/**
 * Connect to MongoDB database
 */
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/a-defection';
    
    // Connection options
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    };

    // Connect to MongoDB
    const conn = await mongoose.connect(mongoURI, options);
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Setup connection error handlers
    mongoose.connection.on('error', (err) => {
      console.error(`MongoDB connection error: ${err}`);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected. Attempting to reconnect...');
    });
    
    // If Node process ends, close the MongoDB connection
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to app termination');
      process.exit(0);
    });
    
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB; 