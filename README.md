# CRAWLERS

Bu loyiha `puppeteer` kutubxonasidan foydalangan holda turli veb-saytlardan ma'lumotlarni yig'ish uchun mo'ljallangan. Loyihani kengaytirib, boshqa saytlar uchun ham moslashtirish mumkin.

## Talablar

- Node.js (v14 yoki undan yuqori)
- Yarn yoki npm

## O'rnatish

1. Repozitoriyani klonlang:

   ```bash
   git clone https://github.com/azadov-azamat/crawlers
   cd crawlers
   ```

2. Zaruriy paketlarni o'rnating:

   Yarn yordamida:

   ```bash
   yarn install
   ```

   yoki npm yordamida:

   ```bash
   npm install
   ```

## Foydalanish

1. Skriptni ishga tushirish uchun quyidagi buyruqni bajaring:

   ```bash
   node yurxizmat-docs/index.js
   ```

2. Skript `yurxizmat.uz` va boshqa qo'shilgan veb-saytlardan kategoriyalar va sub-kategoriyalarni yuklab oladi va ularni mahalliy fayl tizimida saqlaydi.

## Kengaytirish

- Yangi saytlar qo'shish uchun `index.js` faylida yangi funksiyalar yarating.
- Har bir sayt uchun alohida fayl yaratib, ularni `index.js` fayliga import qiling.
- Har bir sayt uchun maxsus `URL` va `selector`larni sozlang.

## Konfiguratsiya

- `startIndex` o'zgaruvchisini o'zgartirish orqali qaysi kategoriyadan boshlashni belgilashingiz mumkin.
- Fayllar `yurxizmat-docs` papkasida saqlanadi.

## Muammolarni hal qilish

- Agar skript ishlamay qolsa, `console.log` yordamida chiqarilgan xatoliklarni tekshiring.
- `puppeteer` bilan bog'liq muammolar uchun `PUPPETEER_EXECUTABLE_PATH` muhit o'zgaruvchisini to'g'ri sozlang.

## Hissa qo'shish

Hissa qo'shmoqchi bo'lsangiz, iltimos, `pull request` yuboring yoki `issue` oching.

## Litsenziya

Ushbu loyiha [MIT litsenziyasi](LICENSE) ostida tarqatiladi.
