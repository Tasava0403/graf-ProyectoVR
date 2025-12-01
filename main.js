import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// =============================================================================
// SISTEMA DE UI Y LOADING
// =============================================================================

let resourcesLoaded = 0;
let totalResources = 8;
let loadingCompleted = false;
let welcomeNotificationShown = false;
let gameCompleted = false;

/**
 * Sistema de carga que muestra progreso y gestiona la pantalla de loading
 */
function initLoadingSystem() {
    const loadingScreen = document.getElementById('loadingScreen');
    const loadingProgress = document.querySelector('.loading-progress');
    const loadingText = document.querySelector('.loading-text');
    
    if (!loadingScreen || !loadingProgress) {
        console.warn('Elementos de loading no encontrados');
        return { resourceLoaded: () => {} };
    }

    /**
     * Actualiza visualmente la barra de progreso y texto
     */
    function updateProgress() {
        const progress = Math.min(100, (resourcesLoaded / totalResources) * 100);
        loadingProgress.style.width = `${progress}%`;
        
        if (progress < 30) {
            loadingText.textContent = 'Cargando entorno 3D...';
        } else if (progress < 60) {
            loadingText.textContent = 'Cargando modelos y texturas...';
        } else if (progress < 90) {
            loadingText.textContent = 'Cargando sistema de audio...';
        } else {
            loadingText.textContent = '¡Listo! Iniciando experiencia...';
        }

        if (progress >= 100 && !loadingCompleted) {
            loadingCompleted = true;
            setTimeout(() => {
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                    if (!welcomeNotificationShown) {
                        showNotification('🚀 ¡Bienvenido a Money Run VR! Recolecta $50,000');
                        welcomeNotificationShown = true;
                    }
                }, 500);
            }, 800);
        }
    }

    /**
     * Marca un recurso como cargado y actualiza el progreso
     */
    function resourceLoaded() {
        resourcesLoaded++;
        console.log(`📦 Recurso cargado: ${resourcesLoaded}/${totalResources}`);
        updateProgress();
    }

    return { resourceLoaded };
}

/**
 * Muestra notificaciones temporales en la interfaz
 * @param {string} message - Mensaje a mostrar
 * @param {number} duration - Duración en milisegundos
 */
function showNotification(message, duration = 3000) {
    if (gameCompleted && message.includes('Felicidades')) return;
    
    const notifications = document.getElementById('notifications');
    if (!notifications) return;
    
    notifications.innerHTML = '';
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.animation = 'slideDown 0.3s ease';
    
    notifications.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideDown 0.3s ease reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, duration);
}

/**
 * Inicializa los controles de la interfaz de usuario
 */
function initUIControls() {
    const controlsToggle = document.getElementById('controlsToggle');
    const controlsPanel = document.getElementById('controlsPanel');
    const closeControls = document.getElementById('closeControls');
    
    if (controlsToggle && controlsPanel) {
        controlsToggle.addEventListener('click', () => {
            controlsPanel.classList.remove('hidden');
        });
    }
    
    if (closeControls && controlsPanel) {
        closeControls.addEventListener('click', () => {
            controlsPanel.classList.add('hidden');
        });
    }
    
    document.addEventListener('keydown', (event) => {
        if (event.code === 'Escape' && controlsPanel && !controlsPanel.classList.contains('hidden')) {
            controlsPanel.classList.add('hidden');
        }
    });
    
    document.addEventListener('click', (event) => {
        if (controlsPanel && !controlsPanel.classList.contains('hidden') && 
            !controlsPanel.contains(event.target) && 
            event.target !== controlsToggle) {
            controlsPanel.classList.add('hidden');
        }
    });
}

/**
 * Sistema de progreso del juego que actualiza la barra de progreso
 */
function initGameProgress() {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    if (!progressFill || !progressText) return;
    
    function updateProgress() {
        const percentage = Math.min(100, Math.round((totalMoneyCollected / moneyTarget) * 100));
        
        progressFill.style.width = `${percentage}%`;
        progressText.textContent = `${percentage}%`;
        
        if (percentage < 30) {
            progressFill.style.background = 'linear-gradient(90deg, #ff6b6b, #ee5a52)';
        } else if (percentage < 70) {
            progressFill.style.background = 'linear-gradient(90deg, #ffd700, #ffed4e)';
        } else {
            progressFill.style.background = 'linear-gradient(90deg, #51cf66, #40c057)';
        }
    }
    
    setInterval(updateProgress, 500);
    updateProgress();
}

// Inicializar sistemas de UI cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    initUIControls();
    initGameProgress();
    console.log('✅ Sistema de UI inicializado');
});

// =============================================================================
// CONFIGURACIÓN DEL MUNDO
// =============================================================================

/** Configuración principal del mundo virtual */
const WORLD_CONFIG = {
    SIZE: 130,
    TERRAIN_RESOLUTION: 256,
    TERRAIN_MAX_HEIGHT: 0.8,
    RADIUS: 130 * 0.5 - 1.0,
    FOG_DENSITY: 0.008,
    BAG_AREA: 40,
    WALL_HEIGHT: 6
};

/** Configuración de objetos y entidades del juego */
const OBJECT_CONFIG = {
    OBJECT_COUNT: 100,
    BAG_COUNT: 25,
    OBSTACLE_COUNT: 12,
    
    PLAYER_RADIUS: 0.35,
    OBJECT_RADIUS: 1.2,
    BAG_RADIUS: 0.45,
    
    WALK_SPEED: 5.5,
    STRAFE_SPEED: 4.8,
    ARC_STEPS: 40,
    ARC_SPEED: 7.5,
    ARC_GRAVITY: 9.8,
    MAX_SLOPE_ANGLE: 45
};

/** Configuración de economía y balance del juego */
const GAME_CONFIG = {
    MODE: 'DESKTOP',
    MIN_MONEY_PER_BAG: 500,      // Aumentado de 200 a 500
    MAX_MONEY_PER_BAG: 1500,     // Aumentado de 1000 a 1500
    BONUS_CHANCE: 0.05,
    BONUS_MULTIPLIER: 5,
    TOTAL_MONEY_TARGET: 50000,
    BAG_RESPAWN_RATE: 3.0        // Reducido de 8.0 a 3.0 segundos
};

