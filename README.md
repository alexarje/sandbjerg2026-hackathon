# Sandbjerg hackathon data

This repository contains accelerometer data, audio, and stage-event annotations for the final clapping section of the MusicLab Copenhagen concert experiment. It is shared for the Sandbjerg hackathon.

## Applause Constellation

Run the interactive visualisation locally with Node.js and npm:

```sh
npm install
npm run dev
```

Open the address printed by Vite. The score shows each participant in a row; the constellation arranges participants in a circle, not at their physical locations. Each selected peak triggers a short tone. Participant identity determines pitch and stereo position, while peak height controls volume. Peak heights are scaled against the 95th percentile and capped. The participant count covers peaks in the preceding second. The concert recording and the sonification can be mixed independently; stage-event markers seek to their annotated times.

Run `npm test` for the data parser checks and `npm run build` for a production build.

## Files

All data are in [final_clapping_section](final_clapping_section/). The original descriptions are in [ReadMe.txt](final_clapping_section/ReadMe.txt).

- [final_section_motion.csv](final_clapping_section/final_section_motion.csv): resampled, vector-normed, and median-normalised accelerometer data, with one column per participant.
- [final_section_trimmed.csv](final_clapping_section/final_section_trimmed.csv): the same motion data with motionless periods at either end of each participant's clapping replaced by missing values.
- [final_section_peaks.csv](final_clapping_section/final_section_peaks.csv): selected peak heights for each participant, indexed by time.
- [final_section_stats.csv](final_clapping_section/final_section_stats.csv): one row per participant, with clapping start and end times, duration, RMS measures, summary statistics, and median interclap interval.
- [final_stage_events.csv](final_clapping_section/final_stage_events.csv): event times in seconds and labels for activity on stage.
- [final_clapping.mp3](final_clapping_section/final_clapping.mp3): stereo audio from the concert hall, including claps from audience members who were not participants.
- [analysis/](final_clapping_section/analysis/): reproducible R script, descriptive statistics, figures, and an HTML visual report for the clapping data.

To regenerate the statistics and figures from the repository root, run:

```sh
Rscript final_clapping_section/analysis/visualize.R
```

The HTML report is [analysis/report.html](final_clapping_section/analysis/report.html). It is descriptive: participant-level sensor summaries should not be interpreted as audience-wide estimates or calibrated force/loudness.

## Timing and interpretation

The accelerometer data were resampled at 50 Hz. The supplied notes describe the section as extended by 7 seconds at each end. Alignment between participants is estimated to be accurate to around 100 ms on average, or 5 samples.

The `index` column in the motion and trimmed files uses timestamps formatted with a 1970 date; the peaks file uses elapsed-time strings. Treat these as time indices, not evidence that the concert took place in 1970. Empty cells in the motion and trimmed files indicate missing values, not zero motion. The peaks file records selected peaks; an empty cell does not denote a peak. The event times correspond to the audio and clapping events to within half a second, according to the supplied notes.

The statistics file uses participant identifiers as its `index`. The RMS measures use a window size and step of 50 samples. The original notes give further definitions of the statistics.

## Reuse

The data come from the Zenodo record below and are licensed under [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/). Please attribute the dataset when reusing it.

Upham, F. (2026). *Clapping data, MusicLab Copenhagen* [Dataset]. Zenodo. https://doi.org/10.5281/zenodo.24482561

## Applause Lab dashboard

Open `index.html` through a local web server. The dashboard combines:

- synchronized MP3 playback and timeline seeking
- ensemble crowd-energy motion
- participant search and selection
- participant clapping statistics
- stage-event markers
- individual accelerometer traces

Example launch commands on Windows PowerShell (run the server in one terminal):

```powershell
python -m http.server 8765
```

Then open `http://localhost:8765` in a browser.
