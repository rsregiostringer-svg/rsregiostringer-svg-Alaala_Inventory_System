import os

replacements = {
    "text-amber-300": "text-[#0866FF]",
    "text-amber-200": "text-[#0866FF]",
    "text-amber-100": "text-[#0866FF]",
    "text-amber-600": "text-[#0866FF]",
    "bg-amber-300": "bg-[#0866FF]",
    "bg-amber-200": "bg-[#0866FF]",
    "bg-amber-100": "bg-[#0866FF]",
    "bg-amber-600": "bg-[#0866FF]",
}

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    for old, new in replacements.items():
        content = content.replace(old, new)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {filepath}")

for root, dirs, files in os.walk('c:/Users/PC/Desktop/Alaala_Inventory_System/frontend/src'):
    for file in files:
        if file.endswith('.jsx') or file.endswith('.js'):
            fix_file(os.path.join(root, file))
