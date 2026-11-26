# Reverie

[A living coastline for wx1ngf19](https://wx1ngf19.github.io/).

Static HTML, CSS, native JavaScript modules, WebGL and Canvas 2D. No build step.
Serve this directory over HTTP to preview it; for example, with Python 3:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000`. Click the personal emblem to start or pause music.
If playback fails, click again to retry playback. Leaving the tab pauses
music; returning keeps it quiet until the next click.

## Structure

- [index.html](index.html), [styles.css](styles.css): the single-screen canvas and emblem.
- [app.js](app.js): pointer interaction, keyboard input and motion preferences.
- [world.js](world.js): the shared clock, solar paths, weather and event conditions.
- [scene.js](scene.js): rendering, stars, meteors and adaptive sky resolution.
- [sky.js](sky.js): procedural sky, galaxy, clouds, distant land and water.
- [atmosphere.js](atmosphere.js): aurora, night-shining clouds, rainbow and rain.
- [fauna.js](fauna.js): occasional bird flocks tied to the world clock.
- [camp.js](camp.js): shoreline, trees, house and campfire.
- [music.js](music.js): playback, shuffled queues and dawn/dusk fades.
- [assets/audio/library.js](assets/audio/library.js): twelve daytime and twelve nighttime tracks.
- [assets/audio/CREDITS.txt](assets/audio/CREDITS.txt): composers, official releases and CC0 licenses.

## World

A full fictional day lasts 36 real minutes. Its state is calculated from absolute
UTC time, so closing or refreshing the page does not restart the world. Weather,
house lighting, bird visits and celestial events share that clock. Music queues
are shuffled separately for each visit and audio loads on demand after a play request.

Solar paths and daily conditions evolve continuously. Rare appearances depend on
light and weather: rain and distant cloud lightning need humid cloud cover;
rainbows need recent rain and a low sun; aurora and luminous waves appear at night;
silver-blue night-shining clouds have a narrow twilight window. Lower clouds and
fog obscure the sky. Rain also dims the campfire.

This is an accelerated, artistically composed world, not a local weather forecast
or an astronomical reconstruction. Its visual references include
[NASA's sky-color explanation](https://spaceplace.nasa.gov/blue-sky/en/),
[NOAA's radiation fog guidance](https://www.weather.gov/safety/fog-radiation),
[NASA's galaxy structures](https://science.nasa.gov/universe/galaxies/types/),
[NOAA's aurora tutorial](https://www.spaceweather.gov/content/aurora-tutorial),
[WMO's night-shining cloud observations](https://cloudatlas.wmo.int/en/noctilucent-clouds-appearance-a.html),
[AMS's rainbow geometry](https://journals.ametsoc.org/abstract/journals/bams/102/2/BAMS-D-20-0101.1.xml),
[Smithsonian Ocean's bioluminescence guide](https://ocean.si.edu/ocean-life/fish/bioluminescence)
and [NOAA's cloud lightning explanation](https://www.nesdis.noaa.gov/about/k-12-education/severe-weather/what-causes-lightning-and-thunder).

## Publication

Pushing `main` publishes this directory through GitHub Pages' built-in
`pages build and deployment` workflow. The [.nojekyll](.nojekyll) file keeps the
site static; no custom build or duplicate deployment workflow is needed.
