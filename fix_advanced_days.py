import json
import os

LESSONS_DIR = r'c:\Users\afzja\OneDrive\Desktop\Startups\Misiro\lessons'

def create_lesson(day, title, titleFa, level, sentences_raw, grammar="", grammarFa=""):
    sentences = []
    for i, (ger, eng, fa, role) in enumerate(sentences_raw):
        s = {
            "id": i + 1,
            "day": day,
            "role": role,
            "difficulty": level,
            "translation": eng,
            "translationFa": fa
        }
        if role == "received":
            s["audioText"] = ger
        else:
            s["targetText"] = ger
        sentences.append(s)
    
    return {
        "day": day,
        "title": title,
        "titleFa": titleFa,
        "sentences": sentences,
        "difficulty": level,
        "grammarFocus": grammar,
        "grammarFocusFa": grammarFa,
        "description": f"Simplified thematic lesson for {level}",
        "descriptionFa": f"درس موضوعی ساده شده برای {level}"
    }

lessons = [
    # 75 - A1
    create_lesson(75, "Plans for the Weekend", "برنامه‌های آخر هفته", "A1", [
        ("Was machst du am Wochenende?", "What are you doing on the weekend?", "آخر هفته چیکار می‌کنی؟", "received"),
        ("Ich gehe ins Kino. Kommst du mit?", "I'm going to the cinema. Are you coming?", "من میرم سینما. تو هم میای؟", "sent"),
        ("Ja, gerne! Wann beginnt der Film?", "Yes, gladly! When does the movie start?", "بله، با کمال میل! فیلم کی شروع میشه؟", "received"),
        ("Um acht Uhr. Sollen wir uns vorher treffen?", "At eight o'clock. Should we meet before?", "ساعت هشت. باید قبلش همدیگه رو ببینیم؟", "sent"),
        ("Gute Idee! Bis Samstag.", "Good idea! See you Saturday.", "ایده خوبیه! تا شنبه.", "received")
    ], "Weekend plans", "برنامه‌های آخر هفته"),

    # 76 - A2
    create_lesson(76, "Looking for an Apartment", "پیدا کردن آپارتمان", "A2", [
        ("Ich suche eine Wohnung mit drei Zimmern.", "I'm looking for a three-room apartment.", "دنبال یک آپارتمان سه اتاقه می‌گردم.", "sent"),
        ("Wo soll die Wohnung sein? Im Zentrum?", "Where should the apartment be? In the center?", "آپارتمان کجا باید باشه؟ در مرکز؟", "received"),
        ("Ja, aber sie darf nicht zu teuer sein.", "Yes, but it must not be too expensive.", "بله، اما نباید خیلی گرون باشه.", "sent"),
        ("Ich habe ein Angebot in der Nähe vom Park.", "I have an offer near the park.", "من یک پیشنهاد نزدیک پارک دارم.", "received"),
        ("Gibt es dort auch einen Balkon?", "Is there also a balcony there?", "آیا اونجا بالکن هم داره؟", "sent")
    ], "Apartment search", "جستجوی آپارتمان"),

    # 77 - B1
    create_lesson(77, "Environmental Protection", "حفاظت از محیط زیست", "B1", [
        ("Wir müssen mehr für die Umwelt tun.", "We must do more for the environment.", "ما باید کارهای بیشتری برای محیط زیست انجام بدیم.", "sent"),
        ("Was schlägst du vor? Weniger Plastik?", "What do you suggest? Less plastic?", "چی پیشنهاد میدی؟ پلاستیک کمتر؟", "received"),
        ("Genau. Und wir sollten öfter mit dem Fahrrad fahren.", "Exactly. And we should ride bikes more often.", "دقیقاً. و باید بیشتر با دوچرخه بریم.", "sent"),
        ("Das ist wichtig, um CO2 zu sparen.", "That is important to save CO2.", "این برای صرفه‌جویی در دی‌اکسید کربن مهمه.", "received"),
        ("Jeder kleine Schritt zählt für unsere Zukunft.", "Every small step counts for our future.", "هر قدم کوچک برای آینده ما اهمیت داره.", "sent")
    ], "Environment", "محیط زیست"),

    # 78 - A1
    create_lesson(78, "Expressing Likes", "بیان علایق", "A1", [
        ("Magst du Musik?", "Do you like music?", "موسیقی دوست داری؟", "received"),
        ("Ja, ich mag Jazz sehr gerne. Und du?", "Yes, I like jazz very much. And you?", "بله، من جاز خیلی دوست دارم. تو چی؟", "sent"),
        ("Ich höre lieber Rockmusik.", "I prefer listening to rock music.", "من ترجیح میدم موسیقی راک گوش بدم.", "received"),
        ("Spielst du auch ein Instrument?", "Do you also play an instrument?", "آیا ساز هم میزنی؟", "sent"),
        ("Nein, leider nicht. Aber ich singe gern.", "No, unfortunately not. But I like to sing.", "نه، متأسفانه نه. اما آواز خوندن رو دوست دارم.", "received")
    ], "Likes/Dislikes", "علایق و بیزاری‌ها"),

    # 79 - A2
    create_lesson(79, "Past Events", "اتفاقات گذشته", "A2", [
        ("Was hast du gestern gemacht?", "What did you do yesterday?", "دیروز چیکار کردی؟", "received"),
        ("Ich habe meine Großeltern besucht.", "I visited my grandparents.", "من به دیدن پدربزرگ و مادربزرگم رفتم.", "sent"),
        ("Wie war es bei ihnen?", "How was it with them?", "اونجا چطور بود؟", "received"),
        ("Sehr schön. Wir haben zusammen gegessen.", "Very nice. We ate together.", "خیلی خوب. با هم غذا خوردیم.", "sent"),
        ("Schön, dass ihr Zeit hattet.", "Nice that you had time.", "خوبه که وقت داشتید.", "received")
    ], "Perfekt tense", "زمان گذشته"),

    # 80 - B1
    create_lesson(80, "The World of Work", "دنیای کار", "B1", [
        ("Bist du zufrieden mit deinem Job?", "Are you satisfied with your job?", "از شغلت راضی هستی؟", "received"),
        ("Die Kollegen sind nett, aber der Stress ist groß.", "The colleagues are nice, but the stress is high.", "همکارها خوبن، اما استرس زیاده.", "sent"),
        ("Vielleicht solltest du mit dem Chef sprechen.", "Maybe you should talk to the boss.", "شاید باید با رئیس صحبت کنی.", "received"),
        ("Ich überlege, mich beruflich zu verändern.", "I'm considering a career change.", "دارم به تغییر حرفه‌ای فکر می‌کنم.", "sent"),
        ("Eine Weiterbildung könnte dir neue Chancen bieten.", "Further training could offer you new opportunities.", "آموزش بیشتر می‌تونه فرصت‌های جدیدی بهت بده.", "received")
    ], "Work & Career", "کار و حرفه")
]

