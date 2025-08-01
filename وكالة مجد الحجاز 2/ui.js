// ui.js - وحدة مسؤولة عن جميع تحديثات واجهة المستخدم (DOM Manipulation)

// --- تحديد عناصر الواجهة الرسومية (DOM Elements) ---
const chatMessages = document.getElementById('chatMessages');
const activeTasksEl = document.getElementById('activeTasks');
const fixedErrorsEl = document.getElementById('fixedErrors');
const lastUpdateEl = document.getElementById('lastUpdate');
const loadingOverlay = document.getElementById('loadingOverlay');
const notificationsContainer = document.getElementById('notifications');

/**
 * تعرض رسالة في نافذة المحادثة.
 * @param {string} text - نص الرسالة.
 * @param {'user' | 'ai'} sender - مرسل الرسالة ('user' أو 'ai').
 */
export function displayMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'ai-message');

    const avatar = document.createElement('div');
    avatar.classList.add('message-avatar');
    const icon = document.createElement('i');
    icon.className = `fas ${sender === 'user' ? 'fa-user' : 'fa-robot'}`;
    avatar.appendChild(icon);

    const content = document.createElement('div');
    content.classList.add('message-content');
    // استخدام innerHTML للسماح بعرض قوائم HTML من الذكاء الاصطناعي
    content.innerHTML = `<p>${text.replace(/\n/g, '<br>')}</p>`;

    const time = document.createElement('div');
    time.classList.add('message-time');
    time.textContent = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    messageDiv.appendChild(time);

    chatMessages.appendChild(messageDiv);
    
    // التمرير لأسفل لعرض الرسالة الجديدة
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * تقوم بمسح جميع الرسائل من نافذة المحادثة.
 */
export function clearChatMessages() {
    chatMessages.innerHTML = '';
    displayMessage("تم مسح المحادثة. كيف يمكنني مساعدتك الآن؟", 'ai');
}

/**
 * تحديث لوحة مراقبة النظام بالبيانات الجديدة.
 * @param {object} status - كائن يحتوي على بيانات الحالة.
 * @param {number} status.activeTasks - عدد المهام النشطة.
 * @param {number} status.fixedErrors - عدد الأخطاء التي تم إصلاحها.
 * @param {Date} status.lastUpdate - وقت آخر تحديث.
 */
export function updateSystemMonitor({ activeTasks, fixedErrors, lastUpdate }) {
    activeTasksEl.textContent = activeTasks;
    fixedErrorsEl.textContent = fixedErrors;
    lastUpdateEl.textContent = lastUpdate.toLocaleTimeString('ar-EG');
}

/**
 * تعرض إشعارًا مؤقتًا للمستخدم.
 * @param {string} message - نص الإشعار.
 * @param {'info' | 'success' | 'error'} type - نوع الإشعار (يؤثر على النمط).
 */
export function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    notificationsContainer.appendChild(notification);

    // إزالة الإشعار بعد 5 ثوانٍ
    setTimeout(() => {
        notification.classList.add('fade-out');
        // إزالة العنصر من الـ DOM بعد انتهاء تأثير التلاشي
        setTimeout(() => notification.remove(), 500);
    }, 5000);
}

/**
 * تظهر أو تخفي مؤشر التحميل.
 * @param {boolean} isLoading - إذا كان يجب إظهار التحميل أم لا.
 */
export function setLoading(isLoading) {
    if (isLoading) {
        loadingOverlay.style.display = 'flex';
    } else {
        loadingOverlay.style.display = 'none';
    }
}