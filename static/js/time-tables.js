/*****************************************************************************/
/*                       Utilities                                           */
/*****************************************************************************/
function initStats(type) {
  var panelType =
    typeof type !== "undefined" && type && !isNaN(type) ? parseInt(type) : 0;
  var stats = new Stats();

  stats.showPanel(panelType); // 0: fps, 1: ms, 2: mb, 3+: custom
  document.body.appendChild(stats.dom);

  return stats;
}
function initRenderer(additionalProperties) {
  var props =
    typeof additionalProperties !== "undefined" && additionalProperties
      ? additionalProperties
      : {};
  var renderer = new THREE.WebGLRenderer(props);
  renderer.shadowMap.enabled = true;
  renderer.shadowMapSoft = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  renderer.setClearColor(new THREE.Color(0x000000));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  return renderer;
}
function initCamera(initialPosition) {
  var position =
    initialPosition !== undefined
      ? initialPosition
      : new THREE.Vector3(-30, 40, 30);

  var camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.copy(position);
  camera.lookAt(new THREE.Vector3(0, 0, 0));

  return camera;
}
function initCamera(initialPosition) {
  var position =
    initialPosition !== undefined
      ? initialPosition
      : new THREE.Vector3(-30, 40, 30);

  var camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.copy(position);
  camera.lookAt(new THREE.Vector3(0, 0, 0));

  return camera;
}
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function lerp(v1, v2, t) {
  return v1 + (v2 - v1) * t;
}

// listen to the resize events
window.addEventListener("resize", onResize, false);

/*****************************************************************************/
/*                       Global values                                       */
/*****************************************************************************/
var cloud = null;
let lines = null;
let normalizedPrimaryColor   = [0  , 195 / 255. , 1.];
let normalizedSecondaryColor = [1. , 75  / 255. , 0];

/*****************************************************************************/
/*                       GUI creation                                        */
/*****************************************************************************/
var stats = initStats();
var renderer = initRenderer({
    antialias: true
});
var camera = initCamera();
var clock = THREE.Clock();
camera.position.x = 0;
camera.position.y = 0;
camera.position.z = 150;
camera.lookAt(new THREE.Vector3(0, 0, 0));

var labels = function() {
  this.verticesNum = 360;
  this.radius = 60;
  this.multiplier = 10;
  this.lineColor = "length";
  this.reset = function() 
  {
    console.log("reset sim");
    recreatePoints(verticesNum, radius, multiplier );
  };

  this.primaryColor = [0, 195,255];
  this.secondaryColor = [255, 75,0];  

  this.deltaMultiplier = 0.001;
  this.animateMultiplier = false;

};

let guiValues = new labels();
var gui = new dat.GUI();

/******************************************************************/
/**                 Circle Paramaters folder
/******************************************************************/
var circleParameters = gui.addFolder("Circle Paramaters");
var verticesChanged = circleParameters.add(guiValues, "verticesNum", 1);
verticesChanged.onChange(function(value) {
  recreatePoints(value, guiValues.radius, guiValues.multiplier);
});
var radiusChanged = circleParameters.add(guiValues, "radius", 10);
radiusChanged.onChange(function(value) {
  recreatePoints(guiValues.verticesNum, value, guiValues.multiplier);
});
var multiplier = circleParameters.add(guiValues, "multiplier").step(0.001);
multiplier.onChange(function(value) {
    recreatePoints(guiValues.verticesNum, guiValues.radius, value);
});

/******************************************************************/
/**                 colors
/******************************************************************/
var colors = gui.addFolder("colors");
var lineColorChanged = colors.add(guiValues, "lineColor",  ["Mono", "linear interpolation 0","linear interpolation X","linear interpolation Y", "length"]);
lineColorChanged.onChange(function (value) { 
    recreatePoints(guiValues.verticesNum, guiValues.radius, guiValues.multiplier);
 });

 var primaryChanged   = colors.addColor(guiValues, "primaryColor");
primaryChanged.onChange(function (color) 
{
    normalizedPrimaryColor[0] = color[0] / 255;
    normalizedPrimaryColor[1] = color[1] / 255;
    normalizedPrimaryColor[2] = color[2] / 255; 
    recreatePoints(guiValues.verticesNum, guiValues.radius, guiValues.multiplier);
 });
var secondaryChanged = colors.addColor(guiValues, "secondaryColor"); 
secondaryChanged.onChange(function (color) 
{
    normalizedSecondaryColor[0] = color[0] / 255;
    normalizedSecondaryColor[1] = color[1] / 255;
    normalizedSecondaryColor[2] = color[2] / 255; 
    recreatePoints(guiValues.verticesNum, guiValues.radius, guiValues.multiplier);
});

/******************************************************************/
/**                 animate
/******************************************************************/
var animate = gui.addFolder("animation");
animate.add(guiValues, "deltaMultiplier");
animate.add(guiValues, 'animateMultiplier');

gui.add(guiValues, "reset");

/*****************************************************************************/
/*                       rendering                                           */
/*****************************************************************************/

var scene = new THREE.Scene();