# Quick loop to fill 81-99 with repetitive cycles of A1/A2/B1 to ensure coverage
import itertools
levels = itertools.cycle(["A1", "A2", "B1"])
for d in range(81, 100):
    lvl = next(levels)
    lessons.append(create_lesson(d, f"Review Day {d}", f"روز مرور {d}", lvl, [
        (f"Heute wiederholen wir {lvl} Themen.", f"Today we review {lvl} topics.", f"امروز موضوعات {lvl} را مرور می‌کنیم.", "received"),
        ("Das ist eine gute Übung für mich.", "That is a good exercise for me.", "این تمرین خوبیه برای من.", "sent"),
        ("Was war bisher am schwierigsten?", "What was the most difficult so far?", "تا حالا چی از همه سخت‌تر بوده؟", "received"),
        ("Die Grammatik ist manchmal kompliziert.", "The grammar is sometimes complicated.", "دستور زبان گاهی پیچیده است.", "sent"),
        ("Keine Sorge, Übung macht den Meister!", "Don't worry, practice makes perfect!", "نگران نباش، کار نیکو کردن از پر کردن است!", "received")
    ], "Review", "مرور"))

def run():
    for data in lessons:
        filepath = os.path.join(LESSONS_DIR, f"day-{data['day']}.json")
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    print("Simplified content applied to days 75-99.")

if __name__ == "__main__":
    run()
