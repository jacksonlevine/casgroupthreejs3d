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

    window.addEventListener('resize', () => {
        viewers.forEach(({ renderer, camera }, container) => {
            const width = container.clientWidth;
            const height = container.clientHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        });
    });
});

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
            viewer.model = gltf.scene;
            scene.add(gltf.scene);
        },
        undefined,
        (error) => console.error('Failed to load model:', error)
    );

    // Mouse-based tilt
    let mouseX = 0, mouseY = 0;
    const maxTilt = 0.3; // radians
    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        mouseX = x * 2; // normalized -1 to 1
        mouseY = y * 2;
    });

    function animate() {
        viewer.animationFrame = requestAnimationFrame(animate);

        // Smooth tilt toward mouse
        if (viewer.model) {
            const targetRotX = mouseY * maxTilt;
            const targetRotY = mouseX * maxTilt;
            viewer.model.rotation.x += (targetRotX - viewer.model.rotation.x) * 0.1;
            viewer.model.rotation.y += (targetRotY - viewer.model.rotation.y) * 0.1;
        }

        renderer.render(scene, camera);
    }

    animate();

    // Smooth camera ease-in (triggered once per section)
    container.addEventListener('focusModel', () => {
        if (viewer.hasAnimatedIn) return;
        viewer.hasAnimatedIn = true;

        const duration = 1500;
        const startTime = performance.now();
        const startPos = camera.position.clone();

        function easeOutCubic(t) {
            return 1 - Math.pow(1 - t, 3);
        }

        function animateCamera(time) {
            const elapsed = time - startTime;
            const t = Math.min(elapsed / duration, 1);
            const easedT = easeOutCubic(t);

            camera.position.lerpVectors(startPos, targetCameraPos, easedT);
            renderer.render(scene, camera);

            if (t < 1) requestAnimationFrame(animateCamera);
        }

        requestAnimationFrame(animateCamera);
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
