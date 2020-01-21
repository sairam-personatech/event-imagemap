import { currentVal } from "./global";
import {
  loadMap,
  closeMarkerAndPopUps,
  removeLayers,
  createFloorLevelSelectionButtons,
  createFloorMapsSelectionButtons,
  renderSelectedMapName,
  createPolyGonArray,
  setPolyLineCordinate,
  getLY,
  get_polygon_centroid,
  pointIsInPoly,
  closeOptions
} from "./helper";

import { config } from "./config";

const allFloorLevelUrl = config.allFloorLevelUrl;
const defaultImageUrl = config.defaultImageUrl;
const imageUrlbaseName = config.imageUrlbaseName;

let allFloorLevel = new URL(allFloorLevelUrl);
var delayInMilliseconds = 500; //0.5 second
let theMarker = [];
let popups = [];
let polylinelayer = [];
let urlParams;
var allMapData = [];

L.Map = L.Map.extend({
  openPopup: function(popup, latlng, options) {
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

var map = L.map("map", {
  maxZoom: 10,
  minZoom: -2,
  crs: L.CRS.Simple
}).setView([3300, 2550], -2);

try {
  /**
   *
   */
  window.onload = function() {
    urlParams = new URLSearchParams(window.location.search);

    renderMap(
      urlParams.get("eventId"),
      urlParams.get("searchRoom"),
      urlParams.get("maplevel"),
      urlParams.get("imageUrl"),
      urlParams.get("searchTerm")
    );
  };

  /**
   *
   * @param {*} eventId
   * @param {*} searchRoom
   * @param {*} maplevel
   * @param {*} imageUrlParam
   * @param {*} searchTermParam
   */
  function renderMap(
    eventId,
    searchRoom,
    maplevel,
    imageUrlParam,
    searchTermParam
  ) {
    let promise;
    let localStorageMapdata;
    try {
      localStorageMapdata = localStorage.getItem("allMapData");
    } catch (e) {}

    if (allMapData.length > 0) {
      promise = new Promise(function(resolve, reject) {
        resolve(allMapData);
      });
    } else if (
      localStorageMapdata != null &&
      localStorageMapdata != undefined
    ) {
      promise = new Promise(function(resolve, reject) {
        resolve(JSON.parse(localStorageMapdata));
      });
    } else {
      var fetchHeaders = new Headers({
        "Access-Control-Allow-Origin": "*"
      });
      allFloorLevel.searchParams.set("eventId", eventId);
      promise = fetch(allFloorLevel, {
        headers: fetchHeaders
      }).then(resp => resp.json());
    }

    promise
      .then(function(data) {
        console.log("searchData " + data);
        try {
          if (data.length != undefined && data.length != 0) {
            localStorage.setItem("allMapData", JSON.stringify(data));
          }
        } catch (e) {}

        allMapData = data;

        createFloorLevelSelectionButtons(maplevel, allMapData);

        let autoCompleteData = allMapData
          .map(mapData => {
            let areas = mapData.area;
            areas.level = mapData.level;
            areas.parentLevel = mapData.parentLevel;
            return areas;
          })
          .map(areas => {
            let parentLevel = Number(areas.parentLevel);
            return areas.map(area => area.title + " Level : " + parentLevel);
          })
          .flat();
        let uniquetags = new Set(autoCompleteData);

        autoComplete(Array.from(uniquetags));

        return allMapData;
      })
      .then(allMapData => {
        if (searchRoom != undefined) {
          let foundMapLevel;
          let dataToSearch;
          if (maplevel != undefined) {
            dataToSearch = allMapData.filter(
              mapData => maplevel == mapData.parentLevel
            );
          } else {
            dataToSearch = allMapData;
          }
          dataToSearch.forEach(mapData => {
            let areas = mapData.area;
            let found = areas.filter(_area =>
              _area["title"].toUpperCase().includes(searchRoom.toUpperCase())
            );
            if (undefined != found && found.length > 0) {
              foundMapLevel = mapData;
              return;
            }
          });
          openFloorMap(foundMapLevel.level, searchRoom);
        }
      })
      .then(() => {
        if (
          undefined != currentVal.imageMap &&
          map.hasLayer(currentVal.imageMap)
        ) {
          closeMarkerAndPopUps(map, currentVal.imageMap, theMarker, popups);
        }
        removeLayers(map, polylinelayer);

        if (imageUrlParam == undefined) {
          imageUrlParam = defaultImageUrl;
        } 
        if (urlParams.get("nativeProtocol")) {
          imageUrlParam = urlParams.get("nativeProtocol")+":/" + imageUrlParam;
        }
        loadMap(map, maplevel, allMapData, imageUrlParam);
        renderSelectedMapName(maplevel);
        if (searchTermParam != undefined) {
          searchInMap(searchTermParam);
        }
      })
      .catch(function(error) {
        console.log(error);
      });
  }

  /**
   *
   * @param {*} autoCompleteData
   */
  function autoComplete(autoCompleteData) {
    $(function() {
      $("#searchString").autocomplete({
        source: autoCompleteData

        /* #tthe ags is the id of the input element 
            source: tags is the list of available tags*/
      });
    });

    //Auto Complete for Mobile
    $(function() {
      $("#searchStringM").autocomplete({
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
  window.searchAcrossLevel = function searchAcrossLevel(title) {
    closeOptions();
    let searchTerms = title.split(":");
    let parentLevel = Number(searchTerms[1].trim());
    searchTerms = title.split("Level");
    let term = searchTerms[0].trim();

    //Close Previous Markers
    if (theMarker != undefined) {
      theMarker.forEach(_marker => {
        map.removeLayer(_marker);
      });
    }

    let filteredMapdata = allMapData.filter(
      mapData => mapData.parentLevel == parentLevel
    );
    let foundMapLevelToSearch;
    let titleToSearch;
    let centroid;

    filteredMapdata.forEach(_data => {
      let areas = _data.area;

      let filteredAreas = areas.filter(_area =>
        _area["title"].toUpperCase().includes(term.toUpperCase())
      );
      if (filteredAreas.length > 0) {
        foundMapLevelToSearch = _data;
        titleToSearch = filteredAreas[0].title;

        let polygonArray = createPolyGonArray(filteredAreas[0].coords);
        centroid = get_polygon_centroid(polygonArray);

        return;
      }
    });

    removeLayers(map, polylinelayer);

    openFloorMap(foundMapLevelToSearch.level, titleToSearch);

    let latlngvalue = {
      lng: centroid.x,
      lat: currentVal.bounds[1][0] - centroid.y
    };

    map.setView(latlngvalue, 0);
  };
  /**
   *
   * @param {The Title of the Room to Search} title
   */
  window.searchInMap = function searchInMap(title) {
    closeOptions();
    if (title && "" != title) {
      let term = title.trim();
      //let searchTerms = title.split(",");

      //Close Previous Markers
      if (theMarker != undefined) {
        theMarker.forEach(_marker => {
          map.removeLayer(_marker);
        });
      }

      var areas = currentVal.mapData["area"];

      const area_m = [];

      //Multiple rooms with the name
      area_m.push(
        ...areas.filter(_area =>
          _area["title"].toUpperCase().includes(term.toUpperCase())
        )
      );
      //Remove previous polyline layers
      removeLayers(map, polylinelayer);

      area_m.forEach((item, index) => {
        delayedProjectionOfMultiplePins(item, index);
      });

      drawPathsInMap(areas);
    }
  };
  /**
   *
   * @param {onClick} e
   */
  function onMapClick(e) {
    var originaly = e.latlng.lat;
    var x = e.latlng.lng;
    let y = getLY(currentVal.bounds[1][0], originaly);
    var areas = currentVal.mapData["area"];
    var isfound = false;
    for (var i = 0; i < areas.length; i++) {
      var item = areas[i];
      var cordsString = item["coords"];
      let polygonArray = createPolyGonArray(cordsString);

      isfound = pointIsInPoly([x, y], polygonArray);

      if (isfound && item.title !== "Path") {
        //Remove previous polyline layers
        removeLayers(map, polylinelayer);

        //Close Previous Markers
        if (theMarker != undefined) {
          theMarker.forEach(_marker => {
            map.removeLayer(_marker);
          });
        }

        //set ant path
        drawPathsInMap(areas);

        popups.push(
          L.popup({ maxWidth: 10 })
            .setLatLng(e.latlng)
            .setContent(item["title"] + "\n" + item["coords"])
            .setContent(
              "<html><head><title></title></head><body><h4>" +
                item["title"] +
                "<h4><a href="+item["href"]+" target='_blank'>Sponsor</a></h4>" +
                "</h4></body></html>"
            )
            .openOn(map)
        );

        var polyLineLArray = setPolyLineCordinate(
          polygonArray,
          currentVal.bounds
        );
        var polyline = L.polygon(polyLineLArray, {
          color: "#78e14e",
          weight: 5,
          opacity: 0.5,
          smoothFactor: 1
        }).addTo(map);
        polylinelayer.push(polyline);

        console.log("current zoom is " + this._zoom);

        map.setView([originaly, x], 0);
        isfound = true;
        break;
      }
    }
  }

  /**
   *
   * @param {*} areas
   */
  function drawPathsInMap(areas) {
    var _pathArea = areas.filter(_area => _area["title"].includes("Path"));

    _pathArea.forEach(path => {
      var cordsString = path["coords"];
      let polygonArray = createPolyGonArray(cordsString);
      var route = setPolyLineCordinate(polygonArray, currentVal.bounds);
      let routepath = L.polyline.antPath(route, {
        delay: 400,
        dashArray: [10, 20],
        weight: 3,
        color: "#ff6666",
        pulseColor: "#040404",
        paused: false,
        reverse: false,
        hardwareAccelerated: true
      });

      polylinelayer.push(routepath);

      map.addLayer(routepath);
    });
  }

  /**
   *
   * @param {*} item
   * @param {*} index
   */
  function delayedProjectionOfMultiplePins(item, index) {
    setTimeout(function() {
      // Add tasks to do
      let cordsString = item["coords"];

      let polygonArray = createPolyGonArray(cordsString);
      let centroid = get_polygon_centroid(polygonArray);

      let latlngvalue = {
        lng: centroid.x,
        lat: currentVal.bounds[1][0] - centroid.y
      };

      let e = { latlng: latlngvalue };
      console.log("original values " + JSON.stringify(latlngvalue));

      //Save Open Markers
      theMarker.push(
        L.marker(latlngvalue)
          .addTo(map)
          .bindPopup(
            "<html><head><title></title></head><body><h4>" +
              item["title"] +
              "<h4><a href="+item["href"]+" target='_blank'>Sponsor</a></h4>" +
              "</h4></body></html>",
            { maxWidth: 10 }
          )
          .openPopup()
      );

      var polyLineLArray = setPolyLineCordinate(
        polygonArray,
        currentVal.bounds
      );
      var polyline = L.polygon(polyLineLArray, {
        color: "#0b88d4",
        weight: 5,
        opacity: 0.5,
        smoothFactor: 1
      }).addTo(map);
      polylinelayer.push(polyline);
      map.setView(latlngvalue, 0);
      //Delay for animation
    }, delayInMilliseconds * index);
  }

  /**
   *
   */
  window.openFloorMap = function openFloorMap(level, searhTerm) {
    //Dynamically create the Floor Map Selection
    createFloorMapsSelectionButtons(level, allMapData);
    //set the currently loaded map level
    openLevelMap(level, searhTerm);
  };
  /**
   *
   * @param {*} level
   * @param {*} searhTerm
   */
  window.openLevelMap = function openLevelMap(level, searhTerm) {
  
    currentVal.mapLevel = level;
    let imageUrl;
    let maplevel;

    console.log(currentVal.mapLevel);

    if (undefined != level) {
      //maplevel = Math.floor(currentMapLevel / 10 % 10) * 10 + level;
      maplevel = level;
      imageUrl = imageUrlbaseName + maplevel + ".jpg";
    } else {
      maplevel = 10;
      imageUrl = defaultImageUrl;
    }
    closeOptions();
    renderMap(
      urlParams.get("eventId"),
      undefined,
      maplevel,
      imageUrl,
      searhTerm
    );
  };

  /**
   * onClick of the Map Event
   */
  map.on("click", onMapClick);

  let searchInMapEvent = document.getElementById("searchStringComma");

  searchInMapEvent.addEventListener("keyup", function(event) {
    if (event.keyCode === 13) {
      event.preventDefault();
      document.getElementById("searchInMapId").click();
    }
  });
} catch (e) {
  alert(e.message);
}
