"""
Minimalist wellness typography: "GUT HEALTH?"
Warm cream background, charcoal text, soft motion.
1080x1080, 30fps, ~7s.
"""

import os, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import imageio

W, H   = 1080, 1080
FPS    = 30
SECS   = 7.0
FRAMES = int(FPS * SECS)
OUT    = "/home/user/Claude/gut_health_v2.mp4"

# ── Palette ────────────────────────────────────────────────────────────────────
CREAM   = (248, 245, 240)   # warm off-white background
CHARCOAL= ( 28,  26,  24)   # near-black text
SAGE    = (130, 160, 120)   # muted sage green for "?"

# ── Fonts ──────────────────────────────────────────────────────────────────────
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

FONT_GUT    = load_font(230)
FONT_HEALTH = load_font(155)
FONT_Q      = FONT_HEALTH

# ── Helpers ────────────────────────────────────────────────────────────────────
def tsize(text, font):
    d = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    bb = d.textbbox((0, 0), text, font=font)
    return bb[2]-bb[0], bb[3]-bb[1], bb[1]   # w, h, top_offset

def ease_out(t, exp=3):
    return 1 - (1 - max(0., min(1., t))) ** exp

def ease_in_out(t):
    t = max(0., min(1., t))
    return t * t * (3 - 2 * t)

def seg(T, s, e):
    return max(0., min(1., (T - s) / (e - s)))

def blend_color(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))

# ── Layout constants ───────────────────────────────────────────────────────────
gw, gh, gt  = tsize("GUT",     FONT_GUT)
hw, hh, ht  = tsize("HEALTH",  FONT_HEALTH)
qw, qh, qtt = tsize("?",       FONT_Q)

# total width of "HEALTH?" on one line
health_q_w = hw + qw + 8          # small kerning gap

LINE_GAP = 32                      # gap between GUT and HEALTH? lines
BLOCK_H  = gh + LINE_GAP + hh
GUT_CY   = H // 2 - LINE_GAP // 2 - hh - 10
HEALTH_CY= H // 2 + LINE_GAP // 2 + gh // 2 + 4

GUT_X    = W // 2 - gw // 2
HEALTH_X = W // 2 - health_q_w // 2

# ── Build each frame ───────────────────────────────────────────────────────────
def make_frame(i):
    T = i / (FRAMES - 1) * SECS   # seconds

    # Timing
    # 0.0-0.6   background breathes in (cream fades up from white)
    # 0.6-1.8   "GUT" rises and fades in
    # 1.6-2.9   "HEALTH?" rises and fades in
    # 2.9-5.5   hold — very gentle vertical drift (breathing)
    # 5.5-7.0   everything fades to white

    bg_prog    = ease_out(seg(T, 0.0,  0.8),  exp=2)
    gut_alpha  = ease_out(seg(T, 0.6,  1.7),  exp=2)
    gut_rise   = 1 - ease_out(seg(T, 0.6,  1.7),  exp=3)
    hlth_alpha = ease_out(seg(T, 1.6,  2.8),  exp=2)
    hlth_rise  = 1 - ease_out(seg(T, 1.6,  2.8),  exp=3)
    fade_out   = ease_in_out(seg(T, 5.5, 7.0))

    # subtle breathing drift during hold
    drift = math.sin(max(0., T - 2.9) * 0.9) * 5   # ±5 px, slow

    RISE_PX = 38   # how far text rises from

    # ── Background ────────────────────────────────────────────────────────────
    bg = blend_color((255, 255, 255), CREAM, bg_prog)
    frame = Image.new("RGBA", (W, H), (*bg, 255))
    draw  = ImageDraw.Draw(frame)

    # ── GUT ───────────────────────────────────────────────────────────────────
    gut_y  = GUT_CY + gut_rise * RISE_PX + drift
    a_gut  = int(255 * gut_alpha * (1 - fade_out))
    if a_gut > 0:
        draw.text(
            (GUT_X, int(gut_y) - gh // 2 - gt),
            "GUT", font=FONT_GUT,
            fill=(*CHARCOAL, a_gut)
        )

    # ── Thin separator line ───────────────────────────────────────────────────
    line_prog  = ease_out(seg(T, 1.3, 2.2), exp=2)
    a_line = int(140 * line_prog * (1 - fade_out))   # subtle, not full black
    if a_line > 0:
        line_y  = (GUT_CY + HEALTH_CY) // 2 + drift
        half_lw = int(line_prog * min(gw, health_q_w) // 2)
        draw.line(
            [(W//2 - half_lw, int(line_y)),
             (W//2 + half_lw, int(line_y))],
            fill=(*SAGE, a_line), width=2
        )

    # ── HEALTH ────────────────────────────────────────────────────────────────
    hlth_y = HEALTH_CY + hlth_rise * RISE_PX + drift
    a_hlth = int(255 * hlth_alpha * (1 - fade_out))
    if a_hlth > 0:
        draw.text(
            (HEALTH_X, int(hlth_y) - hh // 2 - ht),
            "HEALTH", font=FONT_HEALTH,
            fill=(*CHARCOAL, a_hlth)
        )
        draw.text(
            (HEALTH_X + hw + 8, int(hlth_y) - qh // 2 - qtt),
            "?", font=FONT_Q,
            fill=(*CHARCOAL, a_hlth)
        )

    return np.array(frame.convert("RGB"))


# ── Render ────────────────────────────────────────────────────────────────────
print(f"Rendering {FRAMES} frames …")
writer = imageio.get_writer(OUT, fps=FPS, codec="libx264",
                             quality=8, pixelformat="yuv420p",
                             macro_block_size=1)
for i in range(FRAMES):
    writer.append_data(make_frame(i))
    if i % FPS == 0:
        print(f"  {i}/{FRAMES}")
writer.close()
print(f"Done → {OUT}")
