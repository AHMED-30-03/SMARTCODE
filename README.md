# لوحة إدارة حملات المؤثرين

نظام ويب متكامل لإدارة حملات المؤثرين، التحويلات المالية، وإصدار الإيصالات.

---

## الميزات

- **تسجيل دخول** مع 3 مستويات صلاحيات
- **رفع فواتير PDF** واستخراج بيانات المؤثرين بالذكاء الاصطناعي
- **إدارة الحملات** والمؤثرين
- **تحويلات مالية** مع توليد إيصالات PDF
- **قاعدة بيانات مشتركة** — عدة مستخدمين في نفس الوقت

---

## خطوات النشر

### الخطوة 1 — إعداد Supabase (مجاني)

1. اذهب إلى [supabase.com](https://supabase.com) وأنشئ حساباً وأنشئ مشروعاً جديداً
2. اذهب إلى **SQL Editor** → **New Query**
3. انسخ محتوى ملف `supabase-schema.sql` والصقه ثم اضغط **Run**
4. اذهب إلى **Project Settings** → **API** وانسخ:
   - `Project URL`
   - `anon public key`

### الخطوة 2 — إعداد Vercel (مجاني)

1. اذهب إلى [vercel.com](https://vercel.com) وأنشئ حساباً
2. ارفع مجلد المشروع على GitHub أو استخدم Vercel CLI:
   ```bash
   npm install -g vercel
   vercel
   ```
3. في لوحة Vercel، اذهب إلى **Settings** → **Environment Variables** وأضف:
   ```
   NEXT_PUBLIC_SUPABASE_URL = [قيمة Project URL]
   NEXT_PUBLIC_SUPABASE_ANON_KEY = [قيمة anon key]
   ```
4. أعد النشر (Redeploy)

### الخطوة 3 — إنشاء أول مستخدم (Admin)

1. في Supabase → **Authentication** → **Users** → **Add User**
2. أضف البريد وكلمة المرور
3. في **SQL Editor** شغّل:
   ```sql
   UPDATE public.profiles SET role = 'admin' WHERE email = 'your@email.com';
   ```

---

## الصلاحيات

| الصلاحية | الوصول |
|----------|--------|
| **Admin** | كل شيء + إدارة المستخدمين |
| **مدير حملات** | الحملات + المؤثرون + الإيصالات (بدون تحويلات) |
| **محاسب** | المؤثرون + التحويلات + الإيصالات |

---

## التشغيل المحلي

```bash
cp .env.local.example .env.local
# عدّل القيم في .env.local

npm install
npm run dev
```

افتح المتصفح على `http://localhost:3000`
