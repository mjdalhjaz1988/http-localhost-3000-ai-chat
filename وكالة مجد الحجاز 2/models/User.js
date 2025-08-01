// نموذج المستخدم في قاعدة البيانات
const mongoose = require('mongoose');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'الاسم مطلوب'],
    trim: true,
    minlength: [2, 'الاسم يجب أن يكون أكثر من حرفين'],
    maxlength: [50, 'الاسم يجب أن يكون أقل من 50 حرف']
  },
  email: {
    type: String,
    required: [true, 'البريد الإلكتروني مطلوب'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'البريد الإلكتروني غير صحيح']
  },
  password: {
    type: String,
    required: [true, 'كلمة المرور مطلوبة'],
    minlength: [6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'],
    select: false // لا تظهر كلمة المرور في الاستعلامات العادية
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  profile: {
    avatar: {
      type: String,
      default: function() {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.name)}&background=random`;
      }
    },
    bio: {
      type: String,
      maxlength: [500, 'النبذة الشخصية يجب أن تكون أقل من 500 حرف'],
      default: ''
    },
    skills: [{
      name: String,
      level: {
        type: String,
        enum: ['مبتدئ', 'متوسط', 'متقدم', 'خبير'],
        default: 'مبتدئ'
      }
    }],
    preferences: {
      language: {
        type: String,
        enum: ['ar', 'en'],
        default: 'ar'
      },
      theme: {
        type: String,
        enum: ['light', 'dark'],
        default: 'light'
      },
      notifications: {
        type: Boolean,
        default: true
      },
      aiModel: {
        type: String,
        enum: ['gpt-3.5-turbo', 'gpt-4', 'claude-3'],
        default: 'gpt-3.5-turbo'
      }
    }
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'free'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      default: function() {
        const date = new Date();
        date.setMonth(date.getMonth() + 1); // شهر مجاني
        return date;
      }
    },
    features: {
      aiRequests: {
        type: Number,
        default: 100 // 100 طلب مجاني شهرياً
      },
      usedRequests: {
        type: Number,
        default: 0
      },
      fileUploads: {
        type: Number,
        default: 10 // 10 ملفات مجانية
      },
      usedUploads: {
        type: Number,
        default: 0
      }
    }
  },
  activity: {
    lastLogin: {
      type: Date,
      default: Date.now
    },
    loginCount: {
      type: Number,
      default: 0
    },
    totalRequests: {
      type: Number,
      default: 0
    },
    favoriteFeatures: [{
      feature: String,
      count: {
        type: Number,
        default: 1
      }
    }]
  },
  projects: [{
    name: {
      type: String,
      required: true
    },
    description: String,
    type: {
      type: String,
      enum: ['web', 'mobile', 'ai', 'automation', 'analysis'],
      required: true
    },
    status: {
      type: String,
      enum: ['planning', 'in-progress', 'completed', 'paused'],
      default: 'planning'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    files: [{
      name: String,
      path: String,
      size: Number,
      type: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  }],
  settings: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    dataSharing: {
      type: Boolean,
      default: false
    },
    autoSave: {
      type: Boolean,
      default: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// فهرسة للبحث السريع
userSchema.index({ email: 1 });
userSchema.index({ 'subscription.plan': 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

// Virtual للحصول على عدد المشاريع
userSchema.virtual('projectCount').get(function() {
  return this.projects ? this.projects.length : 0;
});

// Virtual للحصول على نسبة استخدام الطلبات
userSchema.virtual('requestUsagePercentage').get(function() {
  if (!this.subscription.features.aiRequests) return 0;
  return Math.round((this.subscription.features.usedRequests / this.subscription.features.aiRequests) * 100);
});

// Virtual للتحقق من انتهاء الاشتراك
userSchema.virtual('isSubscriptionExpired').get(function() {
  return this.subscription.endDate < new Date();
});

// Middleware قبل الحفظ
userSchema.pre('save', function(next) {
  // تحديث تاريخ آخر تعديل للمشاريع
  if (this.isModified('projects')) {
    this.projects.forEach(project => {
      if (project.isModified()) {
        project.updatedAt = new Date();
      }
    });
  }
  next();
});

// دالة لزيادة عداد الطلبات
userSchema.methods.incrementRequests = function() {
  this.subscription.features.usedRequests += 1;
  this.activity.totalRequests += 1;
  return this.save();
};

// دالة للتحقق من إمكانية إجراء طلب جديد
userSchema.methods.canMakeRequest = function() {
  if (this.subscription.plan === 'enterprise') return true;
  return this.subscription.features.usedRequests < this.subscription.features.aiRequests;
};

// دالة لإضافة مشروع جديد
userSchema.methods.addProject = function(projectData) {
  this.projects.push({
    ...projectData,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  return this.save();
};

// دالة لتحديث إعدادات المستخدم
userSchema.methods.updatePreferences = function(preferences) {
  Object.assign(this.profile.preferences, preferences);
  return this.save();
};

// دالة لإعادة تعيين عدادات الاشتراك الشهرية
userSchema.methods.resetMonthlyLimits = function() {
  this.subscription.features.usedRequests = 0;
  this.subscription.features.usedUploads = 0;
  return this.save();
};

module.exports = mongoose.model('User', userSchema);