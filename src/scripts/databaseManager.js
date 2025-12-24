import mongoose from 'mongoose';
import User from '../model/Auth/auth.js';
import Donation from '../model/Donation/donation.js';
import Gallery from '../model/Gallery/gallery.js';
import Certificate from '../model/Certificate/certificate.js';
import dotenv from 'dotenv';

dotenv.config();

class DatabaseManager {
  async connect() {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');
  }

  async disconnect() {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }

  async getAllData() {
    try {
      await this.connect();
      
      const users = await User.find({}).lean();
      const donations = await Donation.find({}).populate('userId', 'fullName email').lean();
      const galleries = await Gallery.find({}).populate('createdBy', 'fullName email').lean();
      const certificates = await Certificate.find({}).populate('userId', 'fullName email').populate('createdBy', 'fullName email').lean();

      const data = {
        users: { count: users.length, data: users },
        donations: { count: donations.length, data: donations },
        galleries: { count: galleries.length, data: galleries },
        certificates: { count: certificates.length, data: certificates },
        summary: {
          totalUsers: users.length,
          totalDonations: donations.length,
          totalGalleryItems: galleries.length,
          totalCertificates: certificates.length,
          totalDonationAmount: donations.reduce((sum, d) => sum + (d.amount || 0), 0)
        }
      };

      console.log('\n=== DATABASE SUMMARY ===');
      console.log(`Database: ${mongoose.connection.db.databaseName}`);
      console.log(`Total Users: ${data.summary.totalUsers}`);
      console.log(`Total Donations: ${data.summary.totalDonations}`);
      console.log(`Total Gallery Items: ${data.summary.totalGalleryItems}`);
      console.log(`Total Certificates: ${data.summary.totalCertificates}`);
      console.log(`Total Donation Amount: ₹${data.summary.totalDonationAmount}`);

      if (data.summary.totalUsers === 0) {
        console.log('\n⚠️  Database is empty. No data found.');
      }

      return data;
    } finally {
      await this.disconnect();
    }
  }

  async getCollectionStats() {
    try {
      await this.connect();
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      
      console.log(`\n=== COLLECTION DETAILS ===`);
      console.log(`Database: ${db.databaseName}`);
      console.log(`Collections: ${collections.length}`);
      
      for (const collection of collections) {
        const count = await db.collection(collection.name).countDocuments();
        console.log(`\n${collection.name}:`);
        console.log(`  Documents: ${count}`);
        
        if (count > 0) {
          const sample = await db.collection(collection.name).findOne();
          console.log(`  Sample:`, JSON.stringify(sample, null, 2));
        }
      }
    } finally {
      await this.disconnect();
    }
  }
}

const manager = new DatabaseManager();

// Run based on command line argument
const command = process.argv[2] || 'data';

if (command === 'stats') {
  manager.getCollectionStats();
} else {
  manager.getAllData()
    .then(data => {
      console.log('\n✅ Data retrieval completed');
    })
    .catch(error => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export default DatabaseManager;