import csv
import json
import os

CSV_FILE = r'c:\Users\afzja\OneDrive\Desktop\Startups\Misiro\lessons\german_100_lessons.csv'
CSV_FILE_V2 = r'c:\Users\afzja\OneDrive\Desktop\Startups\Misiro\lessons\german_100_lessons_v2.csv'
LESSONS_DIR = r'c:\Users\afzja\OneDrive\Desktop\Startups\Misiro\lessons'
INDEX_FILE = r'c:\Users\afzja\OneDrive\Desktop\Startups\Misiro\lessons\index.json'

def sync():
    lessons_data = {}
    
    def read_csv(file_path, filter_days=None):
        print(f"Reading CSV: {file_path}")
        with open(file_path, mode='r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                day_str = row['Day'].strip()
                if not day_str: continue
                day = int(day_str)
                
                if filter_days and day not in filter_days:
                    continue
                
                lesson_level = row['LessonLevel'].strip()
                sentence_level = row['SentenceLevel'].strip()
                
                if day not in lessons_data or day in (filter_days or []):
                    if day not in lessons_data or row['SentenceId'].strip() == "1":
                        lessons_data[day] = {
                            "day": day,
                            "title": f"{day}: {row['Title'].strip()}",
                            "titleFa": row['TitleFa'].strip(),
                            "sentences": [],
                            "difficulty": lesson_level,
                            "grammarFocus": row['GrammarFocus'].strip(),
                            "grammarFocusFa": row['GrammarFocusFa'].strip(),
                            "description": "", 
                            "descriptionFa": ""
                        }
                
                sentence_id_str = row['SentenceId'].strip()
                if not sentence_id_str: continue
                
                sentence = {
                    "id": int(sentence_id_str),
                    "day": day,
                    "role": row['Role'].strip().lower(),
                    "difficulty": sentence_level,
                    "translation": row['Translation'].strip(),
                    "translationFa": row['TranslationFa'].strip()
                }
                
                german_text = row['GermanText'].strip()
                if row['Role'].strip().lower() == 'received':
                    sentence["audioText"] = german_text
                else:
                    sentence["targetText"] = german_text
                    
                lessons_data[day]["sentences"].append(sentence)

    # 1. Read original for days 1-70
    read_csv(CSV_FILE, filter_days=range(1, 71))
    
    # 2. Read V2 for days 71-100 (this will replace completely if we reset for those days)
    # Actually, let's just use the filter to handle the replacement logic
    read_csv(CSV_FILE_V2, filter_days=range(71, 101))

    print(f"Read {len(lessons_data)} days from CSV.")

    # Generate individual JSON files
    new_index_lessons = []
    for day in sorted(lessons_data.keys()):
        data = lessons_data[day]
        filename = f"day-{day}.json"
        filepath = os.path.join(LESSONS_DIR, filename)
        
        # Group logic similar to generate_sql.py
        if day <= 15: group = "basics"
        elif day <= 45: group = "survival"
        elif day <= 75: group = "scenarios"
        else: group = "advanced"
        
        # Only preserve description for days 1-70 where content stayed same
        if day <= 70 and os.path.exists(filepath):
            try:
                with open(filepath, 'r', encoding='utf-8') as old_f:
                    old_data = json.load(old_f)
                    data["description"] = old_data.get("description", "")
                    data["descriptionFa"] = old_data.get("descriptionFa", "")
            except:
                pass

        new_index_lessons.append({
            "day": day,
            "file": filename,
            "title": data["title"],
            "titleFa": data["titleFa"],
            "group": group
        })
        
        with open(filepath, 'w', encoding='utf-8') as jf:
            json.dump(data, jf, ensure_ascii=False, indent=2)
    
    print(f"Generated {len(lessons_data)} JSON files in {LESSONS_DIR}")

    # Update index.json
    index_content = {
        "lessons": new_index_lessons,
        "glossaryFile": "glossary.json"
    }
    with open(INDEX_FILE, 'w', encoding='utf-8') as ifile:
        json.dump(index_content, ifile, ensure_ascii=False, indent=2)
    
    print(f"Updated {INDEX_FILE}")

if __name__ == "__main__":
    sync()
