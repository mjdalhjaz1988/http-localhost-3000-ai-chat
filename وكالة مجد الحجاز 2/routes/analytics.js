// راوتر التحليلات والإحصائيات
const express = require('express');
const { auth, requireRole, logActivity } = require('../middleware/auth');
const User = require('../models/User');
const AIRequest = require('../models/AIRequest');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// إحصائيات عامة للنظام (للمديرين فقط)
router.get('/system', [
  auth,
  requireRole('admin'),
  logActivity('عرض إحصائيات النظام')
], async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    // إحصائيات المستخدمين
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({
      'activity.lastLogin': { $gte: startDate }
    });
    const newUsers = await User.countDocuments({
      createdAt: { $gte: startDate }
    });

    // إحصائيات الطلبات
    const totalRequests = await AIRequest.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    });
    const completedRequests = await AIRequest.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
      status: 'completed'
    });
    const failedRequests = await AIRequest.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
      status: 'failed'
    });

    // إحصائيات حسب النوع
    const requestsByType = await AIRequest.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          avgProcessingTime: {
            $avg: '$processing.processingTime'
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // إحصائيات الاشتراكات
    const subscriptionStats = await User.aggregate([
      {
        $group: {
          _id: '$subscription.plan',
          count: { $sum: 1 },
          totalRevenue: {
            $sum: '$subscription.billing.amount'
          }
        }
      }
    ]);

    // إحصائيات يومية للفترة المحددة
    const dailyStats = await AIRequest.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          requests: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        period: `${days} أيام`,
        users: {
          total: totalUsers,
          active: activeUsers,
          new: newUsers,
          activePercentage: totalUsers > 0 ? (activeUsers / totalUsers * 100).toFixed(2) : 0
        },
        requests: {
          total: totalRequests,
          completed: completedRequests,
          failed: failedRequests,
          successRate: totalRequests > 0 ? (completedRequests / totalRequests * 100).toFixed(2) : 0,
          byType: requestsByType
        },
        subscriptions: subscriptionStats,
        dailyTrends: dailyStats
      }
    });

  } catch (error) {
    console.error('خطأ في جلب إحصائيات النظام:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب إحصائيات النظام'
    });
  }
});

// إحصائيات الأداء
router.get('/performance', [
  auth,
  requireRole('admin'),
  logActivity('عرض إحصائيات الأداء')
], async (req, res) => {
  try {
    const { period = '7' } = req.query;
    const days = parseInt(period);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // متوسط أوقات المعالجة
    const avgProcessingTimes = await AIRequest.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: 'completed',
          'processing.processingTime': { $exists: true }
        }
      },
      {
        $group: {
          _id: '$type',
          avgTime: { $avg: '$processing.processingTime' },
          minTime: { $min: '$processing.processingTime' },
          maxTime: { $max: '$processing.processingTime' },
          count: { $sum: 1 }
        }
      }
    ]);

    // معدلات الخطأ
    const errorRates = await AIRequest.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: 1 },
          errors: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 1,
          total: 1,
          errors: 1,
          errorRate: {
            $multiply: [
              { $divide: ['$errors', '$total'] },
              100
            ]
          }
        }
      }
    ]);

    // أكثر الأخطاء شيوعاً
    const commonErrors = await AIRequest.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: 'failed',
          errorMessage: { $exists: true }
        }
      },
      {
        $group: {
          _id: '$errorMessage',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // استخدام الموارد
    const resourceUsage = await AIRequest.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          'usage.tokensUsed': { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          totalTokens: { $sum: '$usage.tokensUsed' },
          totalCost: { $sum: '$usage.costEstimate' },
          avgTokensPerRequest: { $avg: '$usage.tokensUsed' },
          requests: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        period: `${days} أيام`,
        processingTimes: avgProcessingTimes,
        errorRates: errorRates,
        commonErrors: commonErrors,
        resourceUsage: resourceUsage[0] || {
          totalTokens: 0,
          totalCost: 0,
          avgTokensPerRequest: 0,
          requests: 0
        }
      }
    });

  } catch (error) {
    console.error('خطأ في جلب إحصائيات الأداء:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب إحصائيات الأداء'
    });
  }
});

// إحصائيات المستخدمين النشطين
router.get('/users/active', [
  auth,
  requireRole('admin'),
  logActivity('عرض المستخدمين النشطين')
], async (req, res) => {
  try {
    const { period = '24' } = req.query; // بالساعات
    const hours = parseInt(period);
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    // المستخدمون النشطون
    const activeUsers = await User.find({
      'activity.lastLogin': { $gte: startDate }
    })
    .select('name email activity.lastLogin activity.totalRequests subscription.plan')
    .sort({ 'activity.lastLogin': -1 })
    .limit(50);

    // إحصائيات النشاط حسب الساعة
    const hourlyActivity = await AIRequest.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            hour: { $hour: '$createdAt' },
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            }
          },
          requests: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          _id: 1,
          requests: 1,
          uniqueUsers: { $size: '$uniqueUsers' }
        }
      },
      { $sort: { '_id.date': 1, '_id.hour': 1 } }
    ]);

    // أكثر المستخدمين نشاطاً
    const topUsers = await AIRequest.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$userId',
          requestCount: { $sum: 1 },
          lastRequest: { $max: '$createdAt' }
        }
      },
      { $sort: { requestCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $project: {
          requestCount: 1,
          lastRequest: 1,
          'user.name': 1,
          'user.email': 1,
          'user.subscription.plan': 1
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        period: `${hours} ساعة`,
        activeUsers: activeUsers,
        hourlyActivity: hourlyActivity,
        topUsers: topUsers,
        summary: {
          totalActiveUsers: activeUsers.length,
          totalRequests: hourlyActivity.reduce((sum, item) => sum + item.requests, 0)
        }
      }
    });

  } catch (error) {
    console.error('خطأ في جلب إحصائيات المستخدمين النشطين:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب إحصائيات المستخدمين النشطين'
    });
  }
});

