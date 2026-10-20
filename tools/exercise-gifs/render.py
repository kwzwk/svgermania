#!/usr/bin/env python3
"""Render a looping top-down GIF of an exercise from a scene file.

Usage:
    python3 tools/exercise-gifs/render.py tools/exercise-gifs/scenes/aw-ball-raeuber.json
    python3 tools/exercise-gifs/render.py SCENE.json --lang en --out path/to/file.gif
    python3 tools/exercise-gifs/render.py --all            # every scene, de + en
    python3 tools/exercise-gifs/render.py SCENE.json --sheet sheet.png   # still frames for checking

A scene describes the pitch, the players and the balls in metres and seconds,
origin top left, x to the right, y downwards. Every track loops: the last
keyframe flows back into the first at t = duration.

Scene format (see scenes/*.json):
    id, duration (s), fps
    field: {w, h, margin, outline?: true}        main area; the picture is scaled to fit
    lines: [[x1, y1, x2, y2], ...]                white lines (half-way line, extra fields)
    dashed: [[x1, y1, x2, y2], ...]               dashed white lines (shooting zones)
    rects: [{x, y, w, h, fill?, line?}]           extra pitches or shaded zones; fill may be "#rrggbbaa"
    goals: [{x, y, side, w?, kind?}]              goal centred on (x, y); side = top|bottom|left|right
                                                  (where the net sits); kind = mini (1.2 m) | small (5 m)
    cones: [[x, y] | [x, y, "#color"], ...]
    poles: [[x, y], ...]                          slalom poles / dummy opponents
    rings: [[x, y], ...]
    labels: [{x, y, de, en, size?}]               static text on the pitch
    signals: [{from, to, color, de?, en?}]        coloured card held up in the top right corner
    teams: {name: {color, bib?, letter?}}
    players: [{id, team, path: [[t, x, y], ...], highlight?: [[from, to]], tail?: [[from, to]],
               letter?, hidden?: [[from, to]]}]
    balls: [{color?, show?: [[from, to]], keys: [{t, on: playerId, fx?} | {t, x, y, lob?}]}]
           fx while at a player's feet: sole (rolled back and forth) | around (circles the body)
                                         | hand (held in the hands)
           lob: true on a free key makes the ball fly through the air to that point
    captions: [{from, to, de, en}]
    legend: [{team, de, en}]
"""
import argparse
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

SS = 3  # supersampling factor for smooth edges
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
GRASS = (58, 140, 70)
GRASS_STRIPE = (52, 128, 63)
LINE = (240, 245, 240)
BAR_BG = (28, 32, 36)
BAR_TEXT = (240, 240, 240)
CONE = "#ff8c14"
MAX_W, MAX_H = 416, 440  # pitch area in px, before the caption bar
PLAYER_R = 10  # px, independent of pitch size so every GIF reads the same
BALL_R = 4.8
REF_PPM = 16  # px per metre the foot offsets were tuned for
ROOT = Path(__file__).resolve().parent


def catmull_rom(p0, p1, p2, p3, u):
    u2, u3 = u * u, u * u * u
    return tuple(
        0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3)
        for a, b, c, d in zip(p0, p1, p2, p3)
    )


def path_pos(path, t, duration):
    """Position on a closed, time-keyed path. Equal consecutive points hold still."""
    t %= duration
    n = len(path)
    if n == 1:
        return tuple(path[0][1:])
    for i in range(n):
        t0 = path[i][0]
        t1 = path[i + 1][0] if i + 1 < n else duration + path[0][0]
        if t0 <= t < t1 or (i == n - 1 and t < path[0][0]):
            if t < t0:
                t += duration
            p1, p2 = path[i][1:], path[(i + 1) % n][1:]
            if p1 == p2:
                return tuple(p1)
            u = (t - t0) / (t1 - t0)
            p0, p3 = path[i - 1][1:], path[(i + 2) % n][1:]
            # Neighbours that hold still would make the curve overshoot.
            if p0 == p1:
                p0 = [2 * p1[0] - p2[0], 2 * p1[1] - p2[1]]
            if p3 == p2:
                p3 = [2 * p2[0] - p1[0], 2 * p2[1] - p1[1]]
            return catmull_rom(p0, p1, p2, p3, u)
    return tuple(path[0][1:])


