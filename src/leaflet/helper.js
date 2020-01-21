import { currentVal } from "./global";
import { config } from "./config";

const defaultImageUrl = config.defaultImageUrl;
let imageUrl;

/**
 *
 * @param {*} map
 * @param {*} maplevel
 * @param {*} allMapData
 * @param {*} imageUrlParam
 */
export function loadMap(map, maplevel, allMapData, imageUrlParam) {
  let levelToLoad = 10; //default

  if (undefined != maplevel) {
    levelToLoad = maplevel;
  }

  //set current Map Level to be used for child Maps
  currentVal.mapLevel = levelToLoad;

  currentVal.mapData = allMapData.find(mapData => mapData.level == levelToLoad);
  let areas = currentVal.mapData["area"];

  let area = areas.filter(
    _area => _area["title"].toUpperCase() == "Image Map".toUpperCase()
  )[0];

  let cordsString = area["coords"];
  let cords = cordsString.split(",");

  currentVal.bounds[1][0] = cords[3];
  currentVal.bounds[1][1] = cords[2];

  let imageUrl;
  if (imageUrlParam != undefined) {
    imageUrl = imageUrlParam;
  } else {
    imageUrl = defaultImageUrl;
  }
  createFloorMapsSelectionButtons(levelToLoad, allMapData);
  currentVal.imageMap = L.imageOverlay(imageUrl, currentVal.bounds).addTo(map);

  map.fitBounds(currentVal.bounds);
}

/**
 *
 * @param {*} map
 * @param {*} currentImageMap
 * @param {*} theMarker
 * @param {*} popups
 */
export function closeMarkerAndPopUps(map, currentImageMap, theMarker, popups) {
  //house keeping
  map.removeLayer(currentImageMap);
  //Close Previous Markers
  if (theMarker != undefined) {
    theMarker.forEach(_marker => {
      map.removeLayer(_marker);
    });
  }

  //Close Previous popups
  if (popups != undefined) {
    popups.forEach(_marker => {
      map.removeLayer(_marker);
    });
  }
}

/**
 *
 * @param {*} map
 * @param {*} polylinelayer
 */
export function removeLayers(map, polylinelayer) {
  if (polylinelayer != undefined) {
    polylinelayer.forEach(layer => {
      map.removeLayer(layer);
    });
  }
}

/**
 *
 * @param {String of Coordinate in Xi,Yi format} coordsString
 */
export function createPolyGonArray(coordsString) {
  var string = coordsString.split(",");

  // Create array of float for each pair of coordinate
  var a = string.length;
  for (let i = 0; i < a; i++) {
    string[i] = parseFloat(string[i]);
  }

  // Initialize an array to store the new values
  var b = string.length / 2;
  var array = [];
  for (let i = 0; i < b; i++) {
    array[i] = [0, 0];
  }

  // Create an array of array of coordinates
  var k = 0;
  for (let i = 0; i < b; i++) {
    for (let j = 0; j < 2; j++) {
      array[i][j] = string[k];
      k++;
    }
  }

  // console.log(array);
  return array;
}

/**
 *
 * @param {heigt bound of the leaflet map} height
 * @param {Original Y cordinate as received from the onClick } originalY
 */
export function getLY(height, originalY) {
  return height - originalY;
}

/**
 *
 * @param {*PolyGon Points} points
 */
export function get_polygon_centroid(points) {
  var centroid = { x: 0, y: 0 };
  for (var i = 0; i < points.length; i++) {
    var point = points[i];
    centroid.x += point[0];
    centroid.y += point[1];
  }
  centroid.x /= points.length;
  centroid.y /= points.length;
  return centroid;
}

/**
 *
 * @param {*} p
 * @param {*} polygon
 */
export function pointIsInPoly(p, polygon) {
  var isInside = false;
  var minX = polygon[0][0],
    maxX = polygon[0][0];
  var minY = polygon[0][1],
    maxY = polygon[0][1];
  for (var n = 1; n < polygon.length; n++) {
    var q = polygon[n];
    minX = Math.min(q[0], minX);
    maxX = Math.max(q[0], maxX);
    minY = Math.min(q[1], minY);
    maxY = Math.max(q[2], maxY);
  }

  if (p[0] < minX || p[0] > maxX || p[1] < minY || p[1] > maxY) {
    return false;
  }

  var i = 0,
    j = polygon.length - 1;
  for (i, j; i < polygon.length; j = i++) {
    if (
      polygon[i][1] > p[1] != polygon[j][1] > p[1] &&
      p[0] <
        ((polygon[j][0] - polygon[i][0]) * (p[1] - polygon[i][1])) /
          (polygon[j][1] - polygon[i][1]) +
          polygon[i][0]
    ) {
      isInside = !isInside;
    }
    // console.log(isInside);
  }

  return isInside;
}

/**
 *
 * @param {*} polygonArray
 * @param {*} bounds
 */
export function setPolyLineCordinate(polygonArray, bounds) {
  let originalPolygonArray = [...polygonArray];
  var lPolygonArray = [];
  originalPolygonArray.forEach(_coords => {
    _coords[1] = bounds[1][0] - _coords[1];
    [_coords[0], _coords[1]] = [_coords[1], _coords[0]];
    lPolygonArray.push(_coords);
  });

  return originalPolygonArray;
}
/**
 *
 * @param {*} data1
 * @param {*} data2
 */
export function compare(data1, data2) {
  if (data1.level > data2.level) {
    return 1;
  } else {
    return -1;
  }
}
/**
 *
 */
