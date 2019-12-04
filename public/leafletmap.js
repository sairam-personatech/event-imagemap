const baseurl = 'http://localhost:8000/public/imagemap/get';
const searchUrl = "http://localhost:8000/public/imagemap/search";
const allFloorLevelUrl = "http://localhost:8000/public/imagemap/getAll";
const floorMaphtml = "http://localhost:3000/floorMap";

// const baseurl = 'http://192.168.0.227:8000/public/imagemap/get';
// const searchUrl = "http://192.168.0.227:8000/public/imagemap/search";
// const allFloorLevelUrl = "http://192.168.0.227:8000/public/imagemap/getAll";
// const floorMaphtml = "http://192.168.0.227:3000/floorMapNew";

// const baseurl = 'https://792d2027.ngrok.io/public/imagemap/get';
// const searchUrl = "https://792d2027.ngrok.io/public/imagemap/search";
// const allFloorLevelUrl = "https://792d2027.ngrok.io/public/imagemap/getAll";
// const floorMaphtml = "https://9cf98688.ngrok.io/floorMapNew";

let allFloorLevel = new URL(allFloorLevelUrl);

// let defaultImageUrl = 'FLOOR PLAN-1.jpg';
// let firstFloorImageUrl = "FLOOR PLAN-2.jpg";
// let secondFloorImageUrl = "FLOOR PLAN-3.jpg";

let defaultImageUrl = 'FLOORPLAN10.jpg';

let imageUrlbaseName = 'FLOORPLAN';

let bounds = [[0, 0], [0, 0]];
var delayInMilliseconds = 500; //0.5 second

let currentMapLevel;
let currentImageMap;
let mapUrl;
let imageUrl;
let mapData;
let theMarker = [];
let popups = [];
let polylinelayer = [];
let urlParams;
var autoCompleteData;
var allMapData = [];

L.Map = L.Map.extend({
   openPopup: function (popup, latlng, options) {
      if (!(popup instanceof L.Popup)) {
         var content = popup;

         popup = new L.Popup(options).setContent(content);
      }

      if (latlng) {
         popup.setLatLng(latlng);
      }

      if (this.hasLayer(popup)) {
         return this;
      }

      // NOTE THIS LINE : COMMENTING OUT THE CLOSEPOPUP CALL
      //this.closePopup(); 
      this._popup = popup;
      return this.addLayer(popup);
   }
});


var map = L.map('map', {
   maxZoom: 10,
   minZoom: -2,
   crs: L.CRS.Simple
}).setView([3300, 2550], -2);

