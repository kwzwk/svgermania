#!/usr/bin/env python3
"""Render a looping top-down GIF of an exercise from a scene file.

Usage:
    python3 tools/exercise-gifs/render.py tools/exercise-gifs/scenes/aw-ball-raeuber.json
    python3 tools/exercise-gifs/render.py SCENE.json --lang en --out path/to/file.gif

A scene describes the pitch, the players and the ball in metres and seconds.
Every track loops: the last keyframe flows back into the first at t = duration.

Scene format (see scenes/aw-ball-raeuber.json):
    id, duration (s), fps, field: {w, h, margin}
    cones: [[x, y], ...]
    teams: {name: {color, bib?}}
    players: [{id, team, path: [[t, x, y], ...], highlight?: [[from, to], ...]}]
    balls: [{keys: [{t, on: playerId, fx?: "sole"} | {t, x, y}]}]
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


class Scene:
    def __init__(self, spec):
        self.spec = spec
        self.d = spec["duration"]
        self.players = {p["id"]: p for p in spec["players"]}

    def player_pos(self, pid, t):
        return path_pos(self.players[pid]["path"], t, self.d)

    def heading(self, pid, t):
        a, b = self.player_pos(pid, t - 0.15), self.player_pos(pid, t + 0.15)
        dx, dy = b[0] - a[0], b[1] - a[1]
        n = math.hypot(dx, dy)
        if n < 0.05:
            return None
        return dx / n, dy / n

    def ball_at_foot(self, pid, t, fx=None):
        x, y = self.player_pos(pid, t)
        h = self.heading(pid, t) or self._last_heading(pid, t)
        off = 0.75
        if fx == "sole":
            # Ball rolled back and forth under the sole while standing.
            off = 0.55 + 0.35 * math.sin(t * 2 * math.pi * 1.6)
        return x + h[0] * off, y + h[1] * off

    def _last_heading(self, pid, t):
        for back in range(1, 40):
            h = self.heading(pid, t - back * 0.1)
            if h:
                return h
        return (0.0, 1.0)

    def key_pos(self, k, t):
        if "on" in k:
            return self.ball_at_foot(k["on"], t, k.get("fx"))
        return k["x"], k["y"]

    def ball_pos(self, ball, t):
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
                    return self.ball_at_foot(k0["on"], tt, k0.get("fx")), False
                a, b = self.key_pos(k0, t0), self.key_pos(k1, t1)
                u = (tt - t0) / (t1 - t0)
                u = 1 - (1 - u) ** 2  # a kicked ball slows down
                return (a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u), a != b
        return self.key_pos(keys[0], t), False


def font(size, bold=False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT, size * SS)


def render(spec, lang, out, px_per_m=16):
    sc = Scene(spec)
    f = spec["field"]
    m = f.get("margin", 3)
    W = round((f["w"] + 2 * m) * px_per_m)
    field_h = round((f["h"] + 2 * m) * px_per_m)
    bar = 58
    H = field_h + bar
    s = px_per_m * SS

    def P(x, y):
        return (x + m) * s, (y + m) * s

    teams = spec["teams"]

    # Static background: grass stripes, field lines, cones, legend.
    bg = Image.new("RGB", (W * SS, H * SS), GRASS)
    d = ImageDraw.Draw(bg)
    stripe = f["w"] / 5
    for i in range(-2, 8):
        if i % 2:
            x0, _ = P(i * stripe, 0)
            d.rectangle([x0, 0, x0 + stripe * s, field_h * SS], fill=GRASS_STRIPE)
    d.rectangle([*P(0, 0), *P(f["w"], f["h"])], outline=LINE, width=2 * SS)
    for cx, cy in spec.get("cones", []):
        x, y = P(cx, cy)
        r = 0.45 * s
        d.polygon([(x, y - r), (x + r * 0.9, y + r * 0.7), (x - r * 0.9, y + r * 0.7)], fill=(255, 140, 20), outline=(150, 70, 0))
    d.rectangle([0, field_h * SS, W * SS, H * SS], fill=BAR_BG)
    lx = 10 * SS
    ly = (field_h + bar - 16) * SS
    for item in spec.get("legend", []):
        col = teams[item["team"]]["color"]
        d.ellipse([lx, ly - 5 * SS, lx + 10 * SS, ly + 5 * SS], fill=col, outline="white", width=SS)
        lx += 14 * SS
        label = item[lang]
        d.text((lx, ly), label, font=font(11), fill=(190, 195, 200), anchor="lm")
        lx += d.textlength(label, font=font(11)) + 16 * SS

    frames = []
    total = round(sc.d * spec["fps"])
    for fi in range(total):
        t = fi / spec["fps"]
        im = bg.copy()
        d = ImageDraw.Draw(im)

        pr = 0.62 * s
        drawn = []
        for p in spec["players"]:
            x, y = P(*sc.player_pos(p["id"], t))
            drawn.append((y, p, x))
        for y, p, x in sorted(drawn, key=lambda e: e[0]):
            team = teams[p["team"]]
            if any(a <= t < b for a, b in p.get("highlight", [])):
                rr = pr * 1.6
                d.ellipse([x - rr, y - rr, x + rr, y + rr], outline=(255, 235, 90), width=2 * SS)
            d.ellipse([x - pr + 2 * SS, y - pr + 3 * SS, x + pr + 2 * SS, y + pr + 3 * SS], fill=(30, 80, 40))
            d.ellipse([x - pr, y - pr, x + pr, y + pr], fill=team["color"], outline="white", width=2 * SS)
            if team.get("bib"):
                d.rectangle([x - pr * 0.75, y - pr * 0.22, x + pr * 0.75, y + pr * 0.22], fill=team["bib"], outline=(120, 60, 0), width=SS)
            h = sc.heading(p["id"], t) or sc._last_heading(p["id"], t)
            d.ellipse([x + h[0] * pr * 0.55 - 2 * SS, y + h[1] * pr * 0.55 - 2 * SS,
                       x + h[0] * pr * 0.55 + 2 * SS, y + h[1] * pr * 0.55 + 2 * SS], fill="white")

        br = 0.3 * s
        for ball in spec.get("balls", []):
            (bx, by), moving = sc.ball_pos(ball, t)
            if moving:
                for k in range(1, 5):
                    (tx, ty), _ = sc.ball_pos(ball, t - k * 0.06)
                    tx, ty = P(tx, ty)
                    rr = br * (1 - k * 0.18)
                    d.ellipse([tx - rr, ty - rr, tx + rr, ty + rr], fill=(200, 225, 200))
            x, y = P(bx, by)
            d.ellipse([x - br, y - br, x + br, y + br], fill="white", outline=(20, 20, 20), width=SS)

        caption = next((c[lang] for c in spec.get("captions", []) if c["from"] <= t < c["to"]), "")
        d.text((10 * SS, (field_h + 18) * SS), caption, font=font(14, bold=True), fill=BAR_TEXT, anchor="lm")

        small = im.resize((W, H), Image.LANCZOS)
        if not frames:
            palette = small.quantize(colors=48, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        # One shared palette lets the GIF store only the changed area of each frame.
        frames.append(small.quantize(palette=palette, dither=Image.Dither.NONE))

    out.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(out, save_all=True, append_images=frames[1:], duration=round(1000 / spec["fps"]),
                   loop=0, optimize=True, disposal=1)
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("scene", type=Path)
    ap.add_argument("--lang", default="de", choices=["de", "en"])
    ap.add_argument("--out", type=Path)
    a = ap.parse_args()
    spec = json.loads(a.scene.read_text(encoding="utf-8"))
    suffix = "" if a.lang == "de" else f".{a.lang}"
    out = a.out or Path(__file__).resolve().parents[2] / "img" / "exercises" / f"{spec['id']}{suffix}.gif"
    print(render(spec, a.lang, out))


if __name__ == "__main__":
    main()
