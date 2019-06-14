mapboxgl.accessToken = 'pk.eyJ1Ijoic2F6ODQ4IiwiYSI6ImNqd3UydHc2MDAycXU0MHF1aHBtazFwc28ifQ.Lo3Z83xWOsQE5S2pZJxeuw';
var globalIsIndia=false; 
var got_user_info = false; 
var can_cross = true; 
var map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v10',
  center: [74.3587, 31.5204], // starting position
  zoom: 1
});

var routeThroughIndia = false; 

// set the bounds of the map
var bounds = [[60.3587, 15.5204], [90.4587, 40.6204]];
map.setMaxBounds(bounds);

// initialize the map canvas to interact with later
var canvas = map.getCanvasContainer();

// an arbitrary start will always be the same
// only the end or destination will change
var start = [74.3587, 31.5204];

function get_user_input() {
  var first_czship = document.getElementById("czship_1");
  var user_czship_1 = first_czship.options[first_czship.selectedIndex].value;

  var second_czship = document.getElementById("czship_2");
  var user_czship_2 = second_czship.options[second_czship.selectedIndex].value;

  if (document.querySelector('input[name="descent"]:checked') != null) {
    var descent = document.querySelector('input[name="descent"]:checked').value; 
  } else { var descent = null; }

  if (document.querySelector('input[name="drive"]:checked') != null) {
    var drive = document.querySelector('input[name="drive"]:checked').value; }
  else { var drive = null; }

  got_user_info = true; 

  can_cross = check_user_input(user_czship_1, user_czship_2, descent, drive);
  
  var instr_div = document.getElementById('instructions').innerHTML = "Select a source and destination to get directions.";
  var mesg_div = document.getElementById('message').innerHTML = "";
}

function check_user_input(first_cit, second_cit, descent, drive)
{
  var can_cross = true; 

  if ((first_cit == 'United States' || second_cit == 'United States') && ((first_cit == 'Pakistan' || second_cit == 'Pakistan') == 0) && ((first_cit == 'India' || second_cit == 'India') == 0) && (descent == "yes"))
  {
    can_cross = false; 
  }

  if (drive == 'yes')
  {
    can_cross = false; 
  }

  return can_cross; 
}


document.getElementById('btn').addEventListener('click', get_user_input);;


function checkIfIndia(coords, callback) {
  var url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' + coords[0] + ',' + coords[1] + '.json?access_token=' + mapboxgl.accessToken;
  var req = new XMLHttpRequest();
  req.responseType = 'json';
  req.open('GET', url, true);
  req.onload = function() {
    var features = req.response.features;
    return callback(features);
  };
  req.send(); 
}

function getCheckResults(coords, callback) {
  checkIfIndia(coords, function(features) {
    var feat_len = features.length;  
    var country; 
    var isIndia=false; 
    for (var i = 0; i < feat_len; i++)
    {
      if (features[i].place_type[0] == 'country')
      {
        country = features[i].text;
        if (country == 'India')
        {
          isIndia = true; 
        }
      }
    }
    return callback(isIndia); 
  });
}

function checkRoute(waypoints, callback) {
  var num_wp = waypoints.length;
  for (var i = 0; i < num_wp; i++) {
    getCheckResults(waypoints[i], function(isIndia) {
      if (isIndia) {
        routeThroughIndia = true; 
        crossingIndia = true; 
      }
      return callback(isIndia);
    });
  }
  //console.log(routeThroughIndia);
}


function find_alt_route(end) 
{
  can_cross = false; 
  console.log(can_cross);

  getRoute(end);
}