try {

   /**
    * 
    */
   window.onload = function () {
      mapUrl = new URL(baseurl);
      urlParams = new URLSearchParams(window.location.search);

      renderMap(urlParams.get('eventId')
         , urlParams.get('searchRoom')
         , urlParams.get('maplevel')
         , urlParams.get('imageUrl')
         , urlParams.get('searchTerm'));
   };

   /**
    * 
    * @param {*} eventId 
    * @param {*} searchRoom 
    * @param {*} maplevel 
    * @param {*} imageUrlParam 
    * @param {*} searchTermParam 
    */
   function renderMap(eventId, searchRoom, maplevel, imageUrlParam, searchTermParam) {
      let promise;
      if (allMapData.length > 0) {
         promise = new Promise(function (resolve, reject) {
            resolve(allMapData);
         });
      } else {
         allFloorLevel.searchParams.set('eventId', eventId);
         promise = fetch(allFloorLevel)
            .then((resp) => resp.json());
      }

      promise.then(function (data) {
         console.log("searchData " + data);
         allMapData = data;
         let allArea;
         let autoCompleteData = allMapData.map(mapData => {
            let areas = mapData.area;
            areas.level = mapData.level;
            areas.parentLevel = mapData.parentLevel;
            return areas;
         }).map(areas => {
            let parentLevel = Number(areas.parentLevel);
            return areas.map(area => area.title + " Level : " + parentLevel);
         }).flat();
         autoComplete(autoCompleteData);
         console.log("All level data : " + autoCompleteData);
         return allMapData;
      }).then(allMapData => {
         if (searchRoom != undefined) {
            let foundMapLevel;
            allMapData.forEach(mapData => {
               let areas = mapData.area;
               let found = areas.filter(_area => _area['title'].toUpperCase().includes(searchRoom.toUpperCase()));
               if (undefined != found && found.length > 0) {
                  foundMapLevel = mapData;
                  return;
               }
            });
            openFloorMap(foundMapLevel.level, searchRoom);
         }
      }).then(() => {
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

         if (undefined != currentImageMap && map.hasLayer(currentImageMap)) {
            //house keeping
            map.removeLayer(currentImageMap);
            removeLayers();
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
         currentImageMap = L.imageOverlay(imageUrl, bounds).addTo(map);

         map.fitBounds(bounds);
         //map.fitBounds(bounds).setZoom(-2);

         console.log(mapData);

         if (searchTermParam != undefined) {
            searchRoom_1(searchTermParam);
         }

      })
         .catch(function (error) {
            console.log(error);
         });
   }


   function autoComplete(autoCompleteData) {
      $(function () {
         $("#searchString").autocomplete({
            source: autoCompleteData

            /* #tthe ags is the id of the input element 
            source: tags is the list of available tags*/


         });
      });
   }

   /**
   * 
   * @param {The Title of the Room to Search} title 
   */
   function searchRoom(title) {

      let searchTerms = title.split(':');
      let parentLevel = Number(searchTerms[1].trim());
      //searchTerms = title.split(' ');
      searchTerms = title.split('Level');
      let term = searchTerms[0].trim();

      //Close Previous Markers
      if (theMarker != undefined) {
         theMarker.forEach(_marker => {
            map.removeLayer(_marker);
         });
      };


      //var areas = mapData['area'];

      const area_m = [];
      let filteredMapdata = allMapData.find(mapData => mapData.parentLevel == parentLevel);
      var areas = filteredMapdata.area;

      let filteredAreas = areas.filter(_area => _area['title'].toUpperCase().includes(term.toUpperCase()));
      // searchTerms.forEach(searchTerm => {
      //    //Multiple rooms with the name
      //    area_m.push(...areas.filter(_area => _area['title'].toUpperCase().includes(searchTerm.toUpperCase())));
      // });
      //Remove previous polyline layers
      removeLayers();
      let concatedsearchTerms = filteredAreas.map(a => a.title).join();
      openFloorMap(filteredMapdata.level, filteredAreas[0].title);

      // filteredAreas.forEach((item, index) => {
      //    delayedProjectionOfMultiplePins(item, index);
      // });

      // drawPathsInMap(areas);
   }
   /**
    * 
    * @param {The Title of the Room to Search} title 
    */
   function searchRoom_1(title) {

      let searchTerms = title.split(',');

      //Close Previous Markers
      if (theMarker != undefined) {
         theMarker.forEach(_marker => {
            map.removeLayer(_marker);
         });
      };


      var areas = mapData['area'];

      const area_m = [];

      searchTerms.forEach(searchTerm => {
         //Multiple rooms with the name
         area_m.push(...areas.filter(_area => _area['title'].toUpperCase().includes(searchTerm.toUpperCase())));
      });
      //Remove previous polyline layers
      removeLayers();

      area_m.forEach((item, index) => {
         delayedProjectionOfMultiplePins(item, index);
      });

      drawPathsInMap(areas);
   }
   /**
    * 
    * @param {onClick} e 
    */
   function onMapClick(e) {
      var originaly = e.latlng.lat;
      var x = e.latlng.lng;
      y = getLY(bounds[1][0], originaly);
      var areas = mapData['area'];
      var isfound = false;
      for (var i = 0; i < areas.length; i++) {
         var item = areas[i];
         var cordsString = item['coords'];
         var cords = cordsString.split(",");

         let polygonArray = createPolyGonArray(cordsString);


         isfound = pointIsInPoly([x, y], polygonArray);


         if (isfound && item.title !== 'Path') {
            //Remove previous polyline layers
            removeLayers();

            //Close Previous Markers
            if (theMarker != undefined) {
               theMarker.forEach(_marker => {
                  map.removeLayer(_marker);
               });
            };

            //set ant path
            drawPathsInMap(areas);

            popups.push(L.popup({ maxWidth: 10 }).setLatLng(e.latlng)
               .setContent(item['title'] + "\n" + item['coords'])
               .setContent('<html><head><title>Page Title</title></head><body><h4>' + item['title'] + '</h4></body></html>')
               .openOn(map));

            var polyLineLArray = setPolyLineCordinate(polygonArray, bounds);
            var polyline = L.polygon(polyLineLArray, { color: '#78e14e', weight: 5, opacity: 0.5, smoothFactor: 1 }).addTo(map);
            polylinelayer.push(polyline);
            //zoom the map to the polyline
            //map.fitBounds(polyLineLArray).setZoom(-1.5);
            //map.fitBounds(polyLineLArray).panTo(get_polygon_centroid(polyLineLArray));
            let cent = get_polygon_centroid(polyLineLArray);
            let _cent = get_polygon_centroid(polygonArray);
            console.log("current zoom is " + this._zoom);
            //map.setView([originaly, x], -1);
            //map.setView([originaly, x], 0);
            map.setView([originaly, x],0);
            isfound = true;
            break;
         }
      }
      if (!isfound) {
         // L.popup({ maxWidth: 10 }).setLatLng(e.latlng)
         //    .setContent(item['title'] + "\n" + item['coords']).setContent('<html><head><title>Page Title</title></head><body><h4>Unknown Room</h4><p>Unmapped Area.</p></body></html>')
         //    .openOn(map);
      } else {
         //set ant path
         //drawPathsInMap(areas);
      }
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
    * @param {The Point to Validate} point 
    * @param {The Polygon} vs 
    */
   function inside(point, vs) {
      // ray-casting algorithm based on
      // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

      var x = point[0], y = point[1];

      var inside = false;
      for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
         var xi = vs[i][0], yi = vs[i][1];
         var xj = vs[j][0], yj = vs[j][1];

         var intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

         if (intersect)
            inside = !intersect;


         console.log("inside for loop: " + inside);
      }
      console.log("inside outside: " + inside);
      return inside;
   };

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
   /**
    * 
    * @param {*} areas 
    */
   function drawPathsInMap(areas) {

      var _pathArea = areas.filter(_area => _area['title'].includes("Path"));

      _pathArea.forEach(path => {
         var cordsString = path['coords'];
         let polygonArray = createPolyGonArray(cordsString);
         var route = setPolyLineCordinate(polygonArray, bounds);
         let routepath = L.polyline.antPath(route, {
            "delay": 400,
            "dashArray": [
               10,
               20
            ],
            "weight": 3,
            "color": "#ff6666",
            "pulseColor": "#040404",
            "paused": false,
            "reverse": false,
            "hardwareAccelerated": true
         });

         polylinelayer.push(routepath);

         map.addLayer(routepath);
         //map.fitBounds(bounds);
      });

   }

   /**
    * 
    */
   function removeLayers() {
      if (polylinelayer != undefined) {
         polylinelayer.forEach(layer => {
            map.removeLayer(layer);
         });
      }
   }

   function delayedProjectionOfMultiplePins(item, index) {
      setTimeout(function () {
         // Add tasks to do
         let cordsString = item['coords'];

         let polygonArray = createPolyGonArray(cordsString);
         let centroid = get_polygon_centroid(polygonArray);

         let latlngvalue = { lng: centroid.x, lat: bounds[1][0] - centroid.y };

         //let latlngvalue = { lng: centroid.x, lat: bounds[0][1]-centroid.y };

         let e = { latlng: latlngvalue };
         console.log("original values " + JSON.stringify(latlngvalue));

         //Save Open Markers
         theMarker.push(L.marker(latlngvalue).addTo(map)
            .bindPopup('<html><head><title>Page Title</title></head><body><h4>' + item['title'] + '</h4></body></html>',
               { maxWidth: 10 })
            .openPopup());


         var polyLineLArray = setPolyLineCordinate(polygonArray, bounds);
         var polyline = L.polygon(polyLineLArray, { color: '#0b88d4', weight: 5, opacity: 0.5, smoothFactor: 1 }).addTo(map);
         polylinelayer.push(polyline);
         //zoom the map to the polyline
         //map.setZoom(3);
         //map.fitBounds(bounds);
         //map.fitBounds(polyLineLArray).setZoom(-1);
         //map.setView(latlngvalue, -1);
         //map.setView(latlngvalue, 0);
         map.setView(latlngvalue, -1);
      }, delayInMilliseconds * index);
   }

   /**
    * 
    */
   function openFloorMap(level, searhTerm) {
      //set the currently loaded map level
      currentMapLevel = level;
      let level1mapUrl = new URL(floorMaphtml);
      let imageUrl;
      let maplevel;
      if(undefined != level){
          maplevel = level;
          imageUrl = imageUrlbaseName+level+".jpg";
      }else{
          maplevel = 10;
          imageUrl = defaultImageUrl;
      }
      renderMap(urlParams.get('eventId')
         , undefined
         , maplevel
         , imageUrl
         , searhTerm);
      //window.open(level1mapUrl, '_self');
   }

   function openLevelMap(level,searhTerm) {
    let level1mapUrl = new URL(floorMaphtml);
    let imageUrl;
    let maplevel;
    level1mapUrl.searchParams.set('eventId', urlParams.get('eventId'));
    console.log(currentMapLevel);
    
    if(undefined != level){
        maplevel = Math.floor(currentMapLevel/10 % 10)*10+level;
        imageUrl = imageUrlbaseName+maplevel+".jpg";
    }else{
        maplevel=10;
        imageUrl = defaultImageUrl;
    }
    renderMap(urlParams.get('eventId')
       , undefined
       , maplevel
       , imageUrl
       , searhTerm);
    //window.open(level1mapUrl, '_self');
 }

   map.on('click', onMapClick);
} catch (e) {
   alert(e.message)
}