export function createFloorMapsSelectionButtons(level, allMapData) {
  let parentLevel = Math.floor((level / 10) % 10);
  //for web
  const mapLevelNode = document.getElementById("mapLevelId");

  while (mapLevelNode.firstChild) {
    mapLevelNode.removeChild(mapLevelNode.firstChild);
  }

  //for mobile
  const mapLevelNodeM = document.getElementById("mapLevelIdM");

  //for mobile
  while (mapLevelNodeM.firstChild) {
    mapLevelNodeM.removeChild(mapLevelNodeM.firstChild);
  }

  let filteredMapdata = allMapData.filter(
    mapData => mapData.parentLevel == parentLevel
  );

  filteredMapdata.sort(compare);
  filteredMapdata.forEach(_data => {
    var btn = document.createElement("button");
    btn.setAttribute("type", "submit");
    btn.setAttribute("onclick", "openLevelMap(" + _data.level + ")");

    if (_data.level == level) {
      btn.setAttribute("class", "pt-mapBtn pt-smoooth hasClick active");
    } else {
      btn.setAttribute("class", "pt-mapBtn pt-smoooth hasClick");
    }
    btn.setAttribute("id", "bt1");
    btn.innerHTML = _data.name;
    document.getElementById("mapLevelId").appendChild(btn);

    //for mobile
    let btnLi = document.createElement("li");

    var btnM = document.createElement("button");
    btnM.setAttribute("type", "submit");
    btnM.setAttribute("onclick", "openLevelMap(" + _data.level + ")");
    btnM.setAttribute("class", "pt-floorBtn pt-smooth");
    if (_data.level == level) {
      btnLi.setAttribute("class", "active");
    }
    btnM.setAttribute("id", "btM1");
    btnM.innerHTML = _data.name;

    btnLi.appendChild(btnM);
    document.getElementById("mapLevelIdM").appendChild(btnLi);
  });
}

/**
 *
 */
export function createFloorLevelSelectionButtons(
  selectedfloorLevel,
  allMapData
) {
  if (undefined == selectedfloorLevel) {
    //load default level1 map
    selectedfloorLevel = 10;
  }
  let selectedMapParent = Math.floor((selectedfloorLevel / 10) % 10);
  const distinctParentLevels = [
    ...new Set(allMapData.map(_mapdata => _mapdata.parentLevel))
  ];

  //for web
  const mapLevelNode = document.getElementById("mapFloorId");

  while (mapLevelNode.firstChild) {
    mapLevelNode.removeChild(mapLevelNode.firstChild);
  }

  //for mobile
  const mapLevelNodeM = document.getElementById("mapFloorIdM");

  while (mapLevelNodeM.firstChild) {
    mapLevelNodeM.removeChild(mapLevelNodeM.firstChild);
  }

  distinctParentLevels.forEach(_parentLevel => {
    //for web
    var btn = document.createElement("button");
    btn.setAttribute("type", "submit");
    btn.setAttribute("onclick", "openFloorMap(" + _parentLevel + "0)");
    if (_parentLevel == selectedMapParent) {
      btn.setAttribute("class", "pt-mapBtn pt-smoooth hasClick active");
    } else {
      btn.setAttribute("class", "pt-mapBtn pt-smoooth hasClick");
    }
    btn.setAttribute("id", "bt4floor" + _parentLevel);
    btn.innerHTML = "Level " + _parentLevel;
    document.getElementById("mapFloorId").appendChild(btn);

    //for mobile

    var btnM = document.createElement("button");
    btnM.setAttribute("type", "submit");
    btnM.setAttribute("onclick", "openFloorMap(" + _parentLevel + "0)");
    if (_parentLevel == selectedMapParent) {
      btnM.setAttribute("class", "pt-levelBtn pt-smooth active");
    } else {
      btnM.setAttribute("class", "pt-levelBtn pt-smooth");
    }
    btnM.setAttribute("id", "btM4floor" + _parentLevel);
    btnM.innerHTML = "L " + _parentLevel;
    document.getElementById("mapFloorIdM").appendChild(btnM);
  });

  let autoCompleteData = allMapData
    .filter(mapData => mapData.level === selectedfloorLevel)
    .map(levelMapdata => {
      return levelMapdata.area.map(area => area.title);
    })
    .flat();
  let uniquetags = new Set(autoCompleteData);

  // console.log("unique tags " + uniquetags);
  autoCompleteLevel(Array.from(uniquetags));
}

/**
 *
 * @param {*} level
 */
export function renderSelectedMapName(level) {
  if (undefined == level) {
    //load default level1 map
    level = 10;
  }
  let parentLevel = Math.floor((level / 10) % 10);
  let mapName = currentVal.mapData.name;
  document.getElementsByClassName("pt-selectedFloor")[0].innerHTML =
    "Level " + parentLevel;
  document.getElementsByClassName("pt-selectedMap")[0].innerHTML = mapName;
}

export function closeOptions() {
  $(".pt-showMenu").toggleClass("slideDown");
  $(".hasOverlay").removeClass("showOverlay");
  $(".pt-mapTopNav").toggleClass("open");
  var text = $(".pt-showMenu > span");
  if (text.text() === "hide options") {
    text.text("choose maps");
  }
}

/**
 *
 * @param {*} autoCompleteData
 */
function autoCompleteLevel(autoCompleteData) {
  $(function() {
    $("#searchStringComma").autocomplete({
      source: autoCompleteData
    });
  });
}
