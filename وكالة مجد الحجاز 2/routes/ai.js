// راوتر الذكاء الاصطناعي
const express = require('express');
const { auth, checkSubscriptionLimits, requireSubscription, logActivity } = require('../middleware/auth');
const User = require('../models/User');
const AIRequest = require('../models/AIRequest');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();

// إعداد رفع الملفات
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads', req.user.id);
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|csv|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('نوع الملف غير مدعوم'));
    }
  }
});

// معالجة رسالة نصية
router.post('/chat', [
  auth,
  checkSubscriptionLimits,
  logActivity('إرسال رسالة للذكاء الاصطناعي'),
  body('message').trim().isLength({ min: 1, max: 2000 }).withMessage('الرسالة يجب أن تكون بين 1 و 2000 حرف'),
  body('context').optional().isString().withMessage('السياق يجب أن يكون نص')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صحيحة',
        errors: errors.array()
      });
    }

    const { message, context, type = 'general' } = req.body;
    const userId = req.user.id;

    // حفظ الطلب في قاعدة البيانات
    const aiRequest = new AIRequest({
      userId,
      type: 'chat',
      input: {
        message,
        context,
        type
      },
      status: 'processing'
    });

    await aiRequest.save();

    // معالجة الرسالة
    const response = await processAIMessage(message, context, type, userId);

    // تحديث الطلب بالنتيجة
    aiRequest.output = response;
    aiRequest.status = 'completed';
    aiRequest.completedAt = new Date();
    await aiRequest.save();

    // تحديث عداد الطلبات للمستخدم
    await User.findByIdAndUpdate(userId, {
      $inc: {
        'subscription.features.usedRequests': 1,
        'activity.totalRequests': 1
      }
    });

    res.json({
      success: true,
      data: {
        requestId: aiRequest._id,
        response: response,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('خطأ في معالجة رسالة الذكاء الاصطناعي:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في معالجة الرسالة'
    });
  }
});

// تحليل ملف
router.post('/analyze-file', [
  auth,
  checkSubscriptionLimits,
  requireSubscription('basic'),
  upload.single('file'),
  logActivity('تحليل ملف')
], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'لم يتم رفع أي ملف'
      });
    }

    const { analysisType = 'general' } = req.body;
    const userId = req.user.id;

    // حفظ الطلب في قاعدة البيانات
    const aiRequest = new AIRequest({
      userId,
      type: 'file_analysis',
      input: {
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        analysisType
      },
      status: 'processing'
    });

    await aiRequest.save();

    // تحليل الملف
    const analysis = await analyzeFile(req.file, analysisType);

    // تحديث الطلب بالنتيجة
    aiRequest.output = analysis;
    aiRequest.status = 'completed';
    aiRequest.completedAt = new Date();
    await aiRequest.save();

    // تحديث عدادات المستخدم
    await User.findByIdAndUpdate(userId, {
      $inc: {
        'subscription.features.usedRequests': 1,
        'subscription.features.usedUploads': 1,
        'activity.totalRequests': 1
      }
    });

    res.json({
      success: true,
      data: {
        requestId: aiRequest._id,
        analysis: analysis,
        file: {
          name: req.file.originalname,
          size: req.file.size,
          type: req.file.mimetype
        }
      }
    });

  } catch (error) {
    console.error('خطأ في تحليل الملف:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحليل الملف'
    });
  }
});

