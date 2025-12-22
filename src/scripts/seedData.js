import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../model/Auth/auth.js';
import Volunteer from '../model/Volunteer/volunteer.js';
import Member from '../model/Member/member.js';
import Donation from '../model/Donation/donation.js';
import dotenv from 'dotenv';

dotenv.config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Volunteer.deleteMany({});
    await Member.deleteMany({});
    await Donation.deleteMany({});
    console.log('Cleared existing data');

    // Create dummy users
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const users = [
      {
        fullName: 'Priya Sharma',
        email: 'priya.sharma@example.com',
        password: hashedPassword,
        role: 'volunteer',
        contactNumber: '+91 98765 43210',
        dob: '1995-06-15',
        gender: 'female',
        address: '123 MG Road, Bandra West',
        area: 'Bandra',
        state: 'Maharashtra',
        pinCode: '400050',
        profession: 'Software Engineer',
        skills: ['Teaching', 'Digital Literacy', 'Communication'],
        areaOfVolunteering: 'training',
        availability: 'weekend',
        emergencyContactNumber: '+91 98765 43211'
      },
      {
        fullName: 'Rahul Kumar',
        email: 'rahul.kumar@example.com',
        password: hashedPassword,
        role: 'volunteer',
        contactNumber: '+91 87654 32109',
        dob: '1992-03-20',
        gender: 'male',
        address: '456 Park Street, Kolkata',
        area: 'Park Street',
        state: 'West Bengal',
        pinCode: '700016',
        profession: 'Teacher',
        skills: ['Education', 'Counseling', 'Event Management'],
        areaOfVolunteering: 'fieldWork',
        availability: 'evening',
        emergencyContactNumber: '+91 87654 32110'
      },
      {
        fullName: 'Anita Patel',
        email: 'anita.patel@example.com',
        password: hashedPassword,
        role: 'donor',
        contactNumber: '+91 76543 21098',
        dob: '1988-11-10',
        gender: 'female',
        address: '789 Gandhi Road, Ahmedabad',
        area: 'Navrangpura',
        state: 'Gujarat',
        pinCode: '380009',
        profession: 'Business Owner',
        organisationName: 'Patel Enterprises',
        panNumber: 'ABCDE1234F',
        modeofDonation: 'bankTransfer',
        consentForUpdate: 'email'
      },
      {
        fullName: 'Admin User',
        email: 'admin@orbosis.org',
        password: hashedPassword,
        role: 'admin',
        contactNumber: '+91 99999 99999',
        fullName: 'System Administrator'
      }
    ];

    const createdUsers = await User.insertMany(users);
    console.log('Created users:', createdUsers.length);

    // Create volunteer records
    const volunteers = [
      {
        fullName: 'Priya Sharma',
        gender: 'female',
        dob: '1995-06-15',
        contactNumber: '+91 98765 43210',
        email: 'priya.sharma@example.com',
        address: '123 MG Road, Bandra West',
        skills: 'Teaching, Digital Literacy, Communication',
        profession: 'Software Engineer',
        areaOfVolunteering: 'training',
        availability: 'weekend',
        emergencyContactNumber: '+91 98765 43211',
        status: 'approved'
      },
      {
        fullName: 'Rahul Kumar',
        gender: 'male',
        dob: '1992-03-20',
        contactNumber: '+91 87654 32109',
        email: 'rahul.kumar@example.com',
        address: '456 Park Street, Kolkata',
        skills: 'Education, Counseling, Event Management',
        profession: 'Teacher',
        areaOfVolunteering: 'fieldWork',
        availability: 'evening',
        emergencyContactNumber: '+91 87654 32110',
        status: 'approved'
      }
    ];

    const createdVolunteers = await Volunteer.insertMany(volunteers);
    console.log('Created volunteers:', createdVolunteers.length);

    // Create member records
    const members = [
      {
        fullName: 'Sunita Devi',
        gender: 'female',
        age: 35,
        contactNumber: '+91 65432 10987',
        email: 'sunita.devi@example.com',
        address: '321 Village Road, Rural Area',
        area: 'Village',
        state: 'Bihar',
        pinCode: '800001',
        TypesOfSupport: ['education', 'health'],
        specialRequirement: 'Financial assistance for children education',
        status: 'approved'
      }
    ];

    const createdMembers = await Member.insertMany(members);
    console.log('Created members:', createdMembers.length);

    // Create donation records
    const donations = [
      {
        fullName: 'Anita Patel',
        email: 'anita.patel@example.com',
        contactNumber: '+91 76543 21098',
        organisationName: 'Patel Enterprises',
        panNumber: 'ABCDE1234F',
        donationAmount: 50000,
        modeofDonation: 'bankTransfer',
        consentForUpdate: 'email',
        status: 'completed'
      },
      {
        fullName: 'Rajesh Gupta',
        email: 'rajesh.gupta@example.com',
        contactNumber: '+91 54321 09876',
        donationAmount: 25000,
        modeofDonation: 'upi',
        consentForUpdate: 'whatsapp',
        status: 'completed'
      }
    ];

    const createdDonations = await Donation.insertMany(donations);
    console.log('Created donations:', createdDonations.length);

    console.log('✅ Dummy data seeded successfully!');
    console.log('Login credentials:');
    console.log('Admin: admin@orbosis.org / password123');
    console.log('Volunteer: priya.sharma@example.com / password123');
    console.log('Donor: anita.patel@example.com / password123');
    
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

seedData();