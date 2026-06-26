let isActive = false;
let stepCount = 0;
let lastStepTime = 0;
let lastAccelerationMagnitude = 0;
let stepCooldown = 350;
let motionSupported = false;
let gyroAvailable = false;
let orientationAvailable = false;
let db = null;
let auth = null;
let userId = null;
let currentUser = null;
let useLocalFallback = false;

const toggleBtn = document.getElementById('toggleBtn');
const authBtn = document.getElementById('authBtn');
const statusEl = document.getElementById('status');
const stepCountEl = document.getElementById('stepCount');
const accXEl = document.getElementById('accX');
const accYEl = document.getElementById('accY');
const accZEl = document.getElementById('accZ');
const gyroXEl = document.getElementById('gyroX');
const gyroYEl = document.getElementById('gyroY');
const gyroZEl = document.getElementById('gyroZ');
const gyroStatusEl = document.getElementById('gyroStatus');
const syncStatusEl = document.getElementById('syncStatus');

function updateStatus(text) {
  if (statusEl) {
    statusEl.textContent = text;
  }
}

function updateGyroStatus(text) {
  if (gyroStatusEl) {
    gyroStatusEl.textContent = text;
  }
}

function updateSyncStatus(text) {
  if (syncStatusEl) {
    syncStatusEl.textContent = text;
  }
}

function initFirebase() {
  if (window.location.protocol === 'file:') {
    updateSyncStatus('Ouvre l’app via un serveur local (http://localhost:8000 ou http://IP:8000)');
    return;
  }

  if (typeof window.firebase === 'undefined') {
    updateSyncStatus('Mode local actif');
    window.setTimeout(() => {
      if (!auth) {
        updateSyncStatus('Mode local actif');
      }
    }, 1000);
    return;
  }

  const firebaseConfig = {
    apiKey: 'AIzaSyC4fgeIfoIcf-jo6tJfLdQfAIN7QIdzzis',
    authDomain: 'compteurdepas.firebaseapp.com',
    projectId: 'compteurdepas',
    storageBucket: 'compteurdepas.firebasestorage.app',
    messagingSenderId: '904521867297',
    appId: '1:904521867297:web:d3fd5626bdafa4d8bb0360'
  };

  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    db = firebase.firestore();
    auth = firebase.auth();
    updateSyncStatus('Connexion Firebase…');

    auth.onAuthStateChanged((user) => {
      currentUser = user;
      if (user) {
        userId = user.uid;
        updateAuthButton();
        updateSyncStatus('Utilisateur connecté');
        loadUserSteps();
      } else {
        userId = null;
        updateAuthButton();
        updateSyncStatus('Connecte-toi avec Google');
      }
    });
  } catch (error) {
    console.error('Erreur d\'initialisation Firebase :', error);
    updateSyncStatus('Mode local actif');
  }
}

function updateAuthButton() {
  if (!authBtn) return;

  if (currentUser) {
    authBtn.textContent = `Déconnexion (${currentUser.displayName || currentUser.email || 'compte'})`;
  } else {
    authBtn.textContent = 'Se connecter avec Google';
  }
}

function saveStepsLocally() {
  if (!userId) {
    localStorage.setItem('stepsFallback', String(stepCount));
  } else {
    localStorage.setItem(`stepsFallback-${userId}`, String(stepCount));
  }
}

function loadStepsLocally() {
  const key = userId ? `stepsFallback-${userId}` : 'stepsFallback';
  const stored = localStorage.getItem(key);
  if (stored !== null) {
    stepCount = Number(stored) || 0;
    if (stepCountEl) {
      stepCountEl.textContent = stepCount;
    }
  }
}

async function loadUserSteps() {
  if (!userId) {
    loadStepsLocally();
    return;
  }

  if (!db) {
    loadStepsLocally();
    useLocalFallback = true;
    updateSyncStatus('Sauvegarde locale active');
    return;
  }

  try {
    const snapshot = await db.collection('users').doc(userId).get();
    if (snapshot.exists) {
      stepCount = Number(snapshot.data().steps) || 0;
      if (stepCountEl) {
        stepCountEl.textContent = stepCount;
      }
      saveStepsLocally();
      updateSyncStatus('Compteur chargé');
      useLocalFallback = false;
    } else {
      stepCount = 0;
      if (stepCountEl) {
        stepCountEl.textContent = stepCount;
      }
      saveStepsLocally();
      updateSyncStatus('Compteur prêt');
      useLocalFallback = false;
    }
  } catch (error) {
    console.error('Erreur de lecture Firebase :', error);
    loadStepsLocally();
    useLocalFallback = true;
    updateSyncStatus('Sauvegarde locale active');
  }
}

