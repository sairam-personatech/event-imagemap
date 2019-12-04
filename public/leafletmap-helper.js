/**
 * 
 * @param {*} map 
 * @param {*} maplevel 
 * @param {*} allMapData 
 * @param {*} imageUrlParam 
 */
function loadMap(map, maplevel, allMapData, imageUrlParam) {
    let levelToLoad = 10; //default

    if (undefined != maplevel) {
        levelToLoad = maplevel;
    }

    //set current Map Level to be used for child Maps
    currentMapLevel = levelToLoad;

    mapData = allMapData.find(mapData => mapData.level == levelToLoad);
    let areas = mapData['area'];

    let area = areas.filter(_area => _area['title'].toUpperCase() == "Image Map".toUpperCase())[0];

    let cordsString = area['coords'];
    let cords = cordsString.split(",");

    bounds[1][0] = cords[3];
    bounds[1][1] = cords[2];

    if (imageUrlParam != undefined) {
        imageUrl = imageUrlParam;
    } else {
        imageUrl = defaultImageUrl;
    }
    currentImageMap = L.imageOverlay(imageUrl, bounds).addTo(map);

    map.fitBounds(bounds);
    //map.fitBounds(bounds).setZoom(-2);

    console.log(mapData);


}

/**
 * 
 * @param {*} map 
 * @param {*} currentImageMap 
 * @param {*} theMarker 
 * @param {*} popups 
 */
function closeMarkerAndPopUps(map, currentImageMap, theMarker, popups) {
    //house keeping
    map.removeLayer(currentImageMap);
    //Close Previous Markers
    if (theMarker != undefined) {
        theMarker.forEach(_marker => {
            map.removeLayer(_marker);
        });
    };

    //Close Previous popups
    if (popups != undefined) {
        popups.forEach(_marker => {
            map.removeLayer(_marker);
        });
    };
}

/**
 * 
 * @param {*} map 
 * @param {*} polylinelayer 
 */
function removeLayers(map, polylinelayer) {
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
function createPolyGonArray(coordsString) {

    var string = coordsString.split(',');

    // Create array of float for each pair of coordinate
    var a = string.length;
    for (i = 0; i < a; i++) {
        string[i] = parseFloat(string[i]);
    }

    // Initialize an array to store the new values
    var b = string.length / 2;
    var array = [];
    for (i = 0; i < b; i++) {
        array[i] = [0, 0];
    }

    // Create an array of array of coordinates
    var k = 0;
    for (i = 0; i < b; i++) {
        for (j = 0; j < 2; j++) {
            array[i][j] = string[k];
            k++;
        }
    }

    console.log(array);
    return array;
}

/**
 * 
 * @param {heigt bound of the leaflet map} height 
 * @param {Original Y cordinate as received from the onClick } originalY 
 */
function getLY(height, originalY) {
    return height - originalY
}

/**
 * 
 * @param {*PolyGon Points} points 
 */
function get_polygon_centroid(points) {

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
function pointIsInPoly(p, polygon) {
    var isInside = false;
    var minX = polygon[0][0], maxX = polygon[0][0];
    var minY = polygon[0][1], maxY = polygon[0][1];
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

    var i = 0, j = polygon.length - 1;
    for (i, j; i < polygon.length; j = i++) {
        if ((polygon[i][1] > p[1]) != (polygon[j][1] > p[1]) &&
            p[0] < (polygon[j][0] - polygon[i][0]) * (p[1] - polygon[i][1]) / (polygon[j][1] - polygon[i][1]) + polygon[i][0]) {
            isInside = !isInside;
        }
        console.log(isInside);
    }

    return isInside;
}

/**
 * 
 * @param {*} polygonArray 
 * @param {*} bounds 
 */
function setPolyLineCordinate(polygonArray, bounds) {
    let originalPolygonArray = [...polygonArray];
    var lPolygonArray = [];
    originalPolygonArray.forEach(_coords => {
        _coords[1] = bounds[1][0] - _coords[1];
        [_coords[0], _coords[1]] = [_coords[1], _coords[0]];
        lPolygonArray.push(_coords);
    })

    return originalPolygonArray;
}