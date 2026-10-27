import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Service from '../models/Service.js';
import ServiceRequest from '../models/ServiceRequest.js';
import Review from '../models/Review.js';

const seedDatabase = async () => {
  try {
    await connectDB();
    console.log('[Seed] Connected to database. Preparing indexes and collections...');

    // Sync indexes
    await User.syncIndexes();
    await Service.syncIndexes();
    await ServiceRequest.syncIndexes();
    await Review.syncIndexes();
    console.log('[Seed] Indexes synchronized.');

    // Clear existing collections
    await Promise.all([
      User.deleteMany({}),
      Service.deleteMany({}),
      ServiceRequest.deleteMany({}),
      Review.deleteMany({}),
    ]);
    console.log('[Seed] Cleared existing data.');

    // Shared password hash for demo accounts: Demo@1234
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Demo@1234', salt);

    // 1. Create Demo Customer
    const customer = await User.create({
      name: 'Ananya Sharma',
      email: 'customer@demo.com',
      passwordHash,
      role: 'customer',
      phone: '9876543210',
    });

    // 2. Create 5 Demo Providers
    const providersData = [
      {
        name: 'Ramesh Kumar (Ace Electricals)',
        email: 'provider1@demo.com',
        passwordHash,
        role: 'provider',
        phone: '9880112233',
      },
      {
        name: 'Suresh Rao (Bengaluru Plumbing Care)',
        email: 'provider2@demo.com',
        passwordHash,
        role: 'provider',
        phone: '9880223344',
      },
      {
        name: 'Pooja Hegde (Bright Minds Tutoring)',
        email: 'provider3@demo.com',
        passwordHash,
        role: 'provider',
        phone: '9880334455',
      },
      {
        name: 'Farhan Akhtar (Precision Tailors)',
        email: 'provider4@demo.com',
        passwordHash,
        role: 'provider',
        phone: '9880445566',
      },
      {
        name: 'Manjunath Gowda (Master Carpenters & Painters)',
        email: 'provider5@demo.com',
        passwordHash,
        role: 'provider',
        phone: '9880556677',
      },
    ];

    const providers = await User.insertMany(providersData);

    // 3. Create ~12 Services across Bengaluru localities
    // Note: Coordinates in GeoJSON are [longitude, latitude]
    const servicesData = [
      {
        provider: providers[0]._id,
        title: 'Emergency Residential Electrical Repairs & Rewiring',
        category: 'electrician',
        description: 'Prompt service for short circuits, appliance installations, circuit breaker troubleshooting, and complete home rewiring with genuine parts.',
        price: 350,
        priceUnit: 'per_hour',
        address: '100 Feet Rd, Indiranagar, Bengaluru',
        location: { type: 'Point', coordinates: [77.6408, 12.9784] },
      },
      {
        provider: providers[0]._id,
        title: 'Inverter & Smart Home Switch Setup',
        category: 'electrician',
        description: 'Complete battery inverter setup and smart home WiFi switchboard installation with safety grounding.',
        price: 799,
        priceUnit: 'per_job',
        address: '5th Block, Koramangala, Bengaluru',
        location: { type: 'Point', coordinates: [77.6245, 12.9352] },
      },
      {
        provider: providers[1]._id,
        title: 'Leak Detection, Pipe Repair & Drain Cleaning',
        category: 'plumber',
        description: 'High-pressure water jetting, concealed pipe leak repairs, kitchen sink unclogging, and bathroom fixture replacement.',
        price: 300,
        priceUnit: 'per_hour',
        address: 'ITPL Main Road, Whitefield, Bengaluru',
        location: { type: 'Point', coordinates: [77.7499, 12.9698] },
      },
      {
        provider: providers[1]._id,
        title: 'Water Heater & RO Purifier Plumbing Installation',
        category: 'plumber',
        description: 'Standard and instantaneous water geyser plumbing connections along with RO water filter inlet/outlet pipelines.',
        price: 499,
        priceUnit: 'per_job',
        address: '4th Block, Jayanagar, Bengaluru',
        location: { type: 'Point', coordinates: [77.5838, 12.9308] },
      },
      {
        provider: providers[2]._id,
        title: 'Mathematics & Science Tutoring for Grades 8-12',
        category: 'tutor',
        description: 'One-on-one personalized tutoring for CBSE and ICSE boards focusing on conceptual clarity, problem solving, and board exam prep.',
        price: 500,
        priceUnit: 'per_hour',
        address: 'Sector 2, HSR Layout, Bengaluru',
        location: { type: 'Point', coordinates: [77.6446, 12.9121] },
      },
      {
        provider: providers[2]._id,
        title: 'Foundational English & Spoken Hindi Coaching',
        category: 'tutor',
        description: 'Interactive conversation practice, grammar mastery, and business communication skills for students and working professionals.',
        price: 400,
        priceUnit: 'per_hour',
        address: 'Sampige Road, Malleshwaram, Bengaluru',
        location: { type: 'Point', coordinates: [77.5643, 13.0031] },
      },
      {
        provider: providers[3]._id,
        title: 'Custom Blouse & Suit Tailoring with Doorstep Fitting',
        category: 'tailor',
        description: 'Custom designer blouses, salwar suits, kurtas, and trousers stitched to your exact measurements with premium finish and timely delivery.',
        price: 850,
        priceUnit: 'per_job',
        address: 'Phase 1, Electronic City, Bengaluru',
        location: { type: 'Point', coordinates: [77.6602, 12.8452] },
      },
      {
        provider: providers[3]._id,
        title: 'Garment Alteration, Zipper & Hemming Service',
        category: 'tailor',
        description: 'Quick turnaround alterations for jeans, formal trousers, dresses, and traditional ethnic wear.',
        price: 250,
        priceUnit: 'per_job',
        address: '12th Main, Indiranagar, Bengaluru',
        location: { type: 'Point', coordinates: [77.6385, 12.9715] },
      },
      {
        provider: providers[4]._id,
        title: 'Custom Modular Furniture & Wooden Wardrobe Carpentry',
        category: 'carpenter',
        description: 'Solid wood and engineered ply furniture fabrication, wardrobe sliding doors, TV unit construction, and lock replacements.',
        price: 450,
        priceUnit: 'per_hour',
        address: 'Sector 7, HSR Layout, Bengaluru',
        location: { type: 'Point', coordinates: [77.6358, 12.9142] },
      },
      {
        provider: providers[4]._id,
        title: 'Interior Wall Painting & Waterproofing Coating',
        category: 'painter',
        description: 'Complete home repainting, putty smoothening, texture walls, and damp-proof anti-fungal waterproofing coating.',
        price: 1200,
        priceUnit: 'per_job',
        address: '7th Block, Koramangala, Bengaluru',
        location: { type: 'Point', coordinates: [77.6185, 12.934] },
      },
      {
        provider: providers[0]._id,
        title: 'Deep Home Cleaning & Sanitization Service',
        category: 'cleaner',
        description: 'Intensive mechanized scrub cleaning for kitchens, bathrooms, balconies, and sofa shampooing using eco-safe detergents.',
        price: 1500,
        priceUnit: 'per_job',
        address: 'Margosa Road, Malleshwaram, Bengaluru',
        location: { type: 'Point', coordinates: [77.5695, 13.0078] },
      },
      {
        provider: providers[1]._id,
        title: 'Two-Wheeler & Bicycle Doorstep Service & Tuning',
        category: 'mechanic',
        description: 'Engine oil change, brake overhaul, chain lubrication, electrical checks, and general tune-up at your doorstep.',
        price: 400,
        priceUnit: 'per_job',
        address: 'ECC Road, Whitefield, Bengaluru',
        location: { type: 'Point', coordinates: [77.742, 12.965] },
      },
    ];

    const createdServices = await Service.insertMany(servicesData);
    console.log(`[Seed] Created ${createdServices.length} services.`);

    // 4. Create completed requests and reviews so ratings display
    // Request 1: Electrician service completed with 5-star review
    const req1 = await ServiceRequest.create({
      customer: customer._id,
      provider: providers[0]._id,
      service: createdServices[0]._id,
      serviceSnapshot: {
        title: createdServices[0].title,
        category: createdServices[0].category,
        price: createdServices[0].price,
        priceUnit: createdServices[0].priceUnit,
      },
      message: 'Need help fixing a tripped MCB switch in the kitchen immediately.',
      preferredDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      customerAddress: 'Flat 302, Green Glen Layout, Indiranagar, Bengaluru',
      status: 'COMPLETED',
      statusHistory: [
        { status: 'PENDING', changedBy: customer._id, at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), note: 'Request initiated' },
        { status: 'ACCEPTED', changedBy: providers[0]._id, at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 3600000), note: 'Accepted' },
        { status: 'COMPLETED', changedBy: providers[0]._id, at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), note: 'Job completed successfully' },
      ],
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      hasReview: true,
    });

    await Review.create({
      request: req1._id,
      service: createdServices[0]._id,
      customer: customer._id,
      provider: providers[0]._id,
      rating: 5,
      comment: 'Arrived promptly in 30 minutes! Diagnosed the problem fast and replaced the faulty breaker safely. Excellent work.',
    });

    // Request 2: Plumbing service completed with 4-star review
    const req2 = await ServiceRequest.create({
      customer: customer._id,
      provider: providers[1]._id,
      service: createdServices[2]._id,
      serviceSnapshot: {
        title: createdServices[2].title,
        category: createdServices[2].category,
        price: createdServices[2].price,
        priceUnit: createdServices[2].priceUnit,
      },
      message: 'Kitchen sink pipe has a heavy leakage under the counter.',
      preferredDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      customerAddress: 'Villa 14, Prestige Boulevard, Whitefield, Bengaluru',
      status: 'COMPLETED',
      statusHistory: [
        { status: 'PENDING', changedBy: customer._id, at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), note: 'Request initiated' },
        { status: 'ACCEPTED', changedBy: providers[1]._id, at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 1800000), note: 'Accepted' },
        { status: 'COMPLETED', changedBy: providers[1]._id, at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), note: 'Work completed' },
      ],
      completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      hasReview: true,
    });

    await Review.create({
      request: req2._id,
      service: createdServices[2]._id,
      customer: customer._id,
      provider: providers[1]._id,
      rating: 4,
      comment: 'Very professional plumbing service. Replaced the gasket and stopped the leakage completely.',
    });

    // Request 3: Tutoring service completed with 5-star review
    const req3 = await ServiceRequest.create({
      customer: customer._id,
      provider: providers[2]._id,
      service: createdServices[4]._id,
      serviceSnapshot: {
        title: createdServices[4].title,
        category: createdServices[4].category,
        price: createdServices[4].price,
        priceUnit: createdServices[4].priceUnit,
      },
      message: 'Need 10th grade calculus guidance for my sibling.',
      preferredDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      customerAddress: 'Apartment 4B, Sector 2, HSR Layout, Bengaluru',
      status: 'COMPLETED',
      statusHistory: [
        { status: 'PENDING', changedBy: customer._id, at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), note: 'Request created' },
        { status: 'ACCEPTED', changedBy: providers[2]._id, at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 7200000), note: 'Accepted' },
        { status: 'COMPLETED', changedBy: providers[2]._id, at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), note: 'Session done' },
      ],
      completedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      hasReview: true,
    });

    await Review.create({
      request: req3._id,
      service: createdServices[4]._id,
      customer: customer._id,
      provider: providers[2]._id,
      rating: 5,
      comment: 'Exceptional tutor! Made difficult topics very easy to understand. Highly recommended.',
    });

    // Update service ratings using aggregation
    for (const s of [createdServices[0], createdServices[2], createdServices[4]]) {
      const stats = await Review.aggregate([
        { $match: { service: s._id } },
        {
          $group: {
            _id: '$service',
            avgRating: { $avg: '$rating' },
            reviewCount: { $sum: 1 },
          },
        },
      ]);

      if (stats.length > 0) {
        await Service.findByIdAndUpdate(s._id, {
          avgRating: Math.round(stats[0].avgRating * 10) / 10,
          reviewCount: stats[0].reviewCount,
        });
      }
    }

    console.log('\n======================================================');
    console.log('       NEARBYPRO DATABASE SEEDED SUCCESSFULLY');
    console.log('======================================================');
    console.log('Demo Customer Account:');
    console.log('  Email:    customer@demo.com');
    console.log('  Password: Demo@1234');
    console.log('  Role:     customer');
    console.log('------------------------------------------------------');
    console.log('Demo Provider Accounts (5 providers):');
    providersData.forEach((p, idx) => {
      console.log(`  [Provider ${idx + 1}] ${p.name}`);
      console.log(`    Email:    ${p.email}`);
      console.log(`    Password: Demo@1234`);
      console.log(`    Role:     provider`);
    });
    console.log('======================================================\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error] Failed to seed database:', error);
    process.exit(1);
  }
};

seedDatabase();
