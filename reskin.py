import os

replacements = {
    "bg-slate-950": "bg-[#F0F2F5]",
    "bg-slate-900/50": "bg-white/50",
    "bg-slate-900/80": "bg-white/80",
    "bg-slate-900": "bg-white",
    "bg-slate-800/50": "bg-slate-50",
    "bg-slate-800": "bg-white",
    "hover:bg-slate-800": "hover:bg-slate-100",
    "hover:bg-slate-700": "hover:bg-slate-200",
    "border-slate-800": "border-slate-200",
    "border-slate-700": "border-slate-300",
    "border-slate-600": "border-slate-300",
    "divide-slate-800": "divide-slate-200",
    "text-slate-400": "text-slate-500",
    "text-slate-300": "text-slate-600",
    "text-slate-200": "text-slate-700",
    "text-slate-50": "text-slate-900",
    "bg-amber-500/10": "bg-blue-600/10",
    "bg-amber-500/20": "bg-blue-600/20",
    "bg-amber-500": "bg-[#0866FF]",
    "hover:bg-amber-600": "hover:bg-blue-700",
    "text-amber-500": "text-[#0866FF]",
    "text-amber-400": "text-blue-500",
    "ring-amber-500": "ring-[#0866FF]",
    "border-amber-500/30": "border-[#0866FF]/30",
    "border-amber-500/20": "border-[#0866FF]/20",
    "border-amber-500": "border-[#0866FF]",
    "from-slate-900": "from-white",
    "to-slate-950": "to-[#F0F2F5]",
    "from-slate-800": "from-slate-50",
    "to-slate-900": "to-white"
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    # Replace longer strings first
    for old, new in sorted(replacements.items(), key=lambda x: len(x[0]), reverse=True):
        content = content.replace(old, new)
        
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

for root, dirs, files in os.walk('c:/Users/PC/Desktop/Alaala_Inventory_System/frontend/src'):
    for file in files:
        if file.endswith('.jsx') or file.endswith('.js'):
            process_file(os.path.join(root, file))
