
// main.js - المنسق الرئيسي للتطبيق (Orchestrator)

// 1. استيراد الوحدات
import * as app from './app.js';
import * as ui from './ui.js';

console.log("main.js: بدأ التحميل.");

/**
 * الوظيفة الرئيسية التي يتم تشغيلها بعد تحميل محتوى الصفحة بالكامل.
 */
function main() {
    console.log("main.js: تم تحميل محتوى الصفحة (DOMContentLoaded). جاري تهيئة التطبيق...");

    // --- تهيئة التطبيق ---
    app.init();

    // --- تحديد عناصر الواجهة الرسومية (DOM Elements) ---
    const chatInput = document.getElementById('chatInput');
    const btnSendMessage = document.getElementById('btnSendMessage');
    const btnClearChat = document.getElementById('btnClearChat');
    const quickActionButtons = document.querySelectorAll('.quick-btn');
    const featureCards = document.querySelectorAll('.feature-card');
    const footerLinks = {
        help: document.getElementById('linkHelp'),
        settings: document.getElementById('linkSettings'),
        about: document.getElementById('linkAbout'),
    };

    // --- تعريف وظائف معالجة الأحداث (Event Handlers) ---

    /**
     * تعالج إرسال أي رسالة (من الإدخال أو الأزرار السريعة) إلى منطق التطبيق.
     * @param {string} messageText
     */
    function submitMessageToApp(messageText) {
        if (!messageText) return;

        ui.displayMessage(messageText, 'user');
        chatInput.value = '';
        chatInput.focus();
        ui.setLoading(true);

        // محاكاة وقت المعالجة للذكاء الاصطناعي
        setTimeout(() => {
            const aiResponse = app.processUserMessage(messageText);
            ui.setLoading(false);
            ui.displayMessage(aiResponse, 'ai');
        }, 1200 + Math.random() * 500); // وقت استجابة عشوائي قليلاً
    }

    /**
     * تعالج إرسال رسالة من حقل الإدخال.
     */
    function handleSendMessage() {
        submitMessageToApp(chatInput.value.trim());
    }

    /**
     * تعالج الضغط على مفتاح Enter في حقل الإدخال.
     * @param {KeyboardEvent} event
     */
    function handleInputKeyPress(event) {
        if (event.key === 'Enter') {
            handleSendMessage();
        }
    }

    /**
     * تعالج النقر على أزرار الإجراءات السريعة.
     * @param {MouseEvent} event
     */
    function handleQuickActionClick(event) {
        const command = event.target.dataset.command;
        submitMessageToApp(command);
    }

    /**
     * تعالج النقر على بطاقات الميزات.
     * @param {MouseEvent} event
     */
    function handleFeatureCardClick(event) {
        const card = event.target.closest('.feature-card');
        if (card) {
            const feature = card.dataset.feature;
            const confirmationMessage = app.activateFeature(feature);
            ui.showNotification(confirmationMessage, 'success');
        }
    }

    /**
     * تقوم بمسح رسائل المحادثة.
     */
    function handleClearChat() {
        ui.clearChatMessages();
        ui.showNotification("تم مسح المحادثة بنجاح.", 'info');
    }

    // --- إعداد مستمعي الأحداث (Setup Event Listeners) ---
    function initializeEventListeners() {
        console.log("main.js: جاري إعداد مستمعي الأحداث.");
        btnSendMessage.addEventListener('click', handleSendMessage);
        chatInput.addEventListener('keypress', handleInputKeyPress);
        btnClearChat.addEventListener('click', handleClearChat);

        quickActionButtons.forEach(button => {
            button.addEventListener('click', handleQuickActionClick);
        });

        featureCards.forEach(card => {
            card.addEventListener('click', handleFeatureCardClick);
        });

        footerLinks.help.addEventListener('click', (e) => {
            e.preventDefault();
            ui.showNotification('سيتم عرض قسم المساعدة هنا في الإصدارات القادمة.', 'info');
        });

        footerLinks.settings.addEventListener('click', (e) => {
            e.preventDefault();
            ui.showNotification('سيتم عرض الإعدادات هنا في الإصدارات القادمة.', 'info');
        });

        footerLinks.about.addEventListener('click', (e) => {
            e.preventDefault();
            ui.showNotification('وكالة الذكاء الاصطناعي - إصدار 1.0 - قيد التطوير.', 'info');
        });
        console.log("main.js: تم إعداد مستمعي الأحداث بنجاح.");
    }

    /**
     * بدء مراقبة النظام وتحديث الواجهة بشكل دوري.
     */
    function startSystemMonitor() {
        console.log("main.js: بدء تشغيل مراقب النظام.");
        setInterval(() => {
            const status = app.getSystemStatus();
            ui.updateSystemMonitor(status);
        }, 2000); // تحديث كل 2 ثانية
    }

    // --- بدء تشغيل التطبيق ---
    initializeEventListeners();
    startSystemMonitor();
    console.log("main.js: وكالة الذكاء الاصطناعي جاهزة ومنتظرة للأوامر.");
}

// تأكد من أن الـ DOM قد تم تحميله بالكامل قبل تشغيل أي كود
document.addEventListener('DOMContentLoaded', main);