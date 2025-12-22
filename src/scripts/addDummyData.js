const API_BASE = 'https://orbosisngo-backend-35v5.onrender.com/api';

const dummyUsers = [
  {
    name: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    password: 'password123',
    role: 'volunteer'
  },
  {
    name: 'Rahul Kumar', 
    email: 'rahul.kumar@example.com',
    password: 'password123',
    role: 'volunteer'
  },
  {
    name: 'Anita Patel',
    email: 'anita.patel@example.com', 
    password: 'password123',
    role: 'donor'
  },
  {
    name: 'Admin User',
    email: 'admin@orbosis.org',
    password: 'password123', 
    role: 'admin'
  }
];

async function addDummyData() {
  console.log('Adding dummy users...');
  
  for (const user of dummyUsers) {
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(user)
      });
      
      const result = await response.json();
      console.log(`✅ Created user: ${user.email}`);
    } catch (error) {
      console.log(`❌ Failed to create user: ${user.email}`, error.message);
    }
  }
  
  console.log('✅ Dummy data creation completed!');
  console.log('\nLogin credentials:');
  console.log('Admin: admin@orbosis.org / password123');
  console.log('Volunteer: priya.sharma@example.com / password123');
  console.log('Donor: anita.patel@example.com / password123');
}

// Run if called directly
if (typeof window === 'undefined') {
  addDummyData();
}

export default addDummyData;