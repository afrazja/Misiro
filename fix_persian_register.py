"""
fix_persian_register.py
Fixes Persian translation register inconsistencies in Days 1-15:
- Replace یک (formal written) with یه (colloquial spoken) in translationFa and descriptionFa
- Affects both lessons_new/ and the worktree lessons/ directory
"""
import json
import os
import re

LESSONS_DIRS = [
    r"C:\Users\afzja\OneDrive\Desktop\Misiro\lessons_new",
    r"C:\Users\afzja\OneDrive\Desktop\Misiro\.claude\worktrees\affectionate-newton\lessons",
]

def fix_farsi_text(text: str) -> str:
    if not text:
        return text
    # Replace یک + space/end with یه (colloquial)
    # but NOT in compound words like یکدیگر, یکپارچه, etc.
    text = re.sub(r'یک (نفر|چیز|مشکل|کنفرانس|اتفاق|لیوان|میز|روز|هفته|ماه|سال|بار|دقیقه|ساعت|لحظه)', 
                  lambda m: 'یه ' + m.group(1), text)
    return text

total_fixed = 0
for lessons_dir in LESSONS_DIRS:
    for day in range(1, 16):
        path = os.path.join(lessons_dir, f"day-{day}.json")
        if not os.path.exists(path):
            print(f"WARNING: {path} not found")
            continue
        
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        
        changed = False
        
        # Fix sentences
        for s in data.get("sentences", []):
            for field in ["translationFa"]:
                if field in s and s[field]:
                    fixed = fix_farsi_text(s[field])
                    if fixed != s[field]:
                        print(f"  day-{day} sentence {s.get('id')}: {s[field]} -> {fixed}")
                        s[field] = fixed
                        changed = True
        
        # Fix lesson-level fields
        for field in ["descriptionFa", "grammarFocusFa"]:
            if field in data and data[field]:
                fixed = fix_farsi_text(data[field])
                if fixed != data[field]:
                    print(f"  day-{day} {field}: {data[field]} -> {fixed}")
                    data[field] = fixed
                    changed = True
        
        if changed:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            total_fixed += 1
            print(f"  -> Saved day-{day}.json")

print(f"\nTotal files updated: {total_fixed}")
