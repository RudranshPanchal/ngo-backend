import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const checkDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const dbName = db.databaseName;
    console.log(`Database Name: ${dbName}`);
    
    const collections = await db.listCollections().toArray();
    console.log(`\nCollections found: ${collections.length}`);
    
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`- ${collection.name}: ${count} documents`);
      
      if (count > 0) {
        const sample = await db.collection(collection.name).findOne();
        console.log(`  Sample document:`, JSON.stringify(sample, null, 2));
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
};

checkDatabase();