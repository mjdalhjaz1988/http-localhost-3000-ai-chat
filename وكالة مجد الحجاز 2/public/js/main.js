// الوظائف الأساسية للواجهة

// متغيرات عامة
let currentUser = null;
let isTyping = false;
let chatMessages = [];
let currentSection = 'home';

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    startBackgroundAnimations();
    checkUserSession();
});

// تهيئة التطبيق
function initializeApp() {
    // إخفاء شاشة التحميل
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }, 2000);

    // تهيئة الجسيمات
    initializeParticles();
    
    // تهيئة تأثير المصفوفة
    initializeMatrix();
    
    // تحديث الإحصائيات
    updateStatistics();
    
    // تهيئة الرسوم البيانية
    initializeCharts();
}

// إعداد مستمعي الأحداث
function setupEventListeners() {
    // التنقل
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', handleNavigation);
    });

    // أزرار الخدمات
    const serviceButtons = document.querySelectorAll('.btn-service');
    serviceButtons.forEach(button => {
        button.addEventListener('click', handleServiceClick);
    });

    // محادثة الذكاء الاصطناعي
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    
    if (chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }

    // نموذج تسجيل الدخول
    const loginModal = document.getElementById('login-modal');
    const loginButton = document.getElementById('login-button');
    const closeModal = document.querySelector('.modal-close');
    
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            loginModal.classList.add('active');
        });
    }
    
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            loginModal.classList.remove('active');
        });
    }

    // إغلاق النموذج عند النقر خارجه
    if (loginModal) {
        loginModal.addEventListener('click', function(e) {
            if (e.target === loginModal) {
                loginModal.classList.remove('active');
            }
        });
    }

    // نموذج تسجيل الدخول
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // تأثيرات التمرير
    window.addEventListener('scroll', handleScroll);
    
    // تغيير حجم النافذة
    window.addEventListener('resize', handleResize);
}

// التعامل مع التنقل
function handleNavigation(e) {
    e.preventDefault();
    const targetSection = e.target.getAttribute('data-section');
    
    if (targetSection) {
        showSection(targetSection);
        updateActiveNavLink(e.target);
    }
}

// عرض القسم المحدد
function showSection(sectionName) {
    // إخفاء جميع الأقسام
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // عرض القسم المطلوب
    const targetSection = document.getElementById(sectionName + '-section');
    if (targetSection) {
        targetSection.classList.add('active');
        currentSection = sectionName;
        
        // تحديث العنوان
        updatePageTitle(sectionName);
        
        // تحديث البيانات حسب القسم
        if (sectionName === 'dashboard') {
            loadDashboardData();
        } else if (sectionName === 'ai-chat') {
            initializeChat();
        }
    }
}

// تحديث رابط التنقل النشط
function updateActiveNavLink(activeLink) {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
    });
    activeLink.classList.add('active');
}

// تحديث عنوان الصفحة
function updatePageTitle(section) {
    const titles = {
        'home': 'وكالة مجد الحجاز الرقمية - الرئيسية',
        'services': 'وكالة مجد الحجاز الرقمية - الخدمات',
        'ai-chat': 'وكالة مجد الحجاز الرقمية - المحادثة الذكية',
        'dashboard': 'وكالة مجد الحجاز الرقمية - لوحة التحكم',
        'about': 'وكالة مجد الحجاز الرقمية - حولنا'
    };
    
    document.title = titles[section] || 'وكالة مجد الحجاز الرقمية';
}

// التعامل مع النقر على أزرار الخدمات
function handleServiceClick(e) {
    const serviceType = e.target.getAttribute('data-service');
    
    if (serviceType) {
        // التبديل إلى قسم محادثة الذكاء الاصطناعي
        showSection('ai-chat');
        
        // إرسال رسالة تلقائية حسب نوع الخدمة
        setTimeout(() => {
            const serviceMessages = {
                'text-analysis': 'أريد تحليل نص',
                'file-analysis': 'أريد تحليل ملف',
                'code-generation': 'أريد إنشاء كود برمجي',
                'job-search': 'أريد البحث عن وظائف'
            };
            
            const message = serviceMessages[serviceType];
            if (message) {
                document.getElementById('chat-input').value = message;
                sendMessage();
            }
        }, 500);
    }
}

// إرسال رسالة في المحادثة
function sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();
    
    if (!message || isTyping) return;
    
    // إضافة رسالة المستخدم
    addMessage(message, 'user');
    
    // مسح حقل الإدخال
    chatInput.value = '';
    
    // عرض مؤشر الكتابة
    showTypingIndicator();
    
    // محاكاة رد الذكاء الاصطناعي
    setTimeout(() => {
        hideTypingIndicator();
        const aiResponse = generateAIResponse(message);
        addMessage(aiResponse, 'ai');
    }, 1500 + Math.random() * 2000);
}

