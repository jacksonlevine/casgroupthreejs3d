import './style.css'


const sectionNames = [
    "CAS Group",
    "CAS Bioceuticals",
    "CAS Organics",
    "CAS Biotics",
    "CAS BioSciences",
    "CAS Publishing",
    "CAS Properties"
];



const container = document.getElementById('container');
const wrappers = document.querySelectorAll('.image-wrapper');
const dots = document.querySelectorAll('.dot');
const logos = document.querySelectorAll('.logodummy');
let currentDisplayingLogoIndex = 0;
let isScrollingToNewSection = false;
const visitedSections = new Set();

// Add tooltips to dots
dots.forEach((dot, i) => {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = sectionNames[i];
    dot.appendChild(tooltip);
});

function updateIndicator() {
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentDisplayingLogoIndex);
    });
}

function getImageCenter(index) {
    const img = wrappers[index];
    const imgTop = img.offsetTop;
    const imgHeight = img.offsetHeight;
    
    let center = imgTop + (imgHeight / 2) - (window.innerHeight / 2);

    // // Hardcoded adjustment for CAS BioSciences (index 4) and CAS Publishing (index 5)
    // if (index === 4) {
    //     center += imgHeight * 0.15;
    // }
    // if(index === 5) {
    //     center += imgHeight * 0.1;
    // }

    return center;
}

function scrollToImage(index) {
    if (index < 0 || index >= wrappers.length || isScrollingToNewSection) return;

    isScrollingToNewSection = true;
    currentDisplayingLogoIndex = index;
    updateIndicator();

    // Trigger logo animation if this is the first visit
    if (!visitedSections.has(index)) {
        visitedSections.add(index);
        wrappers[index].querySelector('.logo-container').classList.add('focused');
        

        setTimeout(() => {
            wrappers[index].querySelector('.ourthreecontainer').classList.add('noblur');
        }, 200); 
        
        // Trigger model camera ease-in animation if present
        const threeContainer = wrappers[index].querySelector('.ourthreecontainer');
        if (threeContainer) {
            threeContainer.dispatchEvent(new Event('focusModel'));
        }
    }

    container.scrollTo({
        top: getImageCenter(index),
        behavior: 'smooth'
    });

    setTimeout(() => {
        isScrollingToNewSection = false;
    }, 600);

    
}

container.addEventListener('wheel', (e) => {
    if (isScrollingToNewSection) {
        e.preventDefault();
        return;
    }

    e.preventDefault();

    if (e.deltaY > 0) {
        scrollToImage(currentDisplayingLogoIndex + 1);
    } else {
        scrollToImage(currentDisplayingLogoIndex - 1);
    }
}, {passive: false});

dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
        scrollToImage(i);
    });
});

window.addEventListener('load', () => {
    scrollToImage(0);
});

// Touch support
let touchStartY = 0;
let touchEndY = 0;

container.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
}, {passive: true});

container.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, {passive: false});

container.addEventListener('touchend', (e) => {
    if (isScrollingToNewSection) return;
    touchEndY = e.changedTouches[0].clientY;
    const delta = touchStartY - touchEndY;

    if (Math.abs(delta) > 50) {
        if (delta > 0) {
            scrollToImage(currentDisplayingLogoIndex + 1);
        } else {
            scrollToImage(currentDisplayingLogoIndex - 1);
        }
    }
});

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