def within(t, spans):
    return any(a <= t < b for a, b in spans)


class Scene:
    def __init__(self, spec, ppm):
        self.spec = spec
        self.d = spec["duration"]
        self.players = {p["id"]: p for p in spec["players"]}
        self.k = REF_PPM / ppm  # metres that look like 1 m at the reference scale

    def player_pos(self, pid, t):
        return path_pos(self.players[pid]["path"], t, self.d)

    def heading(self, pid, t):
        a, b = self.player_pos(pid, t - 0.15), self.player_pos(pid, t + 0.15)
        dx, dy = b[0] - a[0], b[1] - a[1]
        n = math.hypot(dx, dy)
        if n < 0.05:
            return None
        return dx / n, dy / n

    def facing(self, pid, t):
        for back in range(0, 40):
            h = self.heading(pid, t - back * 0.1)
            if h:
                return h
        face = self.players[pid].get("face")
        return tuple(face) if face else (0.0, 1.0)

    def ball_at_foot(self, pid, t, fx=None):
        x, y = self.player_pos(pid, t)
        h = self.facing(pid, t)
        if fx == "hand":
            return x + h[0] * 0.2 * self.k, y + h[1] * 0.2 * self.k
        if fx == "around":
            a = t * 2 * math.pi * 0.9
            return x + math.cos(a) * 0.8 * self.k, y + math.sin(a) * 0.8 * self.k
        off = 0.75
        if fx == "sole":
            # Ball rolled back and forth under the sole while standing.
            off = 0.55 + 0.35 * math.sin(t * 2 * math.pi * 1.6)
        return x + h[0] * off * self.k, y + h[1] * off * self.k

    def key_pos(self, k, t):
        if "on" in k:
            return self.ball_at_foot(k["on"], t, k.get("fx"))
        return k["x"], k["y"]

    def ball_pos(self, ball, t):
        """Returns (x, y), whether it is rolling free, and its height (0 on the ground)."""
        keys = ball["keys"]
        t %= self.d
        n = len(keys)
        for i in range(n):
            k0, k1 = keys[i], keys[(i + 1) % n]
            t0 = k0["t"]
            t1 = k1["t"] if i + 1 < n else self.d + keys[0]["t"]
            tt = t + self.d if t < t0 else t
            if t0 <= tt < t1:
                if "on" in k0 and k0.get("on") == k1.get("on"):
                    return self.ball_at_foot(k0["on"], tt, k0.get("fx")), False, 0
                a, b = self.key_pos(k0, t0), self.key_pos(k1, t1)
                u = (tt - t0) / (t1 - t0)
                if k1.get("lob"):
                    z = math.sin(u * math.pi)
                else:
                    u, z = 1 - (1 - u) ** 2, 0  # a kicked ball slows down
                return (a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u), a != b, z
        return self.key_pos(keys[0], t), False, 0


def font(size, bold=False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT, round(size * SS))


def rgba(c):
    c = c.lstrip("#")
    vals = [int(c[i:i + 2], 16) for i in range(0, len(c), 2)]
    return tuple(vals + [255] * (4 - len(vals)))


def text_fit(d, text, max_w, size, bold=False):
    while size > 8 and d.textlength(text, font=font(size, bold)) > max_w:
        size -= 0.5
    return font(size, bold)


