import * as THREE from './js/three.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';


import { ColorifyShader } from 'three/examples/jsm/shaders/ColorifyShader.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SobelOperatorShader } from 'three/addons/shaders/SobelOperatorShader.js';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';

import { TTFLoader } from 'three/addons/loaders/TTFLoader.js';
import { Font } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';


let camera, scene, renderer, composer;
let effectSobel;

let container;
let group, textMesh1, textMesh2, textGeom, material;
let firstLetter = true;

let text = 'SIP ';
const depth = 1,
    size = 3,
    hover = -100,
    curveSegments = 4,
    bevelThickness = 2,
    bevelSize = 0.5;

let font = null;
const mirror = true;

let targetRotation = 0;
let targetRotationOnPointerDown = 0;

let pointerX = 0;
let pointerXOnPointerDown = 0;

let windowHalfX = window.innerWidth / 2;

let loader;

// Ambient Light 색상을 변경하기 위한 색상 파라미터 추가
const ambientLightColor = {
    color: '#e7e7e7'
};


init();

function init(){
    container = document.createElement('div');
    document.body.appendChild(container);

    //scene 객체 생성
    scene = new THREE.Scene();
    //camera 객체 생성
   camera = new THREE.PerspectiveCamera(
        40, // field of view
        window.innerWidth/window.innerHeight, // aspect ratio
        0.1, // near
        1000 // far 
    );
    camera.position.set( 0, 2, 10 );
    camera.lookAt( scene.position );

    //Web Graphics Library 웹 상에서 2D 및 3D 그래픽 렌더링을 위한 로우레벨 javaScript API
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setAnimationLoop( animate );
    document.body.appendChild( renderer.domElement );


    // font 로딩
    loader = new TTFLoader();
    loader.load('Resource/Font/ari_w9500/ari-w9500-bold.ttf', function (fontData) {
        font = new Font(fontData);
        createText();
    });

    const ambientLight = new THREE.AmbientLight( 0xe7e7e7 );
    scene.add( ambientLight );

    const pointLight = new THREE.PointLight( 0xffffff, 20 );
    camera.add( pointLight );
    scene.add( camera );

    group = new THREE.Group();
    group.position.y = 100;

    scene.add( group );

// postprocessing

    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass( scene, camera );
    composer.addPass( renderPass );

    // Sobel operator
    effectSobel = new ShaderPass( SobelOperatorShader );
    effectSobel.uniforms[ 'resolution' ].value.x = window.innerWidth * window.devicePixelRatio;
    effectSobel.uniforms[ 'resolution' ].value.y = window.innerHeight * window.devicePixelRatio;
    composer.addPass( effectSobel );
    
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.7, 0.4, 0.85);
    composer.addPass(bloomPass);

    const effectColorify = new ShaderPass(ColorifyShader);
    effectColorify.uniforms['color'].value = new THREE.Color(0x00ffff);
    composer.addPass(effectColorify);

    window.addEventListener( 'resize', onWindowResize );

    const plane = new THREE.Mesh(
        new THREE.PlaneGeometry( 10000, 10000 ),
        new THREE.MeshBasicMaterial( { color: 0xffffff, opacity: 0.5, transparent: true } )
    );
    plane.position.y = 0;
    plane.rotation.x = - Math.PI / 2;
    scene.add( plane );

    const color = 0xFFFFFF;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color,intensity);
    light.position.set(0,10,0);
    light.target.position.set(-5, 0, 0);
    scene.add(light);
    scene.add(light.target);

    // 3D 모델 로딩용 GLTF Loader 객체 생성
    const gloader = new GLTFLoader();
    gloader.load('Resource/3D/sipe_arrow.glb', function(gltf){
        gltf.scene.scale.set(.6, .5, .5);
        gltf.scene.rotateZ(Math.PI / 2);
        gltf.scene.rotateX(Math.PI / 2);
        gltf.scene.position.set(4.5, 1.7, -5.5);
    scene.add(gltf.scene);
    }, undefined, function(error){
        console.error(error);
    });

    const controls = new OrbitControls( camera, renderer.domElement );
    controls.enableZoom = true;

    //

    const gui = new GUI();

    // GUI에 색상 선택기 추가
    gui.addColor(ambientLightColor, 'color').onChange(function(value) {
    ambientLight.color.set(value);
    });

    gui.open();

				//
    container.style.touchAction = 'none';
    container.addEventListener( 'pointerdown', onPointerDown );

    document.addEventListener( 'keypress', onDocumentKeyPress );
    document.addEventListener( 'keydown', onDocumentKeyDown );
    window.addEventListener( 'resize', onWindowResize );
}

