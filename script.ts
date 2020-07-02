// TS types
interface SegmentTime {
  nanos?: number;
  seconds?: number;
}

interface Segment {
  end_time_offset: SegmentTime;
  start_time_offset: SegmentTime;
}

interface Coordinate {
  x: number;
  y: number;
}

interface BoundingBox {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

interface PersonLandmark {
  name: string;
  point: Coordinate;
  confidence: number;
}

interface PersonObject {
  attributes: any[];
  landmarks: PersonLandmark[];
  time_offset: SegmentTime;
  normalized_bounding_box: BoundingBox;
}

interface Data {
  annotation_results: {
    input_uri: string;
    person_detection_annotations: {
      tracks: {
        segment: Segment;
        timestamped_objects: PersonObject[];
      }[];
    }[];
  }[];
}

// Cast all these to avoid nulls
const videoEl = document.getElementById("video") as HTMLVideoElement;
const canvasEl = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvasEl.getContext("2d") as CanvasRenderingContext2D;

let data: Data;

const COLOR_MAP: { [key: string]: string | undefined } = {
  // nose: "",
  // left_eye: "",
  // right_eye: "",
  // left_ear: "",
  // right_ear: "",
  left_shoulder: "#1abc9c",
  right_shoulder: "#1abc9c",
  left_elbow: "#1abc9c",
  right_elbow: "#1abc9c",
  left_wrist: "#1abc9c",
  right_wrist: "#1abc9c",
  left_hip: "#1abc9c",
  right_hip: "#1abc9c",
  left_knee: "#1abc9c",
  right_knee: "#1abc9c",
  left_ankle: "#1abc9c",
  right_ankle: "#1abc9c",

}

function renderFrame() {
  const { width, height } = canvasEl.getBoundingClientRect();
  canvasEl.width = width;
  canvasEl.height = height;

  // Gather all the objects that are in display this frame
  const ct = videoEl.currentTime * 1e9;
  const personsInFrame = data.annotation_results[0].person_detection_annotations.filter(
    (pda) => {
      return segmentInFrame(pda.tracks[0].segment, ct);
    }
  );
  const frameObjects = personsInFrame.reduce<PersonObject[]>((prev, pda) => {
    const idx = pda.tracks[0].timestamped_objects.findIndex((obj) => {
      return nanos(obj.time_offset) > ct;
    });
    const frameObj = pda.tracks[0].timestamped_objects[idx]
    const prevFrameObj = pda.tracks[0].timestamped_objects[idx - 1]
    let obj = frameObj

    // Exclude small objects, cause they're background

    // If we have a previous frame to go off of, interpolate the data for max smoothness
    if (prevFrameObj && frameObj.landmarks && prevFrameObj.landmarks) {
      // Value between 0 and 1 that represents how hard to interpolate
      const diff = (nanos(frameObj.time_offset) - ct) / (nanos(frameObj.time_offset) - nanos(prevFrameObj.time_offset))
      obj = {
        ...obj,
        landmarks: obj.landmarks.map(lm => {
          const prevLm = prevFrameObj.landmarks.find(plm => plm.name === lm.name)
          if (!prevLm) {
            return lm
          }
          return {
            ...lm,
            point: {
              x: lm.point.x + (prevLm.point.x - lm.point.x) * diff,
              y: lm.point.y + (prevLm.point.y - lm.point.y) * diff,
            },
          }
        }),
      }
    }

    // Uncomment for uninterpolated jaggies
    // const obj = pda.tracks[0].timestamped_objects.find((obj) => {
    //   return nanos(obj.time_offset) > ct;
    // });

    return obj ? [...prev, obj] : prev;
  }, []);
  (window as any).lastFramePersons
  
  debugData({ frameObjects, personsInFrame, ct })

  // Clear the canvas
  ctx.clearRect(0, 0, width, height);

  // Draw the objects
  frameObjects.forEach(obj => {
    ctx.beginPath();

    // Draw a rectangle around them
    // ctx.rect(
    //   width * obj.normalized_bounding_box.left,
    //   height * obj.normalized_bounding_box.top,
    //   width * (obj.normalized_bounding_box.right - obj.normalized_bounding_box.left),
    //   height * (obj.normalized_bounding_box.bottom - obj.normalized_bounding_box.top),
    // );
    // ctx.strokeStyle = "#F00";
    // ctx.stroke();

    if (!obj.landmarks) {
      return
    }

    // Assemble a dictionary of body parts and their points to draw lines
    const lmMap = obj.landmarks.reduce<{ [key: string]: Coordinate }>((prev, lm) => {
      prev[lm.name] = lm.point
      return prev
    }, {})

    const lineBetween = (p1?: Coordinate, p2?: Coordinate) => {
      if (!p1 || !p2) {
        return
      }
      ctx.strokeStyle = "#FFF";
      ctx.moveTo(p1.x * width, p1.y * height);
      ctx.lineTo(p2.x * width, p2.y * height);
      ctx.stroke();
    }
    lineBetween(lmMap["left_wrist"], lmMap["left_elbow"])
    lineBetween(lmMap["left_elbow"], lmMap["left_shoulder"])
    lineBetween(lmMap["left_shoulder"], lmMap["left_hip"])
    lineBetween(lmMap["left_hip"], lmMap["left_knee"])
    lineBetween(lmMap["left_knee"], lmMap["left_ankle"])
    
    lineBetween(lmMap["right_wrist"], lmMap["right_elbow"])
    lineBetween(lmMap["right_elbow"], lmMap["right_shoulder"])
    lineBetween(lmMap["right_shoulder"], lmMap["right_hip"])
    lineBetween(lmMap["right_hip"], lmMap["right_knee"])
    lineBetween(lmMap["right_knee"], lmMap["right_ankle"])

    lineBetween(lmMap["left_shoulder"], lmMap["right_shoulder"])
    lineBetween(lmMap["left_hip"], lmMap["right_hip"])

    // Then draw each body part as a dot
    obj.landmarks.forEach(lm => {
      const color = COLOR_MAP[lm.name]
      if (!color) {
        return
      }
      ctx.beginPath();
      ctx.arc(lm.point.x * width, lm.point.y * height, 5, 0, 2 * Math.PI);
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.fill();
    })
  });

  window.requestAnimationFrame(renderFrame);
}

function start() {
  videoEl.classList.remove("loading");
  videoEl.play;

  renderFrame();
}

// Kick this pupper off
videoEl.classList.add("loading");
fetch("./data.json")
  .then((res) => res.json())
  .then((res: Data) => {
    data = res;
    console.log(data);
    start();
  });

// Convert API seconds + nanoseconds to a single number
function nanos(t: SegmentTime) {
  return (t.seconds || 0) * 1000000000 + (t.nanos || 0);
}

// Checks if a segment is within a specified timeframe
function segmentInFrame(t: Segment, ct: number) {
  return nanos(t.start_time_offset) <= ct && nanos(t.end_time_offset) >= ct;
}

function debugData(obj: any) {
  (window as any).__DEBUG = obj
}
