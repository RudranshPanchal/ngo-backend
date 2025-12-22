import mongoose from 'mongoose';
import User from '../model/Auth/auth.js';
import Donation from '../model/Donation/donation.js';
import Gallery from '../model/Gallery/gallery.js';
import Certificate from '../model/Certificate/certificate.js';
import dotenv from 'dotenv';

dotenv.config();

const getAllData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const users = await User.find({}).lean();
    const donations = await Donation.find({}).populate('userId', 'fullName email').lean();
    const galleries = await Gallery.find({}).populate('createdBy', 'fullName email').lean();
    const certificates = await Certificate.find({}).populate('userId', 'fullName email').populate('createdBy', 'fullName email').lean();

    const allData = {
      users: { count: users.length, data: users },
      donations: { count: donations.length, data: donations },
      galleries: { count: galleries.length, data: galleries },
      certificates: { count: certificates.length, data: certificates },
      summary: {
        totalUsers: users.length,
        totalDonations: donations.length,
        totalGalleryItems: galleries.length,
        totalCertificates: certificates.length,
        totalDonationAmount: donations.reduce((sum, donation) => sum + (donation.amount || 0), 0)
      }
    };

    console.log('\n=== DATABASE SUMMARY ===');
    console.log(`Total Users: ${allData.summary.totalUsers}`);
    console.log(`Total Donations: ${allData.summary.totalDonations}`);
    console.log(`Total Gallery Items: ${allData.summary.totalGalleryItems}`);
    console.log(`Total Certificates: ${allData.summary.totalCertificates}`);
    console.log(`Total Donation Amount: ₹${allData.summary.totalDonationAmount}`);

    return allData;

  } catch (error) {
    console.error('Error retrieving data:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
  }
};

getAllData()
  .then(data => {
    console.log('\n=== ALL DATA RETRIEVED SUCCESSFULLY ===');
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });

export default getAllData;