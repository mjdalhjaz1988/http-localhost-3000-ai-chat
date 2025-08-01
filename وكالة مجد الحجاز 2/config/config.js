// ملف التكوين الرئيسي للنظام
require('dotenv').config();

const config = {
  // إعدادات الخادم
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
    environment: process.env.NODE_ENV || 'development',
    cors: {
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }
  },

  // إعدادات قاعدة البيانات
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_agency',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,
      bufferCommands: false
    }
  },

  // إعدادات JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    issuer: process.env.JWT_ISSUER || 'ai-agency',
    audience: process.env.JWT_AUDIENCE || 'ai-agency-users'
  },

  // إعدادات الذكاء الاصطناعي
  ai: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 4000,
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
      timeout: parseInt(process.env.OPENAI_TIMEOUT) || 30000
    },
    claude: {
      apiKey: process.env.CLAUDE_API_KEY,
      model: process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229',
      maxTokens: parseInt(process.env.CLAUDE_MAX_TOKENS) || 4000
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || 'gemini-pro'
    },
    rateLimit: {
      windowMs: parseInt(process.env.AI_RATE_LIMIT_WINDOW) || 60000, // 1 دقيقة
      maxRequests: parseInt(process.env.AI_RATE_LIMIT_MAX) || 10
    }
  },

  // إعدادات رفع الملفات
  upload: {
    path: process.env.UPLOAD_PATH || './uploads',
    maxSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    allowedTypes: {
      images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      documents: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      code: ['text/plain', 'application/javascript', 'text/html', 'text/css']
    },
    avatarSize: {
      width: 200,
      height: 200,
      quality: 80
    }
  },

  // إعدادات البريد الإلكتروني
  email: {
    service: process.env.EMAIL_SERVICE || 'gmail',
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    from: process.env.EMAIL_FROM || 'noreply@ai-agency.com',
    templates: {
      welcome: 'welcome',
      resetPassword: 'reset-password',
      subscription: 'subscription-update'
    }
  },

  // إعدادات الأمان
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    sessionSecret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
    rateLimiting: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 دقيقة
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX) || 100,
      skipSuccessfulRequests: true
    },
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https://api.openai.com']
        }
      }
    }
  },

  // إعدادات الاشتراكات
  subscriptions: {
    plans: {
      free: {
        name: 'مجاني',
        price: 0,
        currency: 'USD',
        limits: {
          requestsPerMonth: 50,
          maxFileSize: 5 * 1024 * 1024, // 5MB
          features: ['basic_ai', 'text_processing']
        }
      },
      basic: {
        name: 'أساسي',
        price: 9.99,
        currency: 'USD',
        limits: {
          requestsPerMonth: 500,
          maxFileSize: 25 * 1024 * 1024, // 25MB
          features: ['basic_ai', 'text_processing', 'file_analysis', 'code_generation']
        }
      },
      pro: {
        name: 'احترافي',
        price: 29.99,
        currency: 'USD',
        limits: {
          requestsPerMonth: 2000,
          maxFileSize: 100 * 1024 * 1024, // 100MB
          features: ['basic_ai', 'text_processing', 'file_analysis', 'code_generation', 'advanced_ai', 'priority_support']
        }
      },
      enterprise: {
        name: 'مؤسسي',
        price: 99.99,
        currency: 'USD',
        limits: {
          requestsPerMonth: -1, // غير محدود
          maxFileSize: 500 * 1024 * 1024, // 500MB
          features: ['all_features', 'custom_models', 'dedicated_support', 'api_access']
        }
      }
    },
    stripe: {
      publicKey: process.env.STRIPE_PUBLIC_KEY,
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
    }
  },

  // إعدادات التحليلات
  analytics: {
    enabled: process.env.ANALYTICS_ENABLED === 'true',
    googleAnalytics: {
      trackingId: process.env.GA_TRACKING_ID
    },
    mixpanel: {
      token: process.env.MIXPANEL_TOKEN
    },
    retention: {
      days: parseInt(process.env.ANALYTICS_RETENTION_DAYS) || 90
    }
  },

  // إعدادات التخزين السحابي
  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local', // local, aws, gcp, azure
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
      bucket: process.env.AWS_S3_BUCKET
    },
    gcp: {
      projectId: process.env.GCP_PROJECT_ID,
      keyFilename: process.env.GCP_KEY_FILENAME,
      bucket: process.env.GCP_STORAGE_BUCKET
    },
    azure: {
      accountName: process.env.AZURE_STORAGE_ACCOUNT,
      accountKey: process.env.AZURE_STORAGE_KEY,
      containerName: process.env.AZURE_CONTAINER_NAME
    }
  },

  // إعدادات التسجيل
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
    file: {
      enabled: process.env.LOG_FILE_ENABLED === 'true',
      path: process.env.LOG_FILE_PATH || './logs',
      maxSize: process.env.LOG_MAX_SIZE || '10m',
      maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5
    },
    database: {
      enabled: process.env.LOG_DB_ENABLED === 'true',
      collection: 'logs'
    }
  },

  // إعدادات التطبيق
  app: {
    name: 'وكالة الذكاء الاصطناعي',
    version: '1.0.0',
    description: 'منصة متقدمة للذكاء الاصطناعي مع واجهة مستقبلية',
    author: 'AI Agency Team',
    website: process.env.APP_WEBSITE || 'https://ai-agency.com',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@ai-agency.com',
    features: {
      selfHealing: process.env.SELF_HEALING_ENABLED === 'true',
      autoUpdates: process.env.AUTO_UPDATES_ENABLED === 'true',
      realTimeSync: process.env.REALTIME_SYNC_ENABLED === 'true',
      multiDevice: process.env.MULTI_DEVICE_ENABLED === 'true'
    }
  },

  // إعدادات SEO ومحركات البحث
  seo: {
    sitemap: {
      enabled: true,
      path: '/sitemap.xml',
      changefreq: 'daily',
      priority: 0.8
    },
    robots: {
      enabled: true,
      path: '/robots.txt',
      allow: ['/', '/api/public'],
      disallow: ['/api/private', '/admin']
    },
    meta: {
      title: 'وكالة الذكاء الاصطناعي - منصة متقدمة للذكاء الاصطناعي',
      description: 'منصة متطورة للذكاء الاصطناعي مع واجهة مستقبلية تحاكي الخيال العلمي. احصل على حلول ذكية لجميع احتياجاتك التقنية.',
      keywords: 'ذكاء اصطناعي, AI, تقنية, مستقبل, خيال علمي, برمجة, تطوير',
      author: 'AI Agency Team',
      robots: 'index, follow',
      canonical: process.env.APP_WEBSITE || 'https://ai-agency.com'
    },
    structured: {
      organization: {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'وكالة الذكاء الاصطناعي',
        url: process.env.APP_WEBSITE || 'https://ai-agency.com',
        logo: `${process.env.APP_WEBSITE || 'https://ai-agency.com'}/logo.png`,
        description: 'منصة متطورة للذكاء الاصطناعي مع واجهة مستقبلية'
      }
    }
  },

  // إعدادات الواجهة المستقبلية
  ui: {
    theme: {
      primary: '#00d4ff', // أزرق سايبر
      secondary: '#ff006e', // وردي نيون
      accent: '#8338ec', // بنفسجي
      background: '#0a0a0a', // أسود عميق
      surface: '#1a1a1a', // رمادي داكن
      text: '#ffffff', // أبيض
      success: '#00ff88', // أخضر نيون
      warning: '#ffaa00', // برتقالي
      error: '#ff3366' // أحمر نيون
    },
    animations: {
      enabled: true,
      duration: 300,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    },
    effects: {
      particles: true,
      hologram: true,
      glitch: true,
      neon: true,
      matrix: true
    },
    layout: {
      sidebar: {
        width: 280,
        collapsible: true,
        position: 'left'
      },
      header: {
        height: 64,
        transparent: true,
        blur: true
      },
      footer: {
        height: 48,
        minimal: true
      }
    }
  },

  // إعدادات الأداء
  performance: {
    cache: {
      enabled: process.env.CACHE_ENABLED === 'true',
      ttl: parseInt(process.env.CACHE_TTL) || 3600, // ثانية
      maxSize: parseInt(process.env.CACHE_MAX_SIZE) || 100 // MB
    },
    compression: {
      enabled: true,
      level: 6,
      threshold: 1024
    },
    clustering: {
      enabled: process.env.CLUSTERING_ENABLED === 'true',
      workers: parseInt(process.env.CLUSTER_WORKERS) || require('os').cpus().length
    }
  },

  // إعدادات المراقبة
  monitoring: {
    healthCheck: {
      enabled: true,
      interval: 30000, // 30 ثانية
      timeout: 5000 // 5 ثواني
    },
    metrics: {
      enabled: process.env.METRICS_ENABLED === 'true',
      endpoint: '/metrics',
      interval: 10000 // 10 ثواني
    },
    alerts: {
      enabled: process.env.ALERTS_ENABLED === 'true',
      webhook: process.env.ALERTS_WEBHOOK,
      thresholds: {
        cpu: 80, // %
        memory: 85, // %
        disk: 90, // %
        responseTime: 2000 // ms
      }
    }
  }
};