// توليد كود
router.post('/generate-code', [
  auth,
  checkSubscriptionLimits,
  requireSubscription('basic'),
  logActivity('توليد كود'),
  body('description').trim().isLength({ min: 10, max: 1000 }).withMessage('الوصف يجب أن يكون بين 10 و 1000 حرف'),
  body('language').isIn(['javascript', 'python', 'html', 'css', 'react', 'nodejs', 'php']).withMessage('لغة البرمجة غير مدعومة')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صحيحة',
        errors: errors.array()
      });
    }

    const { description, language, framework, complexity = 'medium' } = req.body;
    const userId = req.user.id;

    // حفظ الطلب
    const aiRequest = new AIRequest({
      userId,
      type: 'code_generation',
      input: {
        description,
        language,
        framework,
        complexity
      },
      status: 'processing'
    });

    await aiRequest.save();

    // توليد الكود
    const generatedCode = await generateCode(description, language, framework, complexity);

    // تحديث الطلب
    aiRequest.output = generatedCode;
    aiRequest.status = 'completed';
    aiRequest.completedAt = new Date();
    await aiRequest.save();

    // تحديث عداد الطلبات
    await User.findByIdAndUpdate(userId, {
      $inc: {
        'subscription.features.usedRequests': 1,
        'activity.totalRequests': 1
      }
    });

    res.json({
      success: true,
      data: {
        requestId: aiRequest._id,
        code: generatedCode,
        language,
        framework
      }
    });

  } catch (error) {
    console.error('خطأ في توليد الكود:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في توليد الكود'
    });
  }
});

// البحث عن وظائف
router.post('/job-search', [
  auth,
  checkSubscriptionLimits,
  logActivity('البحث عن وظائف'),
  body('keywords').trim().isLength({ min: 2, max: 100 }).withMessage('الكلمات المفتاحية يجب أن تكون بين 2 و 100 حرف')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صحيحة',
        errors: errors.array()
      });
    }

    const { keywords, location, experience, jobType = 'all' } = req.body;
    const userId = req.user.id;

    // حفظ الطلب
    const aiRequest = new AIRequest({
      userId,
      type: 'job_search',
      input: {
        keywords,
        location,
        experience,
        jobType
      },
      status: 'processing'
    });

    await aiRequest.save();

    // البحث عن الوظائف
    const jobs = await searchJobs(keywords, location, experience, jobType);

    // تحديث الطلب
    aiRequest.output = { jobs, count: jobs.length };
    aiRequest.status = 'completed';
    aiRequest.completedAt = new Date();
    await aiRequest.save();

    // تحديث عداد الطلبات
    await User.findByIdAndUpdate(userId, {
      $inc: {
        'subscription.features.usedRequests': 1,
        'activity.totalRequests': 1
      }
    });

    res.json({
      success: true,
      data: {
        requestId: aiRequest._id,
        jobs: jobs,
        count: jobs.length,
        searchCriteria: {
          keywords,
          location,
          experience,
          jobType
        }
      }
    });

  } catch (error) {
    console.error('خطأ في البحث عن الوظائف:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في البحث عن الوظائف'
    });
  }
});

// الحصول على تاريخ الطلبات
router.get('/requests', [
  auth,
  logActivity('عرض تاريخ الطلبات')
], async (req, res) => {
  try {
    const { page = 1, limit = 10, type } = req.query;
    const userId = req.user.id;

    const query = { userId };
    if (type) query.type = type;

    const requests = await AIRequest.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-output.fullResponse'); // استبعاد الاستجابات الكاملة لتوفير البيانات

    const total = await AIRequest.countDocuments(query);

    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: requests.length,
          totalRequests: total
        }
      }
    });

  } catch (error) {
    console.error('خطأ في جلب تاريخ الطلبات:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب تاريخ الطلبات'
    });
  }
});

// الحصول على تفاصيل طلب محدد
router.get('/requests/:id', [
  auth,
  logActivity('عرض تفاصيل طلب')
], async (req, res) => {
  try {
    const request = await AIRequest.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'الطلب غير موجود'
      });
    }

    res.json({
      success: true,
      data: request
    });

  } catch (error) {
    console.error('خطأ في جلب تفاصيل الطلب:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب تفاصيل الطلب'
    });
  }
});

