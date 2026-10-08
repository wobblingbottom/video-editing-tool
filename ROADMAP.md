# CapCut-style feature roadmap

Crazyland Motion is a Windows desktop editor. Features are being added in working stages, with preview behavior, project persistence, timeline indicators, and real exports checked together.

Reference: [CapCut Desktop feature overview](https://www.capcut.com/tools/desktop-video-editor). This is a working implementation checklist, not a guarantee that every CapCut feature, preset, service, or platform-specific option has been inventoried. CapCut changes its catalog over time.

## 1. Audio editing — delivered in 1.2
- [x] Full-source waveform analysis, including songs longer than two minutes.
- [x] Waveform display respects source trims and playback speed.
- [x] Visible gain envelope and shaded fade regions.
- [x] Drag and keyboard editing of fade handles.
- [x] Fade duration labels and presets.
- [x] Drag the volume line to adjust clip volume.
- [x] Independent audio and video fades.
- [x] Clip mute with a visible timeline label.
- [x] Extract audio from video, preserving timing, speed, volume, and fades.
- [x] Save/open, undo/redo, preview and export support.
- [x] Volume keyframes through Inspector → Motion, reflected in the gain envelope.
- [ ] Voice recording and voiceover tracks.
- [ ] Equalizer, normalization, noise reduction, voice enhancement.
- [ ] Beat detection and music synchronization.
- [ ] Pitch controls, voice effects and voice isolation.

## 2. Transitions — first transition delivered in 1.2
- [x] Cross dissolve between video clips.
- [x] Shaded timeline transition region and duration marker.
- [x] Drag or type the transition duration.
- [x] Matching preview and exported video blending.
- [x] Undo/redo, remove transition and save/open.
- [x] Fade through black.
- [ ] Fade through white.
- [ ] Wipes, slides, zooms and blur transitions.
- [x] Transition shelf with animated illustrations for dissolve and fade through black.
- [ ] User-defined reusable transition presets.
- [ ] Optional linked audio crossfades.

A dissolve overlaps the selected clip with its preceding video clip and shifts following video clips. Music and text remain anchored. Move the playhead outside the incoming dissolve region before splitting that clip.

## 3. Animation and keyframes — first controls delivered in 1.3
- [x] Keyframes for horizontal/vertical position, opacity and volume.
- [ ] Scale and rotation keyframes.
- [x] Visible, clickable keyframe diamonds on the timeline.
- [x] Add, update, jump to, remove and clear keyframes.
- [ ] Move and copy individual keyframes.
- [x] Linear interpolation, preserved by trimming, splitting and speed changes.
- [ ] Eased interpolation.
- [ ] Graph editor and custom easing curves.
- [x] Fade, slide and rise entry presets with an exit fade for text/video.
- [ ] Looping animations and separate entry/exit preset selection.

## 4. Timeline and layers — workflow delivered in 1.4
- [x] Import, drag, trim, split, duplicate and delete.
- [x] Undo/redo, snapping, zoom, fit and frame stepping.
- [x] Separate video, text and audio tracks.
- [x] Persistent video/audio/text layers, including legacy overlap migration.
- [x] Explicit new-layer drop targets, empty layer creation and media-card parallel placement.
- [x] Concurrent video preview/export with picture-in-picture and side-by-side arrangements.
- [x] Concurrent audio mixing with placement at the playhead and per-track mute.
- [x] Vertical dragging between layers and explicit stacking order.
- [x] Track mute, visibility and lock, preserved in projects and export.
- [x] Multi-select, box selection, grouping, copy/cut/paste and linked video/audio.
- [x] Ripple deletion on the selected clip's track.
- [x] Magnetic main timeline: insertion, reorder, trim and delete close gaps.
- [x] Independent main-track magnet, scene linkage and edge snapping.
- [x] Context menu, anchored wheel zoom, horizontal scrolling and timeline resizing.
- [ ] Slip, roll and range editing.
- [ ] Markers, labels and timeline navigation.

## 5. Text, subtitles and captions
- [x] Editable text, basic presets, size, color, bold and positioning.
- [x] Arial, Georgia and Courier New; stroke, background and shadow controls.
- [x] Direct preview dragging for video and text positioning.
- [ ] Additional fonts, alignment and spacing controls.
- [ ] SRT/VTT import and export.
- [ ] Caption timing editor and reusable caption styles.
- [ ] Automatic transcription and word timing.
- [ ] Animated word highlighting.
- [ ] Translation and transcript-based editing.

## 6. Speed and time effects
- [x] Constant playback speed, 0.25–4x.
- [ ] Speed curves and speed ramp graph.
- [ ] Reverse, freeze frame and frame holds.
- [ ] Optical-flow slow motion.
- [ ] Motion blur.

## 7. Color and compositing
- [x] Brightness, contrast and saturation controls.
- [x] Basic color-look presets and transform controls.
- [ ] Temperature, tint, exposure, highlights and shadows.
- [ ] HSL, curves, wheels and LUT import.
- [ ] Crop, flip, background fill and blend modes.
- [ ] Masks, feathering and chroma key.
- [ ] Background segmentation and cutout.

## 8. Effects, stickers and templates
- [ ] Video-effect library with previews.
- [ ] User-imported stickers and animated graphics.
- [ ] Reusable project and text templates.
- [ ] Adjustment layers and effect stacking.
- [ ] Asset organization and relinking missing files.
- [ ] Licensed stock media and sound-effect sources.

## 9. Smart tools
- [ ] Stabilization.
- [ ] Motion and object tracking.
- [ ] Subject tracking and auto reframing.
- [ ] Filler-word and silence removal.
- [ ] Scene detection and long-video clipping.
- [ ] Upscaling and relighting.
- [ ] Voice generation, dubbing and text-to-speech.

## 10. Capture, projects and export
- [x] Local projects and native file dialogs.
- [x] MP4/H.264/AAC export at HD, Full HD and 4K.
- [x] GIF animation export with size, frame rate, quality and continuous/once looping.
- [x] Export progress and cancellation.
- [ ] Autosave, recovery and recent projects.
- [ ] Proxy media and preview quality controls.
- [ ] Webcam and screen recording.
- [ ] Export presets, bitrate controls and additional codecs/formats.
- [ ] Batch export and render queue.
- [ ] Keyboard shortcut customization.

## 11. Connected and generative features
- [ ] Cloud project sync and collaboration.
- [ ] Optional publishing integrations.
- [ ] AI-generated images/video, avatars and scripts.
- [ ] Configurable provider connections and model downloads.

Cloud and generative features need a separate service or local model implementation. CapCut's own hosted AI models and proprietary asset catalog are not included with this project. These entries remain planned until an implementation is selected, connected and verified.
