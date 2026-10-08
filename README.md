# Cutline Studio

A free Windows desktop video editor inspired by CapCut's editing workflow, with its own interface and a coral `#f45f77` accent. Projects and media stay on your computer. The implemented tools have no account requirement, subscription, or export watermark.

## Run locally

Use Windows x64 and Node.js 22.12 or newer. In PowerShell:

```powershell
git clone https://github.com/wobblingbottom/video-editing-tool.git
cd video-editing-tool
npm ci
npm start
```

Dependencies download Electron, FFmpeg, and FFprobe during installation. Normal editing and export work offline afterward.

## Build the Windows app

```powershell
npm run build:win
```

Open `release/Cutline-Studio-1.6.1.exe`. The portable app bundles its runtime and media tools; Node.js is only needed to develop or build it. The executable is unsigned.

## Editing tools

- Import videos, still images, music, and sound effects using **Import media**, **Ctrl I**, or a file drop.
- Move, trim, split, duplicate, group, copy/paste, and ripple-delete clips, with undo/redo.
- Use up to sixteen persistent layers per video, text, and audio track. Higher visual layers appear above lower ones. All overlapping unmuted soundtracks mix together.
- Use **Magnet** to pack and rearrange the main sequence, **Link** to carry attached overlays and sound, and **Snap** to align clip edges. Hold **Alt** during a drag to bypass snapping.
- Create styled titles with fonts, outlines, shadows, and backgrounds. Drag video or text directly in Preview to position it.
- Adjust scale, rotation, speed, brightness, contrast, saturation, volume, and independent video/audio fades.
- Animate position, opacity, and volume with keyframes, or apply Fade in, Slide across, and Rise up presets. Keyframes interpolate linearly; scale and rotation are static controls.
- Add **Cross dissolve** or **Fade through black** between neighboring video clips. Preview and export use the same timing.
- Switch between landscape, portrait, square, and 4:3 aspect ratios.

## Play videos and audio together

Drag a video into **Drop video here to add a layer**, above the existing video tracks, and align its start with another clip. The media card's **layer button** also places video on a separate layer at the playhead; its **+** button adds video to the main sequence.

Select an overlapping video and open **Inspector → Video → Show videos together**. Choose **Picture in picture**, **Side by side**, or **Full frame**, then adjust position and scale if needed. Side by side requires the playhead to be inside both videos. A full-size upper picture covers the lower one.

Add music at the playhead with the media card's **+** button, or drop it into the new audio layer area below the tracks. Overlapping audio uses separate layers. Track mute buttons and **Inspector → Audio** control volume, fades, and audio extraction. **＋ Video layer** and **＋ Audio layer** create empty tracks for manual placement.

## Export

Choose **Export**, then select a format:

| Format | Size | Frame rate | Options |
| --- | --- | --- | --- |
| MP4 | 720p, 1080p, 2160p | 24, 25, 30, 60 fps | H.264 video, AAC audio; Standard or High quality |
| GIF | 240p, 360p, 480p, 720p | 10, 15, 20, 24, 25, 30 fps | Standard or High color quality; continuous looping or play once |

GIF includes composited video layers, text, motion, and transitions without audio. Its default is 480p at 15 fps. High quality uses more colors and smoother dithering. GIF palette generation uses a separate pass to keep memory use down on longer timelines.

Export settings do not change the project's frame rate. Progress and cancellation are available; **Show in folder** reveals the completed file. Export and Cancel remain visible while settings scroll in smaller windows.

## Projects and shortcuts

Save with **Ctrl S** and reopen `.cutline` files with **Ctrl O**. Projects reference the original media paths; keep source files available. Layer order, groups, layouts, track states, text styling, keyframes, transitions, and timeline settings are preserved. Older version 1 projects remain supported.

| Shortcut | Action |
| --- | --- |
| Space | Play / pause |
| Left / Right | Move one frame |
| Ctrl B | Split selected clips at the playhead |
| Ctrl A | Select all timeline clips |
| Ctrl / Shift click | Extend selection |
| Ctrl C / X / V | Copy / cut / paste at the playhead |
| Ctrl G / Ctrl Shift G | Group / ungroup |
| Delete / Shift Delete | Delete / ripple delete |
| Ctrl Z / Ctrl Shift Z | Undo / redo |
| K | Add a keyframe |
| Ctrl wheel / Shift wheel | Zoom around the pointer / scroll horizontally |

Right-click the timeline for additional editing actions. Drag the divider above the timeline to resize it. Locked tracks resist edits; visibility and mute settings are reflected in preview and export.

## Development checks

Run these in order; the real export tests generate the media fixtures used by desktop checks:

```powershell
npm run check
npm test
npm run test:desktop
```

To verify a built app:

```powershell
node scripts/verify-desktop.cjs "release/win-unpacked/Cutline Studio.exe"
```

Tests cover actual FFmpeg exports, animation timing, color blending, audio mixing, cancellation, project persistence, and desktop editing workflows. Generated media, screenshots, build outputs, and local project files are excluded from Git.

## Roadmap and license

Automatic captions, AI background removal, masks, autosave, and cloud collaboration remain planned; see [ROADMAP.md](ROADMAP.md). CapCut's proprietary assets and hosted AI services are not included. Preview depends on Electron's supported codecs; export uses FFmpeg.

Application source is licensed under [MIT](LICENSE). Bundled dependencies retain their own licenses.
