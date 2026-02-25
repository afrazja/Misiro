/**
 * seed-basics.mjs
 * Seeds all basics categories, sections, and words into Supabase.
 *
 * Usage:
 *   node seed/seed-basics.mjs
 *
 * Requires:
 *   SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

// ============================================================
// BASICS DATA (inlined from src/lib/data/basics.ts)
// Using actual Unicode characters instead of escape sequences
// ============================================================
const basicsData = {
  pronounsAndSein: {
    icon: '👤',
    title: { en: 'Pronouns, Possessives & Verb: Sein', fa: 'ضمایر، ملکی و فعل بودن' },
    description: { en: 'Personal/object pronouns, possessives & to be', fa: 'ضمایر شخصی/مفعولی، ملکی و فعل بودن' },
    type: 'multi',
    sections: [
      {
        heading: { en: 'Personal Pronouns', fa: 'ضمایر شخصی' },
        type: 'table',
        words: [
          { german: 'ich', en: 'I', fa: 'من', example: 'Ich bin hier.', exampleEn: 'I am here.', exampleFa: 'من اینجا هستم.' },
          { german: 'du', en: 'you (informal)', fa: 'تو', example: 'Du bist nett.', exampleEn: 'You are nice.', exampleFa: 'تو مهربانی.' },
          { german: 'er', en: 'he', fa: 'او (مذکر)', example: 'Er ist groß.', exampleEn: 'He is tall.', exampleFa: 'او قد بلند است.' },
          { german: 'sie', en: 'she', fa: 'او (مؤنث)', example: 'Sie ist schön.', exampleEn: 'She is beautiful.', exampleFa: 'او زیباست.' },
          { german: 'es', en: 'it', fa: 'آن', example: 'Es ist kalt.', exampleEn: 'It is cold.', exampleFa: 'هوا سرد است.' },
          { german: 'wir', en: 'we', fa: 'ما', example: 'Wir sind Freunde.', exampleEn: 'We are friends.', exampleFa: 'ما دوست هستیم.' },
          { german: 'ihr', en: 'you (plural)', fa: 'شما (جمع)', example: 'Ihr seid toll.', exampleEn: 'You are great.', exampleFa: 'شما عالی هستید.' },
          { german: 'sie', en: 'they', fa: 'آنها', example: 'Sie sind hier.', exampleEn: 'They are here.', exampleFa: 'آنها اینجا هستند.' },
          { german: 'Sie', en: 'you (formal)', fa: 'شما (رسمی)', example: 'Sind Sie Herr Müller?', exampleEn: 'Are you Mr. Müller?', exampleFa: 'شما آقای مولر هستید؟' }
        ]
      },
      {
        heading: { en: 'Object Pronouns & Possessives', fa: 'ضمایر مفعولی و ملکی' },
        type: 'table',
        words: [
          { german: 'mich', en: 'me (accusative)', fa: 'مرا', example: 'Das Geschenk ist für mich.', exampleEn: 'The gift is for me.', exampleFa: 'هدیه برای من است.' },
          { german: 'dich', en: 'you (accusative)', fa: 'تو را', example: 'Der Brief ist für dich.', exampleEn: 'The letter is for you.', exampleFa: 'نامه برای توست.' },
          { german: 'ihn', en: 'him', fa: 'او را', example: 'Ich nehme ihn ins Kino mit.', exampleEn: "I'm taking him to the cinema.", exampleFa: 'او را به سینما می‌برم.' },
          { german: 'uns', en: 'us', fa: 'ما را', example: 'Sie sahen uns aus der Ferne.', exampleEn: 'They saw us from afar.', exampleFa: 'آنها ما را از دور دیدند.' },
          { german: 'mir', en: 'me (dative)', fa: 'به من', example: 'Es ist ein Geschenk von mir.', exampleEn: 'It is a gift from me.', exampleFa: 'این هدیه‌ای از طرف من است.' },
          { german: 'sich', en: 'oneself/themselves', fa: 'خود', example: 'Meine Tochter zieht sich an.', exampleEn: 'My daughter gets dressed.', exampleFa: 'دخترم لباس می‌پوشد.' },
          { german: 'mein', en: 'my (masc/neut)', fa: 'مال من', example: 'Es ist mein Hut.', exampleEn: 'It is my hat.', exampleFa: 'این کلاه من است.' },
          { german: 'meine', en: 'my (fem/pl)', fa: 'مال من', example: 'Meine Familie ist toll.', exampleEn: 'My family is great.', exampleFa: 'خانواده من عالی است.' },
          { german: 'dein', en: 'your (masc/neut)', fa: 'مال تو', example: 'Dein Hund ist sehr klug.', exampleEn: 'Your dog is very smart.', exampleFa: 'سگ تو خیلی باهوش است.' },
          { german: 'deine', en: 'your (fem/pl)', fa: 'مال تو', example: 'Deine Schwester ist nett.', exampleEn: 'Your sister is nice.', exampleFa: 'خواهرت مهربان است.' }
        ]
      },
      {
        heading: { en: 'Verb: Sein (To Be)', fa: 'فعل بودن' },
        type: 'conjugation',
        infinitive: { german: 'sein', en: 'to be', fa: 'بودن' },
        tenses: [
          {
            name: { en: 'Present (Präsens)', fa: 'حال (Präsens)' },
            forms: [
              { pronoun: 'ich', verb: 'bin', en: 'I am', fa: 'من هستم', example: 'Ich bin Deutschlehrer.', exampleEn: 'I am a German teacher.', exampleFa: 'من معلم آلمانی هستم.' },
              { pronoun: 'du', verb: 'bist', en: 'you are', fa: 'تو هستی', example: 'Du bist eine ruhige Person.', exampleEn: 'You are a quiet person.', exampleFa: 'تو آدم آرامی هستی.' },
              { pronoun: 'er/sie/es', verb: 'ist', en: 'he/she/it is', fa: 'او/آن هست', example: 'Er ist groß.', exampleEn: 'He is tall.', exampleFa: 'او قد بلند است.' },
              { pronoun: 'wir', verb: 'sind', en: 'we are', fa: 'ما هستیم', example: 'Wir sind Brüder.', exampleEn: 'We are brothers.', exampleFa: 'ما برادر هستیم.' },
              { pronoun: 'ihr', verb: 'seid', en: 'you are', fa: 'شما هستید', example: 'Ihr seid toll.', exampleEn: 'You are great.', exampleFa: 'شما عالی هستید.' },
              { pronoun: 'sie/Sie', verb: 'sind', en: 'they/you are', fa: 'آنها/شما هستند', example: 'Sie sind hier.', exampleEn: 'They are here.', exampleFa: 'آنها اینجا هستند.' }
            ]
          },
          {
            name: { en: 'Simple Past (Präteritum)', fa: 'گذشته ساده (Präteritum)' },
            forms: [
              { pronoun: 'ich', verb: 'war', en: 'I was', fa: 'من بودم', example: 'Ich war müde.', exampleEn: 'I was tired.', exampleFa: 'من خسته بودم.' },
              { pronoun: 'du', verb: 'warst', en: 'you were', fa: 'تو بودی', example: 'Du warst sehr nett.', exampleEn: 'You were very nice.', exampleFa: 'تو خیلی مهربان بودی.' },
              { pronoun: 'er/sie/es', verb: 'war', en: 'he/she/it was', fa: 'او/آن بود', example: 'Es war kalt.', exampleEn: 'It was cold.', exampleFa: 'هوا سرد بود.' },
              { pronoun: 'wir', verb: 'waren', en: 'we were', fa: 'ما بودیم', example: 'Wir waren in Berlin.', exampleEn: 'We were in Berlin.', exampleFa: 'ما در برلین بودیم.' },
              { pronoun: 'ihr', verb: 'wart', en: 'you were', fa: 'شما بودید', example: 'Ihr wart toll.', exampleEn: 'You were great.', exampleFa: 'شما عالی بودید.' },
              { pronoun: 'sie/Sie', verb: 'waren', en: 'they/you were', fa: 'آنها/شما بودند', example: 'Sie waren Freunde.', exampleEn: 'They were friends.', exampleFa: 'آنها دوست بودند.' }
            ]
          },
          {
            name: { en: 'Present Perfect (Perfekt)', fa: 'ماضی نقلی (Perfekt)' },
            forms: [
              { pronoun: 'ich', verb: 'bin gewesen', en: 'I have been', fa: 'من بوده‌ام', example: 'Ich bin in Paris gewesen.', exampleEn: 'I have been to Paris.', exampleFa: 'من در پاریس بوده‌ام.' },
              { pronoun: 'du', verb: 'bist gewesen', en: 'you have been', fa: 'تو بوده‌ای', example: 'Du bist dort gewesen.', exampleEn: 'You have been there.', exampleFa: 'تو آنجا بوده‌ای.' },
              { pronoun: 'er/sie/es', verb: 'ist gewesen', en: 'he/she/it has been', fa: 'او بوده است', example: 'Es ist schön gewesen.', exampleEn: 'It has been nice.', exampleFa: 'خوب بوده است.' },
              { pronoun: 'wir', verb: 'sind gewesen', en: 'we have been', fa: 'ما بوده‌ایم', example: 'Wir sind dort gewesen.', exampleEn: 'We have been there.', exampleFa: 'ما آنجا بوده‌ایم.' },
              { pronoun: 'ihr', verb: 'seid gewesen', en: 'you have been', fa: 'شما بوده‌اید', example: 'Ihr seid da gewesen.', exampleEn: 'You have been there.', exampleFa: 'شما آنجا بوده‌اید.' },
              { pronoun: 'sie/Sie', verb: 'sind gewesen', en: 'they/you have been', fa: 'آنها بوده‌اند', example: 'Sie sind krank gewesen.', exampleEn: 'They have been sick.', exampleFa: 'آنها مریض بوده‌اند.' }
            ]
          }
        ]
      }
    ]
  },
  articles: {
    icon: '📝',
    title: { en: 'Articles', fa: 'حروف تعریف' },
    description: { en: 'German has 3 genders - learn the articles!', fa: 'آلمانی ۳ جنسیت دارد - حروف تعریف را یاد بگیرید!' },
    type: 'grid',
    words: [
      { german: 'der', en: 'the (masculine)', fa: 'این (مذکر)', example: 'Der Mann ist groß.', exampleEn: 'The man is tall.', exampleFa: 'مرد قد بلند است.' },
      { german: 'die', en: 'the (feminine)', fa: 'این (مؤنث)', example: 'Die Frau liest ein Buch.', exampleEn: 'The woman reads a book.', exampleFa: 'زن یک کتاب می‌خواند.' },
      { german: 'das', en: 'the (neuter)', fa: 'این (خنثی)', example: 'Das Kind spielt draußen.', exampleEn: 'The child plays outside.', exampleFa: 'بچه بیرون بازی می‌کند.' },
      { german: 'ein', en: 'a/an (masc/neut)', fa: 'یک (مذکر/خنثی)', example: 'Ich lese ein Buch.', exampleEn: 'I am reading a book.', exampleFa: 'من یک کتاب می‌خوانم.' },
      { german: 'eine', en: 'a/an (feminine)', fa: 'یک (مؤنث)', example: 'Das ist eine schöne Blume.', exampleEn: 'That is a beautiful flower.', exampleFa: 'آن یک گل زیباست.' }
    ]
  },
  conjunctions: {
    icon: '🔗',
    title: { en: 'Conjunctions', fa: 'حروف ربط' },
    description: { en: 'Connect words, phrases, and clauses', fa: 'کلمات، عبارات و جملات را به هم وصل می‌کنند' },
    type: 'grid',
    words: [
      { german: 'und', en: 'and', fa: 'و', example: 'Ich und du.', exampleEn: 'Me and you.', exampleFa: 'من و تو.' },
      { german: 'oder', en: 'or', fa: 'یا', example: 'Ja oder nein?', exampleEn: 'Yes or no?', exampleFa: 'بله یا نه؟' },
      { german: 'aber', en: 'but', fa: 'اما', example: 'Klein, aber fein.', exampleEn: 'Small but fine.', exampleFa: 'کوچک، اما خوب.' },
      { german: 'denn', en: 'because/for', fa: 'زیرا', example: 'Ich bleibe, denn es regnet.', exampleEn: "I stay because it's raining.", exampleFa: 'می‌مانم زیرا باران می‌بارد.' },
      { german: 'sondern', en: 'but rather', fa: 'بلکه', example: 'Nicht ich, sondern er.', exampleEn: 'Not me, but him.', exampleFa: 'نه من، بلکه او.' },
      { german: 'doch', en: 'however/yet', fa: 'با این حال', example: 'Es ist teuer, doch gut.', exampleEn: "It's expensive, yet good.", exampleFa: 'گران است، با این حال خوب است.' },
      { german: 'also', en: 'so/therefore', fa: 'پس/بنابراین', example: 'Also gut!', exampleEn: 'Alright then!', exampleFa: 'خب باشه!' },
      { german: 'sowohl...als auch', en: 'both...and', fa: 'هم...هم', example: 'Sowohl Deutsch als auch Englisch.', exampleEn: 'Both German and English.', exampleFa: 'هم آلمانی هم انگلیسی.' },
      { german: 'entweder...oder', en: 'either...or', fa: 'یا...یا', example: 'Entweder heute oder morgen.', exampleEn: 'Either today or tomorrow.', exampleFa: 'یا امروز یا فردا.' },
      { german: 'weder...noch', en: 'neither...nor', fa: 'نه...نه', example: 'Weder hier noch dort.', exampleEn: 'Neither here nor there.', exampleFa: 'نه اینجا نه آنجا.' },
      { german: 'nicht nur...sondern auch', en: 'not only...but also', fa: 'نه تنها...بلکه', example: 'Nicht nur schön, sondern auch klug.', exampleEn: 'Not only beautiful but also smart.', exampleFa: 'نه تنها زیبا، بلکه باهوش هم.' },
      { german: 'deshalb', en: 'therefore', fa: 'به همین دلیل', example: 'Deshalb bin ich hier.', exampleEn: "That's why I'm here.", exampleFa: 'به همین دلیل من اینجا هستم.' }
    ]
  },
  numbers: {
    icon: '🔢',
    title: { en: 'Numbers 1-20', fa: 'اعداد ۱ تا ۲۰' },
    description: { en: 'Learn to count in German', fa: 'شمردن به آلمانی را یاد بگیرید' },
    type: 'grid',
    words: [
      { german: 'eins', en: '1', fa: '۱', example: 'Ich habe eins.', exampleEn: 'I have one.', exampleFa: 'من یکی دارم.' },
      { german: 'zwei', en: '2', fa: '۲', example: 'Ich habe zwei Hunde.', exampleEn: 'I have two dogs.', exampleFa: 'من دو سگ دارم.' },
      { german: 'drei', en: '3', fa: '۳', example: 'Drei Kinder spielen.', exampleEn: 'Three children are playing.', exampleFa: 'سه بچه بازی می‌کنند.' },
      { german: 'vier', en: '4', fa: '۴', example: 'Ein Tisch hat vier Beine.', exampleEn: 'A table has four legs.', exampleFa: 'یک میز چهار پایه دارد.' },
      { german: 'fünf', en: '5', fa: '۵', example: 'Fünf Finger an einer Hand.', exampleEn: 'Five fingers on a hand.', exampleFa: 'پنج انگشت در یک دست.' },
      { german: 'sechs', en: '6', fa: '۶', example: 'Es ist sechs Uhr.', exampleEn: "It is six o'clock.", exampleFa: 'ساعت شش است.' },
      { german: 'sieben', en: '7', fa: '۷', example: 'Die Woche hat sieben Tage.', exampleEn: 'A week has seven days.', exampleFa: 'یک هفته هفت روز دارد.' },
      { german: 'acht', en: '8', fa: '۸', example: 'Ich arbeite acht Stunden.', exampleEn: 'I work eight hours.', exampleFa: 'من هشت ساعت کار می‌کنم.' },
      { german: 'neun', en: '9', fa: '۹', example: 'Der Kurs beginnt um neun.', exampleEn: 'The course starts at nine.', exampleFa: 'دوره ساعت نه شروع می‌شود.' },
      { german: 'zehn', en: '10', fa: '۱۰', example: 'Ich zähle bis zehn.', exampleEn: 'I count to ten.', exampleFa: 'من تا ده می‌شمارم.' },
      { german: 'elf', en: '11', fa: '۱۱', example: 'Ein Team hat elf Spieler.', exampleEn: 'A team has eleven players.', exampleFa: 'یک تیم یازده بازیکن دارد.' },
      { german: 'zwölf', en: '12', fa: '۱۲', example: 'Ein Jahr hat zwölf Monate.', exampleEn: 'A year has twelve months.', exampleFa: 'یک سال دوازده ماه دارد.' },
      { german: 'dreizehn', en: '13', fa: '۱۳', example: 'Er ist dreizehn Jahre alt.', exampleEn: 'He is thirteen years old.', exampleFa: 'او سیزده ساله است.' },
      { german: 'vierzehn', en: '14', fa: '۱۴', example: 'In vierzehn Tagen.', exampleEn: 'In fourteen days.', exampleFa: 'در چهارده روز.' },
      { german: 'fünfzehn', en: '15', fa: '۱۵', example: 'Der Bus kommt in fünfzehn Minuten.', exampleEn: 'The bus comes in fifteen minutes.', exampleFa: 'اتوبوس در پانزده دقیقه می‌آید.' },
      { german: 'sechzehn', en: '16', fa: '۱۶', example: 'Sie ist sechzehn.', exampleEn: 'She is sixteen.', exampleFa: 'او شانزده ساله است.' },
      { german: 'siebzehn', en: '17', fa: '۱۷', example: 'Siebzehn Schüler in der Klasse.', exampleEn: 'Seventeen students in the class.', exampleFa: 'هفده دانش‌آموز در کلاس.' },
      { german: 'achtzehn', en: '18', fa: '۱۸', example: 'Mit achtzehn ist man erwachsen.', exampleEn: 'At eighteen you are an adult.', exampleFa: 'در هجده سالگی بزرگسال هستید.' },
      { german: 'neunzehn', en: '19', fa: '۱۹', example: 'Neunzehn Euro bitte.', exampleEn: 'Nineteen euros please.', exampleFa: 'نوزده یورو لطفاً.' },
      { german: 'zwanzig', en: '20', fa: '۲۰', example: 'Er ist zwanzig Jahre alt.', exampleEn: 'He is twenty years old.', exampleFa: 'او بیست ساله است.' }
    ]
  },
  colors: {
    icon: '🎨',
    title: { en: 'Colors', fa: 'رنگ‌ها' },
    description: { en: 'Basic colors in German', fa: 'رنگ‌های پایه به آلمانی' },
    type: 'grid',
    words: [
      { german: 'rot', en: 'red', fa: 'قرمز', example: 'Die Rose ist rot.', exampleEn: 'The rose is red.', exampleFa: 'گل رز قرمز است.' },
      { german: 'blau', en: 'blue', fa: 'آبی', example: 'Der Himmel ist blau.', exampleEn: 'The sky is blue.', exampleFa: 'آسمان آبی است.' },
      { german: 'grün', en: 'green', fa: 'سبز', example: 'Das Gras ist grün.', exampleEn: 'The grass is green.', exampleFa: 'چمن سبز است.' },
      { german: 'gelb', en: 'yellow', fa: 'زرد', example: 'Die Sonne ist gelb.', exampleEn: 'The sun is yellow.', exampleFa: 'خورشید زرد است.' },
      { german: 'orange', en: 'orange', fa: 'نارنجی', example: 'Die Orange ist orange.', exampleEn: 'The orange is orange.', exampleFa: 'پرتقال نارنجی است.' },
      { german: 'lila', en: 'purple', fa: 'بنفش', example: 'Ihre Bluse ist lila.', exampleEn: 'Her blouse is purple.', exampleFa: 'بلوز او بنفش است.' },
      { german: 'rosa', en: 'pink', fa: 'صورتی', example: 'Das Baby trägt rosa.', exampleEn: 'The baby wears pink.', exampleFa: 'نوزاد صورتی پوشیده.' },
      { german: 'schwarz', en: 'black', fa: 'سیاه', example: 'Die Katze ist schwarz.', exampleEn: 'The cat is black.', exampleFa: 'گربه سیاه است.' },
      { german: 'weiß', en: 'white', fa: 'سفید', example: 'Der Schnee ist weiß.', exampleEn: 'The snow is white.', exampleFa: 'برف سفید است.' },
      { german: 'grau', en: 'gray', fa: 'خاکستری', example: 'Der Elefant ist grau.', exampleEn: 'The elephant is gray.', exampleFa: 'فیل خاکستری است.' },
      { german: 'braun', en: 'brown', fa: 'قهوه‌ای', example: 'Der Bär ist braun.', exampleEn: 'The bear is brown.', exampleFa: 'خرس قهوه‌ای است.' }
    ]
  },
  days: {
    icon: '📅',
    title: { en: 'Days of the Week', fa: 'روزهای هفته' },
    description: { en: 'Monday to Sunday', fa: 'دوشنبه تا یکشنبه' },
    type: 'grid',
    words: [
      { german: 'Montag', en: 'Monday', fa: 'دوشنبه', example: 'Am Montag gehe ich arbeiten.', exampleEn: 'On Monday I go to work.', exampleFa: 'دوشنبه من سر کار می‌روم.' },
      { german: 'Dienstag', en: 'Tuesday', fa: 'سه‌شنبه', example: 'Dienstag habe ich Deutschkurs.', exampleEn: 'On Tuesday I have German class.', exampleFa: 'سه‌شنبه کلاس آلمانی دارم.' },
      { german: 'Mittwoch', en: 'Wednesday', fa: 'چهارشنبه', example: 'Mittwoch ist die Mitte der Woche.', exampleEn: 'Wednesday is the middle of the week.', exampleFa: 'چهارشنبه وسط هفته است.' },
      { german: 'Donnerstag', en: 'Thursday', fa: 'پنج‌شنبه', example: 'Am Donnerstag gehen wir einkaufen.', exampleEn: 'On Thursday we go shopping.', exampleFa: 'پنج‌شنبه خرید می‌رویم.' },
      { german: 'Freitag', en: 'Friday', fa: 'جمعه', example: 'Freitag ist mein Lieblingstag.', exampleEn: 'Friday is my favorite day.', exampleFa: 'جمعه روز مورد علاقه من است.' },
      { german: 'Samstag', en: 'Saturday', fa: 'شنبه', example: 'Am Samstag schlafe ich lange.', exampleEn: 'On Saturday I sleep in.', exampleFa: 'شنبه زیاد می‌خوابم.' },
      { german: 'Sonntag', en: 'Sunday', fa: 'یکشنبه', example: 'Sonntag ist Ruhetag.', exampleEn: 'Sunday is a rest day.', exampleFa: 'یکشنبه روز استراحت است.' }
    ]
  },
  months: {
    icon: '🗓️',
    title: { en: 'Months', fa: 'ماه‌ها' },
    description: { en: 'January to December', fa: 'ژانویه تا دسامبر' },
    type: 'grid',
    words: [
      { german: 'Januar', en: 'January', fa: 'ژانویه', example: 'Im Januar schneit es oft.', exampleEn: 'It often snows in January.', exampleFa: 'در ژانویه اغلب برف می‌بارد.' },
      { german: 'Februar', en: 'February', fa: 'فوریه', example: 'Februar ist kurz.', exampleEn: 'February is short.', exampleFa: 'فوریه کوتاه است.' },
      { german: 'März', en: 'March', fa: 'مارس', example: 'Im März wird es wärmer.', exampleEn: 'It gets warmer in March.', exampleFa: 'در مارس هوا گرم‌تر می‌شود.' },
      { german: 'April', en: 'April', fa: 'آوریل', example: 'April macht was er will.', exampleEn: 'April does what it wants.', exampleFa: 'آوریل هر کاری دلش بخواهد می‌کند.' },
      { german: 'Mai', en: 'May', fa: 'مه', example: 'Im Mai blühen die Blumen.', exampleEn: 'Flowers bloom in May.', exampleFa: 'در ماه مه گل‌ها شکوفا می‌شوند.' },
      { german: 'Juni', en: 'June', fa: 'ژوئن', example: 'Im Juni beginnt der Sommer.', exampleEn: 'Summer starts in June.', exampleFa: 'در ژوئن تابستان شروع می‌شود.' },
      { german: 'Juli', en: 'July', fa: 'ژوئیه', example: 'Juli ist sehr heiß.', exampleEn: 'July is very hot.', exampleFa: 'ژوئیه خیلی گرم است.' },
      { german: 'August', en: 'August', fa: 'اوت', example: 'Im August machen wir Urlaub.', exampleEn: 'In August we go on vacation.', exampleFa: 'در اوت به تعطیلات می‌رویم.' },
      { german: 'September', en: 'September', fa: 'سپتامبر', example: 'Die Schule beginnt im September.', exampleEn: 'School starts in September.', exampleFa: 'مدرسه در سپتامبر شروع می‌شود.' },
      { german: 'Oktober', en: 'October', fa: 'اکتبر', example: 'Im Oktober fallen die Blätter.', exampleEn: 'Leaves fall in October.', exampleFa: 'در اکتبر برگ‌ها می‌ریزند.' },
      { german: 'November', en: 'November', fa: 'نوامبر', example: 'November ist oft neblig.', exampleEn: 'November is often foggy.', exampleFa: 'نوامبر اغلب مه‌آلود است.' },
      { german: 'Dezember', en: 'December', fa: 'دسامبر', example: 'Im Dezember feiern wir Weihnachten.', exampleEn: 'In December we celebrate Christmas.', exampleFa: 'در دسامبر کریسمس را جشن می‌گیریم.' }
    ]
  },
  prepositions: {
    icon: '📍',
    title: { en: 'Prepositions', fa: 'حروف اضافه' },
    description: { en: 'Words describing relationships in space, time, and logic', fa: 'کلماتی که رابطه مکان، زمان و منطق را توصیف می‌کنند' },
    type: 'grid',
    words: [
      { german: 'für', en: 'for', fa: 'برای', example: 'Das ist für dich.', exampleEn: 'This is for you.', exampleFa: 'این برای توست.' },
      { german: 'bis', en: 'until', fa: 'تا', example: 'Ich arbeite bis acht Uhr.', exampleEn: "I work until eight o'clock.", exampleFa: 'من تا ساعت هشت کار می‌کنم.' },
      { german: 'in', en: 'in', fa: 'در', example: 'Ich komme in zwei Stunden zurück.', exampleEn: "I'll be back in two hours.", exampleFa: 'دو ساعت دیگر برمی‌گردم.' },
      { german: 'aus', en: 'from/out of', fa: 'از', example: 'Ich komme aus Berlin.', exampleEn: 'I come from Berlin.', exampleFa: 'من اهل برلین هستم.' },
      { german: 'mit', en: 'with', fa: 'با', example: 'Sie spielen mit einem Hund.', exampleEn: 'They play with a dog.', exampleFa: 'آنها با یک سگ بازی می‌کنند.' },
      { german: 'nach', en: 'to/after', fa: 'به/بعد از', example: 'Ich fahre nach Genf.', exampleEn: "I'm going to Geneva.", exampleFa: 'من به ژنو می‌روم.' },
      { german: 'auf', en: 'on', fa: 'روی', example: 'Das Buch liegt auf dem Tisch.', exampleEn: 'The book is on the table.', exampleFa: 'کتاب روی میز است.' },
      { german: 'über', en: 'over/about', fa: 'بالای/درباره', example: 'Das Flugzeug fliegt über den Berg.', exampleEn: 'The plane flies over the mountain.', exampleFa: 'هواپیما از بالای کوه پرواز می‌کند.' },
      { german: 'dann', en: 'then', fa: 'سپس', example: 'Ich gehe dann mal los.', exampleEn: "I'll get going then.", exampleFa: 'پس من دیگر می‌روم.' },
      { german: 'vielleicht', en: 'maybe', fa: 'شاید', example: 'Vielleicht komme ich morgen.', exampleEn: "Maybe I'll come tomorrow.", exampleFa: 'شاید فردا بیایم.' },
      { german: 'auch', en: 'also/too', fa: 'همچنین', example: 'Er hat auch viel Talent.', exampleEn: 'He also has a lot of talent.', exampleFa: 'او همچنین استعداد زیادی دارد.' },
      { german: 'nicht', en: 'not', fa: 'نه/نیست', example: 'Mein Name ist nicht Hendrik.', exampleEn: 'My name is not Hendrik.', exampleFa: 'اسم من هندریک نیست.' }
    ]
  },
  cases: {
    icon: '📋',
    title: { en: 'Cases (Fälle)', fa: 'حالت\u200Cهای دستوری' },
    description: { en: 'Nominative, Accusative, Dative & Genitive', fa: 'فاعلی، مفعولی، متممی و اضافی' },
    type: 'multi',
    sections: [
      {
        heading: { en: 'Definite Articles (Bestimmte Artikel)', fa: 'حروف تعریف معین' },
        type: 'declension',
        declension: {
          columns: [
            { de: 'Maskulin', en: 'Masculine', fa: 'مذکر' },
            { de: 'Feminin', en: 'Feminine', fa: 'مؤنث' },
            { de: 'Neutrum', en: 'Neuter', fa: 'خنثی' },
            { de: 'Plural', en: 'Plural', fa: 'جمع' }
          ],
          rows: [
            { label: { de: 'Nominativ', en: 'Nominative', fa: 'فاعلی' }, forms: ['der', 'die', 'das', 'die'], example: 'Der Mann kauft Brot.', exampleEn: 'The man buys bread.', exampleFa: 'مرد نان می\u200Cخرد.' },
            { label: { de: 'Akkusativ', en: 'Accusative', fa: 'مفعولی' }, forms: ['den', 'die', 'das', 'die'], example: 'Ich sehe den Mann.', exampleEn: 'I see the man.', exampleFa: 'من مرد را می\u200Cبینم.' },
            { label: { de: 'Dativ', en: 'Dative', fa: 'متممی' }, forms: ['dem', 'der', 'dem', 'den'], example: 'Ich gebe dem Mann das Buch.', exampleEn: 'I give the man the book.', exampleFa: 'من کتاب را به مرد می\u200Cدهم.' },
            { label: { de: 'Genitiv', en: 'Genitive', fa: 'اضافی' }, forms: ['des', 'der', 'des', 'der'], example: 'Das Auto des Mannes ist rot.', exampleEn: "The man's car is red.", exampleFa: 'ماشین مرد قرمز است.' }
          ]
        }
      },
      {
        heading: { en: 'Indefinite Articles (Unbestimmte Artikel)', fa: 'حروف تعریف نامعین' },
        type: 'declension',
        declension: {
          columns: [
            { de: 'Maskulin', en: 'Masculine', fa: 'مذکر' },
            { de: 'Feminin', en: 'Feminine', fa: 'مؤنث' },
            { de: 'Neutrum', en: 'Neuter', fa: 'خنثی' }
          ],
          rows: [
            { label: { de: 'Nominativ', en: 'Nominative', fa: 'فاعلی' }, forms: ['ein', 'eine', 'ein'], example: 'Ein Mann steht dort.', exampleEn: 'A man stands there.', exampleFa: 'یک مرد آنجا ایستاده.' },
            { label: { de: 'Akkusativ', en: 'Accusative', fa: 'مفعولی' }, forms: ['einen', 'eine', 'ein'], example: 'Ich kaufe einen Hund.', exampleEn: 'I buy a dog.', exampleFa: 'من یک سگ می\u200Cخرم.' },
            { label: { de: 'Dativ', en: 'Dative', fa: 'متممی' }, forms: ['einem', 'einer', 'einem'], example: 'Ich gebe einem Kind das Spielzeug.', exampleEn: 'I give a child the toy.', exampleFa: 'من اسباب\u200Cبازی را به یک بچه می\u200Cدهم.' },
            { label: { de: 'Genitiv', en: 'Genitive', fa: 'اضافی' }, forms: ['eines', 'einer', 'eines'], example: 'Das Spielzeug eines Kindes.', exampleEn: "A child's toy.", exampleFa: 'اسباب\u200Cبازی یک بچه.' }
          ]
        }
      },
      {
        heading: { en: 'Personal Pronouns by Case', fa: 'ضمایر شخصی بر اساس حالت' },
        type: 'declension',
        declension: {
          columns: [
            { de: 'Nominativ', en: 'Nominative', fa: 'فاعلی' },
            { de: 'Akkusativ', en: 'Accusative', fa: 'مفعولی' },
            { de: 'Dativ', en: 'Dative', fa: 'متممی' }
          ],
          rows: [
            { label: { de: 'ich', en: 'I', fa: 'من' }, forms: ['ich', 'mich', 'mir'], example: 'Er gibt mir das Buch.', exampleEn: 'He gives me the book.', exampleFa: 'او کتاب را به من می\u200Cدهد.' },
            { label: { de: 'du', en: 'you (inf.)', fa: 'تو' }, forms: ['du', 'dich', 'dir'], example: 'Ich helfe dir gern.', exampleEn: 'I gladly help you.', exampleFa: 'من با کمال میل به تو کمک می\u200Cکنم.' },
            { label: { de: 'er', en: 'he', fa: 'او (مذکر)' }, forms: ['er', 'ihn', 'ihm'], example: 'Ich sehe ihn jeden Tag.', exampleEn: 'I see him every day.', exampleFa: 'من هر روز او را می\u200Cبینم.' },
            { label: { de: 'sie', en: 'she', fa: 'او (مؤنث)' }, forms: ['sie', 'sie', 'ihr'], example: 'Ich gebe ihr die Blumen.', exampleEn: 'I give her the flowers.', exampleFa: 'من گل\u200Cها را به او می\u200Cدهم.' },
            { label: { de: 'es', en: 'it', fa: 'آن' }, forms: ['es', 'es', 'ihm'], example: 'Ich gebe ihm Wasser.', exampleEn: 'I give it water.', exampleFa: 'من به آن آب می\u200Cدهم.' },
            { label: { de: 'wir', en: 'we', fa: 'ما' }, forms: ['wir', 'uns', 'uns'], example: 'Er hilft uns immer.', exampleEn: 'He always helps us.', exampleFa: 'او همیشه به ما کمک می\u200Cکند.' },
            { label: { de: 'ihr', en: 'you (pl.)', fa: 'شما (جمع)' }, forms: ['ihr', 'euch', 'euch'], example: 'Ich bringe euch Kaffee.', exampleEn: 'I bring you (all) coffee.', exampleFa: 'من برای شما قهوه می\u200Cآورم.' },
            { label: { de: 'sie/Sie', en: 'they / you (formal)', fa: 'آنها / شما (رسمی)' }, forms: ['sie/Sie', 'sie/Sie', 'ihnen/Ihnen'], example: 'Ich danke Ihnen sehr.', exampleEn: 'I thank you very much.', exampleFa: 'من بسیار از شما متشکرم.' }
          ]
        }
      },
      {
        heading: { en: 'Key Vocabulary', fa: 'واژگان کلیدی' },
        type: 'grid',
        words: [
          { german: 'der Mann', en: 'the man', fa: 'مرد', example: 'Der Mann trinkt Kaffee.', exampleEn: 'The man drinks coffee.', exampleFa: 'مرد قهوه می\u200Cنوشد.' },
          { german: 'die Frau', en: 'the woman', fa: 'زن', example: 'Die Frau liest ein Buch.', exampleEn: 'The woman reads a book.', exampleFa: 'زن یک کتاب می\u200Cخواند.' },
          { german: 'das Kind', en: 'the child', fa: 'بچه', example: 'Das Kind spielt im Garten.', exampleEn: 'The child plays in the garden.', exampleFa: 'بچه در باغ بازی می\u200Cکند.' },
          { german: 'der Hund', en: 'the dog', fa: 'سگ', example: 'Der Hund läuft schnell.', exampleEn: 'The dog runs fast.', exampleFa: 'سگ تند می\u200Cدود.' },
          { german: 'die Katze', en: 'the cat', fa: 'گربه', example: 'Die Katze schläft gern.', exampleEn: 'The cat likes to sleep.', exampleFa: 'گربه دوست دارد بخوابد.' },
          { german: 'das Buch', en: 'the book', fa: 'کتاب', example: 'Das Buch ist interessant.', exampleEn: 'The book is interesting.', exampleFa: 'کتاب جالب است.' },
          { german: 'der Tisch', en: 'the table', fa: 'میز', example: 'Der Tisch ist aus Holz.', exampleEn: 'The table is made of wood.', exampleFa: 'میز از چوب است.' },
          { german: 'die Tür', en: 'the door', fa: 'در', example: 'Die Tür ist offen.', exampleEn: 'The door is open.', exampleFa: 'در باز است.' },
          { german: 'das Haus', en: 'the house', fa: 'خانه', example: 'Das Haus ist groß.', exampleEn: 'The house is big.', exampleFa: 'خانه بزرگ است.' },
          { german: 'der Kaffee', en: 'the coffee', fa: 'قهوه', example: 'Der Kaffee ist heiß.', exampleEn: 'The coffee is hot.', exampleFa: 'قهوه داغ است.' }
        ]
      }
    ]
  },
  verbConjugation: {
    icon: '🔄',
    title: { en: 'Verb Conjugation (Present Tense)', fa: 'صرف فعل (زمان حال)' },
    description: { en: 'Essential verbs conjugated in the present tense', fa: 'افعال ضروری صرف شده در زمان حال' },
    type: 'multi',
    sections: [
      {
        heading: { en: 'haben (to have)', fa: 'haben (داشتن)' },
        type: 'conjugation',
        infinitive: { german: 'haben', en: 'to have', fa: 'داشتن' },
        tenses: [
          {
            name: { en: 'Present (Präsens)', fa: 'حال (Präsens)' },
            forms: [
              { pronoun: 'ich', verb: 'habe', en: 'I have', fa: 'من دارم', example: 'Ich habe einen Hund.', exampleEn: 'I have a dog.', exampleFa: 'من یک سگ دارم.' },
              { pronoun: 'du', verb: 'hast', en: 'you have', fa: 'تو داری', example: 'Du hast recht.', exampleEn: 'You are right.', exampleFa: 'تو حق داری.' },
              { pronoun: 'er/sie/es', verb: 'hat', en: 'he/she/it has', fa: 'او/آن دارد', example: 'Er hat keine Zeit.', exampleEn: 'He has no time.', exampleFa: 'او وقت ندارد.' },
              { pronoun: 'wir', verb: 'haben', en: 'we have', fa: 'ما داریم', example: 'Wir haben Hunger.', exampleEn: 'We are hungry.', exampleFa: 'ما گرسنه هستیم.' },
              { pronoun: 'ihr', verb: 'habt', en: 'you have', fa: 'شما دارید', example: 'Ihr habt ein schönes Haus.', exampleEn: 'You have a beautiful house.', exampleFa: 'شما خانه زیبایی دارید.' },
              { pronoun: 'sie/Sie', verb: 'haben', en: 'they/you have', fa: 'آنها/شما دارند', example: 'Sie haben zwei Kinder.', exampleEn: 'They have two children.', exampleFa: 'آنها دو فرزند دارند.' }
            ]
          }
        ]
      },
      {
        heading: { en: 'machen (to do/make)', fa: 'machen (انجام دادن/ساختن)' },
        type: 'conjugation',
        infinitive: { german: 'machen', en: 'to do / to make', fa: 'انجام دادن / ساختن' },
        tenses: [
          {
            name: { en: 'Present (Präsens)', fa: 'حال (Präsens)' },
            forms: [
              { pronoun: 'ich', verb: 'mache', en: 'I do/make', fa: 'من انجام می‌دهم', example: 'Ich mache meine Hausaufgaben.', exampleEn: 'I do my homework.', exampleFa: 'من تکالیفم را انجام می‌دهم.' },
              { pronoun: 'du', verb: 'machst', en: 'you do/make', fa: 'تو انجام می‌دهی', example: 'Du machst das sehr gut.', exampleEn: 'You do that very well.', exampleFa: 'تو آن را خیلی خوب انجام می‌دهی.' },
              { pronoun: 'er/sie/es', verb: 'macht', en: 'he/she/it does/makes', fa: 'او انجام می‌دهد', example: 'Sie macht einen Kuchen.', exampleEn: 'She makes a cake.', exampleFa: 'او یک کیک درست می‌کند.' },
              { pronoun: 'wir', verb: 'machen', en: 'we do/make', fa: 'ما انجام می‌دهیم', example: 'Wir machen einen Ausflug.', exampleEn: 'We are going on a trip.', exampleFa: 'ما به گردش می‌رویم.' },
              { pronoun: 'ihr', verb: 'macht', en: 'you do/make', fa: 'شما انجام می‌دهید', example: 'Ihr macht das richtig.', exampleEn: 'You are doing it right.', exampleFa: 'شما آن را درست انجام می‌دهید.' },
              { pronoun: 'sie/Sie', verb: 'machen', en: 'they/you do/make', fa: 'آنها انجام می‌دهند', example: 'Sie machen Sport.', exampleEn: 'They do sports.', exampleFa: 'آنها ورزش می‌کنند.' }
            ]
          }
        ]
      },
      {
        heading: { en: 'gehen (to go)', fa: 'gehen (رفتن)' },
        type: 'conjugation',
        infinitive: { german: 'gehen', en: 'to go', fa: 'رفتن' },
        tenses: [
          {
            name: { en: 'Present (Präsens)', fa: 'حال (Präsens)' },
            forms: [
              { pronoun: 'ich', verb: 'gehe', en: 'I go', fa: 'من می‌روم', example: 'Ich gehe zur Schule.', exampleEn: 'I go to school.', exampleFa: 'من به مدرسه می‌روم.' },
              { pronoun: 'du', verb: 'gehst', en: 'you go', fa: 'تو می‌روی', example: 'Du gehst nach Hause.', exampleEn: 'You go home.', exampleFa: 'تو به خانه می‌روی.' },
              { pronoun: 'er/sie/es', verb: 'geht', en: 'he/she/it goes', fa: 'او می‌رود', example: 'Er geht ins Kino.', exampleEn: 'He goes to the cinema.', exampleFa: 'او به سینما می‌رود.' },
              { pronoun: 'wir', verb: 'gehen', en: 'we go', fa: 'ما می‌رویم', example: 'Wir gehen einkaufen.', exampleEn: 'We go shopping.', exampleFa: 'ما به خرید می‌رویم.' },
              { pronoun: 'ihr', verb: 'geht', en: 'you go', fa: 'شما می‌روید', example: 'Ihr geht in den Park.', exampleEn: 'You go to the park.', exampleFa: 'شما به پارک می‌روید.' },
              { pronoun: 'sie/Sie', verb: 'gehen', en: 'they/you go', fa: 'آنها می‌روند', example: 'Sie gehen spazieren.', exampleEn: 'They go for a walk.', exampleFa: 'آنها قدم می‌زنند.' }
            ]
          }
        ]
      },
      {
        heading: { en: 'kommen (to come)', fa: 'kommen (آمدن)' },
        type: 'conjugation',
        infinitive: { german: 'kommen', en: 'to come', fa: 'آمدن' },
        tenses: [
          {
            name: { en: 'Present (Präsens)', fa: 'حال (Präsens)' },
            forms: [
              { pronoun: 'ich', verb: 'komme', en: 'I come', fa: 'من می‌آیم', example: 'Ich komme aus dem Iran.', exampleEn: 'I come from Iran.', exampleFa: 'من اهل ایران هستم.' },
              { pronoun: 'du', verb: 'kommst', en: 'you come', fa: 'تو می‌آیی', example: 'Du kommst zu spät.', exampleEn: 'You are coming too late.', exampleFa: 'تو دیر می‌آیی.' },
              { pronoun: 'er/sie/es', verb: 'kommt', en: 'he/she/it comes', fa: 'او می‌آید', example: 'Er kommt morgen.', exampleEn: 'He comes tomorrow.', exampleFa: 'او فردا می‌آید.' },
              { pronoun: 'wir', verb: 'kommen', en: 'we come', fa: 'ما می‌آییم', example: 'Wir kommen um acht Uhr.', exampleEn: 'We come at eight o\'clock.', exampleFa: 'ما ساعت هشت می‌آییم.' },
              { pronoun: 'ihr', verb: 'kommt', en: 'you come', fa: 'شما می‌آیید', example: 'Ihr kommt aus Deutschland.', exampleEn: 'You come from Germany.', exampleFa: 'شما اهل آلمان هستید.' },
              { pronoun: 'sie/Sie', verb: 'kommen', en: 'they/you come', fa: 'آنها می‌آیند', example: 'Sie kommen bald.', exampleEn: 'They come soon.', exampleFa: 'آنها به زودی می‌آیند.' }
            ]
          }
        ]
      },
      {
        heading: { en: 'sprechen (to speak)', fa: 'sprechen (صحبت کردن)' },
        type: 'conjugation',
        infinitive: { german: 'sprechen', en: 'to speak', fa: 'صحبت کردن' },
        tenses: [
          {
            name: { en: 'Present (Präsens)', fa: 'حال (Präsens)' },
            forms: [
              { pronoun: 'ich', verb: 'spreche', en: 'I speak', fa: 'من صحبت می‌کنم', example: 'Ich spreche Deutsch.', exampleEn: 'I speak German.', exampleFa: 'من آلمانی صحبت می‌کنم.' },
              { pronoun: 'du', verb: 'sprichst', en: 'you speak', fa: 'تو صحبت می‌کنی', example: 'Du sprichst sehr gut Englisch.', exampleEn: 'You speak English very well.', exampleFa: 'تو انگلیسی را خیلی خوب صحبت می‌کنی.' },
              { pronoun: 'er/sie/es', verb: 'spricht', en: 'he/she/it speaks', fa: 'او صحبت می‌کند', example: 'Sie spricht drei Sprachen.', exampleEn: 'She speaks three languages.', exampleFa: 'او سه زبان صحبت می‌کند.' },
              { pronoun: 'wir', verb: 'sprechen', en: 'we speak', fa: 'ما صحبت می‌کنیم', example: 'Wir sprechen über das Wetter.', exampleEn: 'We talk about the weather.', exampleFa: 'ما درباره آب و هوا صحبت می‌کنیم.' },
              { pronoun: 'ihr', verb: 'sprecht', en: 'you speak', fa: 'شما صحبت می‌کنید', example: 'Ihr sprecht zu schnell.', exampleEn: 'You speak too fast.', exampleFa: 'شما خیلی تند صحبت می‌کنید.' },
              { pronoun: 'sie/Sie', verb: 'sprechen', en: 'they/you speak', fa: 'آنها صحبت می‌کنند', example: 'Sie sprechen Französisch.', exampleEn: 'They speak French.', exampleFa: 'آنها فرانسوی صحبت می‌کنند.' }
            ]
          }
        ]
      },
      {
        heading: { en: 'essen (to eat)', fa: 'essen (خوردن)' },
        type: 'conjugation',
        infinitive: { german: 'essen', en: 'to eat', fa: 'خوردن' },
        tenses: [
          {
            name: { en: 'Present (Präsens)', fa: 'حال (Präsens)' },
            forms: [
              { pronoun: 'ich', verb: 'esse', en: 'I eat', fa: 'من می‌خورم', example: 'Ich esse gern Pizza.', exampleEn: 'I like to eat pizza.', exampleFa: 'من پیتزا دوست دارم.' },
              { pronoun: 'du', verb: 'isst', en: 'you eat', fa: 'تو می‌خوری', example: 'Du isst zu schnell.', exampleEn: 'You eat too fast.', exampleFa: 'تو خیلی تند غذا می‌خوری.' },
              { pronoun: 'er/sie/es', verb: 'isst', en: 'he/she/it eats', fa: 'او می‌خورد', example: 'Er isst einen Apfel.', exampleEn: 'He eats an apple.', exampleFa: 'او یک سیب می‌خورد.' },
              { pronoun: 'wir', verb: 'essen', en: 'we eat', fa: 'ما می‌خوریم', example: 'Wir essen zusammen.', exampleEn: 'We eat together.', exampleFa: 'ما با هم غذا می‌خوریم.' },
              { pronoun: 'ihr', verb: 'esst', en: 'you eat', fa: 'شما می‌خورید', example: 'Ihr esst viel Obst.', exampleEn: 'You eat a lot of fruit.', exampleFa: 'شما میوه زیاد می‌خورید.' },
              { pronoun: 'sie/Sie', verb: 'essen', en: 'they/you eat', fa: 'آنها می‌خورند', example: 'Sie essen im Restaurant.', exampleEn: 'They eat at the restaurant.', exampleFa: 'آنها در رستوران غذا می‌خورند.' }
            ]
          }
        ]
      },
      {
        heading: { en: 'fahren (to drive/travel)', fa: 'fahren (رانندگی کردن/سفر کردن)' },
        type: 'conjugation',
        infinitive: { german: 'fahren', en: 'to drive / to travel', fa: 'رانندگی کردن / سفر کردن' },
        tenses: [
          {
            name: { en: 'Present (Präsens)', fa: 'حال (Präsens)' },
            forms: [
              { pronoun: 'ich', verb: 'fahre', en: 'I drive', fa: 'من رانندگی می‌کنم', example: 'Ich fahre mit dem Bus.', exampleEn: 'I go by bus.', exampleFa: 'من با اتوبوس می‌روم.' },
              { pronoun: 'du', verb: 'fährst', en: 'you drive', fa: 'تو رانندگی می‌کنی', example: 'Du fährst zu schnell.', exampleEn: 'You drive too fast.', exampleFa: 'تو خیلی تند رانندگی می‌کنی.' },
              { pronoun: 'er/sie/es', verb: 'fährt', en: 'he/she/it drives', fa: 'او رانندگی می‌کند', example: 'Er fährt nach Berlin.', exampleEn: 'He drives to Berlin.', exampleFa: 'او به برلین می‌رود.' },
              { pronoun: 'wir', verb: 'fahren', en: 'we drive', fa: 'ما رانندگی می‌کنیم', example: 'Wir fahren in den Urlaub.', exampleEn: 'We drive on vacation.', exampleFa: 'ما به تعطیلات می‌رویم.' },
              { pronoun: 'ihr', verb: 'fahrt', en: 'you drive', fa: 'شما رانندگی می‌کنید', example: 'Ihr fahrt mit dem Zug.', exampleEn: 'You go by train.', exampleFa: 'شما با قطار می‌روید.' },
              { pronoun: 'sie/Sie', verb: 'fahren', en: 'they/you drive', fa: 'آنها رانندگی می‌کنند', example: 'Sie fahren nach München.', exampleEn: 'They drive to Munich.', exampleFa: 'آنها به مونیخ می‌روند.' }
            ]
          }
        ]
      },
      {
        heading: { en: 'sehen (to see)', fa: 'sehen (دیدن)' },
        type: 'conjugation',
        infinitive: { german: 'sehen', en: 'to see', fa: 'دیدن' },
        tenses: [
          {
            name: { en: 'Present (Präsens)', fa: 'حال (Präsens)' },
            forms: [
              { pronoun: 'ich', verb: 'sehe', en: 'I see', fa: 'من می‌بینم', example: 'Ich sehe einen Vogel.', exampleEn: 'I see a bird.', exampleFa: 'من یک پرنده می‌بینم.' },
              { pronoun: 'du', verb: 'siehst', en: 'you see', fa: 'تو می‌بینی', example: 'Du siehst müde aus.', exampleEn: 'You look tired.', exampleFa: 'تو خسته به نظر می‌رسی.' },
              { pronoun: 'er/sie/es', verb: 'sieht', en: 'he/she/it sees', fa: 'او می‌بیند', example: 'Sie sieht einen Film.', exampleEn: 'She watches a movie.', exampleFa: 'او یک فیلم می‌بیند.' },
              { pronoun: 'wir', verb: 'sehen', en: 'we see', fa: 'ما می‌بینیم', example: 'Wir sehen die Berge.', exampleEn: 'We see the mountains.', exampleFa: 'ما کوه‌ها را می‌بینیم.' },
              { pronoun: 'ihr', verb: 'seht', en: 'you see', fa: 'شما می‌بینید', example: 'Ihr seht das Meer.', exampleEn: 'You see the sea.', exampleFa: 'شما دریا را می‌بینید.' },
              { pronoun: 'sie/Sie', verb: 'sehen', en: 'they/you see', fa: 'آنها می‌بینند', example: 'Sie sehen fern.', exampleEn: 'They watch TV.', exampleFa: 'آنها تلویزیون تماشا می‌کنند.' }
            ]
          }
        ]
      }
    ]
  },
  questionWords: {
    icon: '❓',
    title: { en: 'Question Words (Fragewörter)', fa: 'کلمات پرسشی' },
    description: { en: 'W-questions and how to ask in German', fa: 'پرسش‌های W و نحوه سوال پرسیدن به آلمانی' },
    type: 'grid',
    words: [
      { german: 'wer', en: 'who', fa: 'چه کسی', example: 'Wer ist das?', exampleEn: 'Who is that?', exampleFa: 'آن کیست؟' },
      { german: 'was', en: 'what', fa: 'چه/چی', example: 'Was machst du?', exampleEn: 'What are you doing?', exampleFa: 'چه کار می‌کنی؟' },
      { german: 'wo', en: 'where', fa: 'کجا', example: 'Wo wohnst du?', exampleEn: 'Where do you live?', exampleFa: 'کجا زندگی می‌کنی؟' },
      { german: 'wohin', en: 'where to', fa: 'به کجا', example: 'Wohin gehst du?', exampleEn: 'Where are you going?', exampleFa: 'کجا می‌روی؟' },
      { german: 'woher', en: 'where from', fa: 'از کجا', example: 'Woher kommst du?', exampleEn: 'Where do you come from?', exampleFa: 'اهل کجایی؟' },
      { german: 'wann', en: 'when', fa: 'کی/چه وقت', example: 'Wann kommst du?', exampleEn: 'When are you coming?', exampleFa: 'کی می‌آیی؟' },
      { german: 'warum', en: 'why', fa: 'چرا', example: 'Warum lernst du Deutsch?', exampleEn: 'Why are you learning German?', exampleFa: 'چرا آلمانی یاد می‌گیری؟' },
      { german: 'wie', en: 'how', fa: 'چطور/چگونه', example: 'Wie geht es dir?', exampleEn: 'How are you?', exampleFa: 'حالت چطور است؟' },
      { german: 'wie viel', en: 'how much', fa: 'چقدر', example: 'Wie viel kostet das?', exampleEn: 'How much does that cost?', exampleFa: 'این چقدر قیمت دارد؟' },
      { german: 'wie viele', en: 'how many', fa: 'چند تا', example: 'Wie viele Geschwister hast du?', exampleEn: 'How many siblings do you have?', exampleFa: 'چند تا خواهر و برادر داری؟' },
      { german: 'welcher', en: 'which (masc)', fa: 'کدام (مذکر)', example: 'Welcher Tag ist heute?', exampleEn: 'Which day is today?', exampleFa: 'امروز چه روزی است؟' },
      { german: 'welche', en: 'which (fem/pl)', fa: 'کدام (مؤنث/جمع)', example: 'Welche Farbe magst du?', exampleEn: 'Which color do you like?', exampleFa: 'کدام رنگ را دوست داری؟' },
      { german: 'welches', en: 'which (neut)', fa: 'کدام (خنثی)', example: 'Welches Buch liest du?', exampleEn: 'Which book are you reading?', exampleFa: 'کدام کتاب را می‌خوانی؟' },
      { german: 'wessen', en: 'whose', fa: 'مال چه کسی', example: 'Wessen Tasche ist das?', exampleEn: 'Whose bag is that?', exampleFa: 'این کیف مال کیست؟' }
    ]
  },
  modalVerbs: {
    icon: '🎯',
    title: { en: 'Modal Verbs (Modalverben)', fa: 'افعال کمکی (Modalverben)' },
    description: { en: 'Must, can, want, should, may & like — essential modal verbs', fa: 'باید، توانستن، خواستن، بایستن، اجازه داشتن و دوست داشتن' },
    type: 'multi',
    sections: [
      {
        heading: { en: 'können (can / to be able to)', fa: 'können (توانستن)' },
        type: 'conjugation',
        infinitive: { german: 'können', en: 'can / to be able to', fa: 'توانستن' },
        tenses: [
          {
            name: { en: 'Present (Präsens)', fa: 'حال (Präsens)' },
            forms: [
              { pronoun: 'ich', verb: 'kann', en: 'I can', fa: 'من می‌توانم', example: 'Ich kann Deutsch sprechen.', exampleEn: 'I can speak German.', exampleFa: 'من می‌توانم آلمانی صحبت کنم.' },
              { pronoun: 'du', verb: 'kannst', en: 'you can', fa: 'تو می‌توانی', example: 'Du kannst gut schwimmen.', exampleEn: 'You can swim well.', exampleFa: 'تو می‌توانی خوب شنا کنی.' },
              { pronoun: 'er/sie/es', verb: 'kann', en: 'he/she/it can', fa: 'او می‌تواند', example: 'Er kann Klavier spielen.', exampleEn: 'He can play piano.', exampleFa: 'او می‌تواند پیانو بزند.' },
              { pronoun: 'wir', verb: 'können', en: 'we can', fa: 'ما می‌توانیم', example: 'Wir können dir helfen.', exampleEn: 'We can help you.', exampleFa: 'ما می‌توانیم به تو کمک کنیم.' },
              { pronoun: 'ihr', verb: 'könnt', en: 'you can', fa: 'شما می‌توانید', example: 'Ihr könnt morgen kommen.', exampleEn: 'You can come tomorrow.', exampleFa: 'شما می‌توانید فردا بیایید.' },
              { pronoun: 'sie/Sie', verb: 'können', en: 'they/you can', fa: 'آنها می‌توانند', example: 'Sie können hier parken.', exampleEn: 'They can park here.', exampleFa: 'آنها می‌توانند اینجا پارک کنند.' }
            ]
          }
        ]
      },
      {
        heading: { en: 'müssen (must / to have to)', fa: 'müssen (باید / مجبور بودن)' },
        type: 'conjugation',
        infinitive: { german: 'müssen', en: 'must / to have to', fa: 'باید / مجبور بودن' },
        tenses: [
          {
            name: { en: 'Present (Präsens)', fa: 'حال (Präsens)' },
            forms: [
              { pronoun: 'ich', verb: 'muss', en: 'I must', fa: 'من باید', example: 'Ich muss jetzt gehen.', exampleEn: 'I must go now.', exampleFa: 'من باید الان بروم.' },
              { pronoun: 'du', verb: 'musst', en: 'you must', fa: 'تو باید', example: 'Du musst mehr lernen.', exampleEn: 'You must study more.', exampleFa: 'تو باید بیشتر درس بخوانی.' },
              { pronoun: 'er/sie/es', verb: 'muss', en: 'he/she/it must', fa: 'او باید', example: 'Er muss früh aufstehen.', exampleEn: 'He must get up early.', exampleFa: 'او باید زود بیدار شود.' },
              { pronoun: 'wir', verb: 'müssen', en: 'we must', fa: 'ما باید', example: 'Wir müssen den Zug nehmen.', exampleEn: 'We must take the train.', exampleFa: 'ما باید قطار بگیریم.' },
              { pronoun: 'ihr', verb: 'müsst', en: 'you must', fa: 'شما باید', example: 'Ihr müsst leise sein.', exampleEn: 'You must be quiet.', exampleFa: 'شما باید ساکت باشید.' },
              { pronoun: 'sie/Sie', verb: 'müssen', en: 'they/you must', fa: 'آنها باید', example: 'Sie müssen das Formular ausfüllen.', exampleEn: 'They must fill out the form.', exampleFa: 'آنها باید فرم را پر کنند.' }
            ]
          }
        ]
      },
      {
        heading: { en: 'wollen (to want to)', fa: 'wollen (خواستن)' },
        type: 'conjugation',
        infinitive: { german: 'wollen', en: 'to want to', fa: 'خواستن' },
        tenses: [
          {
            name: { en: 'Present (Präsens)', fa: 'حال (Präsens)' },
            forms: [
              { pronoun: 'ich', verb: 'will', en: 'I want to', fa: 'من می‌خواهم', example: 'Ich will Deutsch lernen.', exampleEn: 'I want to learn German.', exampleFa: 'من می‌خواهم آلمانی یاد بگیرم.' },
              { pronoun: 'du', verb: 'willst', en: 'you want to', fa: 'تو می‌خواهی', example: 'Du willst nach Hause gehen.', exampleEn: 'You want to go home.', exampleFa: 'تو می‌خواهی به خانه بروی.' },
              { pronoun: 'er/sie/es', verb: 'will', en: 'he/she/it wants to', fa: 'او می‌خواهد', example: 'Sie will Ärztin werden.', exampleEn: 'She wants to become a doctor.', exampleFa: 'او می‌خواهد دکتر شود.' },
              { pronoun: 'wir', verb: 'wollen', en: 'we want to', fa: 'ما می‌خواهیم', example: 'Wir wollen ins Kino gehen.', exampleEn: 'We want to go to the cinema.', exampleFa: 'ما می‌خواهیم به سینما برویم.' },
              { pronoun: 'ihr', verb: 'wollt', en: 'you want to', fa: 'شما می‌خواهید', example: 'Ihr wollt Pizza bestellen.', exampleEn: 'You want to order pizza.', exampleFa: 'شما می‌خواهید پیتزا سفارش دهید.' },
              { pronoun: 'sie/Sie', verb: 'wollen', en: 'they/you want to', fa: 'آنها می‌خواهند', example: 'Sie wollen ein Haus kaufen.', exampleEn: 'They want to buy a house.', exampleFa: 'آنها می‌خواهند یک خانه بخرند.' }
            ]
          }
        ]
      },
      {
        heading: { en: 'sollen (should / to be supposed to)', fa: 'sollen (بایستن / قرار بودن)' },
        type: 'conjugation',
        infinitive: { german: 'sollen', en: 'should / to be supposed to', fa: 'بایستن / قرار بودن' },
        tenses: [
          {
            name: { en: 'Present (Präsens)', fa: 'حال (Präsens)' },
            forms: [
              { pronoun: 'ich', verb: 'soll', en: 'I should', fa: 'من باید (توصیه)', example: 'Ich soll mehr Wasser trinken.', exampleEn: 'I should drink more water.', exampleFa: 'من باید آب بیشتری بنوشم.' },
              { pronoun: 'du', verb: 'sollst', en: 'you should', fa: 'تو باید (توصیه)', example: 'Du sollst nicht so laut sein.', exampleEn: 'You should not be so loud.', exampleFa: 'تو نباید اینقدر بلند صحبت کنی.' },
              { pronoun: 'er/sie/es', verb: 'soll', en: 'he/she/it should', fa: 'او باید (توصیه)', example: 'Er soll pünktlich sein.', exampleEn: 'He should be on time.', exampleFa: 'او باید به موقع باشد.' },
              { pronoun: 'wir', verb: 'sollen', en: 'we should', fa: 'ما باید (توصیه)', example: 'Wir sollen früh anfangen.', exampleEn: 'We should start early.', exampleFa: 'ما باید زود شروع کنیم.' },
              { pronoun: 'ihr', verb: 'sollt', en: 'you should', fa: 'شما باید (توصیه)', example: 'Ihr sollt eure Eltern anrufen.', exampleEn: 'You should call your parents.', exampleFa: 'شما باید به والدینتان زنگ بزنید.' },
              { pronoun: 'sie/Sie', verb: 'sollen', en: 'they/you should', fa: 'آنها باید (توصیه)', example: 'Sie sollen den Arzt fragen.', exampleEn: 'They should ask the doctor.', exampleFa: 'آنها باید از دکتر بپرسند.' }
            ]
          }
        ]
      },
      {
        heading: { en: 'dürfen (may / to be allowed to)', fa: 'dürfen (اجازه داشتن)' },
        type: 'conjugation',
        infinitive: { german: 'dürfen', en: 'may / to be allowed to', fa: 'اجازه داشتن' },
        tenses: [
          {
            name: { en: 'Present (Präsens)', fa: 'حال (Präsens)' },
            forms: [
              { pronoun: 'ich', verb: 'darf', en: 'I may', fa: 'من اجازه دارم', example: 'Ich darf hier nicht rauchen.', exampleEn: 'I may not smoke here.', exampleFa: 'من اجازه ندارم اینجا سیگار بکشم.' },
              { pronoun: 'du', verb: 'darfst', en: 'you may', fa: 'تو اجازه داری', example: 'Du darfst jetzt gehen.', exampleEn: 'You may go now.', exampleFa: 'تو اجازه داری الان بروی.' },
              { pronoun: 'er/sie/es', verb: 'darf', en: 'he/she/it may', fa: 'او اجازه دارد', example: 'Das Kind darf fernsehen.', exampleEn: 'The child may watch TV.', exampleFa: 'بچه اجازه دارد تلویزیون تماشا کند.' },
              { pronoun: 'wir', verb: 'dürfen', en: 'we may', fa: 'ما اجازه داریم', example: 'Wir dürfen den Raum benutzen.', exampleEn: 'We may use the room.', exampleFa: 'ما اجازه داریم از اتاق استفاده کنیم.' },
              { pronoun: 'ihr', verb: 'dürft', en: 'you may', fa: 'شما اجازه دارید', example: 'Ihr dürft draußen spielen.', exampleEn: 'You may play outside.', exampleFa: 'شما اجازه دارید بیرون بازی کنید.' },
              { pronoun: 'sie/Sie', verb: 'dürfen', en: 'they/you may', fa: 'آنها اجازه دارند', example: 'Sie dürfen hier parken.', exampleEn: 'They may park here.', exampleFa: 'آنها اجازه دارند اینجا پارک کنند.' }
            ]
          }
        ]
      },
      {
        heading: { en: 'mögen / möchten (to like / would like)', fa: 'mögen / möchten (دوست داشتن / مایل بودن)' },
        type: 'conjugation',
        infinitive: { german: 'mögen', en: 'to like / would like', fa: 'دوست داشتن / مایل بودن' },
        tenses: [
          {
            name: { en: 'mögen – Present (Präsens)', fa: 'mögen – حال (Präsens)' },
            forms: [
              { pronoun: 'ich', verb: 'mag', en: 'I like', fa: 'من دوست دارم', example: 'Ich mag Schokolade.', exampleEn: 'I like chocolate.', exampleFa: 'من شکلات دوست دارم.' },
              { pronoun: 'du', verb: 'magst', en: 'you like', fa: 'تو دوست داری', example: 'Du magst Musik.', exampleEn: 'You like music.', exampleFa: 'تو موسیقی دوست داری.' },
              { pronoun: 'er/sie/es', verb: 'mag', en: 'he/she/it likes', fa: 'او دوست دارد', example: 'Sie mag Blumen.', exampleEn: 'She likes flowers.', exampleFa: 'او گل دوست دارد.' },
              { pronoun: 'wir', verb: 'mögen', en: 'we like', fa: 'ما دوست داریم', example: 'Wir mögen dieses Restaurant.', exampleEn: 'We like this restaurant.', exampleFa: 'ما این رستوران را دوست داریم.' },
              { pronoun: 'ihr', verb: 'mögt', en: 'you like', fa: 'شما دوست دارید', example: 'Ihr mögt den neuen Lehrer.', exampleEn: 'You like the new teacher.', exampleFa: 'شما معلم جدید را دوست دارید.' },
              { pronoun: 'sie/Sie', verb: 'mögen', en: 'they/you like', fa: 'آنها دوست دارند', example: 'Sie mögen Tee.', exampleEn: 'They like tea.', exampleFa: 'آنها چای دوست دارند.' }
            ]
          },
          {
            name: { en: 'möchten – Would like (Konjunktiv II)', fa: 'möchten – مایل بودن' },
            forms: [
              { pronoun: 'ich', verb: 'möchte', en: 'I would like', fa: 'من مایلم', example: 'Ich möchte einen Kaffee.', exampleEn: 'I would like a coffee.', exampleFa: 'من یک قهوه می‌خواهم.' },
              { pronoun: 'du', verb: 'möchtest', en: 'you would like', fa: 'تو مایلی', example: 'Möchtest du mitkommen?', exampleEn: 'Would you like to come along?', exampleFa: 'مایلی همراه بیایی؟' },
              { pronoun: 'er/sie/es', verb: 'möchte', en: 'he/she/it would like', fa: 'او مایل است', example: 'Er möchte ein Eis.', exampleEn: 'He would like an ice cream.', exampleFa: 'او یک بستنی می‌خواهد.' },
              { pronoun: 'wir', verb: 'möchten', en: 'we would like', fa: 'ما مایلیم', example: 'Wir möchten bestellen.', exampleEn: 'We would like to order.', exampleFa: 'ما می‌خواهیم سفارش بدهیم.' },
              { pronoun: 'ihr', verb: 'möchtet', en: 'you would like', fa: 'شما مایلید', example: 'Möchtet ihr etwas trinken?', exampleEn: 'Would you like something to drink?', exampleFa: 'مایلید چیزی بنوشید؟' },
              { pronoun: 'sie/Sie', verb: 'möchten', en: 'they/you would like', fa: 'آنها مایلند', example: 'Möchten Sie Tee oder Kaffee?', exampleEn: 'Would you like tea or coffee?', exampleFa: 'چای یا قهوه میل دارید؟' }
            ]
          }
        ]
      }
    ]
  }
};

// ============================================================
// SEED FUNCTION
// ============================================================
console.log('🌱 Seeding basics categories...\n');

let totalCategories = 0;
let totalWords = 0;
let totalSections = 0;

for (const [key, cat] of Object.entries(basicsData)) {
  const sortOrder = Object.keys(basicsData).indexOf(key);

  // Upsert category
  const { data: catRow, error: catErr } = await supabase
    .from('basics_categories')
    .upsert({
      key,
      icon: cat.icon,
      title_en: cat.title.en,
      title_fa: cat.title.fa,
      description_en: cat.description.en,
      description_fa: cat.description.fa,
      type: cat.type,
      sort_order: sortOrder
    }, { onConflict: 'key' })
    .select('id')
    .single();

  if (catErr) {
    console.error(`❌ Failed to upsert category "${key}":`, catErr.message);
    continue;
  }

  const categoryId = catRow.id;

  // Delete existing words/sections for clean re-seed
  await supabase.from('basics_words').delete().eq('category_id', categoryId);
  await supabase.from('basics_sections').delete().eq('category_id', categoryId);

  if (cat.type === 'multi' && cat.sections) {
    // Insert sections
    for (let si = 0; si < cat.sections.length; si++) {
      const sec = cat.sections[si];

      const { data: secRow, error: secErr } = await supabase
        .from('basics_sections')
        .insert({
          category_id: categoryId,
          heading_en: sec.heading.en,
          heading_fa: sec.heading.fa,
          type: sec.type,
          sort_order: si,
          infinitive: sec.infinitive ? JSON.stringify(sec.infinitive) : null,
          tenses: sec.tenses ? JSON.stringify(sec.tenses) : null,
          declension: sec.declension ? JSON.stringify(sec.declension) : null
        })
        .select('id')
        .single();

      if (secErr) {
        console.error(`  ❌ Failed to insert section "${sec.heading.en}":`, secErr.message);
        continue;
      }

      totalSections++;

      // Insert words for non-conjugation sections
      if (sec.words && sec.words.length > 0) {
        const wordRows = sec.words.map((w, wi) => ({
          section_id: secRow.id,
          german: w.german,
          en: w.en,
          fa: w.fa,
          example: w.example || null,
          example_en: w.exampleEn || null,
          example_fa: w.exampleFa || null,
          sort_order: wi
        }));

        const { error: wordErr } = await supabase.from('basics_words').insert(wordRows);
        if (wordErr) {
          console.error(`  ❌ Failed to insert words for section "${sec.heading.en}":`, wordErr.message);
        } else {
          totalWords += wordRows.length;
        }
      }
    }
  } else if (cat.words) {
    // Insert words directly on category
    const wordRows = cat.words.map((w, wi) => ({
      category_id: categoryId,
      german: w.german,
      en: w.en,
      fa: w.fa,
      example: w.example || null,
      example_en: w.exampleEn || null,
      example_fa: w.exampleFa || null,
      sort_order: wi
    }));

    const { error: wordErr } = await supabase.from('basics_words').insert(wordRows);
    if (wordErr) {
      console.error(`  ❌ Failed to insert words for category "${key}":`, wordErr.message);
    } else {
      totalWords += wordRows.length;
    }
  }

  totalCategories++;
  console.log(`  ✅ ${key} (${cat.type}) — ${cat.sections?.length || 0} sections, ${cat.words?.length || 0} direct words`);
}

console.log(`\n🎉 Done! Seeded ${totalCategories} categories, ${totalSections} sections, ${totalWords} words total.`);
