import cvPromise from "@techstark/opencv-js";

// Initialize OpenCV runtime
const cv = await cvPromise;

/**
 * Calculates a 3x3 Homography Matrix using OpenCV's getPerspectiveTransform.
 *
 * @param {Array<{x: number, y: number}>|Array<[number, number]>} videoPoints - 4 source coordinates
 * @param {Array<{x: number, y: number}>|Array<[number, number]>} blueprintPoints - 4 destination coordinates
 * @returns {Array<Array<number>>} 3x3 Homography Matrix
 */
const calculateHMatrix = (videoPoints, blueprintPoints) => {
  if (!Array.isArray(videoPoints) || videoPoints.length !== 4) {
    throw new Error("Source video points must contain exactly 4 coordinates.");
  }
  if (!Array.isArray(blueprintPoints) || blueprintPoints.length !== 4) {
    throw new Error("Destination blueprint points must contain exactly 4 coordinates.");
  }

  const getXY = (p) =>
    Array.isArray(p) ? [Number(p[0]), Number(p[1])] : [Number(p.x), Number(p.y)];

  const srcFlat = videoPoints.flatMap(getXY);
  const dstFlat = blueprintPoints.flatMap(getXY);

  // Convert 4 corresponding points into OpenCV CV_32FC2 matrices
  const srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, srcFlat);
  const dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, dstFlat);

  try {
    // OpenCV's perspective transform function
    const H = cv.getPerspectiveTransform(srcPts, dstPts);

    const matrix = [];
    for (let r = 0; r < 3; r++) {
      const row = [];
      for (let c = 0; c < 3; c++) {
        const val = H.doubleAt(r, c);
        row.push(Math.abs(val) < 1e-12 ? 0 : val);
      }
      matrix.push(row);
    }

    H.delete();
    return matrix;
  } finally {
    srcPts.delete();
    dstPts.delete();
  }
};

export default calculateHMatrix;
