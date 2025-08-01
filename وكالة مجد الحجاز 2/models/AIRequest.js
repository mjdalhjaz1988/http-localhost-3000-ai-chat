// نموذج طلبات الذكاء الاصطناعي
const mongoose = require('mongoose');

const aiRequestSchema = new mongoose.Schema({
  // معرف المستخدم
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // نوع الطلب
  type: {
    type: String,
    required: true,
    enum: [
      'chat',
      'file_analysis',
      'code_generation',
      'job_search',
      'automation',
      'data_analysis',
      'translation',
      'content_creation',
      'image_generation',
      'voice_processing'
    ],
    index: true
  },
  
  // بيانات الإدخال
  input: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  
  // بيانات الإخراج
  output: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // حالة الطلب
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  // رسالة الخطأ (في حالة الفشل)
  errorMessage: {
    type: String
  },
  
  // الأولوية
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // معلومات المعالجة
  processing: {
    startedAt: Date,
    completedAt: Date,
    processingTime: Number, // بالميلي ثانية
    retryCount: {
      type: Number,
      default: 0
    },
    lastRetryAt: Date
  },
  
  // معلومات الاستخدام
  usage: {
    tokensUsed: Number,
    costEstimate: Number,
    modelUsed: String,
    apiCalls: Number
  },
  
  // التقييم والملاحظات
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    helpful: Boolean,
    reportedIssue: String
  },
  
  // معلومات إضافية
  metadata: {
    userAgent: String,
    ipAddress: String,
    sessionId: String,
    requestSource: {
      type: String,
      enum: ['web', 'mobile', 'api', 'bot'],
      default: 'web'
    },
    language: {
      type: String,
      default: 'ar'
    },
    timezone: String
  },
  
  // العلامات والتصنيفات
  tags: [{
    type: String,
    trim: true
  }],
  
  // مشاركة الطلب
  shared: {
    isPublic: {
      type: Boolean,
      default: false
    },
    sharedWith: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      permission: {
        type: String,
        enum: ['view', 'edit', 'admin'],
        default: 'view'
      },
      sharedAt: {
        type: Date,
        default: Date.now
      }
    }],
    publicUrl: String
  },
  
  // الأرشفة والحذف
  archived: {
    type: Boolean,
    default: false
  },
  
  archivedAt: Date,
  
  // تواريخ النظام
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// الفهارس المركبة
aiRequestSchema.index({ userId: 1, createdAt: -1 });
aiRequestSchema.index({ type: 1, status: 1 });
aiRequestSchema.index({ status: 1, priority: 1, createdAt: 1 });
aiRequestSchema.index({ 'metadata.sessionId': 1 });
aiRequestSchema.index({ tags: 1 });
aiRequestSchema.index({ archived: 1, createdAt: -1 });

// الحقول الافتراضية
aiRequestSchema.virtual('duration').get(function() {
  if (this.processing.startedAt && this.processing.completedAt) {
    return this.processing.completedAt - this.processing.startedAt;
  }
  return null;
});

aiRequestSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

aiRequestSchema.virtual('isFailed').get(function() {
  return this.status === 'failed';
});

aiRequestSchema.virtual('isProcessing').get(function() {
  return this.status === 'processing';
});

aiRequestSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt;
});

// الطرق الثابتة
aiRequestSchema.statics.getStatsByUser = function(userId, startDate, endDate) {
  const match = { userId };
  if (startDate && endDate) {
    match.createdAt = { $gte: startDate, $lte: endDate };
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        failed: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        },
        avgProcessingTime: {
          $avg: '$processing.processingTime'
        },
        totalTokensUsed: {
          $sum: '$usage.tokensUsed'
        },
        totalCost: {
          $sum: '$usage.costEstimate'
        }
      }
    }
  ]);
};

aiRequestSchema.statics.getRecentRequests = function(userId, limit = 10) {
  return this.find({ userId, archived: false })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('type status createdAt processing.processingTime feedback.rating');
};

aiRequestSchema.statics.getPopularTypes = function(days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        avgRating: { $avg: '$feedback.rating' }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
};

