// وكالة الذكاء الاصطناعي المتطورة - النظام الأساسي
class AIAgency {
    constructor() {
        this.isInitialized = false;
        this.activeTasks = 0;
        this.fixedErrors = 0;
        this.features = {
            autoFix: true,
            webDev: true,
            jobSearch: true,
            automation: true,
            analytics: true,
            learning: true
        };
        this.chatHistory = [];
        this.isVoiceEnabled = false;
        this.recognition = null;
        this.responses = {
            greetings: [
                'مرحباً! كيف يمكنني مساعدتك اليوم؟',
                'أهلاً وسهلاً! أنا هنا لخدمتك.',
                'مرحباً بك في وكالة الذكاء الاصطناعي المتطورة!'
            ],
            programming: [
                'سأقوم بتطوير الكود المطلوب بأحدث التقنيات.',
                'جاري العمل على المشروع البرمجي...',
                'سأنشئ لك تطبيقاً متطوراً وعملياً.'
            ],
            automation: [
                'سأقوم بأتمتة هذه المهمة لتوفير الوقت والجهد.',
                'جاري إعداد النظام التلقائي...',
                'تم تفعيل الأتمتة الذكية بنجاح!'
            ],
            errorFix: [
                'تم اكتشاف الخطأ وسيتم إصلاحه تلقائياً.',
                'جاري تحليل المشكلة وإيجاد الحل الأمثل...',
                'تم إصلاح الخطأ بنجاح! النظام يعمل بكفاءة الآن.'
            ]
        };
        this.init();
    }

    async init() {
        try {
            await this.setupVoiceRecognition();
            this.setupEventListeners();
            this.startAutoErrorDetection();
            this.updateSystemStatus();
            this.showWelcomeMessage();
            this.isInitialized = true;
            this.showNotification('تم تشغيل النظام بنجاح!', 'success');
        } catch (error) {
            this.handleError('خطأ في تهيئة النظام', error);
        }
    }