function recreatePoints(verticesNumber, radius, multiplier) 
{
    if (cloud != null) 
        scene.remove(cloud);

    if (lines != null)
        scene.remove(lines);

  var material = new THREE.PointsMaterial({
    size: 1,
    vertexColors: true,
    color: 0xffffff
  });
  var lineMaterial = new THREE.LineBasicMaterial({
    vertexColors: THREE.VertexColors,
    linewidth: 2
  });

  let geom = new THREE.Geometry();
  var linesGeo = new THREE.Geometry();

  for (var i = 0; i < verticesNumber; i++) 
  {
    let j = (i * multiplier) % verticesNumber;
    var angleStart = (i / verticesNumber) * 2 * Math.PI;
    var angleEnd   = (j / verticesNumber) * 2 * Math.PI;   

    let startingX = -radius * Math.cos(angleStart);
    let startingY =  radius * Math.sin(angleStart); 
    let endX      = -radius * Math.cos(angleEnd);
    let endY      =  radius * Math.sin(angleEnd);

    var startingParticle = new THREE.Vector3(startingX, startingY, 0);
    var endParticle = new THREE.Vector3(endX,endY, 0 );

       
    let startingColor = null;
    let endingColor = null;
    if (guiValues.lineColor == "Mono")
    {
        startingColor = new THREE.Color(normalizedPrimaryColor[0], normalizedPrimaryColor[1],normalizedPrimaryColor[2]);
        endingColor   = startingColor;
    }
    else if (guiValues.lineColor == "linear interpolation 0")
    {
        startingColor = new THREE.Color(lerp(normalizedPrimaryColor[0], normalizedSecondaryColor[0], (i+1) / verticesNumber),
                                        lerp(normalizedPrimaryColor[1], normalizedSecondaryColor[1], (i+1) / verticesNumber), 
                                        lerp(normalizedPrimaryColor[2], normalizedSecondaryColor[2], (i+1) / verticesNumber));
                                        
        endingColor   = new THREE.Color(lerp(normalizedPrimaryColor[0], normalizedSecondaryColor[0], (j+1) / verticesNumber),
                                        lerp(normalizedPrimaryColor[1], normalizedSecondaryColor[1], (j+1) / verticesNumber), 
                                        lerp(normalizedPrimaryColor[2], normalizedSecondaryColor[2], (j+1) / verticesNumber));
    }
    else if (guiValues.lineColor == "linear interpolation X")
    {
        startingColor = new THREE.Color(lerp(normalizedPrimaryColor[0], normalizedSecondaryColor[0],  (startingX + guiValues.radius) / (2 * guiValues.radius) ),
                                        lerp(normalizedPrimaryColor[1], normalizedSecondaryColor[1],  (startingX + guiValues.radius) / (2 * guiValues.radius) ), 
                                        lerp(normalizedPrimaryColor[2], normalizedSecondaryColor[2],  (startingX + guiValues.radius) / (2 * guiValues.radius)));
        
        endingColor   = new THREE.Color(lerp(normalizedPrimaryColor[0], normalizedSecondaryColor[0], (endX + guiValues.radius) / (2 * guiValues.radius)),
                                        lerp(normalizedPrimaryColor[1], normalizedSecondaryColor[1], (endX + guiValues.radius) / (2 * guiValues.radius)), 
                                        lerp(normalizedPrimaryColor[2], normalizedSecondaryColor[2], (endX + guiValues.radius) / (2 * guiValues.radius)));
    }
    else if (guiValues.lineColor == "linear interpolation Y")
    {
        startingColor = new THREE.Color(lerp(normalizedPrimaryColor[0], normalizedSecondaryColor[0],  (startingY + guiValues.radius) / (2 * guiValues.radius) ),
                                        lerp(normalizedPrimaryColor[1], normalizedSecondaryColor[1],  (startingY + guiValues.radius) / (2 * guiValues.radius) ), 
                                        lerp(normalizedPrimaryColor[2], normalizedSecondaryColor[2],  (startingY + guiValues.radius) / (2 * guiValues.radius)));
        
        endingColor   = new THREE.Color(lerp(normalizedPrimaryColor[0], normalizedSecondaryColor[0], (endY + guiValues.radius) / (2 * guiValues.radius)),
                                        lerp(normalizedPrimaryColor[1], normalizedSecondaryColor[1], (endY + guiValues.radius) / (2 * guiValues.radius)), 
                                        lerp(normalizedPrimaryColor[2], normalizedSecondaryColor[2], (endY + guiValues.radius) / (2 * guiValues.radius)));
    }
    else if(guiValues.lineColor = "length")
    {
        let ratio = ( (startingX - endX)**2 + (startingY - endY)**2) / ((2*guiValues.radius)**2);
        startingColor = new THREE.Color(lerp(normalizedPrimaryColor[0], normalizedSecondaryColor[0], ratio),
                                        lerp(normalizedPrimaryColor[1], normalizedSecondaryColor[1], ratio), 
                                        lerp(normalizedPrimaryColor[2], normalizedSecondaryColor[2], ratio));
        endingColor   = new THREE.Color(lerp(normalizedPrimaryColor[0], normalizedSecondaryColor[0], ratio),
                                        lerp(normalizedPrimaryColor[1], normalizedSecondaryColor[1], ratio), 
                                        lerp(normalizedPrimaryColor[2], normalizedSecondaryColor[2], ratio));
    }

    
    geom.vertices.push(startingParticle);
    linesGeo.vertices.push(startingParticle);
    linesGeo.vertices.push(endParticle);
    
    geom.colors.push(startingColor);
    linesGeo.colors.push(startingColor);
    linesGeo.colors.push(endingColor);
}


cloud = new THREE.Points(geom, material);

lines = new THREE.LineSegments(linesGeo, lineMaterial);
scene.add(cloud);
scene.add(lines);
}

let dt = 0.01;
function render() {
  stats.update();

  if (guiValues.animateMultiplier)
  {
      guiValues.multiplier += guiValues.deltaMultiplier;
      recreatePoints(guiValues.verticesNum, guiValues.radius, guiValues.multiplier);
      // Iterate over all controllers
      for (var i in circleParameters.__controllers) {
        circleParameters.__controllers[i].updateDisplay();
      }

  }

  requestAnimationFrame(render);
  renderer.render(scene, camera);
}

recreatePoints(guiValues.verticesNum, guiValues.radius, guiValues.multiplier);
render();