def draw_background(spec, lang, W, H, field_h, ppm, P):
    f = spec["field"]
    s = ppm * SS
    bg = Image.new("RGBA", (W * SS, H * SS), GRASS)
    d = ImageDraw.Draw(bg)
    stripe = 4 * REF_PPM / ppm * 1.25
    total_w = W / ppm
    m = f.get("margin", 3)
    for i in range(0, int(total_w / stripe) + 2):
        if i % 2:
            x0 = (i * stripe) * s
            d.rectangle([x0, 0, x0 + stripe * s, field_h * SS], fill=GRASS_STRIPE)

    overlay = Image.new("RGBA", bg.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for r in spec.get("rects", []):
        box = [*P(r["x"], r["y"]), *P(r["x"] + r["w"], r["y"] + r["h"])]
        od.rectangle(box, fill=rgba(r["fill"]) if r.get("fill") else None)
    bg = Image.alpha_composite(bg, overlay)
    d = ImageDraw.Draw(bg)
    for r in spec.get("rects", []):
        if r.get("line", True):
            d.rectangle([*P(r["x"], r["y"]), *P(r["x"] + r["w"], r["y"] + r["h"])], outline=LINE, width=2 * SS)

    if f.get("outline", True):
        d.rectangle([*P(0, 0), *P(f["w"], f["h"])], outline=LINE, width=2 * SS)
    for x1, y1, x2, y2 in spec.get("lines", []):
        d.line([P(x1, y1), P(x2, y2)], fill=LINE, width=2 * SS)
    for x1, y1, x2, y2 in spec.get("dashed", []):
        length = math.hypot(x2 - x1, y2 - y1)
        dash = 6 / ppm
        steps = max(1, int(length / dash))
        for i in range(0, steps, 2):
            a, b = i / steps, min(1, (i + 1) / steps)
            d.line([P(x1 + (x2 - x1) * a, y1 + (y2 - y1) * a), P(x1 + (x2 - x1) * b, y1 + (y2 - y1) * b)],
                   fill=LINE, width=SS * 2)

    for g in spec.get("goals", []):
        w = g.get("w", 5 if g.get("kind") == "small" else 1.2)
        depth = 6 / ppm if g.get("kind") != "small" else 10 / ppm
        side = g["side"]
        dx, dy = {"top": (0, -1), "bottom": (0, 1), "left": (-1, 0), "right": (1, 0)}[side]
        px, py = (1, 0) if dy else (0, 1)
        a = (g["x"] - px * w / 2, g["y"] - py * w / 2)
        b = (g["x"] + px * w / 2, g["y"] + py * w / 2)
        c = (b[0] + dx * depth, b[1] + dy * depth)
        e = (a[0] + dx * depth, a[1] + dy * depth)
        d.polygon([P(*a), P(*b), P(*c), P(*e)], fill=(225, 230, 225), outline=(255, 255, 255))
        for k in range(1, 6):
            q = k / 6
            d.line([P(a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q),
                    P(e[0] + (c[0] - e[0]) * q, e[1] + (c[1] - e[1]) * q)], fill=(170, 180, 170), width=SS)
        d.line([P(*e), P(*a), P(*b), P(*c)], fill=(255, 255, 255), width=3 * SS)

    for r in spec.get("rings", []):
        x, y = P(*r[:2])
        rr = 9 * SS
        d.ellipse([x - rr, y - rr, x + rr, y + rr], outline=r[2] if len(r) > 2 else "#e83b3b", width=3 * SS)
    for c in spec.get("cones", []):
        x, y = P(c[0], c[1])
        r = 7 * SS
        col = c[2] if len(c) > 2 else CONE
        d.polygon([(x, y - r), (x + r * 0.9, y + r * 0.7), (x - r * 0.9, y + r * 0.7)], fill=col, outline=(90, 50, 0))
    for p in spec.get("poles", []):
        x, y = P(*p)
        r = 4 * SS
        d.ellipse([x - r + 3 * SS, y - r + 3 * SS, x + r + 3 * SS, y + r + 3 * SS], fill=(30, 80, 40))
        d.ellipse([x - r, y - r, x + r, y + r], fill="#ffd400", outline=(60, 50, 0), width=SS)
    for lab in spec.get("labels", []):
        d.text(P(lab["x"], lab["y"]), lab[lang], font=font(lab.get("size", 10), True),
               fill=(235, 245, 235), anchor="mm")

    d.rectangle([0, field_h * SS, W * SS, H * SS], fill=BAR_BG)
    lx = 10 * SS
    ly = (H - 16) * SS
    teams = spec["teams"]
    for item in spec.get("legend", []):
        col = teams[item["team"]]["color"]
        d.ellipse([lx, ly - 5 * SS, lx + 10 * SS, ly + 5 * SS], fill=col, outline="white", width=SS)
        lx += 14 * SS
        label = item[lang]
        d.text((lx, ly), label, font=font(11), fill=(190, 195, 200), anchor="lm")
        lx += d.textlength(label, font=font(11)) + 16 * SS
    return bg.convert("RGB")


def render_frames(spec, lang):
    f = spec["field"]
    m = f.get("margin", 3)
    ppm = min(MAX_W / (f["w"] + 2 * m), MAX_H / (f["h"] + 2 * m))
    W = round((f["w"] + 2 * m) * ppm)
    field_h = round((f["h"] + 2 * m) * ppm)
    H = field_h + 58
    s = ppm * SS
    sc = Scene(spec, ppm)

    def P(x, y):
        return (x + m) * s, (y + m) * s

    teams = spec["teams"]
    bg = draw_background(spec, lang, W, H, field_h, ppm, P)
    pr, br = PLAYER_R * SS, BALL_R * SS

    total = round(sc.d * spec["fps"])
    for fi in range(total):
        t = fi / spec["fps"]
        im = bg.copy()
        d = ImageDraw.Draw(im)

        for sig in spec.get("signals", []):
            if sig["from"] <= t < sig["to"]:
                x1, y1 = (W - 14) * SS, 12 * SS
                d.rounded_rectangle([x1 - 34 * SS, y1, x1, y1 + 46 * SS], radius=5 * SS, fill=sig["color"],
                                    outline="white", width=2 * SS)
                if sig.get(lang):
                    d.text((x1 - 17 * SS, y1 + 58 * SS), sig[lang], font=font(10, True), fill="white", anchor="mm")

        drawn = []
        for p in spec["players"]:
            if within(t, p.get("hidden", [])):
                continue
            x, y = P(*sc.player_pos(p["id"], t))
            drawn.append((y, p, x))
        for y, p, x in sorted(drawn, key=lambda e: e[0]):
            team = teams[p["team"]]
            h = sc.facing(p["id"], t)
            if within(t, p.get("highlight", [])):
                rr = pr * 1.6
                d.ellipse([x - rr, y - rr, x + rr, y + rr], outline=(255, 235, 90), width=2 * SS)
            if within(t, p.get("tail", [])):
                tx, ty = x - h[0] * pr * 1.1, y - h[1] * pr * 1.1
                ex, ey = x - h[0] * pr * 2.1 + h[1] * pr * 0.4, y - h[1] * pr * 2.1 - h[0] * pr * 0.4
                d.line([(tx, ty), (ex, ey)], fill=p.get("tailColor", "#ffd23f"), width=5 * SS)
            d.ellipse([x - pr + 2 * SS, y - pr + 3 * SS, x + pr + 2 * SS, y + pr + 3 * SS], fill=(30, 80, 40))
            d.ellipse([x - pr, y - pr, x + pr, y + pr], fill=team["color"], outline="white", width=2 * SS)
            if team.get("bib"):
                d.rectangle([x - pr * 0.75, y - pr * 0.22, x + pr * 0.75, y + pr * 0.22], fill=team["bib"],
                            outline=(120, 60, 0), width=SS)
            letter = p.get("letter", team.get("letter"))
            if letter:
                d.text((x, y), letter, font=font(10, True), fill="white", anchor="mm")
            else:
                d.ellipse([x + h[0] * pr * 0.55 - 2 * SS, y + h[1] * pr * 0.55 - 2 * SS,
                           x + h[0] * pr * 0.55 + 2 * SS, y + h[1] * pr * 0.55 + 2 * SS], fill="white")

        for ball in spec.get("balls", []):
            if ball.get("show") and not within(t % sc.d, ball["show"]):
                continue
            (bx, by), moving, z = sc.ball_pos(ball, t)
            fill = ball.get("color", "white")
            if moving and not z:
                for k in range(1, 5):
                    (tx, ty), _, _ = sc.ball_pos(ball, t - k * 0.06)
                    tx, ty = P(tx, ty)
                    rr = br * (1 - k * 0.18)
                    d.ellipse([tx - rr, ty - rr, tx + rr, ty + rr], fill=(200, 225, 200))
            x, y = P(bx, by)
            if z:
                sh = br * 0.9
                d.ellipse([x - sh + 2 * SS, y - sh + 3 * SS, x + sh + 2 * SS, y + sh + 3 * SS], fill=(30, 80, 40))
                y -= z * 14 * SS
            rr = br * (1 + 0.5 * z)
            d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=fill, outline=(20, 20, 20), width=SS)

        caption = next((c[lang] for c in spec.get("captions", []) if c["from"] <= t < c["to"]), "")
        d.text((10 * SS, (field_h + 18) * SS), caption, font=text_fit(d, caption, (W - 20) * SS, 14, True),
               fill=BAR_TEXT, anchor="lm")

        yield im.resize((W, H), Image.LANCZOS)


