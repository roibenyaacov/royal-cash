# פתרון מלא - איפוס והתחלה מחדש

## שלב 1: מחק את המשתמש הקיים

1. לך ל-Supabase Dashboard → Authentication → Users
2. מצא את המשתמש `roi2304@gmail.com`
3. לחץ על ה-3 נקודות (⋮) ליד המשתמש
4. בחר "Delete user"
5. אשר מחיקה

## שלב 2: כבה אימות אימייל

1. לך ל-Authentication → Settings
2. מצא "Enable email confirmations"
3. **כבה** את זה (Toggle OFF)
4. שמור

## שלב 3: בדוק שהטבלאות קיימות

1. לך ל-SQL Editor
2. הרץ את הסקריפט הבא:

```sql
-- בדוק אם הטבלאות קיימות
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'tables', 'table_players', 'game_results');
```

אם חסרות טבלאות, הרץ את `fix_existing_tables.sql`

## שלב 4: הרץ את quick_fix.sql

1. פתח SQL Editor
2. העתק והדבק את כל התוכן מ-`quick_fix.sql`
3. לחץ Run

## שלב 5: הירשם מחדש באפליקציה

1. רענן את האפליקציה (F5)
2. לחץ על "הרשמה"
3. הזן:
   - שם משתמש: (כל שם שתרצה)
   - אימייל: roi2304@gmail.com
   - טלפון: 0546998224 (10 ספרות)
   - סיסמה: (סיסמה חדשה)
4. לחץ "הירשם"

זה אמור לעבוד מיד!

## אם עדיין לא עובד

פתח Console (F12) ובדוק אם יש שגיאות. שלח אותן אליי.

