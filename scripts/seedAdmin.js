require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Program = require('../models/Program');
const Module = require('../models/Module');
const Lesson = require('../models/Lesson');
const Setting = require('../models/Setting');
const connectDB = require('../config/db');

const seed = async () => {
  try {
    await connectDB();
    console.log('[Seed] Seeding LMS Academy data...');

    // 1. Seed Academy Admin
    let admin = await User.findOne({ email: 'admin@dxsport.com' });
    if (!admin) {
      admin = await User.create({
        fullName: 'DX Academy Director',
        email: 'admin@dxsport.com',
        phoneNumber: '+2348012345678',
        password: 'admin123',
        role: 'admin',
        isVerified: true,
        country: 'Nigeria',
        state: 'Lagos'
      });
      console.log('[Seed] Admin account created: admin@dxsport.com / admin123');
    } else {
      admin.role = 'admin';
      admin.isVerified = true;
      await admin.save();
      console.log('[Seed] Existing admin verified: admin@dxsport.com');
    }

    // Also seed dedicated academy admin
    let academyAdmin = await User.findOne({ email: 'academy.admin@dxsportz.com' });
    if (!academyAdmin) {
      academyAdmin = await User.create({
        fullName: 'Head of Technical Development',
        email: 'academy.admin@dxsportz.com',
        phoneNumber: '+2348098765432',
        password: 'academy123',
        role: 'admin',
        isVerified: true,
        country: 'Nigeria',
        state: 'Abuja'
      });
      console.log('[Seed] Academy Admin created: academy.admin@dxsportz.com / academy123');
    }

    // 2. Seed Default Settings
    const defaultSettings = [
      {
        key: 'payment',
        value: {
          bankName: process.env.BANK_NAME || 'Zenith Bank',
          accountName: process.env.ACCOUNT_NAME || 'DX SPORTS ACADEMY LTD',
          accountNumber: process.env.ACCOUNT_NUMBER || '1234567890',
          instructions: process.env.PAYMENT_INSTRUCTIONS || 'Make a direct bank transfer of the program tuition fee to the account details above. After transfer, upload your payment receipt/screenshot and transaction reference number below for instant administrative verification.'
        }
      },
      {
        key: 'academy',
        value: {
          name: process.env.ACADEMY_NAME || 'DX Football Academy',
          email: process.env.ACADEMY_EMAIL || 'academy@dxsportz.com',
          phone: '+234 800 000 0000',
          address: 'National Stadium Sports Complex, Surulere, Lagos, Nigeria'
        }
      },
      {
        key: 'signatory',
        value: {
          name: 'Coach Austin Eguavoen',
          title: 'Technical Director & Head of Coach Education'
        }
      }
    ];

    for (const s of defaultSettings) {
      await Setting.findOneAndUpdate({ key: s.key }, s, { upsert: true });
    }
    console.log('[Seed] Settings configured.');

    // 3. Seed Programs
    const programsData = [
      {
        title: 'Grassroots Football Coaching & Player Development',
        slug: 'grassroots-football-coaching-player-development',
        level: 'Beginner',
        price: 25000,
        currency: 'NGN',
        duration: '3 Weeks',
        accessDurationDays: 30,
        status: 'published',
        description: 'An entry-level certification for aspiring youth coaches, school sports teachers, and grassroots instructors. Learn modern pedagogical principles, safety protocols, and age-appropriate tactical drills.',
        requirements: [
          'Passionate interest in football education',
          'Basic English reading and comprehension ability',
          'Commitment to child safety and positive sportsmanship'
        ],
        objectives: [
          'Master fundamental training drill structures for ages U-8 to U-14',
          'Understand player psychology and motivation at grassroots level',
          'Design structured 60-minute coaching session plans',
          'Implement physical literacy and injury prevention routines'
        ],
        modules: [
          {
            title: 'Module 1: Foundations of Youth Coaching',
            description: 'Understanding the role of the modern youth coach and child safeguarding.',
            lessons: [
              {
                title: 'Lesson 1.1: Philosophy of Grassroots Football',
                type: 'text',
                content: `<h2>Philosophy of Grassroots Football</h2><p>Grassroots football is the bedrock of the global game. At this stage, development triumphs over winning at all costs.</p><h3>Key Principles:</h3><ul><li><strong>Fun and Engagement:</strong> Every child touches the ball frequently.</li><li><strong>Positive Reinforcement:</strong> Praise effort rather than outcome.</li><li><strong>Inclusive Participation:</strong> Equal playing time for all youngsters regardless of early physical maturity.</li></ul>`,
                durationMinutes: 15,
                isRequired: true
              },
              {
                title: 'Lesson 1.2: Child Protection & Safeguarding in Sports',
                type: 'text',
                content: `<h2>Child Protection & Safeguarding</h2><p>Coaches hold a position of profound trust. This lesson outlines essential codes of conduct, duty of care, and medical emergency readiness on the training pitch.</p>`,
                durationMinutes: 20,
                isRequired: true
              }
            ]
          },
          {
            title: 'Module 2: Technical Drills & Session Planning',
            description: 'Designing high-repetition, small-sided games that maximize ball touches.',
            lessons: [
              {
                title: 'Lesson 2.1: Ball Mastery & 1v1 Dominance',
                type: 'external_video',
                mediaUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                description: 'Video walkthrough of dynamic cone drills, body feints, and dribbling agility.',
                durationMinutes: 25,
                isRequired: true
              },
              {
                title: 'Lesson 2.2: The Structure of a 60-Minute Training Session',
                type: 'text',
                content: `<h2>The 60-Minute Session Template</h2><ol><li><strong>Warm-up & Agility (10 mins):</strong> Dynamic movement with ball.</li><li><strong>Technical Repetition (15 mins):</strong> Passing lanes and receiving on the half-turn.</li><li><strong>Game-realistic Situation (20 mins):</strong> 3v3 or 4v4 rondo transitions.</li><li><strong>Free Play (15 mins):</strong> Small-sided scrimmage with minimal coach interruption.</li></ol>`,
                durationMinutes: 20,
                isRequired: true
              }
            ]
          }
        ]
      },
      {
        title: 'Tactical Periodization & Match Analysis',
        slug: 'tactical-periodization-match-analysis',
        level: 'Intermediate',
        price: 45000,
        currency: 'NGN',
        duration: '4 Weeks',
        accessDurationDays: 30,
        status: 'published',
        description: 'For active club coaches and video analysts seeking an advanced understanding of game model construction, load management, and opposition breakdown in African and European football leagues.',
        requirements: [
          'Basic coaching experience or certification',
          'Familiarity with standard football formations (4-3-3, 3-5-2)',
          'Access to a PC or tablet for video breakdown analysis'
        ],
        objectives: [
          'Formulate a comprehensive Game Model across all four moments of the game',
          'Learn the tactical principles of Vítor Frade’s Tactical Periodization methodology',
          'Perform live and post-match video breakdowns of NPFL and European matches',
          'Plan weekly morphocycle training loads to avoid player fatigue'
        ],
        modules: [
          {
            title: 'Module 1: The Four Moments of the Game',
            description: 'Attacking organization, defensive organization, and transitional phases.',
            lessons: [
              {
                title: 'Lesson 1.1: Constructing the Team Game Model',
                type: 'text',
                content: `<h2>Constructing the Game Model</h2><p>A game model is not simply a formation; it is the collective identity of how your team thinks and acts across every phase of play.</p>`,
                durationMinutes: 30,
                isRequired: true
              },
              {
                title: 'Lesson 1.2: Rest Defense & Defensive Transitions',
                type: 'text',
                content: `<h2>Rest Defense Principles</h2><p>How teams protect against counter-attacks while maintaining offensive pressure in the opposition final third.</p>`,
                durationMinutes: 25,
                isRequired: true
              }
            ]
          },
          {
            title: 'Module 2: Weekly Morphocycle Planning',
            description: 'Balancing physical recovery, tension, duration, and speed days.',
            lessons: [
              {
                title: 'Lesson 2.1: The 7-Day Microcycle Architecture',
                type: 'text',
                content: `<h2>The Standard Sunday-to-Sunday Morphocycle</h2><p>Designing Monday active recovery, Wednesday maximum strength/tension, and Friday speed of reaction drills.</p>`,
                durationMinutes: 35,
                isRequired: true
              }
            ]
          }
        ]
      },
      {
        title: 'Professional Football Management & Technical Scouting',
        slug: 'professional-football-management-technical-scouting',
        level: 'Professional',
        price: 75000,
        currency: 'NGN',
        duration: '6 Weeks',
        accessDurationDays: 30,
        status: 'published',
        description: 'Elite diploma program for sporting directors, head scouts, and senior managers. Master data-driven recruitment, contract negotiations, FIFA transfer regulations, and talent identification across emerging football markets.',
        requirements: [
          'Coaching license, sports science degree, or equivalent club experience',
          'Ambition to work in professional football club leadership or international scouting'
        ],
        objectives: [
          'Develop institutional scouting metrics and positional scorecards',
          'Understand FIFA Clearing House, Solidarity Mechanisms, and Training Compensation',
          'Build player shadow teams and transfer succession pipelines',
          'Lead multidisciplinary backroom staffs (coaching, medical, analysis, sports science)'
        ],
        modules: [
          {
            title: 'Module 1: Elite Talent Identification & Scouting Reports',
            description: 'Evaluating technical, tactical, physical, and psychological markers.',
            lessons: [
              {
                title: 'Lesson 1.1: Writing Professional Scouting Dossiers',
                type: 'text',
                content: `<h2>The Professional Scouting Report</h2><p>How top clubs evaluate players under pressure, analyze non-verbal body language, and project development ceilings.</p>`,
                durationMinutes: 40,
                isRequired: true
              },
              {
                title: 'Lesson 1.2: Positional KPI Frameworks',
                type: 'text',
                content: `<h2>Positional KPI Scorecards</h2><p>Metric benchmarks for inverted wingers, progressive centre-backs, and box-to-box midfielders.</p>`,
                durationMinutes: 35,
                isRequired: true
              }
            ]
          },
          {
            title: 'Module 2: Transfer Market Operations & FIFA Governance',
            description: 'Regulations, contracts, representation, and academy compensation.',
            lessons: [
              {
                title: 'Lesson 2.1: FIFA Regulations on the Status and Transfer of Players (RSTP)',
                type: 'text',
                content: `<h2>FIFA RSTP Essentials</h2><p>Key guidelines on international transfers, minors protection, training compensation, and dispute resolution.</p>`,
                durationMinutes: 45,
                isRequired: true
              }
            ]
          }
        ]
      }
    ];

    for (const pData of programsData) {
      let program = await Program.findOne({ slug: pData.slug });
      if (!program) {
        program = await Program.create({
          title: pData.title,
          slug: pData.slug,
          level: pData.level,
          price: pData.price,
          currency: pData.currency,
          duration: pData.duration,
          accessDurationDays: pData.accessDurationDays,
          status: pData.status,
          description: pData.description,
          requirements: pData.requirements,
          objectives: pData.objectives,
          createdBy: admin._id
        });
        console.log(`[Seed] Program created: ${program.title}`);

        // Seed modules and lessons
        for (let i = 0; i < pData.modules.length; i++) {
          const mData = pData.modules[i];
          const mod = await Module.create({
            program: program._id,
            title: mData.title,
            description: mData.description,
            order: i + 1,
            status: 'published'
          });

          for (let j = 0; j < mData.lessons.length; j++) {
            const lData = mData.lessons[j];
            await Lesson.create({
              module: mod._id,
              program: program._id,
              title: lData.title,
              description: lData.description || '',
              type: lData.type || 'text',
              content: lData.content || '',
              mediaUrl: lData.mediaUrl || '',
              durationMinutes: lData.durationMinutes || 20,
              order: j + 1,
              isRequired: lData.isRequired !== undefined ? lData.isRequired : true,
              status: 'published'
            });
          }
        }
      }
    }

    console.log('[Seed] Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('[Seed] Error seeding LMS data:', error);
    process.exit(1);
  }
};

seed();