// دوال المساعدة
async function processAIMessage(message, context, type, userId) {
  // هنا يمكن إضافة الاتصال بـ OpenAI API أو أي نموذج ذكاء اصطناعي آخر
  
  const responses = {
    general: [
      'مرحباً! كيف يمكنني مساعدتك اليوم؟',
      'أنا هنا لمساعدتك في جميع احتياجاتك التقنية.',
      'يمكنني مساعدتك في تطوير المواقع، البحث عن وظائف، والأتمتة.'
    ],
    technical: [
      'بناءً على سؤالك التقني، إليك الحل المقترح...',
      'هذه مشكلة شائعة في البرمجة، يمكن حلها بالطرق التالية...'
    ],
    business: [
      'من منظور الأعمال، أنصح بالتالي...',
      'هذا قرار استراتيجي مهم، دعني أساعدك في تحليله...'
    ]
  };

  const responseArray = responses[type] || responses.general;
  const randomResponse = responseArray[Math.floor(Math.random() * responseArray.length)];

  // محاكاة تأخير المعالجة
  await new Promise(resolve => setTimeout(resolve, 1500));

  return {
    message: randomResponse,
    type: 'text',
    confidence: 0.95,
    suggestions: [
      'تطوير موقع ويب',
      'البحث عن وظيفة',
      'أتمتة المهام',
      'تحليل البيانات'
    ],
    relatedTopics: [
      'تطوير الويب',
      'الذكاء الاصطناعي',
      'إدارة المشاريع'
    ]
  };
}

async function analyzeFile(file, analysisType) {
  // محاكاة تحليل الملف
  await new Promise(resolve => setTimeout(resolve, 2000));

  return {
    summary: `تم تحليل الملف ${file.originalname} بنجاح`,
    type: analysisType,
    insights: [
      'الملف يحتوي على بيانات منظمة',
      'جودة البيانات عالية',
      'لا توجد أخطاء واضحة'
    ],
    recommendations: [
      'يمكن استخدام هذه البيانات للتحليل المتقدم',
      'ننصح بإجراء تنظيف إضافي للبيانات'
    ],
    metadata: {
      size: file.size,
      type: file.mimetype,
      processedAt: new Date()
    }
  };
}

async function generateCode(description, language, framework, complexity) {
  // محاكاة توليد الكود
  await new Promise(resolve => setTimeout(resolve, 3000));

  const codeTemplates = {
    javascript: `// ${description}\nfunction solution() {\n  // الكود المولد تلقائياً\n  console.log('مرحباً من الكود المولد!');\n}`,
    python: `# ${description}\ndef solution():\n    # الكود المولد تلقائياً\n    print('مرحباً من الكود المولد!')`,
    html: `<!-- ${description} -->\n<div class="generated-content">\n  <h1>المحتوى المولد</h1>\n</div>`
  };

  return {
    code: codeTemplates[language] || codeTemplates.javascript,
    explanation: `هذا الكود تم توليده تلقائياً بناءً على الوصف: ${description}`,
    language,
    framework,
    complexity,
    suggestions: [
      'يمكن تحسين الأداء بإضافة التخزين المؤقت',
      'ننصح بإضافة معالجة الأخطاء',
      'يمكن إضافة اختبارات وحدة'
    ]
  };
}

async function searchJobs(keywords, location, experience, jobType) {
  // محاكاة البحث عن الوظائف
  await new Promise(resolve => setTimeout(resolve, 2000));

  const mockJobs = [
    {
      title: `مطور ${keywords}`,
      company: 'شركة التقنية المتقدمة',
      location: location || 'الرياض',
      salary: '8000 - 12000 ريال',
      experience: experience || 'متوسط',
      type: jobType,
      description: `نبحث عن مطور متخصص في ${keywords}`,
      requirements: [
        `خبرة في ${keywords}`,
        'مهارات تواصل جيدة',
        'القدرة على العمل ضمن فريق'
      ],
      postedDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
    },
    {
      title: `أخصائي ${keywords}`,
      company: 'مؤسسة الابتكار',
      location: location || 'جدة',
      salary: '6000 - 10000 ريال',
      experience: experience || 'مبتدئ',
      type: jobType,
      description: `فرصة ممتازة للعمل في مجال ${keywords}`,
      requirements: [
        `معرفة أساسية في ${keywords}`,
        'شهادة جامعية ذات صلة',
        'رغبة في التعلم والتطوير'
      ],
      postedDate: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000)
    }
  ];

  return mockJobs;
}

module.exports = router;