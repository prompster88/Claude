"""
Kinetic typography animation: "GUT HEALTH?"
Black background, white + acid-green accents.
6-second H.264 MP4, 1080x1080 square (social-ready).
"""

import math, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import imageio

# ── Config ─────────────────────────────────────────────────────────────────────
W, H   = 1080, 1080
FPS    = 30
SECS   = 6.0
FRAMES = int(FPS * SECS)
OUT    = "/home/user/Claude/gut_health_animation.mp4"

BG      = (0,   0,   0)
WHITE   = (255, 255, 255)
GREEN   = (180, 255,  80)   # acid green accent
GREY    = (120, 120, 120)

# ── Font loader ────────────────────────────────────────────────────────────────
def load_font(size):
    for p in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
        "/usr/share/fonts/truetype/ubuntu/Ubuntu-B.ttf",
    ]:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

FONT_BIG  = load_font(260)
FONT_MED  = load_font(180)
FONT_TINY = load_font(52)

# ── Easing ─────────────────────────────────────────────────────────────────────
def ease_out_back(t, s=1.5):
    t = max(0.0, min(1.0, t))
    return 1 + (s + 1) * (t - 1)**3 + s * (t - 1)**2

def ease_out(t):
    t = max(0.0, min(1.0, t))
    return 1 - (1 - t)**3

def ease_in(t):
    t = max(0.0, min(1.0, t))
    return t ** 3

def lerp(a, b, t):
    return a + (b - a) * max(0.0, min(1.0, t))

def seg(t, s, e):
    return max(0.0, min(1.0, (t - s) / (e - s)))

def bounce(t):
    """one pop bounce"""
    t = max(0.0, min(1.0, t))
    return abs(math.sin(t * math.pi)) * math.exp(-t * 3)

# ── Text helpers ───────────────────────────────────────────────────────────────
def text_size(text, font):
    dummy = Image.new("RGB", (1, 1))
    d = ImageDraw.Draw(dummy)
    bb = d.textbbox((0, 0), text, font=font)
    return bb[2] - bb[0], bb[3] - bb[1], bb[1]  # w, h, top_offset

def draw_text_centered(draw, text, font, cx, cy, color, alpha=255):
    tw, th, top = text_size(text, font)
    x = cx - tw // 2
    y = cy - th // 2 - top
    # draw with color + alpha via RGBA layer approach handled outside
    draw.text((x, y), text, font=font, fill=(*color, alpha))

def draw_text_at(draw, text, font, x, cy, color, alpha=255):
    _, th, top = text_size(text, font)
    y = cy - th // 2 - top
    draw.text((x, y), text, font=font, fill=(*color, alpha))

# ── Scanline / noise overlays ─────────────────────────────────────────────────
def add_grain(arr, strength=18):
    noise = np.random.randint(-strength, strength + 1, arr.shape, dtype=np.int16)
    return np.clip(arr.astype(np.int16) + noise, 0, 255).astype(np.uint8)

def scanlines(arr, gap=4, strength=0.12):
    result = arr.astype(np.float32)
    for y in range(0, arr.shape[0], gap):
        result[y] *= (1 - strength)
    return result.astype(np.uint8)

# ── Word-level shake (impact frames) ─────────────────────────────────────────
def shake(t, decay=8, freq=40, amp=14):
    return amp * math.exp(-decay * t) * math.sin(freq * t)

