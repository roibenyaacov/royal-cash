# 🔧 תיקון בעיית Redirect ל-Supabase

## 🐛 הבעיה:
כשפותחים את הדפדפן, הוא מעביר ל-Supabase Dashboard במקום לאפליקציה.

## 🔍 סיבות אפשריות:

### 1. **Supabase Auth Redirect URL לא מוגדר נכון**
   - ב-Supabase Dashboard → Authentication → URL Configuration
   - צריך להיות: `http://localhost:3000` (או הכתובת שלך)

### 2. **השרת לא רץ**
   - השרת לא עובד, אז הדפדפן מנסה לטעון משהו אחר

### 3. **בעיית CORS או RLS**
   - Supabase חוסם את הבקשות ומעביר ל-Dashboard

---

## ✅ פתרונות:

### פתרון 1: בדוק Supabase Auth Settings

1. **היכנס ל-Supabase Dashboard:**
   - https://supabase.com/dashboard/project/gfchsw

2. **לך ל-Authentication → URL Configuration**

3. **וודא ש-Site URL הוא:**
   ```
   http://localhost:3000
   ```

4. **וודא ש-Redirect URLs כולל:**
   ```
   http://localhost:3000/**
   http://127.0.0.1:3000/**
   ```

### פתרון 2: הפעל את השרת

**אפשרות A: השתמש ב-start-server.bat**
- כפול קליק על `start-server.bat`
- פתח את הדפדפן ב: `http://localhost:3000`

**אפשרות B: פתח את index.html ישירות**
- כפול קליק על `index.html`
- זה יעבוד, אבל יכול להיות בעיות CORS

**אפשרות C: השתמש ב-Python (אם מותקן)**
```bash
cd C:\Users\roi23\OneDrive\Desktop\royal-cash
python -m http.server 3000
```

### פתרון 3: בדוק את ה-Console

1. **פתח את הדפדפן (F12)**
2. **לך ל-Console**
3. **ראה אם יש שגיאות:**
   - CORS errors
   - Auth errors
   - Network errors

---

## 🧪 בדיקה:

1. **הפעל את השרת:**
   ```bash
   npx serve . -p 3000
   ```

2. **פתח את הדפדפן:**
   ```
   http://localhost:3000
   ```

3. **אם עדיין מעביר ל-Supabase:**
   - בדוק את ה-Console (F12)
   - בדוק את ה-Network tab
   - שלח לי את השגיאות

---

## 📝 הערות:

- אם אתה רואה את דף ה-Login של Supabase, זה אומר שיש בעיה ב-Auth flow
- אם אתה רואה את ה-Dashboard, זה אומר שיש redirect ב-Supabase Settings
- אם אתה רואה שגיאת 404, זה אומר שהשרת לא רץ

---

**נסה את הפתרונות ותגיד מה קורה! 🚀**



