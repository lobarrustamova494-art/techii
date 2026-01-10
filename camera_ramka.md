KAMERA RAMKASI QANDAY BO‘LADI
Ko‘rinishi

Ekran markazida katta to‘rtburchak

To‘rt burchagida aniq markerlar

Ramka ichida faqat imtihon varag‘i sig‘adi

Tashqi hudud qoraroq (dimmed)

Bu foydalanuvchining ko‘zini majburan markazga olib keladi.

RAMKANING ASOSIY VAZIFALARI
1. JOYLASHUVNI MAJBURLASH

Varaq ramkadan chiqsa → skan yo‘q

To‘liq kirmasa → tekshiruv yo‘q

EvalBee shunday deydi:
“Avval to‘g‘ri joylashtir, keyin tekshiraman.”

2. QIYSHAYISHNI NAZORAT QILISH

Ramka ichida:

varaqning yuqori va pastki chiziqlari solishtiriladi

qiyshayish darajasi baholanadi

Agar juda qiyshiq bo‘lsa:

“Telefonni tekislang” degan signal chiqadi

3. MASOFA NAZORATI

Ramka o‘lchami:

juda yaqin kelsa → varaq sig‘maydi

juda uzoq bo‘lsa → ramkaga to‘liq to‘lmaydi

Natija:

optimal masofa avtomatik topiladi

4. REAL-TIME YENGIL TEKSHIRUV

Har frame’da faqat yengil hisoblar:

yorug‘lik yetarlimi

rasm xira emasmi

varaq ramkada bormi

Bu OpenCV’ning og‘ir qismlari emas.
Shuning uchun qotmaydi.

RAMKA QANDAY ISHLAYDI (TEXNIK)
Frontend darajasida

bu oddiy overlay

Canvas yoki SVG bilan chiziladi

Kamera oqimini to‘xtatmaydi

Backend / Processing darajasida

Ramka ichidagi hudud:

ROI sifatida olinadi

faqat shu joy tekshiriladi

tashqi hudud e’tiborga olinmaydi

Bu aniqlikni oshiradi.

AVTOMATIK SKAN LOGIKASI

EvalBee’da ko‘pincha:

skan tugmasi yo‘q

ramka ichidagi holat 0.5–1 soniya barqaror bo‘lsa

rasm avtomatik olinadi

Bu:

qo‘l titrashini yo‘q qiladi

blur’ni kamaytiradi

RAMKA BO‘LMASA NIMA BO‘LADI

Ramkasiz kamera:

foydalanuvchi xohlagancha surat oladi

rasm qiyshiq

savollar joyi siljiydi

OMR ishonchsiz bo‘ladi

EvalBee bunga yo‘l qo‘ymaydi.

ENG MUHIM XULOSA

EvalBee’dagi kamera ramkasi:

dizayn emas

majburlovchi mexanizm

OMR’ning bir qismi

Agar sen EvalBee darajasida tizim qilmoqchi bo‘lsang:

ramka majburiy

ramkasiz kamera — xato yo‘l