// تقرير مفصل
router.post('/report', [
  auth,
  requireRole('admin'),
  logActivity('إنشاء تقرير مفصل'),
  body('startDate').isISO8601().withMessage('تاريخ البداية غير صحيح'),
  body('endDate').isISO8601().withMessage('تاريخ النهاية غير صحيح'),
  body('reportType').isIn(['users', 'requests', 'performance', 'revenue']).withMessage('نوع التقرير غير صحيح')
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

    const { startDate, endDate, reportType, filters = {} } = req.body;
    const start = new Date(startDate);
    const end = new Date(endDate);

    let reportData = {};

    switch (reportType) {
      case 'users':
        reportData = await generateUsersReport(start, end, filters);
        break;
      case 'requests':
        reportData = await generateRequestsReport(start, end, filters);
        break;
      case 'performance':
        reportData = await generatePerformanceReport(start, end, filters);
        break;
      case 'revenue':
        reportData = await generateRevenueReport(start, end, filters);
        break;
    }

    res.json({
      success: true,
      data: {
        reportType,
        period: {
          start: startDate,
          end: endDate
        },
        generatedAt: new Date(),
        ...reportData
      }
    });

  } catch (error) {
    console.error('خطأ في إنشاء التقرير:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء التقرير'
    });
  }
});

// دوال مساعدة لإنشاء التقارير
async function generateUsersReport(startDate, endDate, filters) {
  const matchQuery = {
    createdAt: { $gte: startDate, $lte: endDate }
  };

  if (filters.plan) matchQuery['subscription.plan'] = filters.plan;
  if (filters.status) matchQuery['subscription.status'] = filters.status;

  const users = await User.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: {
          plan: '$subscription.plan',
          month: { $month: '$createdAt' },
          year: { $year: '$createdAt' }
        },
        count: { $sum: 1 },
        totalRevenue: { $sum: '$subscription.billing.amount' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  const totalUsers = await User.countDocuments(matchQuery);
  const activeUsers = await User.countDocuments({
    ...matchQuery,
    'activity.lastLogin': { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
  });

  return {
    totalUsers,
    activeUsers,
    usersByPlan: users,
    retentionRate: totalUsers > 0 ? (activeUsers / totalUsers * 100).toFixed(2) : 0
  };
}

async function generateRequestsReport(startDate, endDate, filters) {
  const matchQuery = {
    createdAt: { $gte: startDate, $lte: endDate }
  };

  if (filters.type) matchQuery.type = filters.type;
  if (filters.status) matchQuery.status = filters.status;

  const requests = await AIRequest.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: {
          type: '$type',
          status: '$status',
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          }
        },
        count: { $sum: 1 },
        avgProcessingTime: { $avg: '$processing.processingTime' },
        totalTokens: { $sum: '$usage.tokensUsed' }
      }
    },
    { $sort: { '_id.date': 1 } }
  ]);

  const totalRequests = await AIRequest.countDocuments(matchQuery);
  const successfulRequests = await AIRequest.countDocuments({
    ...matchQuery,
    status: 'completed'
  });

  return {
    totalRequests,
    successfulRequests,
    successRate: totalRequests > 0 ? (successfulRequests / totalRequests * 100).toFixed(2) : 0,
    requestsByTypeAndDate: requests
  };
}

async function generatePerformanceReport(startDate, endDate, filters) {
  const matchQuery = {
    createdAt: { $gte: startDate, $lte: endDate },
    status: 'completed'
  };

  if (filters.type) matchQuery.type = filters.type;

  const performance = await AIRequest.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$type',
        avgProcessingTime: { $avg: '$processing.processingTime' },
        minProcessingTime: { $min: '$processing.processingTime' },
        maxProcessingTime: { $max: '$processing.processingTime' },
        totalRequests: { $sum: 1 },
        avgTokensUsed: { $avg: '$usage.tokensUsed' }
      }
    }
  ]);

  return {
    performanceByType: performance,
    overallMetrics: {
      totalProcessedRequests: performance.reduce((sum, item) => sum + item.totalRequests, 0),
      avgProcessingTime: performance.reduce((sum, item) => sum + item.avgProcessingTime, 0) / performance.length
    }
  };
}

async function generateRevenueReport(startDate, endDate, filters) {
  const matchQuery = {
    'subscription.billing.paidAt': { $gte: startDate, $lte: endDate }
  };

  if (filters.plan) matchQuery['subscription.plan'] = filters.plan;

  const revenue = await User.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: {
          plan: '$subscription.plan',
          month: { $month: '$subscription.billing.paidAt' },
          year: { $year: '$subscription.billing.paidAt' }
        },
        totalRevenue: { $sum: '$subscription.billing.amount' },
        userCount: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  const totalRevenue = revenue.reduce((sum, item) => sum + item.totalRevenue, 0);
  const totalSubscriptions = revenue.reduce((sum, item) => sum + item.userCount, 0);

  return {
    totalRevenue,
    totalSubscriptions,
    avgRevenuePerUser: totalSubscriptions > 0 ? (totalRevenue / totalSubscriptions).toFixed(2) : 0,
    revenueByPlan: revenue
  };
}

module.exports = router;