function onWindowResize() {

    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
    composer.setSize( window.innerWidth, window.innerHeight );

    effectSobel.uniforms[ 'resolution' ].value.x = window.innerWidth * window.devicePixelRatio;
    effectSobel.uniforms[ 'resolution' ].value.y = window.innerHeight * window.devicePixelRatio;

}

function onDocumentKeyDown( event ) {

    if ( firstLetter ) {

        firstLetter = false;
        text = '';

    }

    const keyCode = event.keyCode;

    // backspace

    if ( keyCode === 8 ) {

        event.preventDefault();

        text = text.substring( 0, text.length - 1 );
        refreshText();

        return false;

    }

}

function onDocumentKeyPress( event ) {

    const keyCode = event.which;

    // backspace

    if ( keyCode === 8 ) {

        event.preventDefault();

    } else {

        const ch = String.fromCharCode( keyCode );
        text += ch;

        refreshText();

    }

}

function createText() {

    material = new THREE.MeshPhongMaterial( { color: 0xffff00 } );

    textGeom = new TextGeometry( text, {

        font: font,

        size: size,
        depth: depth,
        curveSegments: curveSegments,

        bevelThickness: bevelThickness,
        bevelSize: bevelSize,
        bevelEnabled: false

    } );

    textGeom.computeBoundingBox();
    textGeom.computeVertexNormals();

    const centerOffset = - 0.5 * ( textGeom.boundingBox.max.x - textGeom.boundingBox.min.x );

    textMesh1 = new THREE.Mesh( textGeom, material );

    textMesh1.position.x = centerOffset;
    textMesh1.position.y = hover;
    textMesh1.position.z = -6;

    textMesh1.rotation.x = 0;
    textMesh1.rotation.y = Math.PI * 2;

    group.add( textMesh1 );

    if ( mirror ) {

        textMesh2 = new THREE.Mesh( textGeom, material );

        textMesh2.position.x = centerOffset;
        textMesh2.position.y = hover;
        textMesh2.position.z = -6 + depth;

        textMesh2.rotation.x = Math.PI;
        textMesh2.rotation.y = Math.PI * 2;

        group.add( textMesh2 );
    }

}

function refreshText() {

    group.remove( textMesh1 );
    if ( mirror ) group.remove( textMesh2 );

    if ( ! text ) return;

    createText();

}

function onPointerDown( event ) {

    if ( event.isPrimary === false ) return;

    pointerXOnPointerDown = event.clientX - windowHalfX;
    targetRotationOnPointerDown = targetRotation;

    document.addEventListener( 'pointermove', onPointerMove );
    document.addEventListener( 'pointerup', onPointerUp );

}

function onPointerMove( event ) {

    if ( event.isPrimary === false ) return;

    pointerX = event.clientX - windowHalfX;

    targetRotation = targetRotationOnPointerDown + ( pointerX - pointerXOnPointerDown ) * 0.02;

}

function onPointerUp( event ) {

    if ( event.isPrimary === false ) return;

    document.removeEventListener( 'pointermove', onPointerMove );
    document.removeEventListener( 'pointerup', onPointerUp );

}

function animate() {
    
        composer.render();

}