async function saveStepCount() {
  saveStepsLocally();

  if (!db || !userId) {
    if (!useLocalFallback) {
      updateSyncStatus('Sauvegarde locale active');
    }
    return;
  }

  try {
    await db.collection('users').doc(userId).set({
      steps: stepCount,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    updateSyncStatus('Pas enregistrés');
    useLocalFallback = false;
  } catch (error) {
    console.error('Erreur d\'enregistrement Firebase :', error);
    useLocalFallback = true;
    updateSyncStatus('Sauvegarde locale active');
  }
}

function getMagnitude(x, y, z) {
  return Math.sqrt(x * x + y * y + z * z);
}

function updateMetrics(acceleration, rotation) {
  const accX = Number(acceleration.x) || 0;
  const accY = Number(acceleration.y) || 0;
  const accZ = Number(acceleration.z) || 0;
  const gyroX = Number(rotation.x) || 0;
  const gyroY = Number(rotation.y) || 0;
  const gyroZ = Number(rotation.z) || 0;

  const accMagnitude = getMagnitude(accX, accY, accZ);
  const gyroMagnitude = getMagnitude(gyroX, gyroY, gyroZ);

  if (accXEl) accXEl.textContent = accX.toFixed(2);
  if (accYEl) accYEl.textContent = accY.toFixed(2);
  if (accZEl) accZEl.textContent = accZ.toFixed(2);

  if (gyroMagnitude > 0.0001) {
    gyroAvailable = true;
    updateGyroStatus('rotation-rate OK');
    if (gyroXEl) gyroXEl.textContent = gyroX.toFixed(2);
    if (gyroYEl) gyroYEl.textContent = gyroY.toFixed(2);
    if (gyroZEl) gyroZEl.textContent = gyroZ.toFixed(2);
  } else if (orientationAvailable) {
    updateGyroStatus('orientation OK');
    if (gyroXEl) gyroXEl.textContent = gyroX.toFixed(2);
    if (gyroYEl) gyroYEl.textContent = gyroY.toFixed(2);
    if (gyroZEl) gyroZEl.textContent = gyroZ.toFixed(2);
  } else {
    updateGyroStatus('indisponible');
    if (gyroXEl) gyroXEl.textContent = '0';
    if (gyroYEl) gyroYEl.textContent = '0';
    if (gyroZEl) gyroZEl.textContent = '0';
  }

  if (!isActive) return;

  const now = Date.now();
  const timeSinceLastStep = now - lastStepTime;
  const hasStrongPeak = accMagnitude > 12 && lastAccelerationMagnitude <= 12;
  const hasLowRotation = gyroMagnitude < 10;
  const isCooldownOk = timeSinceLastStep > stepCooldown;

  if (hasStrongPeak && hasLowRotation && isCooldownOk) {
    stepCount += 1;
    lastStepTime = now;
    if (stepCountEl) {
      stepCountEl.textContent = stepCount;
    }
    updateStatus('Pas détecté');
    saveStepCount();
  } else {
    updateStatus('À l’écoute');
  }

  lastAccelerationMagnitude = accMagnitude;
}

function handleMotion(event) {
  motionSupported = true;
  const acc = event.accelerationIncludingGravity || event.acceleration || { x: 0, y: 0, z: 0 };
  const rotation = event.rotationRate || { x: 0, y: 0, z: 0 };
  updateMetrics(acc, rotation);
}

function handleOrientation(event) {
  orientationAvailable = true;
  const gyroX = Number(event.beta) || 0;
  const gyroY = Number(event.gamma) || 0;
  const gyroZ = Number(event.alpha) || 0;
  updateGyroStatus('orientation OK');
  if (gyroXEl) gyroXEl.textContent = gyroX.toFixed(2);
  if (gyroYEl) gyroYEl.textContent = gyroY.toFixed(2);
  if (gyroZEl) gyroZEl.textContent = gyroZ.toFixed(2);
}

function startListening() {
  if (typeof window.DeviceMotionEvent === 'undefined' && typeof window.DeviceOrientationEvent === 'undefined') {
    updateStatus('Capteur non pris en charge');
    updateGyroStatus('indisponible');
    return;
  }

  const requestPermission = window.DeviceMotionEvent && typeof window.DeviceMotionEvent.requestPermission === 'function';

  const enable = () => {
    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', handleMotion, { passive: true });
    }
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation, { passive: true });
    }
    isActive = true;
    if (toggleBtn) toggleBtn.textContent = 'Arrêter';
    updateStatus('Détection en cours');
  };

  if (requestPermission) {
    window.DeviceMotionEvent.requestPermission()
      .then((response) => {
        if (response === 'granted') {
          enable();
        } else {
          updateStatus('Permission refusée');
        }
      })
      .catch(() => {
        updateStatus('Erreur de permission');
      });
  } else {
    enable();
  }
}

function stopListening() {
  window.removeEventListener('devicemotion', handleMotion);
  window.removeEventListener('deviceorientation', handleOrientation);
  isActive = false;
  if (toggleBtn) toggleBtn.textContent = 'Démarrer';
  updateStatus('Arrêté');
  saveStepCount();
}

async function signInWithGoogle() {
  if (!auth) {
    updateSyncStatus('Connexion Google indisponible actuellement');
    return;
  }

  if (window.location.protocol === 'file:') {
    updateSyncStatus('Ouvre l’app via http://localhost:8000 ou une adresse IP');
    return;
  }

  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    await auth.signInWithRedirect(provider);
    updateSyncStatus('Redirection Google…');
  } catch (error) {
    console.error('Erreur de connexion Google :', error);
    updateSyncStatus('Connexion Google annulée ou impossible');
  }
}

async function signOut() {
  if (!auth) return;

  try {
    await auth.signOut();
    updateSyncStatus('Déconnecté');
  } catch (error) {
    console.error('Erreur de déconnexion :', error);
  }
}

toggleBtn.addEventListener('click', () => {
  if (isActive) {
    stopListening();
  } else {
    startListening();
  }
});

authBtn.addEventListener('click', async () => {
  if (currentUser) {
    await signOut();
  } else {
    await signInWithGoogle();
  }
});

window.addEventListener('load', () => {
  initFirebase();

  if (typeof window.DeviceMotionEvent !== 'undefined') {
    updateGyroStatus('capteur motion présent');
  } else if (typeof window.DeviceOrientationEvent !== 'undefined') {
    updateGyroStatus('orientation présente');
  } else {
    updateGyroStatus('indisponible');
  }

  if (typeof window.DeviceMotionEvent !== 'undefined' || typeof window.DeviceOrientationEvent !== 'undefined') {
    updateStatus('Prêt');
  }
});
