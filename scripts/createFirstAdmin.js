// scripts/createFirstAdmin.js
/**
 * CLI Script to create the first admin account
 * Usage: node scripts/createFirstAdmin.js
 * 
 * This script should be run once to create the initial admin account.
 * After the first admin is created, all subsequent admin accounts must be
 * created through the protected admin API endpoint.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import readline from 'readline';
import dotenv from 'dotenv';
import User from '../models/user.js';
import { validatePassword } from '../utils/passwordValidator.js';

dotenv.config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function createFirstAdmin() {
    try {
        console.log('\n===========================================');
        console.log('  CREATE FIRST ADMIN ACCOUNT');
        console.log('===========================================\n');

        // Connect to database
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGO_DB_URI);
        console.log('✓ Connected to database\n');

        // Check if any admin already exists
        const existingAdmin = await User.findOne({ type: 'admin' });
        if (existingAdmin) {
            console.log('⚠ Warning: An admin account already exists!');
            console.log(`   Admin: ${existingAdmin.firstName} ${existingAdmin.lastName}`);
            console.log(`   User ID: ${existingAdmin.userId}\n`);
            
            const proceed = await question('Do you want to create another admin? (yes/no): ');
            if (proceed.toLowerCase() !== 'yes') {
                console.log('\nOperation cancelled.');
                rl.close();
                process.exit(0);
            }
        }

        // Get admin details
        const firstName = await question('\nEnter first name: ');
        const lastName = await question('Enter last name (optional): ');
        const phonenumber = await question('Enter phone number: ');
        const homeaddress = await question('Enter home address: ');

        console.log('\n--- Password Requirements ---');
        console.log('• At least 12 characters long');
        console.log('• At least one uppercase letter');
        console.log('• At least one lowercase letter');
        console.log('• At least one number');
        console.log('• At least one special character (!@#$%^&*...)');
        console.log('• No common passwords or sequential characters\n');

        let password = await question('Enter strong password: ');
        
        // Validate password
        const validation = validatePassword(password);
        if (!validation.isValid) {
            console.log('\n❌ Password does not meet security requirements:');
            validation.errors.forEach(error => console.log(`   • ${error}`));
            console.log('\nPlease run the script again with a stronger password.');
            rl.close();
            process.exit(1);
        }

        const confirmPassword = await question('Confirm password: ');
        
        if (password !== confirmPassword) {
            console.log('\n❌ Passwords do not match!');
            rl.close();
            process.exit(1);
        }

        // Check if phone number already exists
        const existingUser = await User.findOne({ phonenumber: phonenumber.trim() });
        if (existingUser) {
            console.log('\n❌ A user with this phone number already exists!');
            rl.close();
            process.exit(1);
        }

        // Create admin account
        console.log('\nCreating admin account...');
        
        const userId = firstName.trim().toLowerCase() + '-admin-' + Date.now();
        const hashedPassword = await bcrypt.hash(password, 12);

        const admin = new User({
            userId,
            firstName: firstName.trim(),
            lastName: lastName ? lastName.trim() : '',
            phonenumber: phonenumber.trim(),
            homeaddress: homeaddress.trim(),
            type: 'admin',
            password: hashedPassword
        });

        await admin.save();

        console.log('\n✓ Admin account created successfully!');
        console.log('\n--- Admin Details ---');
        console.log(`User ID: ${admin.userId}`);
        console.log(`Name: ${admin.firstName} ${admin.lastName}`);
        console.log(`Phone: ${admin.phonenumber}`);
        console.log(`Type: ${admin.type}`);
        console.log('\n⚠ IMPORTANT: Store these credentials securely!');
        console.log('⚠ You will need the phone number and password to log in.\n');

        rl.close();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error creating admin account:', error.message);
        rl.close();
        process.exit(1);
    }
}

// Run the script
createFirstAdmin();