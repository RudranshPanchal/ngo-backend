#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

console.log('🔧 OrbosisNGO Backend - 500 Error Fix Script');
console.log('=' .repeat(50));

// Check if uploads directory exists
const uploadsDir = './uploads';
if (!fs.existsSync(uploadsDir)) {
  console.log('📁 Creating uploads directory...');
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Uploads directory created');
} else {
  console.log('✅ Uploads directory exists');
}

// Check environment variables
console.log('\n🔍 Checking environment variables:');
const requiredEnvVars = ['PORT', 'NODE_ENV'];
const envFile = './.env';

if (fs.existsSync(envFile)) {
  console.log('✅ .env file exists');
  const envContent = fs.readFileSync(envFile, 'utf8');
  
  requiredEnvVars.forEach(varName => {
    if (envContent.includes(varName)) {
      console.log(`✅ ${varName} is set`);
    } else {
      console.log(`⚠️  ${varName} is missing`);
    }
  });
} else {
  console.log('❌ .env file not found');
}

// Check package.json dependencies
console.log('\n📦 Checking dependencies:');
const packageJsonPath = './package.json';
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const requiredDeps = ['express', 'mongoose', 'cors', 'dotenv', 'bcrypt', 'jsonwebtoken'];
  
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      console.log(`✅ ${dep} is installed`);
    } else {
      console.log(`❌ ${dep} is missing`);
    }
  });
} else {
  console.log('❌ package.json not found');
}

console.log('\n🚀 Common 500 Error Solutions:');
console.log('1. Database Connection Issues:');
console.log('   - Check MongoDB Atlas connection string');
console.log('   - Verify network access and IP whitelist');
console.log('   - Ensure database user has proper permissions');

console.log('\n2. Missing Dependencies:');
console.log('   - Run: npm install');
console.log('   - Check for version conflicts');

console.log('\n3. File Upload Issues:');
console.log('   - Ensure uploads/ directory exists (✅ Fixed above)');
console.log('   - Check file permissions');

console.log('\n4. Environment Variables:');
console.log('   - Add JWT_SECRET to .env file');
console.log('   - Set proper NODE_ENV value');

console.log('\n5. CORS Issues:');
console.log('   - Check frontend URL in CORS configuration');
console.log('   - Verify request headers');

console.log('\n🔧 Quick Fix Commands:');
console.log('npm install');
console.log('node debug-server.js  # Test basic server');
console.log('npm start  # Start main server');

console.log('\n📝 Check server logs for specific error details');