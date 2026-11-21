import os
from PIL import Image, ImageDraw, ImageFilter

def draw_chevron(draw, points, width, fill_color, outline_color=None):
    # If outline is needed, draw thicker outline first, then inner fill
    if outline_color:
        # Draw outline with wider stroke
        draw.line(points, fill=outline_color, width=width + 4, joint="curve")
    # Draw main stroke
    draw.line(points, fill=fill_color, width=width, joint="curve")

def generate_icon(size):
    # Use supersampling factor of 4 for crisp anti-aliased rendering
    scale = 4
    s = size * scale
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Proportions
    # Canvas: s x s
    # Padding
    pad = int(s * 0.15)
    w = s - 2 * pad
    h = s - 2 * pad
    
    cy = s / 2
    
    # Two chevrons: >>
    # Let's define bounds for chevron 1 and chevron 2
    # Chevron 1 width: w * 0.45, Chevron 2 width: w * 0.45, gap: w * 0.1
    c_width = w * 0.42
    gap = w * 0.12
    
    # Chevron 1 (left)
    x1_start = pad
    x1_tip = pad + c_width
    
    # Chevron 2 (right)
    x2_start = x1_start + c_width + gap - (c_width * 0.25) # slight overlap or spacing
    # Let's adjust positions nicely
    # Total span: x1_start to x2_start + c_width = pad + w
    
    # Let's recalculate cleanly:
    # 2 chevrons of width CW, separated by GP.
    # Total width = 2 * CW + GP = w
    # Let CW = w * 0.4, GP = w * 0.2
    cw = w * 0.38
    gp = w * 0.15
    
    x_a = pad
    x_b = x_a + cw
    x_c = x_b + gp
    x_d = x_c + cw
    
    y_top = pad + h * 0.05
    y_bottom = pad + h * 0.95
    y_mid = cy
    
    # Points for Chevron 1
    ch1 = [(x_a, y_top), (x_b, y_mid), (x_a, y_bottom)]
    # Points for Chevron 2
    ch2 = [(x_c, y_top), (x_d, y_mid), (x_c, y_bottom)]
    
    line_width = int(max(2, s * 0.08))
    outline_width = line_width + int(max(2, s * 0.04))
    
    outline_color = (15, 23, 42, 220) # #0f172a with alpha
    fill_color = (14, 165, 233, 255) # #0ea5e9 bright turquoise-blue
    
    # Draw outline (shadow/border)
    for pts in [ch1, ch2]:
        # Draw with round cap/joint by drawing circles at vertices and thick lines
        draw.line(pts, fill=outline_color, width=outline_width, joint="curve")
        # Also draw round end caps if line doesn't automatically cap nicely
        r_out = outline_width // 2
        for pt in pts:
            draw.ellipse([pt[0]-r_out, pt[1]-r_out, pt[0]+r_out, pt[1]+r_out], fill=outline_color)

    # Draw inner fill
    for pts in [ch1, ch2]:
        draw.line(pts, fill=fill_color, width=line_width, joint="curve")
        r_in = line_width // 2
        for pt in pts:
            draw.ellipse([pt[0]-r_in, pt[1]-r_in, pt[0]+r_in, pt[1]+r_in], fill=fill_color)

    # Downsample to target size with LANCZOS
    img_final = img.resize((size, size), Image.Resampling.LANCZOS)
    return img_final

def main():
    os.makedirs("icons", exist_ok=True)
    sizes = [16, 48, 128]
    for size in sizes:
        icon = generate_icon(size)
        path = f"icons/icon{size}.png"
        icon.save(path, "PNG")
        print(f"Generated {path}")

if __name__ == "__main__":
    main()
