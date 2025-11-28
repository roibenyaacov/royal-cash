# ✅ רשימת בדיקה מהירה - Royal Cash

## 🚀 לפני שתחל לשחק

- [ ] הרצתי את `ultimate_fix.sql` ב-Supabase SQL Editor
- [ ] ראיתי הודעה: `✅ Ultimate Fix Complete!`
- [ ] רעננתי את הדפדפן עם **Ctrl + Shift + F5**
- [ ] פתחתי Console (F12) - **חובה!**

---

## 🎮 במהלך המשחק

### כשמזינים Cash Out:
- [ ] Console מראה: `=== STARTING CALCULATION ===`
- [ ] Console מראה: `💰 Calculating for "[שם]"`
- [ ] Console מראה: `📊 Net profit calculation: ...`
- [ ] Console מראה: `💾 Storing tempSettleResults:`
- [ ] `net` הוא **מספר** (לא 0, לא string)

### כשלוחצים "שולם":
- [ ] Console מראה: `=== STARTING SAVE AND EXIT ===`
- [ ] Console מראה: `✅ Valid Active Table ID: [UUID]`
- [ ] Console מראה: `Step 1 complete: table_players updated`
- [ ] Console מראה: `✅ Player "[שם]" has valid UUID`
- [ ] Console מראה: `✅ Game results inserted successfully!`
- [ ] **אין** שגיאות אדומות ב-Console

---

## 📊 אחרי המשחק

### בדף "הנתונים שלי":
- [ ] סה"כ רווח/הפסד: **לא 0** (אם היה רווח/הפסד)
- [ ] משחקים: **עלה ב-1**
- [ ] ממוצע למשחק: **מחושב נכון**

### ביכל התהילה:
- [ ] הכריש 🦈: **מופיע** (אם יש רווח)
- [ ] המפסיד 🐑: **מופיע** (אם יש הפסד)
- [ ] טבלת ליגה: **מציגה שחקנים**

---

## ❌ אם משהו לא עובד

### אם `net_profit` הוא 0:
1. [ ] בדקתי ב-Console מה הערך של `cash_out`
2. [ ] בדקתי ב-Console מה הערך של `net` אחרי "חישוב"
3. [ ] בדקתי ב-Console מה הערך של `net_profit` ב-`saveAndExit`

### אם `total_profit` לא מתעדכן:
1. [ ] בדקתי שהטריגר קיים (SQL: `SELECT * FROM pg_trigger WHERE tgname = 'on_game_result_insert';`)
2. [ ] בדקתי ב-Console ש-`game_results` נשמרו (`✅ Game results inserted successfully!`)
3. [ ] בדקתי ב-SQL: `SELECT * FROM game_results ORDER BY game_date DESC LIMIT 5;`

### אם יש שגיאת UUID:
1. [ ] בדקתי ב-SQL: `SELECT id, user_id FROM table_players WHERE user_id IS NULL OR user_id = 'null';`
2. [ ] אם יש תוצאות, הרצתי: `UPDATE table_players SET user_id = NULL WHERE user_id = 'null';`

---

## 📞 אם כלום לא עזר

אסף את המידע הבא:
- [ ] צילום מסך של Console (כל הלוגים)
- [ ] תוצאות SQL מהשאילתות ב-`DEBUG_GUIDE_HEB.md`
- [ ] צילום מסך של Supabase Logs (אם יש שגיאות)

---

**💡 טיפ:** תמיד שמור את Console פתוח (F12) כשאתה משחק - זה יעזור לך לראות בדיוק מה קורה!