// إضافة رسالة إلى المحادثة
function addMessage(content, sender) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${sender}-message`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = sender === 'user' ? '👤' : '🤖';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    const messageText = document.createElement('p');
    messageText.textContent = content;
    
    const messageTime = document.createElement('div');
    messageTime.className = 'message-time';
    messageTime.textContent = new Date().toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    messageContent.appendChild(messageText);
    messageContent.appendChild(messageTime);
    
    messageElement.appendChild(avatar);
    messageElement.appendChild(messageContent);
    
    messagesContainer.appendChild(messageElement);
    
    // التمرير إلى أسفل
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // حفظ الرسالة
    chatMessages.push({
        content,
        sender,
        timestamp: new Date()
    });
}

// عرض مؤشر الكتابة
function showTypingIndicator() {
    isTyping = true;
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.style.display = 'flex';
    }
}

// إخفاء مؤشر الكتابة
function hideTypingIndicator() {
    isTyping = false;
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

// توليد رد الذكاء الاصطناعي
function generateAIResponse(userMessage) {
    const responses = {
        'مرحبا': 'مرحباً بك! كيف يمكنني مساعدتك اليوم؟',
        'تحليل نص': 'بالطبع! يرجى إرسال النص الذي تريد تحليله وسأقوم بتحليله لك.',
        'إنشاء كود': 'ممتاز! ما نوع الكود الذي تريد إنشاءه؟ يرجى تحديد اللغة البرمجية والوظيفة المطلوبة.',
        'البحث عن وظائف': 'سأساعدك في البحث عن الوظائف المناسبة. ما هو مجال تخصصك؟',
        'مساعدة': 'يمكنني مساعدتك في:\n- تحليل النصوص والملفات\n- إنشاء الأكواد البرمجية\n- البحث عن الوظائف\n- الإجابة على الأسئلة العامة'
    };
    
    // البحث عن رد مناسب
    for (const [key, response] of Object.entries(responses)) {
        if (userMessage.includes(key)) {
            return response;
        }
    }
    
    // رد افتراضي
    const defaultResponses = [
        'شكراً لك على رسالتك. كيف يمكنني مساعدتك بشكل أفضل؟',
        'هذا سؤال مثير للاهتمام! دعني أفكر في أفضل طريقة للإجابة عليه.',
        'أفهم ما تقصده. هل يمكنك توضيح المزيد من التفاصيل؟',
        'ممتاز! سأعمل على تحليل طلبك وتقديم أفضل حل ممكن.'
    ];
    
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

// تهيئة المحادثة
function initializeChat() {
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer && messagesContainer.children.length === 0) {
        // رسالة ترحيب
        setTimeout(() => {
            addMessage('مرحباً! أنا مساعدك الذكي. كيف يمكنني مساعدتك اليوم؟', 'ai');
        }, 500);
    }
}

// التعامل مع تسجيل الدخول
function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    
    // محاكاة تسجيل الدخول
    if (email && password) {
        // عرض مؤشر التحميل
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'جاري تسجيل الدخول...';
        submitButton.disabled = true;
        
        setTimeout(() => {
            // محاكاة نجاح تسجيل الدخول
            currentUser = {
                email: email,
                name: 'المستخدم',
                avatar: '👤'
            };
            
            // إخفاء النموذج
            document.getElementById('login-modal').classList.remove('active');
            
            // تحديث واجهة المستخدم
            updateUserInterface();
            
            // إعادة تعيين النموذج
            e.target.reset();
            submitButton.textContent = originalText;
            submitButton.disabled = false;
            
            // عرض رسالة نجاح
            showNotification('تم تسجيل الدخول بنجاح!', 'success');
        }, 2000);
    }
}

// تحديث واجهة المستخدم بعد تسجيل الدخول
function updateUserInterface() {
    const loginButton = document.getElementById('login-button');
    if (loginButton && currentUser) {
        loginButton.textContent = currentUser.name;
        loginButton.onclick = () => showUserMenu();
    }
}

// عرض قائمة المستخدم
function showUserMenu() {
    // يمكن إضافة قائمة منسدلة للمستخدم هنا
    console.log('عرض قائمة المستخدم');
}

// فحص جلسة المستخدم
function checkUserSession() {
    // فحص وجود جلسة محفوظة
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUserInterface();
    }
}

// تحديث الإحصائيات
function updateStatistics() {
    const stats = {
        users: 15420,
        requests: 89650,
        success: 98.5,
        uptime: 99.9
    };
    
    // تحديث العدادات بتأثير متحرك
    Object.keys(stats).forEach(key => {
        const element = document.getElementById(`stat-${key}`);
        if (element) {
            animateCounter(element, 0, stats[key], 2000);
        }
    });
}

// تحريك العدادات
function animateCounter(element, start, end, duration) {
    const startTime = performance.now();
    const isDecimal = end % 1 !== 0;
    
    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const current = start + (end - start) * easeOutQuart(progress);
        
        if (isDecimal) {
            element.textContent = current.toFixed(1);
        } else {
            element.textContent = Math.floor(current).toLocaleString('ar-SA');
        }
        
        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        }
    }
    
    requestAnimationFrame(updateCounter);
}

// دالة التسارع
function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
}

// تهيئة الجسيمات
function initializeParticles() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles = [];
    const particleCount = 100;
    
    // إنشاء الجسيمات
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            size: Math.random() * 2 + 1,
            opacity: Math.random() * 0.5 + 0.2
        });
    }
    
    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(particle => {
            // تحديث الموقع
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // إعادة تعيين الموقع عند الخروج من الشاشة
            if (particle.x < 0) particle.x = canvas.width;
            if (particle.x > canvas.width) particle.x = 0;
            if (particle.y < 0) particle.y = canvas.height;
            if (particle.y > canvas.height) particle.y = 0;
            
            // رسم الجسيم
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 212, 255, ${particle.opacity})`;
            ctx.fill();
        });
        
        requestAnimationFrame(animateParticles);
    }
    
    animateParticles();
}

