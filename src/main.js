import './style.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const sectionNames = [
    "CAS Group","CAS Bioceuticals","CAS Organics","CAS Biotics",
    "CAS BioSciences","CAS Publishing","CAS Properties"
];

const container = document.getElementById('container');
const wrappers = document.querySelectorAll('.image-wrapper');
const dots = document.querySelectorAll('.dot');
const canvascontainer = document.getElementById('ourcanvas');

let scene, camera, renderer, light;
let currentDisplayingLogoIndex = 0;
let isScrollingToNewSection = false;
const visitedSections = new Set();
let mouseX = 0, mouseY = 0;
const maxTilt = 0.1;

// ----------------- Tooltips -----------------
dots.forEach((dot,i)=>{
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = sectionNames[i];
    dot.appendChild(tooltip);
});

// ----------------- Initialize Canvas -----------------
function initMainCanvas(){
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
        45,
        canvascontainer.clientWidth/canvascontainer.clientHeight,
        0.1,100
    );
    camera.position.set(0,0.3,2);
    camera.lookAt(0,0,0);

    renderer = new THREE.WebGLRenderer({antialias:true,alpha:true});
    renderer.setSize(canvascontainer.clientWidth,canvascontainer.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0xffffff,0);
    canvascontainer.appendChild(renderer.domElement);

    light = new THREE.DirectionalLight(0xffffff,5);
    light.position.set(0,0.1,2);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff,0.4));
}

// ----------------- Scroll Helpers -----------------
function updateIndicator(){
    dots.forEach((dot,i)=>{
        dot.classList.toggle('active',i===currentDisplayingLogoIndex);
    });
}

function getImageCenter(index){
    const img = wrappers[index];
    return img.offsetTop + img.offsetHeight/2 - window.innerHeight/2;
}

function scrollToImage(index){
    if(index<0||index>=wrappers.length||isScrollingToNewSection) return;
    const prevIndex = currentDisplayingLogoIndex;
    isScrollingToNewSection=true;
    currentDisplayingLogoIndex=index;
    updateIndicator();

    const wrapper = wrappers[index];
    const prevWrapper = wrappers[prevIndex];

    // First visit logic
    if(!visitedSections.has(index)){
        visitedSections.add(index);
        wrapper.querySelector('.logo-container')?.classList.add('focused');

        if(canvascontainer){
            canvascontainer.classList.remove('noblur');
            void canvascontainer.offsetWidth;
            setTimeout(()=>{canvascontainer.classList.add('noblur');}, 100);
        }
    }

    // Show pivot
    if(wrapper.pivot) wrapper.pivot.visible = true;

    // Trigger slide animation
    wrapper.dispatchEvent(new CustomEvent('slideModel',{
        detail: { direction: index>prevIndex?'up':'down', prevWrapper }
    }));

    container.scrollTo({top:getImageCenter(index),behavior:'smooth'});
    setTimeout(()=>{isScrollingToNewSection=false;},600);
}

// ----------------- Scrolling -----------------
container.addEventListener('wheel',e=>{
    if(isScrollingToNewSection){e.preventDefault();return;}
    e.preventDefault();
    scrollToImage(currentDisplayingLogoIndex+(e.deltaY>0?1:-1));
},{passive:false});

dots.forEach((dot,i)=>dot.addEventListener('click',()=>scrollToImage(i)));

let touchStartY=0;
container.addEventListener('touchstart',e=>{touchStartY=e.touches[0].clientY;},{passive:true});
container.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
container.addEventListener('touchend',e=>{
    if(isScrollingToNewSection) return;
    const delta = touchStartY-e.changedTouches[0].clientY;
    if(Math.abs(delta)>50) scrollToImage(currentDisplayingLogoIndex+(delta>0?1:-1));
});

// ----------------- Load Models -----------------
function initModelSpot(wrapper, modelPath){
    const loader = new GLTFLoader();
    loader.load(import.meta.env.BASE_URL+modelPath,
        gltf=>{
            const pivot = new THREE.Object3D();
            pivot.position.set(0,0,0);
            pivot.visible = false;
            scene.add(pivot);

            const model = gltf.scene;
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const adjustmentForHeaderHeight = 0.1;
            center.y -= adjustmentForHeaderHeight;
            center.z += pivot.position.z;
            model.position.sub(center);
            pivot.add(model);

            wrapper.pivot = pivot;
            wrapper.model = model;
            wrapper.modelAnimation = null;
            wrapper.slideAnimation = null;
            wrapper.hasFocusAnimationRun = false;

            // First logo initial focus
            const index = Array.from(wrappers).indexOf(wrapper);
            if(index===0){
                wrapper.pivot.visible = true;
                wrapper.dispatchEvent(new Event('focusModel'));
                visitedSections.add(0);
                wrapper.querySelector('.logo-container')?.classList.add('focused');
                wrapper.hasFocusAnimationRun = true;

                canvascontainer.classList.remove('noblur');
                void canvascontainer.offsetWidth;
                setTimeout(()=>{canvascontainer.classList.add('noblur');}, 100);
            }
        },
        undefined,
        err=>console.error('Failed to load model:',err)
    );

    // Mouse tilt
    wrapper.addEventListener('mousemove', e=>{
        const rect = wrapper.getBoundingClientRect();
        mouseX = ((e.clientX-rect.left)/rect.width-0.5)*2;
        mouseY = ((e.clientY-rect.top)/rect.height-0.5)*2;
    });

    // Slide animation
    wrapper.addEventListener('slideModel', e=>{
        const {direction, prevWrapper} = e.detail;
        const now = performance.now();
        const slideDistance = 1.5;
        const targetY = 0;
        const startY = wrapper.pivot.position.y; // continue from current pos

        wrapper.slideAnimation = { startTime: now, startY, targetY, duration: 1000 };

        if(prevWrapper && prevWrapper.pivot){
            const prevStartY = prevWrapper.pivot.position.y;
            const prevTargetY = direction==='up'? slideDistance : -slideDistance;
            prevWrapper.slideAnimation = { startTime: now, startY: prevStartY, targetY: prevTargetY, duration: 1000, hideAfter: true };
        }

        if(!wrapper.hasFocusAnimationRun){
            wrapper.hasFocusAnimationRun = true;
            requestAnimationFrame(() => {
                wrapper.dispatchEvent(new Event('focusModel'));
            });
        }
    });

    // Z-focus animation
    wrapper.addEventListener('focusModel', ()=>{
        if(wrapper.modelAnimation) return;
        const startZ = wrapper.pivot.position.z + 2;
        const targetZ = wrapper.pivot.position.z;
        const now = performance.now();
        wrapper.modelAnimation = { startTime: now, startZ, targetZ, duration: 1000 };
        wrapper.pivot.position.z = startZ;
    });
}

