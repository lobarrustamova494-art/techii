KAMERA SAHIFASINING ASOSIY MAQSADI

Kamera sahifasi tekshirmaydi.
U faqat to‘g‘ri rasm olishga majbur qiladi.

EvalBee shuni qiladi:

yomon rasmni umuman qabul qilmaydi

foydalanuvchini to‘g‘ri holatga majbur qiladi

Shu sabab:

qotib qolmaydi

xato kam

tekshiruv tez

1️⃣ REAL-TIME PREVIEW (DOIMIY ISH HOLATI)

Kamera ochilganda:

video oqim doimiy

frame’lar yengil ishlovdan o‘tadi

og‘ir OpenCV YO‘Q

Faqat:

grayscale

blur tekshiruvi

yorug‘lik tekshiruvi

Hech narsa bloklanmaydi.

2️⃣ ALIGNMENT OVERLAY (ENG MUHIM QISM)

Ekranda:

to‘rtburchak ramka

burchak markerlari

Foydalanuvchi:

varaqni shu ramkaga moslaydi

Ilova:

varaq ramkadan chiqsa → ogohlantiradi

qiyshaygan bo‘lsa → “tekislang” deydi

Bu — insonni to‘g‘ri rasm olishga majburlash.

3️⃣ FOKUS VA BLUR NAZORATI

EvalBee har frame’da buni tekshiradi:

Laplacian variance

agar past bo‘lsa → “kamera yaqinlashtiring”

Natija:

xira rasm hech qachon tekshiruvga ketmaydi

Shu sabab:

qayta-qayta xato chiqmaydi

4️⃣ YORUG‘LIK NAZORATI

EvalBee:

o‘rtacha brightness hisoblaydi

juda qorong‘i yoki juda yorug‘ bo‘lsa:

“yorug‘likni sozlang” deydi

skan tugmasi faol bo‘lmaydi

Bu juda muhim.
OMR yoritishsiz ishlamaydi.

5️⃣ AVTO-SKAN (TUGMASIZ)

EvalBee’da ko‘pincha:

“Scan” tugmasi yo‘q

sharoitlar to‘g‘ri bo‘lsa:

0.5–1 soniya kutadi

avtomatik rasm oladi

Bu:

qo‘l titrashini kamaytiradi

blur’ni yo‘q qiladi

6️⃣ BITTA FRAME — BITTA TEKSHIRUV

Muhim qoida:

faqat bitta frame olinadi

video oqim to‘xtatiladi

fon jarayonda OpenCV ishlaydi

UI qotmaydi.

Tekshiruv:

alohida thread

yoki backend’da

7️⃣ NATIJA CHIQMAGUNCHA KAMERA YO‘Q

EvalBee:

tekshiruv paytida kamerani yopadi

foydalanuvchi yana surat ololmaydi

Bu:

server yukini kamaytiradi

chalkashlikni yo‘q qiladi

8️⃣ XATO BO‘LSA — ORTGA QAYTARADI

Agar:

blank topilmasa

markerlar yo‘qolsa

savollar joyi aniqlanmasa

Ilova:

“Qayta joylashtiring”

kamerani qayta ochadi

Tekshiruvni davom ettirmaydi.

NIMA UCHUN QOTIB QOLMAYDI

Sabablar:

kamera faqat preview

og‘ir hisoblash faqat 1 marta

OpenCV video oqimda ishlamaydi

UI va processing ajratilgan

Bu — professional mobil dizayn.

XULOSA (ENG MUHIMI)

EvalBee:

kamerani aqlli qiladi

foydalanuvchini to‘g‘ri rasmga majbur qiladi

shundan keyin tekshiradi

Shu sabab:

“nega xato chiqdi?” kam

tizim ishonchli