// تهيئة تأثير المصفوفة
function initializeMatrix() {
    const canvas = document.getElementById('matrix-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const chars = '01';
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops = [];
    
    // تهيئة القطرات
    for (let i = 0; i < columns; i++) {
        drops[i] = 1;
    }
    
    function drawMatrix() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'rgba(0, 212, 255, 0.8)';
        ctx.font = fontSize + 'px monospace';
        
        for (let i = 0; i < drops.length; i++) {
            const text = chars[Math.floor(Math.random() * chars.length)];
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);
            
            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            drops[i]++;
        }
    }
    
    setInterval(drawMatrix, 50);
}

// بدء الرسوم المتحركة في الخلفية
function startBackgroundAnimations() {
    // تحريك العناصر عند التمرير
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    // مراقبة العناصر القابلة للتحريك
    const animatedElements = document.querySelectorAll('.service-card, .dashboard-card, .tech-item');
    animatedElements.forEach(el => observer.observe(el));
}

// التعامل مع التمرير
function handleScroll() {
    const scrolled = window.pageYOffset;
    const parallax = document.querySelector('.hero-background');
    
    if (parallax) {
        parallax.style.transform = `translateY(${scrolled * 0.5}px)`;
    }
}

// التعامل مع تغيير حجم النافذة
function handleResize() {
    const canvas = document.getElementById('particles-canvas');
    if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    const matrixCanvas = document.getElementById('matrix-canvas');
    if (matrixCanvas) {
        matrixCanvas.width = window.innerWidth;
        matrixCanvas.height = window.innerHeight;
    }
}

// تحميل بيانات لوحة التحكم
function loadDashboardData() {
    // محاكاة تحميل البيانات
    updateDashboardMetrics();
    updateProgressBars();
}

// تحديث مقاييس لوحة التحكم
function updateDashboardMetrics() {
    const metrics = {
        'total-requests': 1250,
        'active-users': 89,
        'success-rate': 98.5,
        'response-time': 0.8
    };
    
    Object.keys(metrics).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
            animateCounter(element, 0, metrics[key], 1500);
        }
    });
}

// تحديث أشرطة التقدم
function updateProgressBars() {
    const progressBars = document.querySelectorAll('.progress-bar-fill');
    progressBars.forEach(bar => {
        const targetWidth = bar.getAttribute('data-width') || '75%';
        setTimeout(() => {
            bar.style.width = targetWidth;
        }, 500);
    });
}

// تهيئة الرسوم البيانية
function initializeCharts() {
    // يمكن إضافة مكتبة رسوم بيانية مثل Chart.js هنا
    console.log('تهيئة الرسوم البيانية');
}

// عرض الإشعارات
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'var(--success-color)' : 'var(--primary-color)'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: var(--border-radius);
        box-shadow: var(--shadow-glow);
        z-index: 3000;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// إضافة أنماط CSS للرسوم المتحركة
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .animate-in {
        animation: fadeInUp 0.6s ease forwards;
    }
    
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);

// حفظ حالة المستخدم
window.addEventListener('beforeunload', () => {
    if (currentUser) {
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
});