/** Rutas de recursos y assets del juego */
const ASSET_PATHS = {
    TEXTURES: {
        GROUND_COLOR: 'assets/textures/suelo/PavingStones089_1K-JPG_Color.jpg',
        GROUND_NORMAL: 'assets/textures/suelo/PavingStones089_1K-JPG_NormalGL.jpg',
        GROUND_ROUGHNESS: 'assets/textures/suelo/PavingStones089_1K-JPG_Roughness.jpg',
        GROUND_AO: 'assets/textures/suelo/PavingStones089_1K-JPG_AmbientOcclusion.jpg'
    },
    AUDIO: {
        COIN: 'assets/audio/Money.mp3',
        AMBIENCE: 'assets/audio/TheVillage.mp3',
        FINAL: 'assets/audio/TheVillage.mp3'
    }
};

/** Modelos 3D disponibles para objetos decorativos */
const OBJECT_MODELS = [
    { path: 'models/arbol1/scene.gltf', scale: 1.0, type: 'decorative' },
    { path: 'models/lampara/scene.gltf', scale: 1.5, type: 'decorative' },
    { path: 'models/mercado/scene.gltf', scale: 1.0, type: 'decorative' },
    { path: 'models/carro1/scene.gltf', scale: 1.5, type: 'decorative' },
    { path: 'models/arbol2/scene.gltf', scale: 1.0, type: 'decorative' },
];

// =============================================================================
// INICIALIZACIÓN DE THREE.JS
// =============================================================================

const canvas = document.getElementById('scene');
const ambientEl = document.getElementById('ambient');
const loadingSystem = initLoadingSystem();

/** Renderer WebGL configurado para VR y alto rendimiento */
const renderer = new THREE.WebGLRenderer({ 
    canvas, 
    antialias: true 
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.xr.enabled = true;
renderer.autoClear = true;

/** Escena principal que contiene todos los objetos del mundo */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.FogExp2(0x87ceeb, WORLD_CONFIG.FOG_DENSITY);

/** Escena de fondo para el skybox */
const bgScene = new THREE.Scene();
const bgCam = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 5000);

/** Cámara principal y jugador */
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 500);
const player = new THREE.Group();
player.position.set(0, 1.6, 3);
player.add(camera);
scene.add(player);

// =============================================================================
// SISTEMA DE ILUMINACIÓN
// =============================================================================

/** Luz hemisférica para iluminación ambiental */
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
scene.add(hemiLight);

/** Luz direccional principal que simula el sol */
const sunLight = new THREE.DirectionalLight(0xfff5cc, 1.5);
sunLight.position.set(50, 100, -50);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(1024, 1024);
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 200;
sunLight.shadow.camera.left = -50;
sunLight.shadow.camera.right = 50;
sunLight.shadow.camera.top = 50;
sunLight.shadow.camera.bottom = -50;
scene.add(sunLight);

/** Luz ambiental adicional para relleno */
const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
scene.add(ambientLight);

// =============================================================================
// SKYBOX DIURNO
// =============================================================================

