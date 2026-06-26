let isActive = false;
let stepCount = 0;
let lastStepTime = 0;
let lastAccelerationMagnitude = 0;
let stepCooldown = 350;
let motionSupported = false;
let gyroAvailable = false;
let orientationAvailable = false;

const toggleBtn = document.getElementById('toggleBtn');
const statusEl = document.getElementById('status');
const stepCountEl = document.getElementById('stepCount');
const accXEl = document.getElementById('accX');
const accYEl = document.getElementById('accY');
const accZEl = document.getElementById('accZ');
const gyroXEl = document.getElementById('gyroX');
const gyroYEl = document.getElementById('gyroY');
const gyroZEl = document.getElementById('gyroZ');
const gyroStatusEl = document.getElementById('gyroStatus');

function updateStatus(text) {
  statusEl.textContent = text;
}

function updateGyroStatus(text) {
  gyroStatusEl.textContent = text;
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

  accXEl.textContent = accX.toFixed(2);
  accYEl.textContent = accY.toFixed(2);
  accZEl.textContent = accZ.toFixed(2);

  if (gyroMagnitude > 0.0001) {
    gyroAvailable = true;
    updateGyroStatus('rotation-rate OK');
    gyroXEl.textContent = gyroX.toFixed(2);
    gyroYEl.textContent = gyroY.toFixed(2);
    gyroZEl.textContent = gyroZ.toFixed(2);
  } else if (orientationAvailable) {
    updateGyroStatus('orientation OK');
    gyroXEl.textContent = gyroX.toFixed(2);
    gyroYEl.textContent = gyroY.toFixed(2);
    gyroZEl.textContent = gyroZ.toFixed(2);
  } else {
    updateGyroStatus('indisponible');
    gyroXEl.textContent = '0';
    gyroYEl.textContent = '0';
    gyroZEl.textContent = '0';
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
    stepCountEl.textContent = stepCount;
    updateStatus('Pas détecté');
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
  gyroXEl.textContent = gyroX.toFixed(2);
  gyroYEl.textContent = gyroY.toFixed(2);
  gyroZEl.textContent = gyroZ.toFixed(2);
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
    toggleBtn.textContent = 'Arrêter';
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
  toggleBtn.textContent = 'Démarrer';
  updateStatus('Arrêté');
}

toggleBtn.addEventListener('click', () => {
  if (isActive) {
    stopListening();
  } else {
    startListening();
  }
});

window.addEventListener('load', () => {
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
