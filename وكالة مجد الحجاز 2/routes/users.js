// راوتر المستخدمين
const express = require('express');
const { auth, requireOwnership, logActivity } = require('../middleware/auth');
const User = require('../models/User');
const AIRequest = require('../models/AIRequest');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const bcrypt = require('bcryptjs');

const router = express.Router();

// إعداد رفع الصور الشخصية
const avatarStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/avatars');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('نوع الملف غير مدعوم. يُسمح فقط بـ JPEG, JPG, PNG, GIF'));
    }
  }
});

// الحصول على الملف الشخصي
router.get('/profile', [
  auth,
  logActivity('عرض الملف الشخصي')
], async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('projects.collaborators', 'name email avatar')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    // إحصائيات المستخدم
    const stats = await AIRequest.getStatsByUser(user._id);
    const recentRequests = await AIRequest.getRecentRequests(user._id, 5);

    res.json({
      success: true,
      data: {
        user,
        stats,
        recentRequests
      }
    });

  } catch (error) {
    console.error('خطأ في جلب الملف الشخصي:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الملف الشخصي'
    });
  }
});

// تحديث الملف الشخصي
router.put('/profile', [
  auth,
  logActivity('تحديث الملف الشخصي'),
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('الاسم يجب أن يكون بين 2 و 50 حرف'),
  body('bio').optional().trim().isLength({ max: 500 }).withMessage('النبذة يجب ألا تتجاوز 500 حرف'),
  body('phone').optional().isMobilePhone('ar-SA').withMessage('رقم الهاتف غير صحيح'),
  body('website').optional().isURL().withMessage('رابط الموقع غير صحيح'),
  body('location').optional().trim().isLength({ max: 100 }).withMessage('الموقع يجب ألا يتجاوز 100 حرف')
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

    const {
      name,
      bio,
      phone,
      website,
      location,
      skills,
      interests,
      socialLinks
    } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (bio !== undefined) updateData['profile.bio'] = bio;
    if (phone !== undefined) updateData['profile.phone'] = phone;
    if (website !== undefined) updateData['profile.website'] = website;
    if (location !== undefined) updateData['profile.location'] = location;
    if (skills) updateData['profile.skills'] = skills;
    if (interests) updateData['profile.interests'] = interests;
    if (socialLinks) updateData['profile.socialLinks'] = socialLinks;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'تم تحديث الملف الشخصي بنجاح',
      data: user
    });

  } catch (error) {
    console.error('خطأ في تحديث الملف الشخصي:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث الملف الشخصي'
    });
  }
});

// رفع الصورة الشخصية
router.post('/avatar', [
  auth,
  uploadAvatar.single('avatar'),
  logActivity('رفع صورة شخصية')
], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'لم يتم رفع أي صورة'
      });
    }

    // حذف الصورة القديمة إن وجدت
    const user = await User.findById(req.user.id);
    if (user.profile.avatar) {
      const oldAvatarPath = path.join(__dirname, '../uploads/avatars', path.basename(user.profile.avatar));
      try {
        await fs.unlink(oldAvatarPath);
      } catch (error) {
        console.log('لم يتم العثور على الصورة القديمة للحذف');
      }
    }

    // تحديث مسار الصورة الجديدة
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await User.findByIdAndUpdate(req.user.id, {
      'profile.avatar': avatarUrl
    });

    res.json({
      success: true,
      message: 'تم رفع الصورة الشخصية بنجاح',
      data: {
        avatar: avatarUrl
      }
    });

  } catch (error) {
    console.error('خطأ في رفع الصورة الشخصية:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في رفع الصورة الشخصية'
    });
  }
});

// تغيير كلمة المرور
router.put('/password', [
  auth,
  logActivity('تغيير كلمة المرور'),
  body('currentPassword').notEmpty().withMessage('كلمة المرور الحالية مطلوبة'),
  body('newPassword').isLength({ min: 6 }).withMessage('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل')
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

    const { currentPassword, newPassword } = req.body;

    // التحقق من كلمة المرور الحالية
    const user = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور الحالية غير صحيحة'
      });
    }

    // تشفير كلمة المرور الجديدة
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // تحديث كلمة المرور
    await User.findByIdAndUpdate(req.user.id, {
      password: hashedPassword,
      'security.lastPasswordChange': new Date()
    });

    res.json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح'
    });

  } catch (error) {
    console.error('خطأ في تغيير كلمة المرور:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تغيير كلمة المرور'
    });
  }
});

// إدارة التفضيلات
router.put('/preferences', [
  auth,
  logActivity('تحديث التفضيلات')
], async (req, res) => {
  try {
    const {
      language,
      theme,
      notifications,
      privacy,
      aiSettings
    } = req.body;

    const updateData = {};
    if (language) updateData['preferences.language'] = language;
    if (theme) updateData['preferences.theme'] = theme;
    if (notifications) updateData['preferences.notifications'] = notifications;
    if (privacy) updateData['preferences.privacy'] = privacy;
    if (aiSettings) updateData['preferences.aiSettings'] = aiSettings;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('preferences');

    res.json({
      success: true,
      message: 'تم تحديث التفضيلات بنجاح',
      data: user.preferences
    });

  } catch (error) {
    console.error('خطأ في تحديث التفضيلات:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث التفضيلات'
    });
  }
});

