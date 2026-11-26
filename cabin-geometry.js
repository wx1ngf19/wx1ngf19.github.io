// One projection for the walls, roof and chimney: depth always recedes by (29, -11).
const depth = [29, -11];
const add = (point, offset) => [point[0] + offset[0], point[1] + offset[1]];
const lower = point => add(point, [0, 2]);
const frontLeft = [-44, -38], frontRight = [17, -38], peak = [-14, -66];
const ridgeFront = add(peak, [0, -2]);
const ridgeBack = add(ridgeFront, depth);
const eaveLeft = [-48, frontLeft[1] + 4 * 28 / 30 - 2];
const eaveRight = [21, frontRight[1] + 4 * 28 / 31 - 2];
const eaveLeftBack = add(eaveLeft, depth), eaveRightBack = add(eaveRight, depth);

function roofPoint(slope, distance) {
  return [ridgeFront[0] + (eaveRight[0] - ridgeFront[0]) * slope + depth[0] * distance,
    ridgeFront[1] + (eaveRight[1] - ridgeFront[1]) * slope + depth[1] * distance];
}

const slope = .58, distance = .55, chimneyWidth = 6 / 35, chimneyDepth = .12;
const footLeft = roofPoint(slope, distance);
const footRight = roofPoint(slope + chimneyWidth, distance);
const footBackRight = roofPoint(slope + chimneyWidth, distance + chimneyDepth);
const footBackLeft = roofPoint(slope, distance + chimneyDepth);
const topLeft = [footLeft[0], -80], topRight = [footRight[0], -80];
const topBackRight = [footBackRight[0], -80 + depth[1] * chimneyDepth];
const topBackLeft = [footBackLeft[0], topBackRight[1]];
const capLeft = add(topLeft, [-1.2, -1.8]), capRight = add(topRight, [1.2, -1.8]);
const capBackRight = add(topBackRight, [1.2, -1.8]), capBackLeft = add(topBackLeft, [-1.2, -1.8]);

export const cabinGeometry = {
  foundation: [[-47, -1], [18, -1], [-16, -12.76], [49, -12.76], [49, -6.76], [18, 5], [-47, 5]],
  foundationTop: [[-47, -1], [18, -1], [49, -12.76], [-16, -12.76]],
  foundationFront: [[-47, -1], [18, -1], [18, 5], [-47, 5]],
  foundationSide: [[18, -1], [49, -12.76], [49, -6.76], [18, 5]],
  bodySilhouette: [[-44, 0], [17, 0], [46, -11], add(frontRight, depth), add(peak, depth), peak, frontLeft],
  facade: [frontLeft, frontRight, [17, 0], [-44, 0]],
  side: [frontRight, add(frontRight, depth), [46, -11], [17, 0]],
  gable: [frontLeft, peak, frontRight],
  roofLeft: [eaveLeft, ridgeFront, ridgeBack, eaveLeftBack],
  roofRight: [ridgeFront, ridgeBack, eaveRightBack, eaveRight],
  roofSilhouette: [eaveLeft, ridgeFront, ridgeBack, eaveRightBack, eaveRight],
  roofFrontEdge: [eaveLeft, ridgeFront, eaveRight, lower(eaveRight), lower(ridgeFront), lower(eaveLeft)],
  roofSideEdge: [eaveRight, eaveRightBack, lower(eaveRightBack), lower(eaveRight)],
  ridge: [ridgeFront, ridgeBack],
  flashing: [roofPoint(slope - .04, distance - .04), roofPoint(slope + chimneyWidth + .04, distance - .04),
    roofPoint(slope + chimneyWidth + .04, distance + chimneyDepth + .04), roofPoint(slope - .04, distance + chimneyDepth + .04)],
  chimneyFoot: [footLeft, footRight, footBackRight, footBackLeft],
  chimneySilhouette: [topLeft, topRight, topBackRight, footBackRight, footRight, footLeft],
  chimneyFront: [topLeft, topRight, footRight, footLeft],
  chimneySide: [topRight, topBackRight, footBackRight, footRight],
  chimneyCap: [capLeft, capRight, capBackRight, capBackLeft],
  chimneyCapEdge: [capLeft, capRight, add(capRight, [0, 2]), add(capLeft, [0, 2])],
};
