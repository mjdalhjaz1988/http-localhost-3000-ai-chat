// Middleware للمصادقة والتحقق من التوكن
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// التحقق من صحة التوكن
const auth = async (req, res, next) => {
  try {
    // الحصول على التوكن من الهيدر
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.header('x-auth-token');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'لا يوجد توكن، الوصول مرفوض'
      });
    }

    // التحقق من صحة التوكن
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // البحث عن المستخدم
    const user = await User.findById(decoded.user.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    // التحقق من أن الحساب نشط
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'الحساب غير نشط'
      });
    }

    // إضافة بيانات المستخدم إلى الطلب
    req.user = {
      id: user._id,
      email: user.email,
      role: user.role,
      subscription: user.subscription
    };
    
    next();
  } catch (error) {
    console.error('خطأ في التحقق من التوكن:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'توكن غير صحيح'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'انتهت صلاحية التوكن'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'خطأ في السيرفر'
    });
  }
};

// التحقق من صلاحيات الإدارة
const adminAuth = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'الوصول مرفوض - صلاحيات إدارية مطلوبة'
    });
  }
  next();
};

// التحقق من صلاحيات المشرف أو الإدارة
const moderatorAuth = (req, res, next) => {
  if (!['admin', 'moderator'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'الوصول مرفوض - صلاحيات إشراف مطلوبة'
    });
  }
  next();
};

// التحقق من حدود الاشتراك
const checkSubscriptionLimits = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    // التحقق من انتهاء الاشتراك
    if (user.isSubscriptionExpired && user.subscription.plan !== 'free') {
      return res.status(403).json({
        success: false,
        message: 'انتهت صلاحية الاشتراك',
        code: 'SUBSCRIPTION_EXPIRED'
      });
    }

    // التحقق من حدود الطلبات
    if (!user.canMakeRequest()) {
      return res.status(429).json({
        success: false,
        message: 'تم تجاوز الحد الأقصى للطلبات الشهرية',
        code: 'LIMIT_EXCEEDED',
        limits: {
          total: user.subscription.features.aiRequests,
          used: user.subscription.features.usedRequests,
          remaining: user.subscription.features.aiRequests - user.subscription.features.usedRequests
        }
      });
    }

    // إضافة بيانات الاشتراك إلى الطلب
    req.subscription = user.subscription;
    next();
  } catch (error) {
    console.error('خطأ في التحقق من حدود الاشتراك:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في السيرفر'
    });
  }
};

// التحقق من نوع الاشتراك المطلوب
const requireSubscription = (requiredPlan) => {
  const planHierarchy = {
    'free': 0,
    'basic': 1,
    'premium': 2,
    'enterprise': 3
  };

  return (req, res, next) => {
    const userPlanLevel = planHierarchy[req.user.subscription.plan] || 0;
    const requiredPlanLevel = planHierarchy[requiredPlan] || 0;

    if (userPlanLevel < requiredPlanLevel) {
      return res.status(403).json({
        success: false,
        message: `هذه الميزة تتطلب اشتراك ${requiredPlan} أو أعلى`,
        code: 'UPGRADE_REQUIRED',
        currentPlan: req.user.subscription.plan,
        requiredPlan: requiredPlan
      });
    }

    next();
  };
};

// Middleware للتحقق من ملكية المورد
const checkResourceOwnership = (resourceModel, resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdParam];
      const resource = await resourceModel.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'المورد غير موجود'
        });
      }

      // التحقق من الملكية أو الصلاحيات الإدارية
      if (resource.userId?.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'ليس لديك صلاحية للوصول إلى هذا المورد'
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error('خطأ في التحقق من ملكية المورد:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في السيرفر'
      });
    }
  };
};

// Middleware للتسجيل والمراقبة
const logActivity = (action) => {
  return async (req, res, next) => {
    try {
      // تسجيل النشاط
      console.log(`[${new Date().toISOString()}] المستخدم ${req.user.id} قام بـ ${action}`);
      
      // يمكن إضافة تسجيل في قاعدة البيانات هنا
      
      next();
    } catch (error) {
      console.error('خطأ في تسجيل النشاط:', error);
      next(); // المتابعة حتى لو فشل التسجيل
    }
  };
};

module.exports = {
  auth,
  adminAuth,
  moderatorAuth,
  checkSubscriptionLimits,
  requireSubscription,
  checkResourceOwnership,
  logActivity
};