// التحقق من المتغيرات المطلوبة
const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'OPENAI_API_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0 && config.server.environment === 'production') {
  console.error('متغيرات البيئة المطلوبة مفقودة:', missingVars);
  process.exit(1);
}

// دالة للحصول على التكوين حسب البيئة
config.getConfig = function(environment = null) {
  const env = environment || config.server.environment;
  
  // تخصيص الإعدادات حسب البيئة
  if (env === 'development') {
    config.logging.level = 'debug';
    config.security.rateLimiting.maxRequests = 1000;
    config.ai.rateLimit.maxRequests = 50;
  } else if (env === 'production') {
    config.logging.level = 'warn';
    config.security.rateLimiting.maxRequests = 100;
    config.ai.rateLimit.maxRequests = 10;
  }
  
  return config;
};

// دالة للتحقق من صحة التكوين
config.validate = function() {
  const errors = [];
  
  // التحقق من إعدادات قاعدة البيانات
  if (!config.database.uri) {
    errors.push('رابط قاعدة البيانات مطلوب');
  }
  
  // التحقق من إعدادات JWT
  if (!config.jwt.secret || config.jwt.secret.length < 32) {
    errors.push('مفتاح JWT يجب أن يكون 32 حرف على الأقل');
  }
  
  // التحقق من إعدادات الذكاء الاصطناعي
  if (!config.ai.openai.apiKey) {
    errors.push('مفتاح OpenAI API مطلوب');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = config;