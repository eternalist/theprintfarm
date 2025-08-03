// backend/prisma/seed.js

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const mockThingiverseModels = [
  {
    thingId: "1234567",
    title: "Articulated Dragon",
    description: "A fully articulated dragon that prints in place without supports! This amazing dragon can move its head, legs, and tail segments. Perfect for beginners and experienced makers alike.",
    imageUrl: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400",
    sourceUrl: "https://www.thingiverse.com/thing/1234567",
    tags: ["dragon", "articulated", "no-supports", "toy", "fantasy"],
    license: "Creative Commons - Attribution",
    authorName: "DragonMaker3D",
    publishedDate: new Date('2023-06-15'),
    downloadCount: 15420,
    likeCount: 892,
    complexity: "Beginner",
    printTime: "8 hours",
    filamentUsed: "45g"
  },
  {
    thingId: "2345678",
    title: "Phone Stand with Cable Management",
    description: "An elegant phone stand that keeps your cables organized. Features adjustable angle and works with phones of all sizes. Includes cable routing channels.",
    imageUrl: "https://images.unsplash.com/photo-1556656793-08538906a9f8?w=400",
    sourceUrl: "https://www.thingiverse.com/thing/2345678",
    tags: ["phone", "stand", "organizer", "desk", "practical"],
    license: "Creative Commons - Attribution",
    authorName: "OrganizedMaker",
    publishedDate: new Date('2023-07-22'),
    downloadCount: 8934,
    likeCount: 456,
    complexity: "Beginner",
    printTime: "3 hours",
    filamentUsed: "22g"
  },
  {
    thingId: "3456789",
    title: "Modular Tool Organizer",
    description: "A customizable tool organizer system that grows with your needs. Print multiple modules and connect them together. Perfect for workshops and maker spaces.",
    imageUrl: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400",
    sourceUrl: "https://www.thingiverse.com/thing/3456789",
    tags: ["tool", "organizer", "modular", "workshop", "storage"],
    license: "Creative Commons - Attribution - Share Alike",
    authorName: "WorkshopWizard",
    publishedDate: new Date('2023-05-10'),
    downloadCount: 12678,
    likeCount: 734,
    complexity: "Intermediate",
    printTime: "5 hours",
    filamentUsed: "68g"
  },
  {
    thingId: "4567890",
    title: "Flexi Rex T-Rex",
    description: "The famous flexible T-Rex that prints fully assembled! No supports needed. This iconic model showcases the power of 3D printing with its print-in-place joints.",
    imageUrl: "https://images.unsplash.com/photo-1551731409-43eb3e517a1a?w=400",
    sourceUrl: "https://www.thingiverse.com/thing/4567890",
    tags: ["flexi", "t-rex", "dinosaur", "flexible", "iconic", "no-supports"],
    license: "Creative Commons - Attribution - Non-Commercial",
    authorName: "FlexiDesigns",
    publishedDate: new Date('2023-04-18'),
    downloadCount: 28934,
    likeCount: 1567,
    complexity: "Beginner",
    printTime: "6 hours",
    filamentUsed: "38g"
  },
  {
    thingId: "5678901",
    title: "Raspberry Pi 4 Case with Fan Mount",
    description: "A sleek case for Raspberry Pi 4 with integrated fan mounting and GPIO access. Features removable top for easy access and excellent ventilation design.",
    imageUrl: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400",
    sourceUrl: "https://www.thingiverse.com/thing/5678901",
    tags: ["raspberry-pi", "case", "electronics", "fan", "cooling"],
    license: "Creative Commons - Attribution",
    authorName: "TechEnclosures",
    publishedDate: new Date('2023-08-05'),
    downloadCount: 6789,
    likeCount: 423,
    complexity: "Intermediate",
    printTime: "4 hours",
    filamentUsed: "35g"
  },
  {
    thingId: "6789012",
    title: "Customizable Desk Nameplate",
    description: "A professional desk nameplate that you can customize with your name and title. Includes mounting options for different desk types and a pen holder attachment.",
    imageUrl: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400",
    sourceUrl: "https://www.thingiverse.com/thing/6789012",
    tags: ["nameplate", "desk", "office", "customizable", "professional"],
    license: "Creative Commons - Attribution",
    authorName: "OfficeDesigns3D",
    publishedDate: new Date('2023-09-12'),
    downloadCount: 3456,
    likeCount: 198,
    complexity: "Beginner",
    printTime: "2 hours",
    filamentUsed: "18g"
  },
  {
    thingId: "7890123",
    title: "Miniature Garden Planters Set",
    description: "A set of 6 different miniature planters perfect for succulents and small plants. Each planter has a unique geometric design and includes drainage holes.",
    imageUrl: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400",
    sourceUrl: "https://www.thingiverse.com/thing/7890123",
    tags: ["planter", "garden", "succulent", "geometric", "set"],
    license: "Creative Commons - Attribution - Share Alike",
    authorName: "GreenThumb3D",
    publishedDate: new Date('2023-03-28'),
    downloadCount: 9876,
    likeCount: 567,
    complexity: "Beginner",
    printTime: "12 hours (full set)",
    filamentUsed: "95g"
  },
  {
    thingId: "8901234",
    title: "Gear Mechanical Puzzle",
    description: "An intricate mechanical puzzle featuring interlocking gears. Challenge yourself to assemble this complex mechanism. Great for engineering students and puzzle enthusiasts.",
    imageUrl: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400",
    sourceUrl: "https://www.thingiverse.com/thing/8901234",
    tags: ["puzzle", "gears", "mechanical", "engineering", "challenge"],
    license: "Creative Commons - Attribution - Non-Commercial",
    authorName: "PuzzleMaster3D",
    publishedDate: new Date('2023-07-14'),
    downloadCount: 5432,
    likeCount: 321,
    complexity: "Advanced",
    printTime: "15 hours",
    filamentUsed: "125g"
  }
];

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data
  await prisma.favorite.deleteMany();
  await prisma.message.deleteMany();
  await prisma.printRequest.deleteMany();
  await prisma.thingiverseModel.deleteMany();
  await prisma.makerProfile.deleteMany();
  await prisma.customerProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.announcement.deleteMany();

  console.log('🧹 Cleaned existing data');

  // Create Thingiverse models
  console.log('📦 Creating Thingiverse models...');
  const models = await Promise.all(
    mockThingiverseModels.map(model => 
      prisma.thingiverseModel.create({ data: model })
    )
  );
  console.log(`✅ Created ${models.length} models`);

  // Hash password for demo users
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create Admin user
  const admin = await prisma.user.create({
    data: {
      email: 'admin@theprintfarm.com',
      passwordHash: hashedPassword,
      name: 'System Admin',
      role: 'ADMIN',
      isActive: true
    }
  });
  console.log('👨‍💼 Created admin user');

  // Create demo customers
  const customers = [];
  for (let i = 1; i <= 3; i++) {
    const customer = await prisma.user.create({
      data: {
        email: `customer${i}@example.com`,
        passwordHash: hashedPassword,
        name: `Customer ${i}`,
        role: 'CUSTOMER',
        customerProfile: {
          create: {
            preferredMaterials: i === 1 ? ['PLA'] : i === 2 ? ['PLA', 'ABS'] : ['PLA', 'PETG'],
            maxBudget: i * 50,
            city: i === 1 ? 'New York' : i === 2 ? 'Los Angeles' : 'Chicago',
            state: i === 1 ? 'NY' : i === 2 ? 'CA' : 'IL'
          }
        }
      },
      include: { customerProfile: true }
    });
    customers.push(customer);
  }
  console.log(`👥 Created ${customers.length} customers`);

  // Create demo makers
  const makers = [];
  const makerData = [
    {
      email: 'maker1@example.com',
      name: 'Alice the Maker',
      materials: ['PLA', 'ABS', 'PETG'],
      printerVolume: '220x220x250mm',
      resolution: '0.2mm',
      hasEnclosure: true,
      status: 'ONLINE',
      availability: 'Weekdays 9-5 EST',
      hourlyRate: 25.0,
      city: 'Austin',
      state: 'TX',
      completedPrints: 47,
      rating: 4.8,
      totalRatings: 23
    },
    {
      email: 'maker2@example.com',
      name: 'Bob Print Master',
      materials: ['PLA', 'TPU'],
      printerVolume: '300x300x400mm',
      resolution: '0.15mm',
      hasEnclosure: false,
      status: 'ONLINE',
      availability: 'Evenings and weekends',
      hourlyRate: 20.0,
      city: 'Denver',
      state: 'CO',
      completedPrints: 89,
      rating: 4.9,
      totalRatings: 41
    },
    {
      email: 'maker3@example.com',
      name: 'Carol 3D Designs',
      materials: ['PLA', 'ABS', 'PETG', 'TPU'],
      printerVolume: '200x200x200mm',
      resolution: '0.1mm',
      hasEnclosure: true,
      status: 'AWAY',
      availability: 'Flexible schedule',
      hourlyRate: 30.0,
      city: 'Seattle',
      state: 'WA',
      completedPrints: 156,
      rating: 4.7,
      totalRatings: 67
    }
  ];

  for (const data of makerData) {
    const { email, name, ...profileData } = data;
    const maker = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        name,
        role: 'MAKER',
        makerProfile: {
          create: profileData
        }
      },
      include: { makerProfile: true }
    });
    makers.push(maker);
  }
  console.log(`🔨 Created ${makers.length} makers`);

  // Create some favorites
  console.log('❤️ Creating favorites...');
  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];
    const favoriteModels = models.slice(i * 2, (i + 1) * 2 + 1);
    
    for (const model of favoriteModels) {
      await prisma.favorite.create({
        data: {
          userId: customer.id,
          modelId: model.id
        }
      });
    }
  }

  // Create some print requests
  console.log('📋 Creating print requests...');
  const printStatuses = ['REQUESTED', 'ACCEPTED', 'PRINTING', 'COMPLETED'];
  
  for (let i = 0; i < 6; i++) {
    const customer = customers[i % customers.length];
    const maker = makers[i % makers.length];
    const model = models[i % models.length];
    const status = printStatuses[i % printStatuses.length];
    
    const requestData = {
      modelId: model.id,
      customerId: customer.id,
      makerId: maker.id,
      status,
      quantity: Math.floor(Math.random() * 3) + 1,
      material: ['PLA', 'ABS', 'PETG'][Math.floor(Math.random() * 3)],
      color: ['Red', 'Blue', 'Black', 'White', 'Green'][Math.floor(Math.random() * 5)],
      notes: i % 2 === 0 ? 'Please use high quality settings' : null,
      quotedPrice: Math.floor(Math.random() * 50) + 10
    };

    // Set timestamps based on status
    if (status !== 'REQUESTED') requestData.acceptedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    if (status === 'PRINTING' || status === 'COMPLETED') requestData.startedAt = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    if (status === 'COMPLETED') requestData.completedAt = new Date();

    await prisma.printRequest.create({ data: requestData });
  }

  // Create some messages
  console.log('💬 Creating messages...');
  const messageTemplates = [
    'Hi! I\'m interested in getting the dragon printed. What material do you recommend?',
    'Thanks for accepting my print request! When do you think it will be ready?',
    'The print looks amazing! Thank you for the great work.',
    'Do you have experience printing with flexible materials?',
    'I have a custom modification to the model. Can you help with that?'
  ];

  for (let i = 0; i < 8; i++) {
    const customer = customers[i % customers.length];
    const maker = makers[i % makers.length];
    const message = messageTemplates[i % messageTemplates.length];
    
    await prisma.message.create({
      data: {
        senderId: i % 2 === 0 ? customer.id : maker.id,
        receiverId: i % 2 === 0 ? maker.id : customer.id,
        content: message,
        modelUrl: i % 3 === 0 ? models[i % models.length].sourceUrl : null,
        isRead: Math.random() > 0.3
      }
    });
  }

  // Create announcements
  console.log('📢 Creating announcements...');
  await prisma.announcement.create({
    data: {
      title: 'Welcome to ThePrintFarm!',
      content: 'We\'re excited to launch our 3D printing marketplace. Connect with skilled makers and bring your ideas to life!',
      type: 'SUCCESS',
      priority: 10
    }
  });

  await prisma.announcement.create({
    data: {
      title: 'New Material Options Available',
      content: 'We\'ve added support for PETG and TPU materials. Check out our updated maker profiles to find specialists in these materials.',
      type: 'INFO',
      priority: 5
    }
  });

  console.log('🎉 Database seeded successfully!');
  console.log('\nDemo Login Credentials:');
  console.log('Admin: admin@theprintfarm.com / password123');
  console.log('Customer: customer1@example.com / password123');
  console.log('Maker: maker1@example.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });