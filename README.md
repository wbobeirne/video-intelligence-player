# Video Intelligence Player

This is a quick toy to play videos that have been analyzed with the
[Video Intelligence API](https://cloud.google.com/video-intelligence) with
data overlaid on top of the video, drawn using a canvas.

Currently it only shows skeletons for people's bodyparts.

## How To Use

1. Clone the repo
2. Install NPM dependencies with `npm install`
3. Place the video you analyzed in the root of the project as `video.mp4`
4. Place the JSON you got back from video intelligence as `data.json`
5. Run `npm start` and open `localhost:8080` to see your video