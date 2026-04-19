import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import imageio

# ── Output settings ────────────────────────────────────────────────────────────
W, H   = 1280, 400
FPS    = 30
TOTAL  = int(FPS * 5.5)   # 5.5 s

# ── Palette ────────────────────────────────────────────────────────────────────
BLACK = (0,   0,   0)
WHITE = (255, 255, 255)

# ── Logo geometry ──────────────────────────────────────────────────────────────
CX, CY  = 195, H // 2          # circle centre
RADIUS  = 155                  # outer radius
INNER   = int(RADIUS * 0.27)   # inner hollow square half-size
LINE_SP = 8                    # line spacing (px)
LINE_W  = 4                    # line thickness

TEXT_X  = 415                  # "Modus" left edge


# ── Draw the Modus striped circle on a transparent layer ──────────────────────
def draw_circle(alpha: float = 1.0) -> Image.Image:
    """
    alpha – overall opacity of the circle (0-1)
    Returns RGBA image of just the circle.
    """
    size = (W, H)
    layer = Image.new("RGBA", size, (255, 255, 255, 0))
    draw  = ImageDraw.Draw(layer)

    a = int(255 * alpha)

    # ── For every row, decide which x-spans get H-lines vs V-lines ────────────
    for row in range(CY - RADIUS, CY + RADIUS + 1):
        dy     = row - CY
        x_span = math.sqrt(max(0.0, RADIUS**2 - dy**2))
        x_lo   = int(CX - x_span)
        x_hi   = int(CX + x_span)

        if x_lo >= x_hi:
            continue

        # horizontal lines land on rows that are multiples of LINE_SP
        if (row - (CY - RADIUS)) % LINE_SP < LINE_W:
            # Draw the whole H-line across the circle chord
            # but clip out the inner square hole
            seg_lo = x_lo
            seg_hi = x_hi
            # if within inner-square height range, leave hole
            if abs(dy) < INNER:
                # left of hole
                if seg_lo < CX - INNER:
                    draw.line([(seg_lo, row), (min(seg_hi, CX - INNER), row)],
                              fill=(*BLACK, a), width=LINE_W)
                # right of hole
                if seg_hi > CX + INNER:
                    draw.line([(max(seg_lo, CX + INNER), row), (seg_hi, row)],
                              fill=(*BLACK, a), width=LINE_W)
            else:
                draw.line([(seg_lo, row), (seg_hi, row)],
                          fill=(*BLACK, a), width=LINE_W)

    # ── Vertical lines (corner sections) ──────────────────────────────────────
    for col in range(CX - RADIUS, CX + RADIUS + 1):
        dx     = col - CX
        y_span = math.sqrt(max(0.0, RADIUS**2 - dx**2))
        y_lo   = int(CY - y_span)
        y_hi   = int(CY + y_span)

        if y_lo >= y_hi:
            continue

        if (col - (CX - RADIUS)) % LINE_SP < LINE_W:
            if abs(dx) < INNER:
                # within inner-square x range → draw only outside inner square vertically
                if y_lo < CY - INNER:
                    draw.line([(col, y_lo), (col, CY - INNER)],
                              fill=(*BLACK, a), width=LINE_W)
                if y_hi > CY + INNER:
                    draw.line([(col, CY + INNER), (col, y_hi)],
                              fill=(*BLACK, a), width=LINE_W)
            # corners: only draw V lines where |dy| < |dx| (corner quadrants)
            # horizontal lines already cover |dy| >= |dx|

    # ── Outer circle border ────────────────────────────────────────────────────
    draw.ellipse(
        [CX - RADIUS, CY - RADIUS, CX + RADIUS, CY + RADIUS],
        outline=(*BLACK, a), width=LINE_W
    )

    return layer


# ── Sweep-reveal mask (arc from top, clockwise) ───────────────────────────────
def reveal_mask(progress: float) -> Image.Image:
    """
    progress 0→1 → a white pie that grows to full circle.
    Returns L-mode mask.
    """
    mask = Image.new("L", (W, H), 0)
    if progress <= 0:
        return mask
    if progress >= 1:
        return Image.new("L", (W, H), 255)

    draw = ImageDraw.Draw(mask)
    angle = progress * 360          # degrees swept so far
    r = RADIUS + 10
    bbox = [CX - r, CY - r, CX + r, CY + r]
    draw.pieslice(bbox, start=-90, end=-90 + angle, fill=255)
    return mask