// create a function to make a directions request
function getRoute(end) {
    // make a directions request using cycling profile
    // an arbitrary start will always be the same
    // only the end or destination will change
    var start = [74.3587, 31.5204];
    var url = 'https://api.mapbox.com/directions/v5/mapbox/driving/' + start[0] + ',' + start[1] + ';' + end[0] + ',' + end[1] + '?steps=true&geometries=geojson&access_token=' + mapboxgl.accessToken;
  
    // make an XHR request https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest
    var req = new XMLHttpRequest();
    req.responseType = 'json';
    req.open('GET', url, true);
    req.onload = function() {
      var data = req.response.routes[0];
      var route = data.geometry.coordinates;
      var geojson = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: route
        }
      };
      var my_waypoints = geojson.geometry.coordinates; 
      var num_waypoints = my_waypoints.length;
      my_waypoints.forEach(function(item) {
        getCheckResults(item, function(crossingIndia) {
          if (crossingIndia) {
            if (!can_cross)
            {
              getCheckResults(end, function(isIndia) {
                if (!isIndia) {
                  var message = document.getElementById('message');
                  message.innerHTML = 'There is a route that goes around India but we cannot provide it.';
                }
                else {
                  var instr_div = document.getElementById('instructions').innerHTML = "There is no possible route that does not cross the Indian border.";
                }
              });
            }
            else 
            {
              var instructions = document.getElementById('instructions');
              var message = document.getElementById('message');
              console.log(message);
              message.innerHTML = 'Warning: If you are a U.S. citizen of Pakistani descent, you will not be able to cross the India border. It is also not possible to bring cars across the border. <button id="newRoute">Find alternate route</button>';
              document.getElementById('newRoute').addEventListener('click', function() {
                find_alt_route(end);
              });
              // add turn instructions here at the end
              // get the sidebar and add the instructions
              var steps = data.legs[0].steps;
        
              if (got_user_info)
              {
                var tripInstructions = [];
                for (var i = 0; i < steps.length; i++) {
                  tripInstructions.push('<br><li>' + steps[i].maneuver.instruction) + '</li>';
                  instructions.innerHTML = '<br><span class="duration">Trip duration: ' + Math.floor(data.duration / 60) + ' min </span>' + tripInstructions;
                }
              }
            }
          }
        });
      }); 
      // if the route already exists on the map, reset it using setData
      //crosses_india = false; 
      if (map.getSource('route')) {
        map.getSource('route').setData(geojson);
      } else { // otherwise, make a new request
        map.addLayer({
          id: 'route',
          type: 'line',
          source: {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: geojson
              }
            }
          },
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#3887be',
            'line-width': 5,
            'line-opacity': 0.75
          }
        });
      }
        // add turn instructions here at the end
        // get the sidebar and add the instructions
        var instructions = document.getElementById('instructions');
        var steps = data.legs[0].steps;
        var message = document.getElementById('message');
        message.innerHTML="";
  
        if (got_user_info)
        {
          var tripInstructions = [];
          for (var i = 0; i < steps.length; i++) {
            tripInstructions.push('<br><li>' + steps[i].maneuver.instruction) + '</li>';
            instructions.innerHTML = '<br><span class="duration">Trip duration: ' + Math.floor(data.duration / 60) + ' min  </span>' + tripInstructions;
          }
        }
    };
    req.send();
  }


  
  map.on('load', function() {
    // make an initial directions request that
    // starts and ends at the same location
    getRoute(start);
  
    // Add starting point to the map
    map.addLayer({
      id: 'point',
      type: 'circle',
      source: {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Point',
              coordinates: start
            }
          }
          ]
        }
      },
      paint: {
        'circle-radius': 10,
        'circle-color': '#3887be'
      }
    });
    map.on('click', function(e) {
        var coordsObj = e.lngLat;
        canvas.style.cursor = '';
        var coords = Object.keys(coordsObj).map(function(key) {
          return coordsObj[key];
        });
        var end = {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Point',
              coordinates: coords
            }
          }
          ]
        };
        if (map.getLayer('end')) {
          map.getSource('end').setData(end);
        } else {
          map.addLayer({
            id: 'end',
            type: 'circle',
            source: {
              type: 'geojson',
              data: {
                type: 'FeatureCollection',
                features: [{
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'Point',
                    coordinates: coords
                  }
                }]
              }
            },
            paint: {
              'circle-radius': 10,
              'circle-color': '#f30'
            }
          });
        }
        getRoute(coords);
      });
  });
  