# ── Build frame ───────────────────────────────────────────────────────────────
def make_frame(i):
    t = i / (FRAMES - 1)   # 0 → 1

    # ── Timing map (seconds → normalised) ──────────────────────────────────────
    # 0.00-0.20  black hold
    # 0.20-0.55  "GUT" drops in from above, big + bouncy
    # 0.55-0.65  chromatic-flash on "GUT"
    # 0.65-1.20  "HEALTH" letters appear left→right
    # 1.20-1.35  "?" bounces in
    # 1.35-4.80  full hold with subtle pulse + green glow on "?"
    # 4.80-5.50  split: "GUT" exits up, "HEALTH?" exits down
    # 5.50-6.00  black hold
    T = t * SECS   # seconds

    layer = Image.new("RGBA", (W, H), (*BG, 255))
    draw  = ImageDraw.Draw(layer)

    CX = W // 2
    GUT_Y  = H // 2 - 140     # vertical centre for "GUT"
    HLTH_Y = H // 2 + 110     # vertical centre for "HEALTH?"

    # ── GUT ────────────────────────────────────────────────────────────────────
    gut_prog  = ease_out_back(seg(T, 0.20, 0.52))
    gut_start = GUT_Y - 520
    gut_y     = lerp(gut_start, GUT_Y, gut_prog)

    # impact shake after landing
    impact_t  = max(0.0, T - 0.52)
    gut_y    += shake(impact_t, decay=10, freq=45, amp=10)

    gut_alpha = int(255 * ease_out(seg(T, 0.20, 0.35)))

    # exit upward
    exit_gut   = ease_in(seg(T, 4.80, 5.30))
    gut_y     -= exit_gut * 600

    # chromatic aberration flash (draw RGB offsets briefly after landing)
    flash = ease_out(1 - seg(T, 0.52, 0.75))
    offset = int(flash * 9)

    if offset > 0:
        draw.text((CX - text_size("GUT", FONT_BIG)[0]//2 - offset,
                   gut_y - text_size("GUT", FONT_BIG)[1]//2 - text_size("GUT", FONT_BIG)[2]),
                  "GUT", font=FONT_BIG, fill=(255, 80, 80, int(gut_alpha * 0.5)))
        draw.text((CX - text_size("GUT", FONT_BIG)[0]//2 + offset,
                   gut_y - text_size("GUT", FONT_BIG)[1]//2 - text_size("GUT", FONT_BIG)[2]),
                  "GUT", font=FONT_BIG, fill=(80, 255, 200, int(gut_alpha * 0.5)))

    draw_text_centered(draw, "GUT", FONT_BIG, CX, int(gut_y), WHITE, gut_alpha)

    # ── HEALTH (letter by letter) ──────────────────────────────────────────────
    letters = "HEALTH"
    letter_delay = 0.085   # seconds between letters

    # measure full HEALTH width for centering
    full_w, full_h, full_top = text_size(letters, FONT_MED)
    x_cursor = CX - full_w // 2

    exit_hlth = ease_in(seg(T, 4.80, 5.35))

    for li, ch in enumerate(letters):
        ch_start = 0.65 + li * letter_delay
        ch_prog  = ease_out_back(seg(T, ch_start, ch_start + 0.22))
        ch_alpha = int(255 * ease_out(seg(T, ch_start, ch_start + 0.18)))

        cw, ch_h, ch_top = text_size(ch, FONT_MED)

        # drop from above into position
        ch_y = HLTH_Y + (1 - ch_prog) * -340
        ch_y += exit_hlth * 520

        draw.text(
            (x_cursor, int(ch_y) - ch_h // 2 - ch_top),
            ch, font=FONT_MED,
            fill=(*WHITE, ch_alpha)
        )
        x_cursor += cw

    # ── "?" ────────────────────────────────────────────────────────────────────
    q_start = 1.20
    q_prog  = ease_out_back(seg(T, q_start, q_start + 0.28), s=2.5)
    q_alpha = int(255 * ease_out(seg(T, q_start, q_start + 0.20)))

    # pulsing glow after arrival
    pulse_t  = max(0.0, T - (q_start + 0.28))
    pulse    = 0.5 + 0.5 * math.sin(pulse_t * 3.5)
    q_color  = tuple(int(lerp(GREEN[c], WHITE[c], pulse * 0.4)) for c in range(3))

    q_scale  = lerp(2.2, 1.0, q_prog)
    q_w, q_h, q_top = text_size("?", FONT_MED)

    # position "?" right after "HEALTH"
    hlth_w, _, _ = text_size(letters, FONT_MED)
    q_x = CX + hlth_w // 2 + 6

    q_y  = HLTH_Y
    q_y += exit_hlth * 520

    # scale the "?" via a sub-image
    q_font_size = int(180 * q_scale)
    q_font_size = max(20, min(q_font_size, 600))
    q_font = load_font(q_font_size)
    qw2, qh2, qtop2 = text_size("?", q_font)

    # draw onto sub-layer
    sub = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd  = ImageDraw.Draw(sub)
    sd.text(
        (q_x - qw2 // 2 + q_w // 2,
         int(q_y) - qh2 // 2 - qtop2),
        "?", font=q_font, fill=(*q_color, q_alpha)
    )
    layer = Image.alpha_composite(layer, sub)

    # ── Thin divider line between GUT and HEALTH ──────────────────────────────
    line_prog  = ease_out(seg(T, 0.75, 1.10))
    exit_line  = ease_in(seg(T, 4.80, 5.10))
    line_alpha = int(255 * line_prog * (1 - exit_line))
    line_y     = (GUT_Y + HLTH_Y) // 2 - 10
    half_w     = int(line_prog * 300)
    if half_w > 0:
        line_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ld = ImageDraw.Draw(line_layer)
        ld.line([(CX - half_w, line_y), (CX + half_w, line_y)],
                fill=(*GREEN, line_alpha), width=3)
        layer = Image.alpha_composite(layer, line_layer)

    # ── Small tagline ─────────────────────────────────────────────────────────
    tag_alpha = int(255 * ease_out(seg(T, 1.50, 2.00))
                       * (1 - ease_in(seg(T, 4.60, 4.90))))
    if tag_alpha > 0:
        tag_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        td = ImageDraw.Draw(tag_layer)
        draw_text_centered(td, "IT'S THE QUESTION EVERYONE'S ASKING.",
                           FONT_TINY, CX, H // 2 + 310, GREY, tag_alpha)
        layer = Image.alpha_composite(layer, tag_layer)

    # ── Convert + post-process ─────────────────────────────────────────────────
    frame = np.array(layer.convert("RGB"))
    frame = add_grain(frame, strength=12)
    frame = scanlines(frame, gap=5, strength=0.08)
    return frame


# ── Render ────────────────────────────────────────────────────────────────────
print(f"Rendering {FRAMES} frames at {W}x{H} …")
writer = imageio.get_writer(OUT, fps=FPS, codec="libx264",
                             quality=9, pixelformat="yuv420p")

for i in range(FRAMES):
    writer.append_data(make_frame(i))
    if i % FPS == 0:
        print(f"  {i}/{FRAMES}  ({i/FPS:.1f}s)")

writer.close()
print(f"\nDone → {OUT}")
