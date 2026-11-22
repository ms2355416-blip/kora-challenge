window.KORA_AI = {
  gemini: {
    key: 'AQ.Ab8RN6LGGsT_5TqR3jUluCkO3ywqjWc17Dp5LqL2Gx9R4EwxrA', // ← حطيت المفتاح هنا يا بطل
    models: ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'], // بيجرب بالترتيب لحد ما واحد يشتغل
    timeoutMs: 9000,                           // أقصى انتظار قبل الرجوع للقواعد
    dailyCap: 120                              // أقصى طلبات في اليوم لكل جهاز (حماية للحصة المجانية)
  }
};
