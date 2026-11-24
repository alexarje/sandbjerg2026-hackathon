# Applause, in orbit

A reveal.js presentation for the Sandbjerg hackathon. Serve the repository root with a local web server and open `/presentation/`. The speaker notes contain context, data limitations, and source details. Press `S` to open them.

The summary slide includes a one-minute spoken version of [the narrative](narrative.md). It uses the Microsoft `en-GB-SoniaNeural` voice. To regenerate it, install `tools/requirements.txt` in the project `.venv` and run `bash presentation/tools/generate-narration.sh` from the repository root. Speech synthesis sends the narrative text to Microsoft's online service; FFmpeg adjusts the result to one minute.

The two demonstrations are linked from the deployed deck. Applause Lab is at `/dashboard.html` on the Pages site and at the repository root when served locally. Applause Constellation is built for the Pages site by the workflow; its local development server is described in the repository README.

The data come from Upham, F. (2026), *Clapping data, MusicLab Copenhagen*, [Zenodo](https://doi.org/10.5281/zenodo.24482561), CC BY 4.0. The number of participant columns and selected peaks is checked by the project's parser test.

The cover uses the [Hubble eXtreme Deep Field](https://images.nasa.gov/details/GSFC_20171208_Archive_e001651). Credit: NASA; ESA; G. Illingworth, D. Magee, and P. Oesch, University of California, Santa Cruz; R. Bouwens, Leiden University; and the HUDF09 Team. The image is used as a metaphor and does not depict the dataset.

The closing slide shows the [Expedition 74 crew](https://images.nasa.gov/details/iss074e0812184), not the hackathon team. Credit: NASA/Chris Williams.

Reveal.js and its speaker-notes plugin are copied from the recent talk template. The deck is a project presentation, not a record of verified statistical conclusions.