import sys
import numpy as np
from PIL import Image

def process_atlas(input_path: str, output_path: str) -> None:
    img = Image.open(input_path)
    w, h = img.size
    cw, ch = w // 4, h // 4

    rgb = np.array(img.convert('RGB'), dtype=np.float32)

    corner_samples = []
    for r in range(4):
        for c in range(4):
            if r == 3 and c == 3: continue
            corner_samples.extend([
                rgb[r*ch + 8, c*cw + 8],
                rgb[r*ch + 8, (c+1)*cw - 9],
                rgb[(r+1)*ch - 9, c*cw + 8],
                rgb[(r+1)*ch - 9, (c+1)*cw - 9],
            ])
    bg_median = np.median(corner_samples, axis=0)
    bg_brightness = np.mean(bg_median)

    if bg_brightness > 128.0:
        diff = np.linalg.norm(rgb - bg_median, axis=2)
        sat = np.max(rgb, axis=2) - np.min(rgb, axis=2)
        if np.max(sat) < 30.0:
            intensity = np.clip((diff - 16.0) / max(1.0, bg_median[0] - 16.0), 0.0, 1.0)
            arr = np.zeros((h, w, 4), dtype=np.uint8)
            arr[:, :, :3] = np.clip(intensity[:, :, None] * 255.0, 0, 255).astype(np.uint8)
            arr[:, :, 3] = np.clip(intensity * 255.0, 0, 255).astype(np.uint8)
        else:
            low = 35.0
            high = 95.0
            alpha = np.clip((diff - low) / (high - low) * 255.0, 0.0, 255.0)
            alpha[diff <= low] = 0
            arr = np.zeros((h, w, 4), dtype=np.uint8)
            arr[:, :, :3] = np.clip(rgb, 0, 255).astype(np.uint8)
            arr[:, :, 3] = alpha.astype(np.uint8)
    elif bg_brightness > 25.0:
        diff = np.linalg.norm(rgb - bg_median, axis=2)
        low = 22.0
        high = 85.0
        alpha = np.clip((diff - low) / (high - low) * 255.0, 0.0, 255.0)
        alpha[diff <= low] = 0
        arr = np.zeros((h, w, 4), dtype=np.uint8)
        arr[:, :, :3] = np.clip(rgb, 0, 255).astype(np.uint8)
        arr[:, :, 3] = alpha.astype(np.uint8)
    else:
        max_c = np.max(rgb, axis=2)
        bg_low = 14.0
        bg_high = 245.0
        alpha = np.clip((max_c - bg_low) / (bg_high - bg_low) * 255.0, 0.0, 255.0)
        alpha[max_c <= bg_low] = 0
        arr = np.zeros((h, w, 4), dtype=np.uint8)
        arr[:, :, :3] = np.clip(rgb, 0, 255).astype(np.uint8)
        arr[:, :, 3] = alpha.astype(np.uint8)

    arr[arr[:, :, 3] == 0] = 0

    for i in [1, 2, 3]:
        gx = int(w * i / 4)
        gy = int(h * i / 4)

        col_slice = arr[:, max(0, gx - 2):min(w, gx + 3)]
        col_alpha = col_slice[:, :, 3]
        col_rgb = col_slice[:, :, :3].astype(np.int32)
        sat = np.max(col_rgb, axis=2) - np.min(col_rgb, axis=2)
        is_grid_col = (col_alpha > 0) & (sat < 30)

        if np.mean(np.any(is_grid_col, axis=1)) > 0.6:
            for dx in range(-2, 3):
                px = gx + dx
                if 0 <= px < w:
                    p_rgb = arr[:, px, :3].astype(np.int32)
                    p_sat = np.max(p_rgb, axis=1) - np.min(p_rgb, axis=1)
                    p_alpha = arr[:, px, 3]
                    mask = (p_alpha > 0) & (p_sat < 35) & (arr[:, px, 0] > 100)
                    arr[mask, px] = 0

        row_slice = arr[max(0, gy - 2):min(h, gy + 3), :]
        row_alpha = row_slice[:, :, 3]
        row_rgb = row_slice[:, :, :3].astype(np.int32)
        sat_row = np.max(row_rgb, axis=2) - np.min(row_rgb, axis=2)
        is_grid_row = (row_alpha > 0) & (sat_row < 30)

        if np.mean(np.any(is_grid_row, axis=0)) > 0.6:
            for dy in range(-2, 3):
                py = gy + dy
                if 0 <= py < h:
                    p_rgb = arr[py, :, :3].astype(np.int32)
                    p_sat = np.max(p_rgb, axis=1) - np.min(p_rgb, axis=1)
                    p_alpha = arr[py, :, 3]
                    mask = (p_alpha > 0) & (p_sat < 35) & (arr[py, :, 0] > 100)
                    arr[py, mask] = 0

    arr[:3, :] = 0
    arr[-3:, :] = 0
    arr[:, :3] = 0
    arr[:, -3:] = 0

    cw, ch = w // 4, h // 4
    arr[3 * ch:, 3 * cw:] = 0
    arr[arr[:, :, 3] == 0] = 0

    out = Image.fromarray(arr, 'RGBA')
    out.save(output_path, 'PNG', optimize=True)
    print(f"Successfully saved {output_path} ({out.size[0]}x{out.size[1]})")

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python process_spritesheet.py <input> <output>")
        sys.exit(1)
    process_atlas(sys.argv[1], sys.argv[2])