def render(spec, lang, out):
    rgb = list(render_frames(spec, lang))
    # One shared palette, built from frames across the loop, lets the GIF store only
    # the changed area of each frame and keeps colours that appear later.
    picks = rgb[:: max(1, len(rgb) // 8)]
    w, h = rgb[0].size
    montage = Image.new("RGB", (w * len(picks), h))
    for i, im in enumerate(picks):
        montage.paste(im, (i * w, 0))
    palette = montage.quantize(colors=64, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    frames = [im.quantize(palette=palette, dither=Image.Dither.NONE) for im in rgb]
    out.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(out, save_all=True, append_images=frames[1:], duration=round(1000 / spec["fps"]),
                   loop=0, optimize=True, disposal=1)
    return out


def sheet(spec, lang, out, count=8):
    rgb = list(render_frames(spec, lang))
    picks = rgb[:: max(1, len(rgb) // count)][:count]
    w, h = rgb[0].size
    cols = 4
    im = Image.new("RGB", (w * cols, h * math.ceil(len(picks) / cols)))
    for i, fr in enumerate(picks):
        im.paste(fr, ((i % cols) * w, (i // cols) * h))
    im.save(out)
    return out


def default_out(spec, lang):
    suffix = "" if lang == "de" else f".{lang}"
    return ROOT.parents[1] / "img" / "exercises" / f"{spec['id']}{suffix}.gif"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("scene", type=Path, nargs="?")
    ap.add_argument("--lang", default="de", choices=["de", "en"])
    ap.add_argument("--out", type=Path)
    ap.add_argument("--sheet", type=Path, help="write a contact sheet of still frames instead of a GIF")
    ap.add_argument("--all", action="store_true", help="render every scene in scenes/, de and en")
    a = ap.parse_args()
    if a.all:
        for path in sorted((ROOT / "scenes").glob("*.json")):
            spec = json.loads(path.read_text(encoding="utf-8"))
            for lang in ("de", "en"):
                print(render(spec, lang, default_out(spec, lang)))
        return
    spec = json.loads(a.scene.read_text(encoding="utf-8"))
    if a.sheet:
        print(sheet(spec, a.lang, a.sheet))
        return
    print(render(spec, a.lang, a.out or default_out(spec, a.lang)))


if __name__ == "__main__":
    main()
