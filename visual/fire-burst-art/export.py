import base64
import io
import json
import math
import os
from pathlib import Path
import shutil
import subprocess

from PIL import Image


ROOT = Path(__file__).resolve().parent
BROWSER = shutil.which("agent-browser")
ENV = dict(os.environ)
ENV.setdefault("AGENT_BROWSER_SESSION", "fire-burst-art")


def browser(*args):
    command = [BROWSER]
    if ENV.get("AGENT_BROWSER_CDP"):
        command.extend(["--cdp", ENV["AGENT_BROWSER_CDP"]])
    command.extend(["--json", *args])
    result = subprocess.run(command, capture_output=True, text=True, encoding="utf-8", env=ENV)
    if result.returncode:
        raise RuntimeError(result.stderr or result.stdout)
    response = json.loads(result.stdout)
    if not response.get("success", False):
        raise RuntimeError(response)
    return response["data"]


def evaluate(source):
    encoded = base64.b64encode(source.encode()).decode()
    return browser("eval", "-b", encoded)["result"]


def export():
    if not BROWSER:
        raise RuntimeError("agent-browser não encontrado")
    browser("open", (ROOT / "Fire Burst.html").as_uri() + "?bg=dark&time=0.9")
    result = evaluate("""
(() => {
  const effect = window.FireBurst;
  if (!effect || !effect.canvas) throw new Error('API FireBurst indisponível');
  const width = 800, height = 450, fps = 24, columns = 8;
  const count = Math.ceil(effect.duration * fps);
  const sheet = document.createElement('canvas');
  sheet.width = columns * width;
  sheet.height = Math.ceil(count / columns) * height;
  const context = sheet.getContext('2d');
  effect.renderAt(0.9);
  const first = effect.canvas.toDataURL();
  effect.renderAt(0.9);
  if (first !== effect.canvas.toDataURL()) throw new Error('Render não determinístico');
  for (let frame = 0; frame < count; frame++) {
    effect.renderAt(frame / fps);
    context.drawImage(effect.canvas, frame % columns * width,
      Math.floor(frame / columns) * height, width, height);
  }
  effect.renderAt(effect.duration);
  const end = effect.canvas.getContext('2d').getImageData(0, 0,
    effect.canvas.width, effect.canvas.height).data;
  for (let i = 3; i < end.length; i += 4) {
    if (end[i] !== 0) throw new Error('Há resíduo após o ataque');
  }
  effect.renderAt(0.9);
  return { png: sheet.toDataURL('image/png').split(',')[1], width, height,
    columns, count, fps, duration: effect.duration,
    canvasSize: [effect.canvas.width, effect.canvas.height],
    deterministic: true, cleanEnd: true,
    uiElements: document.querySelectorAll('button,input,select,nav').length };
})()
""")
    sheet = Image.open(io.BytesIO(base64.b64decode(result.pop("png")))).convert("RGBA")
    frames = []
    boxes = []
    for index in range(result["count"]):
        x = index % result["columns"] * result["width"]
        y = index // result["columns"] * result["height"]
        frame = sheet.crop((x, y, x + result["width"], y + result["height"]))
        frames.append(frame)
        boxes.append(frame.getchannel("A").getbbox())
    visible = [box for box in boxes if box]
    if len(visible) < 12:
        raise RuntimeError("Animação sem quadros visíveis suficientes")
    if boxes[-1]:
        raise RuntimeError("Último quadro ainda contém pixels visíveis")
    if any(box[0] == 0 or box[1] == 0 or box[2] == result["width"]
           or box[3] == result["height"] for box in visible):
        raise RuntimeError("Efeito cortado na borda")
    if result["uiElements"]:
        raise RuntimeError("Interface visível no efeito isolado")
    sheet.save(ROOT / "fire-burst-spritesheet.png")
    durations = [round((i + 1) * 1000 / result["fps"]) - round(i * 1000 / result["fps"])
                 for i in range(len(frames))]
    frames[0].save(ROOT / "fire-burst-animation.png", save_all=True,
                   append_images=frames[1:], duration=durations,
                   loop=0, disposal=0, blend=0, optimize=False)
    animated = Image.open(ROOT / "fire-burst-animation.png")
    if not animated.is_animated:
        raise RuntimeError("APNG exportado sem animação")
    playback_duration = 0
    for index in range(animated.n_frames):
        animated.seek(index)
        playback_duration += animated.info["duration"]
    if abs(playback_duration - sum(durations)) > 1:
        raise RuntimeError("Duração divergente no APNG")
    animated.seek(animated.n_frames - 1)
    if animated.convert("RGBA").getchannel("A").getbbox():
        raise RuntimeError("APNG com resíduo no último quadro")
    result.update({
        "rows": math.ceil(result["count"] / result["columns"]),
        "sheetSize": list(sheet.size),
        "order": "row-major",
        "alpha": "straight RGBA",
        "loop": True,
        "animationFile": "fire-burst-animation.png",
        "sheetFile": "fire-burst-spritesheet.png",
        "visibleFrames": len(visible),
        "apngFrames": animated.n_frames,
        "playbackDurationMs": playback_duration,
        "noClipping": True,
        "firstFrameTransparent": boxes[0] is None,
        "lastFrameTransparent": boxes[-1] is None,
    })
    (ROOT / "fire-burst-animation.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    browser("open", (ROOT / "Fire Burst.html").as_uri() + "?bg=dark")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    try:
        export()
    finally:
        if not ENV.get("AGENT_BROWSER_CDP") and BROWSER:
            browser("close")