# ── Render "Modus" text onto a layer ─────────────────────────────────────────
def draw_text(alpha: float, offset_x: float = 0) -> Image.Image:
    layer = Image.new("RGBA", (W, H), (255, 255, 255, 0))
    draw  = ImageDraw.Draw(layer)
    a     = int(255 * alpha)

    # Try system bold fonts in order
    font_size = 220
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
        "/usr/share/fonts/truetype/ubuntu/Ubuntu-B.ttf",
    ]
    font = None
    for p in candidates:
        try:
            font = ImageFont.truetype(p, font_size)
            break
        except Exception:
            pass
    if font is None:
        font = ImageFont.load_default()

    text = "Modus"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = int(TEXT_X + offset_x)
    ty = (H - th) // 2 - bbox[1]
    draw.text((tx, ty), text, font=font, fill=(*BLACK, a))
    return layer


# ── Timing helpers ────────────────────────────────────────────────────────────
def ease_out(t: float) -> float:
    return 1 - (1 - t) ** 3

def ease_in_out(t: float) -> float:
    return t * t * (3 - 2 * t)

def clamp01(t: float) -> float:
    return max(0.0, min(1.0, t))

def segment(t: float, start: float, end: float) -> float:
    return clamp01((t - start) / (end - start))


# ── Build all frames ──────────────────────────────────────────────────────────
print(f"Rendering {TOTAL} frames …")
prebuilt_circle = draw_circle(1.0)   # full-alpha circle layer (reused)
frames = []

for i in range(TOTAL):
    t = i / (TOTAL - 1)             # 0 → 1 over full clip

    # ── Phase timings (in normalised time 0-1) ────────────────────────────────
    # 0.00-0.10  black hold / fade-in white bg
    # 0.10-0.50  circle sweeps in
    # 0.45-0.75  text slides + fades in
    # 0.75-0.90  full logo hold
    # 0.90-1.00  gentle fade to white

    bg_fade      = ease_out(segment(t, 0.00, 0.12))   # 0→1
    circle_sweep = ease_out(segment(t, 0.10, 0.52))   # arc reveal 0→1
    circle_alpha = ease_out(segment(t, 0.10, 0.20))   # fade-in as sweep starts
    text_alpha   = ease_out(segment(t, 0.45, 0.70))
    text_slide   = 1 - ease_out(segment(t, 0.45, 0.70))  # 1→0 (right→left)
    fade_out     = 1 - ease_in_out(segment(t, 0.90, 1.00))

    # ── White background ──────────────────────────────────────────────────────
    bg_value = int(255 * bg_fade)
    frame = Image.new("RGBA", (W, H), (bg_value, bg_value, bg_value, 255))

    # ── Circle with sweep reveal ──────────────────────────────────────────────
    circ_layer = prebuilt_circle.copy()
    # apply sweep mask
    mask = reveal_mask(circle_sweep)
    circ_layer.putalpha(
        Image.fromarray(
            np.minimum(
                np.array(circ_layer.split()[3]),
                np.array(mask)
            ).astype(np.uint8)
        )
    )
    frame = Image.alpha_composite(frame, circ_layer)

    # ── Text ──────────────────────────────────────────────────────────────────
    slide_px = text_slide * 80           # slides in 80 px from right
    txt_layer = draw_text(text_alpha, offset_x=slide_px)
    frame = Image.alpha_composite(frame, txt_layer)

    # ── Fade-out veil ─────────────────────────────────────────────────────────
    if fade_out < 1.0:
        veil_a = int(255 * (1 - fade_out))
        veil   = Image.new("RGBA", (W, H), (255, 255, 255, veil_a))
        frame  = Image.alpha_composite(frame, veil)

    frames.append(np.array(frame.convert("RGB")))

    if i % 30 == 0:
        print(f"  frame {i}/{TOTAL}")

# ── Export MP4 ────────────────────────────────────────────────────────────────
out_path = "/home/user/Claude/modus_logo_animation.mp4"
print(f"Writing {out_path} …")
writer = imageio.get_writer(
    out_path,
    fps=FPS,
    codec="libx264",
    quality=9,
    pixelformat="yuv420p",
)
for f in frames:
    writer.append_data(f)
writer.close()
print("Done!")