// طرق المثيل
aiRequestSchema.methods.markAsStarted = function() {
  this.status = 'processing';
  this.processing.startedAt = new Date();
  return this.save();
};

aiRequestSchema.methods.markAsCompleted = function(output, usage = {}) {
  this.status = 'completed';
  this.output = output;
  this.processing.completedAt = new Date();
  
  if (this.processing.startedAt) {
    this.processing.processingTime = this.processing.completedAt - this.processing.startedAt;
  }
  
  if (usage) {
    this.usage = { ...this.usage, ...usage };
  }
  
  return this.save();
};

aiRequestSchema.methods.markAsFailed = function(errorMessage) {
  this.status = 'failed';
  this.errorMessage = errorMessage;
  this.processing.completedAt = new Date();
  
  if (this.processing.startedAt) {
    this.processing.processingTime = this.processing.completedAt - this.processing.startedAt;
  }
  
  return this.save();
};

aiRequestSchema.methods.retry = function() {
  this.processing.retryCount += 1;
  this.processing.lastRetryAt = new Date();
  this.status = 'pending';
  this.errorMessage = undefined;
  return this.save();
};

aiRequestSchema.methods.addFeedback = function(rating, comment, helpful) {
  this.feedback = {
    rating,
    comment,
    helpful,
    submittedAt: new Date()
  };
  return this.save();
};

aiRequestSchema.methods.shareWith = function(userId, permission = 'view') {
  const existingShare = this.shared.sharedWith.find(
    share => share.userId.toString() === userId.toString()
  );
  
  if (existingShare) {
    existingShare.permission = permission;
  } else {
    this.shared.sharedWith.push({
      userId,
      permission,
      sharedAt: new Date()
    });
  }
  
  return this.save();
};

aiRequestSchema.methods.makePublic = function() {
  this.shared.isPublic = true;
  this.shared.publicUrl = `public/${this._id}`;
  return this.save();
};

aiRequestSchema.methods.archive = function() {
  this.archived = true;
  this.archivedAt = new Date();
  return this.save();
};

// الخطافات (Hooks)
aiRequestSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

aiRequestSchema.pre('find', function() {
  this.where({ archived: { $ne: true } });
});

aiRequestSchema.pre('findOne', function() {
  this.where({ archived: { $ne: true } });
});

// التحقق من صحة البيانات
aiRequestSchema.pre('save', function(next) {
  // التحقق من أن الإدخال ليس فارغاً
  if (!this.input || Object.keys(this.input).length === 0) {
    return next(new Error('بيانات الإدخال مطلوبة'));
  }
  
  // التحقق من حالة المعالجة
  if (this.status === 'completed' && !this.output) {
    return next(new Error('بيانات الإخراج مطلوبة للطلبات المكتملة'));
  }
  
  // التحقق من رسالة الخطأ
  if (this.status === 'failed' && !this.errorMessage) {
    return next(new Error('رسالة الخطأ مطلوبة للطلبات الفاشلة'));
  }
  
  next();
});

// إضافة طرق البحث
aiRequestSchema.statics.searchRequests = function(userId, query, options = {}) {
  const {
    type,
    status,
    startDate,
    endDate,
    tags,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = -1
  } = options;
  
  const searchQuery = { userId };
  
  if (type) searchQuery.type = type;
  if (status) searchQuery.status = status;
  if (tags && tags.length > 0) searchQuery.tags = { $in: tags };
  
  if (startDate || endDate) {
    searchQuery.createdAt = {};
    if (startDate) searchQuery.createdAt.$gte = startDate;
    if (endDate) searchQuery.createdAt.$lte = endDate;
  }
  
  if (query) {
    searchQuery.$or = [
      { 'input.message': { $regex: query, $options: 'i' } },
      { 'input.description': { $regex: query, $options: 'i' } },
      { 'input.keywords': { $regex: query, $options: 'i' } },
      { tags: { $regex: query, $options: 'i' } }
    ];
  }
  
  const sort = {};
  sort[sortBy] = sortOrder;
  
  return this.find(searchQuery)
    .sort(sort)
    .limit(limit)
    .skip((page - 1) * limit)
    .populate('userId', 'name email');
};

module.exports = mongoose.model('AIRequest', aiRequestSchema);