// Animation loop
function animate(){
    const active = wrappers[currentDisplayingLogoIndex];
    wrappers.forEach(w=>{
        if(!w.pivot) return;

        // Tilt
        if(w===active){
            w.pivot.rotation.x += (mouseY*maxTilt - w.pivot.rotation.x)*0.1;
            w.pivot.rotation.y += (mouseX*maxTilt - w.pivot.rotation.y)*0.1;
        }

        // Z-focus
        if(w.modelAnimation){
            const {startTime,startZ,targetZ,duration} = w.modelAnimation;
            const t = Math.min((performance.now()-startTime)/duration,1);
            const eased = 1 - Math.pow(1-t,3);
            w.pivot.position.z = startZ + (targetZ-startZ)*eased;
            if(t>=1) w.modelAnimation = null;
        }

        // Slide
        if(w.slideAnimation){
            const {startTime,startY,targetY,duration,hideAfter} = w.slideAnimation;
            const t = Math.min((performance.now()-startTime)/duration,1);
            const eased = 1 - Math.pow(1-t,3);
            w.pivot.position.y = startY + (targetY-startY)*eased;
            if(t>=1){
                if(hideAfter) w.pivot.visible = false;
                w.slideAnimation = null;
            }
        }
    });

    renderer.render(scene,camera);
    requestAnimationFrame(animate);
}

// ----------------- Init -----------------
initMainCanvas();

// ----------------- Resize & viewport handling -----------------
function resizeIfNeeded() {
    camera.aspect = canvascontainer.clientWidth / canvascontainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvascontainer.clientWidth, canvascontainer.clientHeight);
}

window.addEventListener('focus', resizeIfNeeded);
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) resizeIfNeeded();
});
document.addEventListener('fullscreenchange', resizeIfNeeded);

// ----------------- Sync scroll after resize -----------------
function scrollToNearestSectionIfNeeded() {
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    const viewportCenter = container.scrollTop + window.innerHeight / 2;

    wrappers.forEach((wrapper, i) => {
        const wrapperCenter = wrapper.offsetTop + wrapper.offsetHeight / 2;
        const distance = Math.abs(wrapperCenter - viewportCenter);
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = i;
        }
    });

    // Determine if the camera/scroll is too far off-center from the active section
    const activeWrapper = wrappers[currentDisplayingLogoIndex];
    if (activeWrapper) {
        const activeCenter = activeWrapper.offsetTop + activeWrapper.offsetHeight / 2;
        const offset = Math.abs(activeCenter - viewportCenter);

        // only correct scroll if it's clearly off-center (more than ~1/6 of viewport)
        if (offset > window.innerHeight / 6) {
            scrollToImage(nearestIndex);
        } else {
            // ensure the renderer and projection are correct
            resizeIfNeeded();
        }
    } else {
        // fallback if somehow none active
        scrollToImage(nearestIndex);
    }
}

// Hook into events
window.addEventListener('resize', () => {
    resizeIfNeeded();
    scrollToNearestSectionIfNeeded();
});
window.addEventListener('focus', scrollToNearestSectionIfNeeded);
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) scrollToNearestSectionIfNeeded();
});
document.addEventListener('fullscreenchange', scrollToNearestSectionIfNeeded);


// ----------------- Manual scroll correction -----------------
let manualScrollTimeout = null;
container.addEventListener('scroll', () => {
    if (isScrollingToNewSection) return; // ignore programmatic scrolls

    if (manualScrollTimeout) clearTimeout(manualScrollTimeout);

    manualScrollTimeout = setTimeout(() => {
        let nearestIndex = 0;
        let nearestDistance = Infinity;
        wrappers.forEach((wrapper, i) => {
            const wrapperCenter = wrapper.offsetTop + wrapper.offsetHeight / 2;
            const distance = Math.abs(wrapperCenter - (container.scrollTop + window.innerHeight / 2));
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestIndex = i;
            }
        });

        if (nearestIndex !== currentDisplayingLogoIndex) {
            scrollToImage(nearestIndex);
        }
    }, 100);
});


wrappers.forEach(w=>initModelSpot(w,w.dataset.modelPath));
requestAnimationFrame(animate);
scrollToImage(0);
