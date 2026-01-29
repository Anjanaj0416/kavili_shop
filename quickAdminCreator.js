// quickAdminCreator.js - Interactive Admin Account Creator
// Usage: node quickAdminCreator.js
// This is the simplest and safest way to create a new admin

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

// User Schema
const userSchema = mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: false },
    userId: { type: String, unique: true, required: true },
    type: { type: String, enum: ["customer", "admin"], default: "customer" },
    phonenumber: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    homeaddress: { type: String, required: true },
    email: { type: String, required: false, sparse: true, default: null },
    providerName: { type: String, enum: ["local", "google", "facebook"], default: "local" },
    providerId: { type: String, sparse: true, default: null }
});

userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ providerId: 1 }, { unique: true, sparse: true });

const User = mongoose.model("user", userSchema);

async function createAdminInteractive() {
    try {
        console.log('\n╔════════════════════════════════════════╗');
        console.log('║   UDARI ONLINE SHOP ADMIN CREATOR      ║');
        console.log('╚════════════════════════════════════════╝\n');

        // Connect to MongoDB
        console.log('📡 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_DB_URI);
        console.log('✅ Connected successfully!\n');

        // Get admin details
        console.log('Please enter the new admin details:\n');
        
        const firstName = await question('👤 First Name: ');
        if (!firstName.trim()) {
            console.log('❌ First name is required!');
            rl.close();
            process.exit(1);
        }

        const lastName = await question('👤 Last Name (optional, press Enter to skip): ');
        
        const phonenumber = await question('📱 Phone Number (this will be the login username): ');
        if (!phonenumber.trim()) {
            console.log('❌ Phone number is required!');
            rl.close();
            process.exit(1);
        }

        // Check if phone number already exists
        console.log('\n🔍 Checking if phone number is available...');
        const existingUser = await User.findOne({ phonenumber: phonenumber.trim() });
        if (existingUser) {
            console.log('\n❌ ERROR: This phone number is already registered!');
            console.log(`   Registered to: ${existingUser.firstName} ${existingUser.lastName || ''}`);
            console.log(`   User Type: ${existingUser.type}`);
            console.log(`   User ID: ${existingUser.userId}\n`);
            console.log('💡 Tip: Use a different phone number or delete the existing user first.\n');
            rl.close();
            process.exit(1);
        }
        console.log('✅ Phone number is available!\n');

        const homeaddress = await question('🏠 Home Address: ');
        if (!homeaddress.trim()) {
            console.log('❌ Home address is required!');
            rl.close();
            process.exit(1);
        }

        console.log('\n🔐 Password Requirements:');
        console.log('   • At least 8 characters (12+ recommended)');
        console.log('   • Mix of letters, numbers, and special characters\n');
        
        const password = await question('🔑 Password: ');
        if (!password || password.length < 8) {
            console.log('❌ Password must be at least 8 characters!');
            rl.close();
            process.exit(1);
        }

        const confirmPassword = await question('🔑 Confirm Password: ');
        if (password !== confirmPassword) {
            console.log('❌ Passwords do not match!');
            rl.close();
            process.exit(1);
        }

        // Generate unique user ID
        const userId = `admin-${firstName.toLowerCase()}-${Date.now()}`;

        // Hash password
        console.log('\n🔐 Securing password...');
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create admin user
        console.log('💾 Creating admin account...');
        const newAdmin = new User({
            userId: userId,
            firstName: firstName.trim(),
            lastName: lastName.trim() || '',
            phonenumber: phonenumber.trim(),
            homeaddress: homeaddress.trim(),
            type: 'admin',
            password: hashedPassword,
            providerName: 'local',
            email: null,
            providerId: null
        });

        await newAdmin.save();

        console.log('\n╔════════════════════════════════════════╗');
        console.log('║     ✅ ADMIN CREATED SUCCESSFULLY!      ║');
        console.log('╚════════════════════════════════════════╝\n');
        
        console.log('📋 Admin Account Details:');
        console.log('─────────────────────────────────────────');
        console.log(`User ID:       ${newAdmin.userId}`);
        console.log(`Name:          ${newAdmin.firstName} ${newAdmin.lastName}`);
        console.log(`Phone:         ${newAdmin.phonenumber}`);
        console.log(`Address:       ${newAdmin.homeaddress}`);
        console.log(`Type:          ${newAdmin.type}`);
        console.log('─────────────────────────────────────────\n');
        
        console.log('🔐 Login Credentials:');
        console.log('─────────────────────────────────────────');
        console.log(`Username:      ${newAdmin.phonenumber}`);
        console.log(`Password:      ${password}`);
        console.log('─────────────────────────────────────────\n');
        
        console.log('⚠️  IMPORTANT SECURITY NOTES:');
        console.log('   1. Save these credentials in a secure location');
        console.log('   2. Do NOT share the password with anyone');
        console.log('   3. Consider changing the password after first login');
        console.log('   4. You can now login at the admin portal\n');

        rl.close();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        
        if (error.code === 11000) {
            console.error('   Duplicate key error - this phone number or user ID already exists.');
        }
        
        rl.close();
        process.exit(1);
    }
}

// Run the script
createAdminInteractive();