document.addEventListener("DOMContentLoaded", () => {
    const containers = document.querySelectorAll('.ourthreecontainer');
    const viewers = new Map();

    containers.forEach(container => {
        const modelPath = container.dataset.modelPath;
        initThreeViewer(container, modelPath, viewers);
    });

    let lastWidth = window.innerWidth;
    let lastHeight = window.innerHeight;

    function adjustScrollForCurrentSection() {
        if (currentDisplayingLogoIndex !== null) {
            container.scrollTo({
                top: getImageCenter(currentDisplayingLogoIndex),
                behavior: 'instant'
            });
        }
    }
    function resizeIfNeeded() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        if (width === lastWidth && height === lastHeight) return;

        lastWidth = width;
        lastHeight = height;

        viewers.forEach(({ renderer, camera }, container) => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        });
        adjustScrollForCurrentSection();
    }
    
    //A handful of listeners to try and cover all events where we need a resize (turns out it's not only resize!)
    window.addEventListener('resize', resizeIfNeeded);
    window.addEventListener('focus', resizeIfNeeded);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) resizeIfNeeded();
    });
    document.addEventListener('fullscreenchange', resizeIfNeeded);

    
    //This is to fix a thing that annoyed me that if a user grabs the scrollbar on the browser and scrolls to a page our programmatic scrolling doesn't play along.
    //Now it will wait 100ms and then scroll to the nearest section using our logic so everything feels correct
    let manualScrollTimeout = null;

    container.addEventListener('scroll', () => {
        if (isScrollingToNewSection) return; //ignore our programmatic scrolls

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

    function animateActiveViewer() {
        const activeContainer = wrappers[currentDisplayingLogoIndex].querySelector('.ourthreecontainer');
        const viewer = viewers.get(activeContainer);

        if (viewer) {
            // Smooth tilt toward mouse
            if (viewer.pivot) {
                const targetRotX = mouseY * maxTilt;
                const targetRotY = mouseX * maxTilt;
                viewer.pivot.rotation.x += (targetRotX - viewer.pivot.rotation.x) * 0.1;
                viewer.pivot.rotation.y += (targetRotY - viewer.pivot.rotation.y) * 0.1;
            }

            // Update camera animation if any
            if (viewer.cameraAnimation) {
                viewer.cameraAnimation(performance.now());
            }

            // Render only the active viewer
            viewer.renderer.render(viewer.scene, viewer.camera);
        }

        requestAnimationFrame(animateActiveViewer);
    }

    requestAnimationFrame(animateActiveViewer);

});

let mouseX = 0, mouseY = 0;
const maxTilt = 0.1; // radians

function initThreeViewer(container, modelPath, viewers) {
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
        45,
        container.clientWidth / container.clientHeight,
        0.1,
        100
    );

    // Start camera close, will ease out when triggered
    camera.position.set(0, 0.3, -1);
    const targetCameraPos = new THREE.Vector3(0, 0, 2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setScissorTest(false);
    renderer.setClearColor(0xffffff, 0);
    container.appendChild(renderer.domElement);

    // Lighting
    const light = new THREE.DirectionalLight(0xffffff, 5);
    light.position.set(0, 2, 7);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    // Viewer entry
    const viewer = {
        renderer,
        scene,
        camera,
        animationFrame: null,
        model: null,
        hasAnimatedIn: false
    };
    viewers.set(container, viewer);

    // Load model
    const loader = new GLTFLoader();
    loader.load(
        import.meta.env.BASE_URL + modelPath,
        (gltf) => {
            
            const pivot = new THREE.Object3D();
            pivot.position.z = -0.1
            scene.add(pivot);
            
            viewer.model = gltf.scene;
            
            //Center the model based on its bounding box
            const box = new THREE.Box3().setFromObject(viewer.model);
            const center = box.getCenter(new THREE.Vector3());
            
            //plus a small adjustment upward to sit with the heading
            const adjustmentForHeaderHeight = 0.1;
            center.y -= adjustmentForHeaderHeight;
            center.z += pivot.position.z;
            viewer.model.position.sub(center);

            pivot.add(viewer.model);
            viewer.pivot = pivot;
            
            
            
        },
        undefined,
        (error) => console.error('Failed to load model:', error)
    );

    // Mouse-based tilt

    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        mouseX = x * 2; // normalized -1 to 1
        mouseY = y * 2;
    });

    

    // Smooth camera ease-in (triggered once per section)
    container.addEventListener('focusModel', () => {
        if (viewer.hasAnimatedIn) return;
        viewer.hasAnimatedIn = true;

        const duration = 1000;
        const startTime = performance.now();
        const startPos = camera.position.clone();

        function easeOutCubic(t) {
            return 1 - Math.pow(1 - t, 3);
        }

        viewer.cameraAnimation = (time) => {
            const elapsed = time - startTime;
            const t = Math.min(elapsed / duration, 1);
            const easedT = easeOutCubic(t);
            camera.position.lerpVectors(startPos, targetCameraPos, easedT);

            if (t >= 1) {
                viewer.cameraAnimation = null; // done
            }
        };
    });
}

function disposeThreeViewer(container, viewers) {
    const viewer = viewers.get(container);
    if (!viewer) return;

    cancelAnimationFrame(viewer.animationFrame);

    viewer.scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            else obj.material.dispose();
        }
    });

    viewer.renderer.dispose();
    if (viewer.renderer.domElement.parentNode === container)
        container.removeChild(viewer.renderer.domElement);

    viewers.delete(container);
}

