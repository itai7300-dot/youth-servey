# פורמלי 📋
אפליקציית סקרים ורישום לאירועים — עברית, מובייל-פרסט, מחובר ל-Google Sheets.

---

## קבצים בריפו

| קובץ | תיאור |
|------|-------|
| `index.html` | כל האתר — HTML + CSS + JavaScript בקובץ אחד |
| `apps-script.gs` | קוד ה-backend שרץ ב-Google Apps Script |

---

## הגדרה ראשונית

### שלב 1 — Google Sheet
1. פתח [sheets.google.com](https://sheets.google.com) וצור גיליון חדש
2. תן לו שם, למשל: **"פורמלי – נתונים"**

### שלב 2 — Apps Script
1. בתוך הגיליון: **Extensions → Apps Script**
2. מחק את הקוד הקיים
3. העתק את תוכן `apps-script.gs` והדבק
4. שמור (Ctrl+S)

### שלב 3 — Deploy
1. לחץ **Deploy → New deployment**
2. לחץ ⚙️ → בחר **Web app**
3. הגדרות:
   - **Execute as:** Me
   - **Who has access:** Anyone
4. לחץ **Deploy** ואשר הרשאות
5. העתק את ה-**Web App URL**

### שלב 4 — חבר את האתר
פתח את `index.html` וחפש את השורה:
```javascript
const APPS_SCRIPT_URL = 'YOUR_APPS_SCRIPT_URL_HERE';
```
החלף ב-URL שקיבלת.

### שלב 5 — העלה ל-Netlify
גרור את `index.html` לתוך [app.netlify.com](https://app.netlify.com) — זה הכל.

---

## סיסמת מנהל
ברירת מחדל: `admin123`

לשינוי — חפש בקוד:
```javascript
const ADMIN_PASSWORD = 'admin123';
```

---

## מבנה ה-Google Sheet

| לשונית | תוכן |
|--------|------|
| `_forms` | מבנה כל הטפסים (כותרת, שאלות, הגדרות) |
| `[formId]` | תשובות לכל טופס — לשונית נפרדת |
