import os
import re

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Fix the accidental 9000 replacements
    content = content.replace("text-slate-9000", "text-slate-500")
    
    # Fix button text contrast: When using bg-[#0866FF], text should be white, not text-slate-950
    content = content.replace("text-slate-950", "text-white")
    content = content.replace("text-[#F0F2F5]", "text-white") # Just in case
    
    # Check for any other anomalies
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {filepath}")

for root, dirs, files in os.walk('c:/Users/PC/Desktop/Alaala_Inventory_System/frontend/src'):
    for file in files:
        if file.endswith('.jsx') or file.endswith('.js'):
            fix_file(os.path.join(root, file))
