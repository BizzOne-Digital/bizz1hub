require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User.model');
const Employee = require('../models/Employee.model');
const Settings = require('../models/Settings.model');
const RateCard = require('../models/RateCard.model');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB for seeding');

    // Create admin user
    const existingAdmin = await User.findOne({ email: 'admin@bizzone.com' });
    if (!existingAdmin) {
      await User.create({
        name: 'Zubair',
        email: 'admin@bizzone.com',
        password: 'BizzOne@2026',
        role: 'admin',
      });
      console.log('✅ Admin user created: admin@bizzone.com / BizzOne@2026');
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    // Default Settings
    await Settings.findOneAndUpdate({}, {
      usdToCad: 1.38,
      pkrPerUsd: 283,
      workingHoursPerMonth: 160,
      companyName: 'BizzOne Digital',
      companyTagline: 'Business Hub',
    }, { upsert: true });
    console.log('✅ Settings seeded');

    // Employees
    const existingEmployees = await Employee.countDocuments();
    if (existingEmployees === 0) {
      const employees = [
        // Automation & Sales
        { name: 'Danial', role: 'Automations', department: 'Automation & Sales', baseSalaryPkr: 20000, clientsPerPersonPerMonth: 20 },
        { name: 'M Abdullah', role: 'Automations', department: 'Automation & Sales', baseSalaryPkr: 20000, clientsPerPersonPerMonth: 20 },
        { name: 'Aimal', role: 'Sales', department: 'Automation & Sales', baseSalaryPkr: 20000, clientsPerPersonPerMonth: 20 },
        { name: 'Ariba', role: 'Sales', department: 'Automation & Sales', baseSalaryPkr: 20000, clientsPerPersonPerMonth: 20 },
        { name: 'Ufaq', role: 'Sales', department: 'Automation & Sales', baseSalaryPkr: 20000, compensationType: 'commission', commissionPerSitePkr: 0 },
        { name: 'Iqra', role: 'Sales', department: 'Automation & Sales', baseSalaryPkr: 20000, compensationType: 'commission', commissionPerSitePkr: 0 },
        { name: 'Sales Rep 7', role: 'Sales', department: 'Automation & Sales', baseSalaryPkr: 20000 },
        { name: 'Sales Rep 8', role: 'Sales', department: 'Automation & Sales', baseSalaryPkr: 20000 },
        { name: 'Meta Ads Specialist 1', role: 'Meta Ads', department: 'Automation & Sales', baseSalaryPkr: 0, clientsPerPersonPerMonth: 10 },
        { name: 'Meta Ads Specialist 2', role: 'Meta Ads', department: 'Automation & Sales', baseSalaryPkr: 0, clientsPerPersonPerMonth: 10 },

        // Client Delivery
        { name: 'Humaira', role: 'Meta Ads Manager', department: 'Client Delivery', baseSalaryPkr: 20000, clientsPerPersonPerMonth: 10 },
        { name: 'Syeda Atirash', role: 'Meta Ads Manager', department: 'Client Delivery', baseSalaryPkr: 20000, clientsPerPersonPerMonth: 10 },
        { name: 'Meta Ads Manager 3', role: 'Meta Ads Manager', department: 'Client Delivery', baseSalaryPkr: 20000, clientsPerPersonPerMonth: 10 },
        { name: 'Laiba Shakeel', role: 'Content Strategist & Writer', department: 'Client Delivery', baseSalaryPkr: 40000, clientsPerPersonPerMonth: 13 },
        { name: 'Hareem', role: 'Content Strategist & Writer', department: 'Client Delivery', baseSalaryPkr: 40000, clientsPerPersonPerMonth: 13 },
        { name: 'Ehsan', role: 'Video Editor', department: 'Client Delivery', baseSalaryPkr: 40000, clientsPerPersonPerMonth: 10 },
        { name: 'Haseeb', role: 'Video Editor', department: 'Client Delivery', baseSalaryPkr: 40000, clientsPerPersonPerMonth: 10 },
        { name: 'Momina', role: 'Graphic Designer', department: 'Client Delivery', baseSalaryPkr: 40000, clientsPerPersonPerMonth: 10 },
        { name: 'Eman', role: 'Graphic Designer', department: 'Client Delivery', baseSalaryPkr: 40000, clientsPerPersonPerMonth: 10 },

        // Development
        { name: 'Alishba', role: 'Developer', department: 'Development', baseSalaryPkr: 20000, clientsPerPersonPerMonth: 20, commissionPerSitePkr: 0 },
        { name: 'Zubair Dev', role: 'Developer', department: 'Development', baseSalaryPkr: 20000, clientsPerPersonPerMonth: 20, commissionPerSitePkr: 0 },
        { name: 'Shumaila Usman', role: 'Developer', department: 'Development', baseSalaryPkr: 20000, clientsPerPersonPerMonth: 20, commissionPerSitePkr: 0 },

        // HR
        { name: 'Maryam Awais', role: 'HR Manager', department: 'HR', baseSalaryPkr: 20000, clientsPerPersonPerMonth: 50 },
        { name: 'Hanan Ahmad', role: 'HR Executive', department: 'HR', baseSalaryPkr: 22000, clientsPerPersonPerMonth: 50 },

        // QA
        { name: 'Maheen Haider', role: 'Coordinator + QA', department: 'QA', baseSalaryPkr: 20000, clientsPerPersonPerMonth: 10 },
      ];

      await Employee.insertMany(employees);
      console.log(`✅ ${employees.length} employees seeded`);
    } else {
      console.log(`ℹ️  Employees already exist (${existingEmployees})`);
    }

    // Default Rate Card
    const existingRC = await RateCard.findOne();
    if (!existingRC) {
      await RateCard.create({
        defaultMarkupPercent: 160,
        activeProjectsPerMonth: 0,
        services: [
          { name: 'Meta Ads Management', assignedRole: 'Meta Ads Manager' },
          { name: 'Google Ads Management', assignedRole: 'Meta Ads Manager' },
          { name: 'TikTok Ads', assignedRole: 'Meta Ads Manager' },
          { name: 'Content Strategy', assignedRole: 'Content Strategist & Writer' },
          { name: 'Social Media Management', assignedRole: 'Content Strategist & Writer', customMarkupPercent: 60 },
          { name: 'Video Editing', assignedRole: 'Video Editor' },
          { name: 'Graphic Design', assignedRole: 'Graphic Designer' },
          { name: 'Videography', assignedRole: 'Video Editor', hourlyRateCad: 75, hoursPerClient: 3 },
          { name: 'SEO', assignedRole: 'Content Strategist & Writer' },
          { name: 'Website Development', assignedRole: 'Developer' },
          { name: 'Web App Development', assignedRole: 'Developer' },
        ],
      });
      console.log('✅ Rate card seeded');
    }

    console.log('\n🎉 Seed complete!');
    console.log('📧 Login: admin@bizzone.com');
    console.log('🔑 Password: BizzOne@2026');
    console.log('⚠️  Change the password after first login!\n');

  } catch (error) {
    console.error('❌ Seed error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seed();
