window.KORA_AI = {
  gemini: {
    key: 'AQ.Ab8RN6I4cmTCKeO7cGIlixhsW-hZh1oH87XKJGGYk0RZ1G-Q', // ← حطيت المفتاح هنا يا بطل
    models: ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'], // بيجرب بالترتيب لحد ما واحد يشتغل
    timeoutMs: 9000,                           // أقصى انتظار قبل الرجوع للقواعد
    dailyCap: 120                              // أقصى طلبات في اليوم لكل جهاز (حماية للحصة المجانية)
  }
};
