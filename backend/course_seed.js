const mongoose = require('mongoose');
const Course = require('./models/common_courses'); // adjust the path as needed
require('dotenv').config();

async function createCourses() {
  try {
    console.log('MONGO_URI:', process.env.MONGO_URI); 
    await mongoose.connect(process.env.MONGO_URI)

    // Clear existing courses
    await Course.deleteMany({});
    console.log('Cleared existing courses');

    const courses = [
      {
        title: 'ISP',
        modules: [
          {
            m_id: 'ISP01',
            name: 'Information Security Fundamentals',
            duration: 60,
            description: 'Learn about basic information security concepts.',
            lessons: 4
          },
          {
            m_id: 'ISP02',
            name: 'Data Protection Principles',
            duration: 90,
            description: 'Understanding data protection and privacy.',
            lessons: 4
          },
          {
            m_id: 'ISP03',
            name: 'Security Best Practices',
            duration: 90,
            description: 'Implementing security best practices.',
            lessons: 4
          },
          {
            m_id: 'ISP04',
            name: 'Incident Response',
            duration: 90,
            description: 'How to respond to security incidents.',
            lessons: 4
          }
        ]
      },
      {
        title: 'GDPR',
        modules: [
          {
            m_id: 'GDPR01',
            name: 'GDPR Fundamentals',
            duration: 60,
            description: 'Introduction to GDPR regulations.',
            lessons: 4
          },
          {
            m_id: 'GDPR02',
            name: 'Data Subject Rights',
            duration: 90,
            description: 'Understanding data subject rights.',
            lessons: 4
          },
          {
            m_id: 'GDPR03',
            name: 'Data Processing Principles',
            duration: 90,
            description: 'GDPR data processing principles.',
            lessons: 4
          },
          {
            m_id: 'GDPR04',
            name: 'Compliance and Enforcement',
            duration: 90,
            description: 'GDPR compliance and enforcement.',
            lessons: 4
          }
        ]
      },
      {
        title: 'POSH',
        modules: [
          {
            m_id: 'POSH01',
            name: 'Foundations – The Why Behind POSH',
            duration: 60,
            description: 'Learn about variables, data types, and memory.',
            lessons: 4
          },
          {
            m_id: 'POSH02',
            name: 'Who\'s Protected & What Counts as Harassment',
            duration: 90,
            description: 'If-else, loops, and switch-case in depth.',
            lessons: 4
          },
          {
            m_id: 'POSH03',
            name: 'How to File a Complaint – And What Happens Next',
            duration: 90,
            description: 'If-else, loops, and switch-case in depth.',
            lessons: 4
          },
          {
            m_id: 'POSH04',
            name: 'Employer\'s Role & Confidentiality Matters',
            duration: 90,
            description: 'If-else, loops, and switch-case in depth.',
            lessons: 4
          }
        ]
      },
      {
        title: 'Factory Act',
        modules: [
          {
            m_id: 'FACTORY01',
            name: 'Factory Act Basics',
            duration: 60,
            description: 'Introduction to Factory Act regulations.',
            lessons: 4
          },
          {
            m_id: 'FACTORY02',
            name: 'Safety Regulations',
            duration: 90,
            description: 'Understanding safety requirements.',
            lessons: 4
          },
          {
            m_id: 'FACTORY03',
            name: 'Compliance Requirements',
            duration: 90,
            description: 'Meeting compliance standards.',
            lessons: 4
          },
         
        ]
      },
      {
        title: 'Welding',
        modules: [
          {
            m_id: 'WELDING01',
            name: 'Welding Fundamentals',
            duration: 60,
            description: 'Basic welding principles and safety.',
            lessons: 4
          },
          {
            m_id: 'WELDING02',
            name: 'Welding Techniques',
            duration: 90,
            description: 'Different welding techniques and applications.',
            lessons: 4
          },
          {
            m_id: 'WELDING03',
            name: 'Quality Control',
            duration: 90,
            description: 'Ensuring welding quality and standards.',
            lessons: 4
          },
          {
            m_id: 'WELDING04',
            name: 'Fitting Techniques & Maintenance',
            duration: 90,
            description: 'Fitting techniques and tool maintenance.',
            lessons: 4
          }
        ]
      },
      {
        title: 'CNC',
        modules: [
          {
            m_id: 'CNC01',
            name: 'CNC Machine Basics',
            duration: 60,
            description: 'Introduction to CNC machines.',
            lessons: 4
          },
          {
            m_id: 'CNC02',
            name: 'Programming Fundamentals',
            duration: 90,
            description: 'CNC programming basics.',
            lessons: 4
          },
          {
            m_id: 'CNC03',
            name: 'Operation and Maintenance',
            duration: 90,
            description: 'CNC machine operation and maintenance.',
            lessons: 4
          },
          {
            m_id: 'CNC04',
            name: 'Advanced CNC Operations',
            duration: 90,
            description: 'Advanced CNC operations and troubleshooting.',
            lessons: 4
          }
        ]
      }
    ];

    for (const courseData of courses) {
      const newCourse = new Course(courseData);
      const savedCourse = await newCourse.save();
      console.log(`Course created: ${savedCourse.title} with ${savedCourse.modules.length} modules`);
    }

    console.log('All courses created successfully!');
    //mongoose.connection.close(); // Close connection after saving
  } catch (error) {
    console.error('Error creating courses:', error);
  }
}

createCourses();
