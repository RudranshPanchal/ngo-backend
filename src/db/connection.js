import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // const mongoUri = 'mongodb+srv://nikitayadav4048_db_user:orbosismain@cluster0.q8trfdq.mongodb.net/orbosisdb?retryWrites=true&w=majority&appName=Cluster0';
    // const mongoUri = '';/
    const mongoUri = 'mongodb+srv://nikitayadav4048_db_user:orbosismain@cluster0.q8trfdq.mongodb.net/orbosisdb?retryWrites=true&w=majority&appName=Cluster0' || process.env.MONGO_URI;

    console.log('🔍 Connecting to MongoDB Atlas...');
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    
    console.log('✅ MongoDB connected successfully');
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', {
      message: error.message,
      code: error.code,
      name: error.name
    });
    
    // Retry connection after 5 seconds
    setTimeout(() => {
      console.log('🔄 Retrying MongoDB connection...');
      connectDB();
    }, 5000);
  }
};

export default connectDB;