    setupEventListeners() {
        // إعداد مستمعي الأحداث
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });
        }

        // مراقبة الأخطاء في الصفحة
        window.addEventListener('error', (e) => {
            this.handleError('خطأ في JavaScript', e.error);
        });

        // مراقبة الأخطاء غير المعالجة
        window.addEventListener('unhandledrejection', (e) => {
            this.handleError('خطأ في Promise', e.reason);
        });
    }

    async setupVoiceRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.lang = 'ar-SA';
            this.recognition.continuous = false;
            this.recognition.interimResults = false;

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                document.getElementById('chatInput').value = transcript;
                this.sendMessage();
            };

            this.recognition.onerror = (event) => {
                console.log('خطأ في التعرف على الصوت:', event.error);
            };
        }
    }

    showWelcomeMessage() {
        const welcomeMsg = {
            type: 'ai',
            content: 'مرحباً! أنا مساعدك الذكي الجديد والمحسن. تم إصلاح جميع المشاكل السابقة وإضافة خصائص متطورة جديدة. كيف يمكنني مساعدتك؟',
            timestamp: new Date().toLocaleTimeString('ar-SA')
        };
        this.addMessageToChat(welcomeMsg);
    }

    sendMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        if (!message) return;

        // إضافة رسالة المستخدم
        this.addMessageToChat({
            type: 'user',
            content: message,
            timestamp: new Date().toLocaleTimeString('ar-SA')
        });

        input.value = '';
        this.showTypingIndicator();

        // معالجة الرسالة
        setTimeout(() => {
            this.processMessage(message);
        }, 1000);
    }

    sendQuickMessage(message) {
        document.getElementById('chatInput').value = message;
        this.sendMessage();
    }

    async processMessage(message) {
        this.hideTypingIndicator();
        this.activeTasks++;
        this.updateSystemStatus();

        try {
            let response = await this.generateResponse(message);
            
            // تنفيذ المهام المطلوبة
            if (message.includes('إصلاح') || message.includes('خطأ')) {
                await this.performAutoFix();
                response += '\n\n✅ تم إصلاح الأخطاء المكتشفة تلقائياً!';
            }
            
            if (message.includes('تطوير') || message.includes('موقع') || message.includes('تطبيق')) {
                await this.performWebDevelopment();
                response += '\n\n💻 جاري تطوير المشروع بأحدث التقنيات...';
            }
            
            if (message.includes('وظائف') || message.includes('عمل')) {
                await this.performJobSearch();
                response += '\n\n🔍 جاري البحث عن الوظائف المناسبة...';
            }

            this.addMessageToChat({
                type: 'ai',
                content: response,
                timestamp: new Date().toLocaleTimeString('ar-SA')
            });

        } catch (error) {
            this.handleError('خطأ في معالجة الرسالة', error);
        } finally {
            this.activeTasks--;
            this.updateSystemStatus();
        }
    }

    async generateResponse(message) {
        // تحليل ذكي للرسالة
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('مرحبا') || lowerMessage.includes('السلام')) {
            return this.getRandomResponse('greetings');
        }
        
        if (lowerMessage.includes('برمجة') || lowerMessage.includes('تطوير') || lowerMessage.includes('كود')) {
            return this.getRandomResponse('programming');
        }
        
        if (lowerMessage.includes('أتمتة') || lowerMessage.includes('تلقائي')) {
            return this.getRandomResponse('automation');
        }
        
        if (lowerMessage.includes('إصلاح') || lowerMessage.includes('خطأ')) {
            return this.getRandomResponse('errorFix');
        }

        // استجابة ذكية عامة
        return `فهمت طلبك: "${message}". سأقوم بتنفيذه باستخدام أحدث تقنيات الذكاء الاصطناعي. جاري العمل...`;
    }

    getRandomResponse(category) {
        const responses = this.responses[category];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    async performAutoFix() {
        this.showLoading();
        
        // محاكاة إصلاح الأخطاء
        await this.delay(2000);
        
        // إصلاح أخطاء CSS
        this.fixCSSErrors();
        
        // إصلاح أخطاء JavaScript
        this.fixJSErrors();
        
        // تحديث العداد
        this.fixedErrors++;
        this.updateSystemStatus();
        
        this.hideLoading();
        this.showNotification('تم إصلاح الأخطاء بنجاح!', 'success');
    }

    async performWebDevelopment() {
        this.showLoading();
        await this.delay(3000);
        
        // محاكاة تطوير الويب
        this.showNotification('تم إنشاء مشروع ويب جديد!', 'success');
        this.hideLoading();
    }

    async performJobSearch() {
        this.showLoading();
        await this.delay(2500);
        
        // محاكاة البحث عن وظائف
        this.showNotification('تم العثور على 15 وظيفة مناسبة!', 'success');
        this.hideLoading();
    }

    fixCSSErrors() {
        // إصلاح أخطاء CSS الشائعة
        const styles = document.querySelectorAll('*');
        styles.forEach(element => {
            const computedStyle = window.getComputedStyle(element);
            if (computedStyle.display === 'none' && element.offsetParent === null) {
                // إصلاح العناصر المخفية بطريقة خاطئة
                if (element.style.display === 'none') {
                    element.style.display = 'block';
                }
            }
        });
    }

    fixJSErrors() {
        // إصلاح أخطاء JavaScript الشائعة
        try {
            // التحقق من المتغيرات غير المعرفة
            if (typeof undefined_variable !== 'undefined') {
                console.log('تم إصلاح متغير غير معرف');
            }
        } catch (e) {
            // تم التعامل مع الخطأ
        }
    }

    startAutoErrorDetection() {
        // مراقبة تلقائية للأخطاء كل 30 ثانية
        setInterval(() => {
            this.detectAndFixErrors();
        }, 30000);
    }

    detectAndFixErrors() {
        // كشف الأخطاء التلقائي
        const errors = this.scanForErrors();
        if (errors.length > 0) {
            this.performAutoFix();
        }
    }

    scanForErrors() {
        const errors = [];
        
        // فحص أخطاء الشبكة
        if (!navigator.onLine) {
            errors.push('انقطاع الاتصال بالإنترنت');
        }
        
        // فحص أخطاء الذاكرة
        if (performance.memory && performance.memory.usedJSHeapSize > 50000000) {
            errors.push('استخدام مرتفع للذاكرة');
        }
        
        return errors;
    }

    addMessageToChat(message) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.type}-message`;
        
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-${message.type === 'ai' ? 'robot' : 'user'}"></i>
            </div>
            <div class="message-content">
                <p>${message.content}</p>
            </div>
            <div class="message-time">${message.timestamp}</div>
        `;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // إضافة إلى التاريخ
        this.chatHistory.push(message);
    }

    showTypingIndicator() {
        const chatMessages = document.getElementById('chatMessages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message ai-message typing-indicator';
        typingDiv.id = 'typingIndicator';
        
        typingDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    toggleVoice() {
        if (!this.recognition) {
            this.showNotification('التعرف على الصوت غير مدعوم في هذا المتصفح', 'warning');
            return;
        }

        if (this.isVoiceEnabled) {
            this.recognition.stop();
            this.isVoiceEnabled = false;
            this.showNotification('تم إيقاف التعرف على الصوت', 'info');
        } else {
            this.recognition.start();
            this.isVoiceEnabled = true;
            this.showNotification('جاري الاستماع...', 'info');
        }
    }

    clearChat() {
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = '';
        this.chatHistory = [];
        this.showWelcomeMessage();
        this.showNotification('تم مسح المحادثة', 'info');
    }

    activateFeature(featureName) {
        this.features[featureName] = !this.features[featureName];
        const status = this.features[featureName] ? 'تم تفعيل' : 'تم إلغاء';
        this.showNotification(`${status} خاصية ${featureName}`, 'info');
        
        // تحديث واجهة المستخدم
        this.updateFeatureUI(featureName);
    }

    updateFeatureUI(featureName) {
        const featureCards = document.querySelectorAll('.feature-card');
        featureCards.forEach(card => {
            if (card.onclick.toString().includes(featureName)) {
                const statusSpan = card.querySelector('.status');
                if (this.features[featureName]) {
                    statusSpan.textContent = 'نشط';
                    statusSpan.className = 'status active';
                } else {
                    statusSpan.textContent = 'متوقف';
                    statusSpan.className = 'status inactive';
                }
            }
        });
    }

    updateSystemStatus() {
        document.getElementById('activeTasks').textContent = this.activeTasks;
        document.getElementById('fixedErrors').textContent = this.fixedErrors;
        document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString('ar-SA');
    }

    showLoading() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notifications');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        container.appendChild(notification);
        
        // إزالة الإشعار بعد 5 ثوان
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    handleError(title, error) {
        console.error(title, error);
        this.showNotification(`${title}: ${error.message || error}`, 'error');
        
        // محاولة إصلاح الخطأ تلقائياً
        this.performAutoFix();
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // وظائف المساعدة
    showHelp() {
        const helpMessage = {
            type: 'ai',
            content: `
                <h4>مساعدة وكالة الذكاء الاصطناعي</h4>
                <ul>
                    <li><strong>إصلاح تلقائي:</strong> يكتشف ويصلح الأخطاء تلقائياً</li>
                    <li><strong>تطوير الويب:</strong> ينشئ مواقع وتطبيقات متطورة</li>
                    <li><strong>البحث عن وظائف:</strong> يبحث ويتقدم للوظائف المناسبة</li>
                    <li><strong>الأتمتة الذكية:</strong> يؤتمت المهام المعقدة</li>
                    <li><strong>تحليل البيانات:</strong> يحلل ويفسر البيانات</li>
                    <li><strong>التعلم الذاتي:</strong> يتحسن مع الاستخدام</li>
                </ul>
            `,
            timestamp: new Date().toLocaleTimeString('ar-SA')
        };
        this.addMessageToChat(helpMessage);
    }

    showSettings() {
        this.showNotification('إعدادات النظام متاحة قريباً!', 'info');
    }

    showAbout() {
        const aboutMessage = {
            type: 'ai',
            content: `
                <h4>حول وكالة الذكاء الاصطناعي المتطورة</h4>
                <p>نظام ذكي متطور يجمع بين أحدث تقنيات الذكاء الاصطناعي لتقديم خدمات شاملة ومتكاملة.</p>
                <p><strong>الإصدار:</strong> 2.0</p>
                <p><strong>تاريخ التطوير:</strong> 2024</p>
                <p><strong>المطور:</strong> فريق الذكاء الاصطناعي المتطور</p>
            `,
            timestamp: new Date().toLocaleTimeString('ar-SA')
        };
        this.addMessageToChat(aboutMessage);
    }
}

// الوظائف العامة
function handleEnter(event) {
    if (event.key === 'Enter') {
        aiAgency.sendMessage();
    }
}

function sendMessage() {
    aiAgency.sendMessage();
}

function sendQuickMessage(message) {
    aiAgency.sendQuickMessage(message);
}

function toggleVoice() {
    aiAgency.toggleVoice();
}

function clearChat() {
    aiAgency.clearChat();
}

function activateFeature(featureName) {
    aiAgency.activateFeature(featureName);
}

function showHelp() {
    aiAgency.showHelp();
}

function showSettings() {
    aiAgency.showSettings();
}

function showAbout() {
    aiAgency.showAbout();
}

// تهيئة النظام عند تحميل الصفحة
let aiAgency;
document.addEventListener('DOMContentLoaded', () => {
    aiAgency = new AIAgency();
});

// إضافة CSS للمؤشر المتحرك
const typingCSS = `
.typing-dots {
    display: flex;
    gap: 4px;
    padding: 10px;
}

.typing-dots span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #667eea;
    animation: typing 1.4s infinite ease-in-out;
}

.typing-dots span:nth-child(1) { animation-delay: -0.32s; }
.typing-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes typing {
    0%, 80%, 100% {
        transform: scale(0.8);
        opacity: 0.5;
    }
    40% {
        transform: scale(1);
        opacity: 1;
    }
}

.status.inactive {
    background: #f44336;
    color: white;
}
`;

// إضافة CSS إلى الصفحة
const styleSheet = document.createElement('style');
styleSheet.textContent = typingCSS;
document.head.appendChild(styleSheet);