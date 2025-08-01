// وكالة الذكاء الاصطناعي - السيرفر الرئيسي
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// استيراد الراوتر
const authRoutes = require('./routes/auth');
const aiRoutes = require('./routes/ai');
const userRoutes = require('./routes/user');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// إعدادات الأمان
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

// معدل الطلبات
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100, // حد أقصى 100 طلب لكل IP
  message: {
    error: 'تم تجاوز الحد الأقصى للطلبات، يرجى المحاولة لاحقاً'
  }
});

app.use(limiter);
app.use(compression());
app.use(morgan('combined'));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// خدمة الملفات الثابتة
app.use(express.static(path.join(__dirname, 'public')));

// اتصال قاعدة البيانات
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_agency';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
  } catch (error) {
    console.error('❌ خطأ في الاتصال بقاعدة البيانات:', error.message);
    process.exit(1);
  }
};

// الراوتر الرئيسي
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/user', userRoutes);
app.use('/api/analytics', analyticsRoutes);

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// معالجة الأخطاء العامة
app.use((err, req, res, next) => {
  console.error('خطأ في السيرفر:', err.stack);
  res.status(500).json({
    success: false,
    message: 'حدث خطأ داخلي في السيرفر',
    error: process.env.NODE_ENV === 'development' ? err.message : 'خطأ داخلي'
  });
});

// معالجة الصفحات غير الموجودة
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'الصفحة المطلوبة غير موجودة'
  });
});

// Socket.IO للاتصال المباشر
io.on('connection', (socket) => {
  console.log('🔗 مستخدم جديد متصل:', socket.id);
  
  // انضمام إلى غرفة المستخدم
  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`👤 المستخدم ${userId} انضم إلى غرفته`);
  });
  
  // معالجة رسائل الذكاء الاصطناعي
  socket.on('ai-message', async (data) => {
    try {
      // معالجة الرسالة وإرسال الرد
      const response = await processAIMessage(data.message, data.userId);
      socket.emit('ai-response', {
        success: true,
        response: response,
        timestamp: new Date()
      });
    } catch (error) {
      socket.emit('ai-response', {
        success: false,
        error: 'حدث خطأ في معالجة الرسالة',
        timestamp: new Date()
      });
    }
  });
  
  // قطع الاتصال
  socket.on('disconnect', () => {
    console.log('❌ مستخدم قطع الاتصال:', socket.id);
  });
});

// دالة معالجة رسائل الذكاء الاصطناعي
async function processAIMessage(message, userId) {
  // هنا يمكن إضافة منطق الذكاء الاصطناعي الحقيقي
  // مثل الاتصال بـ OpenAI API أو نماذج أخرى
  
  const responses = [
    'مرحباً! كيف يمكنني مساعدتك اليوم؟',
    'أنا هنا لمساعدتك في جميع احتياجاتك التقنية.',
    'يمكنني مساعدتك في تطوير المواقع، البحث عن وظائف، والأتمتة.',
    'ما هو المشروع الذي تريد العمل عليه؟'
  ];
  
  // محاكاة تأخير المعالجة
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    message: responses[Math.floor(Math.random() * responses.length)],
    type: 'text',
    suggestions: [
      'تطوير موقع ويب',
      'البحث عن وظيفة',
      'أتمتة المهام',
      'تحليل البيانات'
    ]
  };
}

// بدء السيرفر
const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`);
    console.log(`🌐 الرابط: http://localhost:${PORT}`);
  });
});

// معالجة إغلاق السيرفر بشكل آمن
process.on('SIGTERM', () => {
  console.log('🛑 إيقاف السيرفر...');
  server.close(() => {
    console.log('✅ تم إيقاف السيرفر بنجاح');
    mongoose.connection.close();
  });
});

module.exports = app;