// إدارة المشاريع
router.get('/projects', [
  auth,
  logActivity('عرض المشاريع')
], async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('projects')
      .populate('projects.collaborators', 'name email avatar');

    res.json({
      success: true,
      data: user.projects
    });

  } catch (error) {
    console.error('خطأ في جلب المشاريع:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المشاريع'
    });
  }
});

// إضافة مشروع جديد
router.post('/projects', [
  auth,
  logActivity('إضافة مشروع جديد'),
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('اسم المشروع يجب أن يكون بين 2 و 100 حرف'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('وصف المشروع يجب ألا يتجاوز 500 حرف')
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

    const { name, description, type, tags } = req.body;

    const user = await User.findById(req.user.id);
    const newProject = {
      name,
      description,
      type: type || 'general',
      tags: tags || [],
      status: 'active',
      createdAt: new Date()
    };

    user.projects.push(newProject);
    await user.save();

    res.json({
      success: true,
      message: 'تم إضافة المشروع بنجاح',
      data: newProject
    });

  } catch (error) {
    console.error('خطأ في إضافة المشروع:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة المشروع'
    });
  }
});

// تحديث مشروع
router.put('/projects/:projectId', [
  auth,
  logActivity('تحديث مشروع')
], async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, description, status, tags } = req.body;

    const user = await User.findById(req.user.id);
    const project = user.projects.id(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'المشروع غير موجود'
      });
    }

    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (status) project.status = status;
    if (tags) project.tags = tags;
    project.updatedAt = new Date();

    await user.save();

    res.json({
      success: true,
      message: 'تم تحديث المشروع بنجاح',
      data: project
    });

  } catch (error) {
    console.error('خطأ في تحديث المشروع:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث المشروع'
    });
  }
});

// حذف مشروع
router.delete('/projects/:projectId', [
  auth,
  logActivity('حذف مشروع')
], async (req, res) => {
  try {
    const { projectId } = req.params;

    const user = await User.findById(req.user.id);
    const project = user.projects.id(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'المشروع غير موجود'
      });
    }

    user.projects.pull(projectId);
    await user.save();

    res.json({
      success: true,
      message: 'تم حذف المشروع بنجاح'
    });

  } catch (error) {
    console.error('خطأ في حذف المشروع:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف المشروع'
    });
  }
});

// إحصائيات المستخدم
router.get('/stats', [
  auth,
  logActivity('عرض الإحصائيات')
], async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // إحصائيات الطلبات
    const requestStats = await AIRequest.getStatsByUser(req.user.id, startDate, new Date());
    
    // إحصائيات عامة
    const totalRequests = await AIRequest.countDocuments({ userId: req.user.id });
    const completedRequests = await AIRequest.countDocuments({ 
      userId: req.user.id, 
      status: 'completed' 
    });
    const failedRequests = await AIRequest.countDocuments({ 
      userId: req.user.id, 
      status: 'failed' 
    });

    // المستخدم
    const user = await User.findById(req.user.id).select('subscription activity projects');

    res.json({
      success: true,
      data: {
        period: `${days} أيام`,
        requests: {
          total: totalRequests,
          completed: completedRequests,
          failed: failedRequests,
          successRate: totalRequests > 0 ? (completedRequests / totalRequests * 100).toFixed(2) : 0,
          byType: requestStats
        },
        subscription: {
          plan: user.subscription.plan,
          status: user.subscription.status,
          usedRequests: user.subscription.features.usedRequests,
          maxRequests: user.subscription.features.maxRequests,
          usagePercentage: user.subscription.features.maxRequests > 0 ? 
            (user.subscription.features.usedRequests / user.subscription.features.maxRequests * 100).toFixed(2) : 0
        },
        activity: user.activity,
        projects: {
          total: user.projects.length,
          active: user.projects.filter(p => p.status === 'active').length,
          completed: user.projects.filter(p => p.status === 'completed').length
        }
      }
    });

  } catch (error) {
    console.error('خطأ في جلب الإحصائيات:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الإحصائيات'
    });
  }
});

// حذف الحساب
router.delete('/account', [
  auth,
  logActivity('حذف الحساب'),
  body('password').notEmpty().withMessage('كلمة المرور مطلوبة للتأكيد'),
  body('confirmation').equals('DELETE').withMessage('يجب كتابة DELETE للتأكيد')
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

    const { password } = req.body;

    // التحقق من كلمة المرور
    const user = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور غير صحيحة'
      });
    }

    // حذف جميع طلبات المستخدم
    await AIRequest.deleteMany({ userId: req.user.id });

    // حذف الصورة الشخصية
    if (user.profile.avatar) {
      const avatarPath = path.join(__dirname, '../uploads/avatars', path.basename(user.profile.avatar));
      try {
        await fs.unlink(avatarPath);
      } catch (error) {
        console.log('لم يتم العثور على الصورة الشخصية للحذف');
      }
    }

    // حذف المستخدم
    await User.findByIdAndDelete(req.user.id);

    res.json({
      success: true,
      message: 'تم حذف الحساب بنجاح'
    });

  } catch (error) {
    console.error('خطأ في حذف الحساب:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف الحساب'
    });
  }
});

module.exports = router;