/** Skybox personalizado con gradiente de colores */
const skyGeometry = new THREE.SphereGeometry(2000, 32, 16);
const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
    uniforms: {
        topColor: { value: new THREE.Color(0x87ceeb) },
        bottomColor: { value: new THREE.Color(0xbfefff) }
    },
    vertexShader: /* glsl */`
        varying vec3 vDir;
        void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: /* glsl */`
        varying vec3 vDir;
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        void main() {
            float t = smoothstep(-0.2, 0.8, vDir.y);
            vec3 col = mix(bottomColor, topColor, t);
            gl_FragColor = vec4(col, 1.0);
        }
    `
});

const skyMesh = new THREE.Mesh(skyGeometry, skyMaterial);
skyMesh.renderOrder = -2;
skyMesh.frustumCulled = false;
bgScene.add(skyMesh);

// =============================================================================
// MURO PERIMETRAL
// =============================================================================

/** Muro cilíndrico que define los límites del mundo */
const wallGeometry = new THREE.CylinderGeometry(
    WORLD_CONFIG.RADIUS + 0.5, 
    WORLD_CONFIG.RADIUS + 0.5, 
    WORLD_CONFIG.WALL_HEIGHT, 
    32, 1, true
);
const wallMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x88c0d0, 
    side: THREE.BackSide, 
    fog: false 
});
const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
wallMesh.position.y = WORLD_CONFIG.WALL_HEIGHT / 2;
wallMesh.renderOrder = 5;
scene.add(wallMesh);

// =============================================================================
// GENERACIÓN DE TERRENO
// =============================================================================

/**
 * Generador de ruido Perlin para crear terreno orgánico
 * @param {number} seed - Semilla para generación reproducible
 * @returns {Function} Función de ruido Perlin
 */
function createPerlinNoise(seed = 1337) {
    const permutation = new Uint8Array(512);
    
    for (let i = 0; i < 256; i++) permutation[i] = i;
    
    for (let i = 255; i > 0; i--) {
        const n = Math.floor((seed = (seed * 16807) % 2147483647) / 2147483647 * (i + 1));
        const temp = permutation[i];
        permutation[i] = permutation[n];
        permutation[n] = temp;
    }
    
    for (let i = 0; i < 256; i++) permutation[256 + i] = permutation[i];
    
    const grad = (hash, x, y) => {
        switch(hash & 3) {
            case 0: return  x + y;
            case 1: return -x + y;
            case 2: return  x - y;
            default: return -x - y;
        }
    };
    
    const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (a, b, t) => a + t * (b - a);
    
    return function noise(x, y) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        x -= Math.floor(x);
        y -= Math.floor(y);
        
        const u = fade(x);
        const v = fade(y);
        
        const A = permutation[X] + Y;
        const B = permutation[X + 1] + Y;
        
        return lerp(
            lerp(grad(permutation[A], x, y), grad(permutation[B], x - 1, y), u),
            lerp(grad(permutation[A + 1], x, y - 1), grad(permutation[B + 1], x - 1, y - 1), u),
            v
        );
    };
}

const perlinNoise = createPerlinNoise(2025);

/** Geometría del terreno con deformación por ruido Perlin */
const terrainGeometry = new THREE.PlaneGeometry(
    WORLD_CONFIG.SIZE, 
    WORLD_CONFIG.SIZE, 
    WORLD_CONFIG.TERRAIN_RESOLUTION, 
    WORLD_CONFIG.TERRAIN_RESOLUTION
);
terrainGeometry.rotateX(-Math.PI / 2);

// Aplicar ruido Perlin al terreno
const terrainPositions = terrainGeometry.attributes.position;
for (let i = 0; i < terrainPositions.count; i++) {
    const x = terrainPositions.getX(i);
    const z = terrainPositions.getZ(i);
    
    const height = perlinNoise(x * 0.02, z * 0.02) * 0.12 + 
                   perlinNoise(x * 0.05, z * 0.05) * 0.05;
    
    terrainPositions.setY(i, height * WORLD_CONFIG.TERRAIN_MAX_HEIGHT);
}

terrainPositions.needsUpdate = true;
terrainGeometry.computeVertexNormals();

/** Carga de texturas para el terreno */
const textureLoader = new THREE.TextureLoader();

let texturesLoaded = 0;
const totalTextures = 4;

/**
 * Carga una textura con manejo de errores
 * @param {string} path - Ruta de la textura
 * @returns {THREE.Texture} Textura cargada
 */
function loadTexture(path) {
    const texture = textureLoader.load(
        path,
        () => {
            texturesLoaded++;
            loadingSystem.resourceLoaded();
            console.log(`✅ Textura cargada: ${path} (${texturesLoaded}/${totalTextures})`);
        },
        undefined,
        (error) => {
            console.warn(`⚠️ Error cargando textura: ${path}`, error);
            texturesLoaded++;
            loadingSystem.resourceLoaded();
            return new THREE.Texture();
        }
    );
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8);
    return texture;
}

// Cargar texturas del terreno
const groundTextures = {
    color: loadTexture(ASSET_PATHS.TEXTURES.GROUND_COLOR),
    normal: loadTexture(ASSET_PATHS.TEXTURES.GROUND_NORMAL),
    roughness: loadTexture(ASSET_PATHS.TEXTURES.GROUND_ROUGHNESS),
    ao: loadTexture(ASSET_PATHS.TEXTURES.GROUND_AO)
};

/** Material del terreno con todas las texturas aplicadas */
const terrainMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x4a4a4a),
    map: groundTextures.color,
    normalMap: groundTextures.normal,
    roughnessMap: groundTextures.roughness,
    aoMap: groundTextures.ao,
    roughness: 1.0,
    metalness: 0.0
});

// Fallback si las texturas no cargan
if (!groundTextures.color.image) {
    terrainMaterial.map = null;
    terrainMaterial.color.set(0x666666);
}

const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
terrain.receiveShadow = true;
scene.add(terrain);

// Marcar terreno como cargado
loadingSystem.resourceLoaded();

// =============================================================================
// SISTEMA DE FÍSICA Y RAYCASTING
// =============================================================================

const raycaster = new THREE.Raycaster();

/**
 * Obtiene la intersección entre un rayo y el terreno
 * @param {THREE.Vector3} origin - Origen del rayo
 * @param {THREE.Vector3} direction - Dirección del rayo
 * @param {number} far - Distancia máxima del rayo
 * @returns {Object|null} Información de la intersección
 */
function getTerrainIntersection(origin, direction, far = 500) {
    raycaster.set(origin, direction);
    raycaster.far = far;
    const hit = raycaster.intersectObject(terrain, false)[0];
    return hit || null;
}

/**
 * Obtiene la altura del terreno en una posición específica
 * @param {number} x - Coordenada X
 * @param {number} z - Coordenada Z
 * @returns {number} Altura del terreno
 */
function getTerrainHeight(x, z) {
    const hit = getTerrainIntersection(
        new THREE.Vector3(x, 100, z), 
        new THREE.Vector3(0, -1, 0)
    );
    return hit ? hit.point.y : 0;
}

/**
 * Limita una posición a los límites del mundo
 * @param {THREE.Vector3} position - Posición a limitar
 * @returns {THREE.Vector3} Posición limitada
 */
function clampToWorldBounds(position) {
    const radius = Math.hypot(position.x, position.z);
    if (radius > WORLD_CONFIG.RADIUS - OBJECT_CONFIG.PLAYER_RADIUS) {
        const angle = Math.atan2(position.z, position.x);
        const maxRadius = WORLD_CONFIG.RADIUS - OBJECT_CONFIG.PLAYER_RADIUS;
        position.x = Math.cos(angle) * maxRadius;
        position.z = Math.sin(angle) * maxRadius;
    }
    return position;
}

// =============================================================================
// SISTEMA DE OBJETOS DECORATIVOS
// =============================================================================

const objectColliders = [];        // Objetos decorativos
const obstacleColliders = [];      // Objetos obstáculo
let objectsLoaded = 0;
const totalObjectsToLoad = 5;

/**
 * Crea un objeto de respaldo cuando falla la carga del modelo
 * @param {number} x - Posición X
 * @param {number} z - Posición Z
 * @param {number} scale - Escala del objeto
 * @param {boolean} isObstacle - Si es un objeto obstáculo
 */
function createFallbackObject(x, z, scale, isObstacle = false) {
    const objectGroup = new THREE.Group();
    
    const bodyGeometry = new THREE.BoxGeometry(1.8 * scale, 0.6 * scale, 4 * scale);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: new THREE.Color().setHSL(Math.random(), 0.8, 0.4) 
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.3 * scale;
    body.castShadow = true;
    
    objectGroup.add(body);
    
    // CORREGIDO: Objeto correctamente posicionado en el terreno
    const terrainY = getTerrainHeight(x, z);
    objectGroup.position.set(x, terrainY, z);
    objectGroup.rotation.y = Math.random() * Math.PI * 2;
    
    scene.add(objectGroup);
    
    const collisionRadius = OBJECT_CONFIG.OBJECT_RADIUS * scale;
    
    if (isObstacle) {
        obstacleColliders.push({ 
            x, z, 
            r: collisionRadius,
            group: objectGroup 
        });
    } else {
        objectColliders.push({ 
            x, z, 
            r: collisionRadius,
            group: objectGroup 
        });
    }
}

/**
 * Añade un objeto 3D a la escena en la posición especificada
 * @param {number} x - Posición X
 * @param {number} z - Posición Z
 * @param {boolean} isObstacle - Si es un objeto obstáculo
 */
function addObject(x, z, isObstacle = false) {
    const modelIndex = Math.floor(Math.random() * OBJECT_MODELS.length);
    const modelInfo = OBJECT_MODELS[modelIndex];
    const loader = new GLTFLoader();
    
    loader.load(modelInfo.path, (gltf) => {
        const object = gltf.scene;
        const scale = modelInfo.scale || 1.0;
        
        // CORREGIDO: Objeto correctamente posicionado en el terreno
        const terrainY = getTerrainHeight(x, z);
        object.scale.set(scale, scale, scale);
        object.position.set(x, terrainY, z);
        object.rotation.y = Math.random() * Math.PI * 2;
        
        object.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        scene.add(object);
        
        const collisionRadius = OBJECT_CONFIG.OBJECT_RADIUS * scale;
        
        if (isObstacle) {
            obstacleColliders.push({ 
                x, z, 
                r: collisionRadius,
                group: object 
            });
        } else {
            objectColliders.push({ 
                x, z, 
                r: collisionRadius,
                group: object 
            });
        }
        
        if (objectsLoaded < totalObjectsToLoad) {
            objectsLoaded++;
            loadingSystem.resourceLoaded();
            console.log(`✅ Modelo de objeto cargado: ${modelInfo.path} (${objectsLoaded}/${totalObjectsToLoad})`);
        }
        
    }, undefined, (error) => {
        console.warn('Error cargando modelo de objeto, usando fallback:', error);
        createFallbackObject(x, z, 1.0, isObstacle);
        
        if (objectsLoaded < totalObjectsToLoad) {
            objectsLoaded++;
            loadingSystem.resourceLoaded();
        }
    });
}

// Generar objetos decorativos en el mundo
for (let i = 0; i < OBJECT_CONFIG.OBJECT_COUNT; i++) {
    let x = (Math.random() - 0.5) * WORLD_CONFIG.SIZE;
    let z = (Math.random() - 0.5) * WORLD_CONFIG.SIZE;
    
    if (Math.hypot(x - player.position.x, z - player.position.z) < 6) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 8 + Math.random() * 20;
        x = player.position.x + Math.cos(angle) * radius;
        z = player.position.z + Math.sin(angle) * radius;
    }
    
    addObject(x, z);
}

// =============================================================================
// SISTEMA DE AUDIO
// =============================================================================

const audioListener = new THREE.AudioListener();
camera.add(audioListener);
const audioLoader = new THREE.AudioLoader();

let coinSoundBuffer = null;
let ambienceSoundBuffer = null;
let finalSongBuffer = null;
let ambienceSound = null;
let finalSong = null;

/**
 * Carga un archivo de audio con manejo de errores
 * @param {string} path - Ruta del archivo de audio
 * @param {Function} onLoad - Callback al cargar
 * @param {Function} onError - Callback en error
 */
function loadAudio(path, onLoad, onError) {
    audioLoader.load(
        path,
        (buffer) => {
            loadingSystem.resourceLoaded();
            onLoad(buffer);
        },
        undefined,
        (error) => {
            console.warn(`⚠️ Error cargando audio: ${path}`, error);
            loadingSystem.resourceLoaded();
            onError(error);
        }
    );
}

// Cargar sonidos del juego
loadAudio(
    ASSET_PATHS.AUDIO.COIN,
    (buffer) => {
        coinSoundBuffer = buffer;
        console.log('✅ Sonido Money.mp3 cargado correctamente');
    },
    () => {
        console.warn('⚠️ Usando sonido de dinero por defecto');
    }
);

loadAudio(
    ASSET_PATHS.AUDIO.AMBIENCE,
    (buffer) => {
        ambienceSoundBuffer = buffer;
        console.log('✅ Audio ambiente cargado correctamente');
    },
    () => {
        console.warn('⚠️ Audio ambiente no disponible');
    }
);

loadAudio(
    ASSET_PATHS.AUDIO.FINAL,
    (buffer) => {
        finalSongBuffer = buffer;
        console.log('✅ Canción final cargada correctamente');
    },
    () => {
        console.warn('⚠️ Canción final no disponible');
    }
);

/**
 * Reproduce el sonido de recolección de dinero
 */
function playMoneySound() {
    if (coinSoundBuffer) {
        try {
            const moneySound = new THREE.Audio(audioListener);
            moneySound.setBuffer(coinSoundBuffer);
            moneySound.setLoop(false);
            moneySound.setVolume(0.7);
            moneySound.play();
            
            setTimeout(() => {
                if (moneySound.isPlaying) {
                    moneySound.stop();
                }
                moneySound.disconnect();
            }, 2000);
        } catch (error) {
            console.warn('Error reproduciendo sonido de dinero:', error);
        }
    }
}

/**
 * Reproduce la canción final al completar el juego
 */
function playFinalSong() {
    if (finalSongBuffer && !finalSong && !gameCompleted) {
        try {
            finalSong = new THREE.Audio(audioListener);
            finalSong.setBuffer(finalSongBuffer);
            finalSong.setLoop(true);
            finalSong.setVolume(0.6);
            finalSong.play();
            showNotification('🎵 ¡Canción final desbloqueada!');
        } catch (error) {
            console.warn('Error reproduciendo canción final:', error);
        }
    }
}

/**
 * Inicia el audio ambiental del juego
 */
function startAmbientAudio() {
    if (ambientEl) {
        try {
            ambientEl.volume = 0.3;
            ambientEl.play().catch((error) => {
                console.warn('No se pudo reproducir audio HTML:', error);
            });
        } catch (error) {
            console.warn('No se pudo usar audio HTML:', error);
        }
    }
    
    if (ambienceSoundBuffer && !ambienceSound) {
        try {
            ambienceSound = new THREE.Audio(audioListener);
            ambienceSound.setBuffer(ambienceSoundBuffer);
            ambienceSound.setLoop(true);
            ambienceSound.setVolume(0.2);
            ambienceSound.play();
        } catch (error) {
            console.warn('Error reproduciendo audio ambiente Three.js:', error);
        }
    }
}

// =============================================================================
// SISTEMA DE SACOS DE DINERO
// =============================================================================

const bags = [];
const bagColliders = [];
let totalMoneyCollected = 0;
let moneyTarget = GAME_CONFIG.TOTAL_MONEY_TARGET;

/**
 * Genera una cantidad aleatoria de dinero para un saco
 * @returns {number} Cantidad de dinero generada
 */
function generateRandomMoney() {
    // ACTUALIZADO: $500-$1500 base con 5% chance de bonus 5x
    const baseAmount = Math.floor(Math.random() * 
        (GAME_CONFIG.MAX_MONEY_PER_BAG - GAME_CONFIG.MIN_MONEY_PER_BAG + 1)) + 
        GAME_CONFIG.MIN_MONEY_PER_BAG;
    
    const hasBonus = Math.random() < GAME_CONFIG.BONUS_CHANCE;
    return hasBonus ? baseAmount * GAME_CONFIG.BONUS_MULTIPLIER : baseAmount;
}

/**
 * Actualiza la interfaz de usuario con la información de dinero
 */
function updateMoneyHUD() {
    const totalElement = document.getElementById('totalPumpkins');
    const collectedElement = document.getElementById('hitPumpkins');
    
    if (totalElement) totalElement.textContent = `$${moneyTarget.toLocaleString()}`;
    if (collectedElement) collectedElement.textContent = `$${totalMoneyCollected.toLocaleString()}`;
    
    // MEJORADO: Mensaje de felicitaciones al completar el juego
    if (totalMoneyCollected >= moneyTarget && totalMoneyCollected > 0 && !gameCompleted) {
        gameCompleted = true;
        showNotification('🎉 ¡FELICIDADES! Has completado el juego y recolectado $50,000. ¡Eres un maestro del dinero!', 8000);
        playFinalSong();
    }
}

/**
 * Sistema que regenera sacos de dinero periódicamente
 */
function startBagRespawnSystem() {
    setInterval(() => {
        if (gameCompleted) return;
        
        const currentBags = bagColliders.length;
        const bagsToRespawn = OBJECT_CONFIG.BAG_COUNT - currentBags;
        
        for (let i = 0; i < bagsToRespawn; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 8 + Math.random() * (WORLD_CONFIG.BAG_AREA - 8);
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            const distanceToPlayer = Math.hypot(x - player.position.x, z - player.position.z);
            if (distanceToPlayer > 5) {
                addMoneyBag(x, z);
            }
        }
    }, GAME_CONFIG.BAG_RESPAWN_RATE * 1000);
}

/**
 * Añade un saco de dinero a la escena en la posición especificada
 * @param {number} x - Posición X
 * @param {number} z - Posición Z
 */
function addMoneyBag(x, z) {
    const loader = new GLTFLoader();
    loader.load('models/money/scene.gltf', (gltf) => {
        const bag = gltf.scene;
        bag.position.set(x, getTerrainHeight(x, z) + 0.2, z);
        bag.scale.set(8, 8, 8);
        
        bag.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        const baseY = bag.position.y;
        bag.userData.animate = (time) => {
            bag.position.y = baseY + Math.sin(time * 1.5 + x * 0.1) * 0.1;
            bag.rotation.y = time * 0.5;
        };
        
        bag.userData.isCollected = false;
        bag.userData.moneyValue = generateRandomMoney();
        scene.add(bag);
        bags.push(bag);
        bagColliders.push({ x, z, r: OBJECT_CONFIG.BAG_RADIUS, index: bags.length - 1 });
    }, undefined, (error) => {
        console.warn('Error cargando modelo de dinero:', error);
    });
}

// Generar sacos de dinero iniciales
for (let i = 0; i < OBJECT_CONFIG.BAG_COUNT; i++) {
    const angle = (i / OBJECT_CONFIG.BAG_COUNT) * Math.PI * 2;
    const radius = 10 + Math.random() * WORLD_CONFIG.BAG_AREA;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    addMoneyBag(x, z);
}

// =============================================================================
// OBJETOS OBSTÁCULO
// =============================================================================

for (let i = 0; i < OBJECT_CONFIG.OBSTACLE_COUNT; i++) {
    const angle = (i / OBJECT_CONFIG.OBSTACLE_COUNT) * Math.PI * 2 + Math.random() * 0.4;
    const radius = 15 + Math.random() * 60;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    addObject(x, z, true);
}

// =============================================================================
// SISTEMA DE PARTÍCULAS
// =============================================================================

const particleSystems = [];

/**
 * Crea un sistema de partículas para efectos visuales al recolectar dinero
 * @param {THREE.Vector3} position - Posición donde spawnear las partículas
 */
function spawnMoneyParticles(position) {
    const PARTICLE_COUNT = 120;
    const geometry = new THREE.BufferGeometry();
    
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const lifetimes = new Float32Array(PARTICLE_COUNT);
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const index = i * 3;
        positions[index] = position.x;
        positions[index + 1] = position.y;
        positions[index + 2] = position.z;
        
        const direction = new THREE.Vector3(
            (Math.random() - 0.5) * 1.5,
            Math.random() * 1.6,
            (Math.random() - 0.5) * 1.5
        );
        const speed = 2.0 + Math.random() * 3.0;
        
        velocities[index] = direction.x * speed;
        velocities[index + 1] = direction.y * speed;
        velocities[index + 2] = direction.z * speed;
        
        const color = new THREE.Color().setHSL(0.33 + Math.random() * 0.1, 0.8, 0.45);
        colors[index] = color.r;
        colors[index + 1] = color.g;
        colors[index + 2] = color.b;
        
        lifetimes[i] = 1.2 + Math.random() * 0.8;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('life', new THREE.BufferAttribute(lifetimes, 1));
    
    const material = new THREE.PointsMaterial({
        size: 0.12,
        vertexColors: true,
        transparent: true,
        opacity: 1.0,
        fog: false,
        depthTest: true,
        blending: THREE.AdditiveBlending
    });
    
    const particleSystem = new THREE.Points(geometry, material);
    particleSystem.userData = { 
        age: 0, 
        geometry: geometry, 
        material: material 
    };
    
    scene.add(particleSystem);
    particleSystems.push(particleSystem);
}

/**
 * Actualiza todos los sistemas de partículas activos
 * @param {number} deltaTime - Tiempo transcurrido desde el último frame
 */
function updateParticleSystems(deltaTime) {
    for (let i = particleSystems.length - 1; i >= 0; i--) {
        const system = particleSystems[i];
        system.userData.age += deltaTime;
        
        const geometry = system.userData.geometry;
        const positions = geometry.getAttribute('position');
        const velocities = geometry.getAttribute('velocity');
        const lifetimes = geometry.getAttribute('life');
        const particleCount = lifetimes.count;
        
        for (let j = 0; j < particleCount; j++) {
            const index = j * 3;
            velocities.array[index + 1] -= 7.5 * deltaTime;
            
            positions.array[index] += velocities.array[index] * deltaTime;
            positions.array[index + 1] += velocities.array[index + 1] * deltaTime;
            positions.array[index + 2] += velocities.array[index + 2] * deltaTime;
        }
        positions.needsUpdate = true;
        
        const LIFETIME = 2.2;
        const alpha = Math.max(0, 1.0 - (system.userData.age / LIFETIME));
        system.userData.material.opacity = alpha;
        
        if (system.userData.age > LIFETIME) {
            scene.remove(system);
            system.geometry.dispose();
            system.material.dispose();
            particleSystems.splice(i, 1);
        }
    }
}

// =============================================================================
// SISTEMA DE CONTROLES
// =============================================================================

let mouseX = 0;
let mouseY = 0;
let isMouseLocked = false;

/**
 * Inicializa los controles de mouse para el modo escritorio
 */
function initMouseControls() {
    const canvas = document.getElementById('scene');
    
    canvas.addEventListener('click', () => {
        if (!isMouseLocked) {
            canvas.requestPointerLock();
        }
    });
    
    document.addEventListener('pointerlockchange', () => {
        isMouseLocked = document.pointerLockElement === canvas;
    });
    
    document.addEventListener('mousemove', (event) => {
        if (isMouseLocked) {
            mouseX -= event.movementX * 0.002;
            mouseY -= event.movementY * 0.002;
            
            mouseY = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, mouseY));
        }
    });
    
    document.addEventListener('keydown', (event) => {
        if (event.code === 'Escape' && isMouseLocked) {
            document.exitPointerLock();
        }
    });
}

/**
 * Actualiza la rotación de la cámara basada en el movimiento del mouse
 */
function updateDesktopCamera() {
    if (isMouseLocked) {
        player.rotation.y = mouseX;
        camera.rotation.x = mouseY;
    }
}

// =============================================================================
// SISTEMA VR
// =============================================================================

const vrButton = VRButton.createButton(renderer);
vrButton.classList.add('vr-button');
document.body.appendChild(vrButton);

const leftController = renderer.xr.getController(0);
const rightController = renderer.xr.getController(1);
scene.add(leftController, rightController);

const controllerModelFactory = new XRControllerModelFactory();
const leftGrip = renderer.xr.getControllerGrip(0);
leftGrip.add(controllerModelFactory.createControllerModel(leftGrip));
scene.add(leftGrip);

const rightGrip = renderer.xr.getControllerGrip(1);
rightGrip.add(controllerModelFactory.createControllerModel(rightGrip));
scene.add(rightGrip);

// Materiales para el sistema de teleportación VR
const arcMaterialValid = new THREE.LineBasicMaterial({ 
    color: 0x0077ff, 
    transparent: true, 
    opacity: 0.95 
});
const arcMaterialInvalid = new THREE.LineBasicMaterial({ 
    color: 0xff5a5a, 
    transparent: true, 
    opacity: 0.95 
});

const arcGeometry = new THREE.BufferGeometry().setFromPoints(
    new Array(OBJECT_CONFIG.ARC_STEPS).fill(0).map(() => new THREE.Vector3())
);
const arcLine = new THREE.Line(arcGeometry, arcMaterialValid);
arcLine.visible = false;
scene.add(arcLine);

const teleportMarker = new THREE.Mesh(
    new THREE.RingGeometry(0.25, 0.30, 32),
    new THREE.MeshBasicMaterial({ 
        color: 0x0077ff, 
        transparent: true, 
        opacity: 0.9, 
        side: THREE.DoubleSide 
    })
);
teleportMarker.rotation.x = -Math.PI / 2;
teleportMarker.visible = false;
scene.add(teleportMarker);

let isTeleportValid = false;
const teleportTarget = new THREE.Vector3();

// Eventos del controlador derecho para teleportación
rightController.addEventListener('selectstart', () => {
    arcLine.visible = true;
    teleportMarker.visible = true;
});

rightController.addEventListener('selectend', () => {
    arcLine.visible = false;
    teleportMarker.visible = false;
    
    if (isTeleportValid) {
        const clampedPosition = clampToWorldBounds(teleportTarget.clone());
        player.position.set(
            clampedPosition.x,
            getTerrainHeight(clampedPosition.x, clampedPosition.z) + 1.6,
            clampedPosition.z
        );
    }
});

// Iniciar audio cuando comience la sesión VR
renderer.xr.addEventListener('sessionstart', async () => {
    startAmbientAudio();
});

// =============================================================================
// LOCOMOCIÓN VR
// =============================================================================

/**
 * Maneja el movimiento del jugador usando los controles VR
 * @param {number} deltaTime - Tiempo transcurrido desde el último frame
 */
function handleVRMovement(deltaTime) {
    const session = renderer.xr.getSession();
    if (!session) return;
    
    for (const inputSource of session.inputSources) {
        if (!inputSource.gamepad) continue;
        
        let stickX = 0;
        let stickY = 0;
        
        if (inputSource.gamepad.axes.length >= 4) {
            stickX = inputSource.gamepad.axes[2] || 0;
            stickY = inputSource.gamepad.axes[3] || 0;
            
            if (Math.abs(stickX) < 0.1 && Math.abs(stickY) < 0.1) {
                stickX = inputSource.gamepad.axes[0] || 0;
                stickY = inputSource.gamepad.axes[1] || 0;
            }
        } else if (inputSource.gamepad.axes.length >= 2) {
            stickX = inputSource.gamepad.axes[0] || 0;
            stickY = inputSource.gamepad.axes[1] || 0;
        }
        
        const DEADZONE = 0.15;
        if (Math.abs(stickX) < DEADZONE) stickX = 0;
        if (Math.abs(stickY) < DEADZONE) stickY = 0;
        
        if (stickX === 0 && stickY === 0) continue;
        
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
        
        let newPosition = player.position.clone();
        newPosition.addScaledVector(forward, -stickY * OBJECT_CONFIG.WALK_SPEED * deltaTime);
        newPosition.addScaledVector(right, stickX * OBJECT_CONFIG.STRAFE_SPEED * deltaTime);
        
        newPosition = clampToWorldBounds(newPosition);
        newPosition.y = getTerrainHeight(newPosition.x, newPosition.z) + 1.6;
        newPosition = resolveCollisions(player.position, newPosition);
        player.position.copy(newPosition);
    }
}

// =============================================================================
// MOVIMIENTO CON TECLADO
// =============================================================================

const keyboardState = {
    KeyW: false,
    KeyA: false,
    KeyS: false,
    KeyD: false,
    ArrowUp: false,
    ArrowLeft: false,
    ArrowDown: false,
    ArrowRight: false
};

/**
 * Maneja el movimiento del jugador usando el teclado
 * @param {number} deltaTime - Tiempo transcurrido desde el último frame
 */
function handleKeyboardMovement(deltaTime) {
    if (renderer.xr.isPresenting) return;
    
    let moveForward = 0;
    let moveRight = 0;
    
    if (keyboardState.KeyW || keyboardState.ArrowUp) moveForward += 1;
    if (keyboardState.KeyS || keyboardState.ArrowDown) moveForward -= 1;
    if (keyboardState.KeyA || keyboardState.ArrowLeft) moveRight -= 1;
    if (keyboardState.KeyD || keyboardState.ArrowRight) moveRight += 1;
    
    if (moveForward === 0 && moveRight === 0) return;
    
    const magnitude = Math.sqrt(moveForward * moveForward + moveRight * moveRight);
    if (magnitude > 0) {
        moveForward /= magnitude;
        moveRight /= magnitude;
    }
    
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    
    let newPosition = player.position.clone();
    newPosition.addScaledVector(forward, moveForward * OBJECT_CONFIG.WALK_SPEED * deltaTime);
    newPosition.addScaledVector(right, moveRight * OBJECT_CONFIG.STRAFE_SPEED * deltaTime);
    
    newPosition = clampToWorldBounds(newPosition);
    newPosition.y = getTerrainHeight(newPosition.x, newPosition.z) + 1.6;
    newPosition = resolveCollisions(player.position, newPosition);
    player.position.copy(newPosition);
}

// Event listeners para el teclado
document.addEventListener('keydown', (event) => {
    if (keyboardState.hasOwnProperty(event.code)) {
        keyboardState[event.code] = true;
        event.preventDefault();
    }
});

document.addEventListener('keyup', (event) => {
    if (keyboardState.hasOwnProperty(event.code)) {
        keyboardState[event.code] = false;
        event.preventDefault();
    }
});

// =============================================================================
// SISTEMA DE TELEPORTACIÓN
// =============================================================================

const arcPointsBuffer = new Float32Array(OBJECT_CONFIG.ARC_STEPS * 3);

/**
 * Verifica la intersección del arco de teleportación con el terreno
 * @param {THREE.Vector3} start - Punto de inicio
 * @param {THREE.Vector3} end - Punto final
 * @returns {Object|null} Información de la intersección
 */
function checkArcTerrainIntersection(start, end) {
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    if (!length) return null;
    
    direction.normalize();
    raycaster.set(start, direction);
    raycaster.far = length + 0.01;
    
    const hit = raycaster.intersectObject(terrain, false)[0];
    if (!hit) return null;
    
    const normal = hit.face?.normal.clone() || new THREE.Vector3(0, 1, 0);
    normal.transformDirection(terrain.matrixWorld);
    
    return { 
        point: hit.point.clone(), 
        faceNormal: normal.normalize() 
    };
}

/**
 * Actualiza el arco de teleportación visual y lógica
 */
function updateTeleportArc() {
    if (!arcLine.visible) return;
    isTeleportValid = false;
    
    const origin = new THREE.Vector3().setFromMatrixPosition(rightController.matrixWorld);
    const direction = new THREE.Vector3(0, 0, -1)
        .applyQuaternion(rightController.quaternion)
        .normalize();
    
    const arcPoints = [];
    let hitPoint = null;
    const initialVelocity = direction.clone().multiplyScalar(OBJECT_CONFIG.ARC_SPEED);
    const gravity = new THREE.Vector3(0, -OBJECT_CONFIG.ARC_GRAVITY, 0);
    
    let currentPosition = origin.clone();
    let currentVelocity = initialVelocity.clone();
    
    for (let i = 0; i < OBJECT_CONFIG.ARC_STEPS; i++) {
        arcPoints.push(currentPosition.clone());
        currentVelocity.addScaledVector(gravity, 1 / 60);
        const nextPosition = currentPosition.clone().addScaledVector(currentVelocity, 1 / 60);
        
        const segmentHit = checkArcTerrainIntersection(currentPosition, nextPosition);
        if (segmentHit) {
            hitPoint = segmentHit;
            break;
        }
        currentPosition.copy(nextPosition);
    }
    
    for (let i = 0; i < OBJECT_CONFIG.ARC_STEPS; i++) {
        const point = arcPoints[Math.min(i, arcPoints.length - 1)];
        arcPointsBuffer[i * 3] = point.x;
        arcPointsBuffer[i * 3 + 1] = point.y;
        arcPointsBuffer[i * 3 + 2] = point.z;
    }
    
    arcGeometry.setAttribute('position', new THREE.BufferAttribute(arcPointsBuffer, 3));
    arcGeometry.attributes.position.needsUpdate = true;
    
    if (hitPoint) {
        const slopeAngle = THREE.MathUtils.radToDeg(
            Math.acos(hitPoint.faceNormal.dot(new THREE.Vector3(0, 1, 0)))
        );
        const isInsideBounds = hitPoint.point.distanceTo(
            new THREE.Vector3(0, hitPoint.point.y, 0)
        ) <= WORLD_CONFIG.RADIUS;
        
        isTeleportValid = (slopeAngle <= OBJECT_CONFIG.MAX_SLOPE_ANGLE) && isInsideBounds;
        
        arcLine.material = isTeleportValid ? arcMaterialValid : arcMaterialInvalid;
        teleportMarker.material.color.set(
            isTeleportValid ? 0x0077ff : 0xff5a5a
        );
        
        const clampedTarget = clampToWorldBounds(hitPoint.point.clone());
        teleportMarker.position.set(
            clampedTarget.x,
            getTerrainHeight(clampedTarget.x, clampedTarget.z) + 0.02,
            clampedTarget.z
        );
        teleportTarget.copy(clampedTarget);
    }
}

// =============================================================================
// SISTEMA DE COLISIONES
// =============================================================================

/**
 * Verifica colisión entre dos círculos en el plano XZ
 * @param {number} x1 - Centro X del primer círculo
 * @param {number} z1 - Centro Z del primer círculo
 * @param {number} r1 - Radio del primer círculo
 * @param {number} x2 - Centro X del segundo círculo
 * @param {number} z2 - Centro Z del segundo círculo
 * @param {number} r2 - Radio del segundo círculo
 * @returns {boolean} True si hay colisión
 */
function checkCircleCollision(x1, z1, r1, x2, z2, r2) {
    const dx = x1 - x2;
    const dz = z1 - z2;
    const distance = Math.sqrt(dx * dx + dz * dz);
    return distance < (r1 + r2);
}

/**
 * Resuelve todas las colisiones del jugador con objetos del mundo
 * @param {THREE.Vector3} currentPos - Posición actual del jugador
 * @param {THREE.Vector3} nextPos - Posición deseada del jugador
 * @returns {THREE.Vector3} Posición corregida después de colisiones
 */
function resolveCollisions(currentPos, nextPos) {
    const collisionMargin = 0.1;
    
    // Colisión con objetos decorativos
    for (const object of objectColliders) {
        if (checkCircleCollision(
            nextPos.x, nextPos.z, OBJECT_CONFIG.PLAYER_RADIUS,
            object.x, object.z, object.r
        )) {
            const dx = nextPos.x - object.x;
            const dz = nextPos.z - object.z;
            const distance = Math.hypot(dx, dz);
            const minDistance = OBJECT_CONFIG.PLAYER_RADIUS + object.r + collisionMargin;
            
            if (distance < minDistance && distance > 0) {
                const pushForce = (minDistance - distance) / distance;
                nextPos.x += dx * pushForce;
                nextPos.z += dz * pushForce;
            }
        }
    }
    
    // Colisión con objetos obstáculo
    for (const obstacle of obstacleColliders) {
        if (checkCircleCollision(
            nextPos.x, nextPos.z, OBJECT_CONFIG.PLAYER_RADIUS,
            obstacle.x, obstacle.z, obstacle.r
        )) {
            const dx = nextPos.x - obstacle.x;
            const dz = nextPos.z - obstacle.z;
            const distance = Math.hypot(dx, dz);
            const minDistance = OBJECT_CONFIG.PLAYER_RADIUS + obstacle.r + collisionMargin;
            
            if (distance < minDistance && distance > 0) {
                const pushForce = (minDistance - distance) / distance;
                nextPos.x += dx * pushForce;
                nextPos.z += dz * pushForce;
            }
        }
    }
    
    // Colisión y recolección de sacos de dinero
    for (let i = bagColliders.length - 1; i >= 0; i--) {
        const bag = bagColliders[i];
        
        if (checkCircleCollision(
            nextPos.x, nextPos.z, OBJECT_CONFIG.PLAYER_RADIUS,
            bag.x, bag.z, bag.r
        )) {
            const dx = nextPos.x - bag.x;
            const dz = nextPos.z - bag.z;
            const distance = Math.hypot(dx, dz);
            const minDistance = OBJECT_CONFIG.PLAYER_RADIUS + bag.r + collisionMargin;
            
            // Empujar al jugador fuera del saco
            if (distance < minDistance && distance > 0) {
                const pushForce = (minDistance - distance) / distance;
                nextPos.x += dx * pushForce;
                nextPos.z += dz * pushForce;
            }
            
            // Recolectar saco
            const bagObject = bags[bag.index];
            if (bagObject && !bagObject.userData.isCollected && !gameCompleted) {
                bagObject.userData.isCollected = true;
                
                const moneyAmount = bagObject.userData.moneyValue;
                totalMoneyCollected += moneyAmount;
                
                playMoneySound();
                spawnMoneyParticles(bagObject.position.clone());
                
                if (moneyAmount >= 2500) {
                    showNotification(`🎊 ¡BONUS! +$${moneyAmount.toLocaleString()}`, 4000);
                } else {
                    showNotification(`💰 +$${moneyAmount.toLocaleString()}`);
                }
                
                updateMoneyHUD();
                
                setTimeout(() => {
                    if (bagObject.parent) {
                        scene.remove(bagObject);
                        bagColliders.splice(i, 1);
                    }
                }, 300);
            }
        }
    }
    
    return clampToWorldBounds(nextPos);
}

// =============================================================================
// LOOP PRINCIPAL DE ANIMACIÓN
// =============================================================================

const gameClock = new THREE.Clock();

/**
 * Bucle principal de animación que actualiza todo el juego
 */
renderer.setAnimationLoop(() => {
    const deltaTime = Math.min(gameClock.getDelta(), 0.05);
    const currentTime = performance.now() * 0.001;
    
    // Actualizar cámara según modo
    updateDesktopCamera();
    
    if (renderer.xr.isPresenting) {
        handleVRMovement(deltaTime);
        updateTeleportArc();
    } else {
        handleKeyboardMovement(deltaTime);
    }
    
    const playerPosition = player.position;
    skyMesh.position.copy(playerPosition);
    
    const sunOffset = new THREE.Vector3(50, 100, -50);
    sunLight.position.copy(playerPosition).add(sunOffset);
    
    for (const bag of bags) bag.userData.animate?.(currentTime);
    for (const child of scene.children) child.userData?.animate?.(currentTime);
    
    updateParticleSystems(deltaTime);
    
    renderer.clear();
    bgCam.projectionMatrix.copy(camera.projectionMatrix);
    bgCam.matrixWorld.copy(camera.matrixWorld);
    bgCam.matrixWorldInverse.copy(camera.matrixWorldInverse);
    renderer.render(bgScene, bgCam);
    renderer.render(scene, camera);
});

// =============================================================================
// INICIALIZACIÓN FINAL
// =============================================================================

// Inicializar cuando la página esté lista
window.addEventListener('load', () => {
    console.log('🚀 Juego iniciado');
    
    // Inicializar sistemas
    initMouseControls();
    startBagRespawnSystem();
    updateMoneyHUD();
    
    // Iniciar audio ambiente después de un breve delay
    setTimeout(() => {
        startAmbientAudio();
    }, 2000);
});