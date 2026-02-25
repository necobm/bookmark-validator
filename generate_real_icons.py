import sys

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Pillow not installed, skipping.")
    sys.exit(1)

import os

os.makedirs('icons', exist_ok=True)

def create_icon(size):
    # Create image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    
    # Draw a rounded rectangle or circle
    margin = size // 8
    
    # Draw a bookmark shape
    # top-left, top-right, bottom-right, bottom-middle, bottom-left
    points = [
        (margin*2, margin),
        (size - margin*2, margin),
        (size - margin*2, size - margin),
        (size // 2, size - margin*3),
        (margin*2, size - margin)
    ]
    
    d.polygon(points, fill="#6366f1")
    
    # Draw a checkmark inside
    check_points = [
        (size//2 - margin, size//2),
        (size//2 - margin//2, size//2 + margin),
        (size//2 + margin*1.5, size//2 - margin*1.5)
    ]
    d.line(check_points, fill="white", width=max(1, size//12))
    
    img.save(f'icons/icon{size}.png')
    print(f"Generated icons/icon{size}.png")

for size in [16, 48, 128]:
    create_icon(size)
