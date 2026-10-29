import { ThirdPersonWorld } from './game3d.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const MOVEMENT_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'ShiftLeft', 'ShiftRight']);

export class HighlineOperation {
  constructor() {
    this.canvas = document.querySelector('#worldCanvas');
    this.shell = document.querySelector('#gameShell');
    this.loadingScreen = document.querySelector('#loadingScreen');
    this.loadingLabel = document.querySelector('#loadingLabel');
    this.introPanel = document.querySelector('#introPanel');
    this.manualPanel = document.querySelector('#manualPanel');
    this.pausePanel = document.querySelector('#pausePanel');
    this.resultPanel = document.querySelector('#resultPanel');
    this.topHud = document.querySelector('#topHud');
    this.missionCard = document.querySelector('#missionCard');
    this.alertChip = document.querySelector('#alertChip');
    this.weaponHud = document.querySelector('#weaponHud');
    this.controlsHint = document.querySelector('#controlsHint');
    this.hudFooter = document.querySelector('#hudFooter');
    this.reticle = document.querySelector('#reticle');
    this.scopeRange = document.querySelector('#scopeRange');
    this.interactionPrompt = document.querySelector('#interactionPrompt');
    this.interactionLabel = document.querySelector('#interactionLabel');
    this.toast = document.querySelector('#toast');
    this.toastText = document.querySelector('#toastText');
    this.errorPanel = document.querySelector('#errorPanel');
    this.keys = new Set();
    this.pointerButtons = new Set();
    this.mode = 'loading';
    this.aiming = false;
    this.crouched = false;
    this.sprinting = false;
    this.player = { x: -0.72, y: 10.82, z: 7.35 };
    this.heading = Math.PI;
    this.velocityX = 0;
    this.velocityZ = 0;
    this.targetDown = false;
    this.alerted = false;
    this.ammo = 5;
    this.reloading = false;
    this.reloadTime = 0;
    this.lastShotAt = -10;
    this.misses = 0;
    this.toastTimeout = 0;
    this.lastFrame = 0;
    this.elapsed = 0;
    this.boundFrame = (time) => this.frame(time);
    this.world = null;
  }

  async initialize() {
    try {
      this.world = new ThirdPersonWorld(this.canvas);
      window.__highlineGame = this;
      window.__highlineWorld = this.world;
      this.bindUI();
      this.mode = 'briefing';
      const result = await this.world.initialize((label) => {
        if (this.loadingLabel) this.loadingLabel.textContent = label;
      });
      this.loadingScreen.classList.add('is-hidden');
      this.introPanel.hidden = false;
      this.topHud.hidden = false;
      if (result.fallback) this.showToast('SOME LIVE MODEL DATA IS UNAVAILABLE. STAND-INS LOADED.');
      this.updateHud();
      requestAnimationFrame(this.boundFrame);
      setTimeout(() => { this.loadingScreen.hidden = true; }, 620);
    } catch (error) {
      console.error('Could not initialize the operation.', error);
      this.showFatalError(error);
    }
  }

  bindUI() {
    document.querySelector('#deployButton').addEventListener('click', () => this.deploy());
    document.querySelector('#manualButton').addEventListener('click', () => { this.manualPanel.hidden = false; });
    document.querySelector('#manualClose').addEventListener('click', () => { this.manualPanel.hidden = true; });
    document.querySelector('#resumeButton').addEventListener('click', () => this.resume());
    document.querySelector('#restartButton').addEventListener('click', () => this.restart());
    document.querySelector('#resultRestart').addEventListener('click', () => this.restart());

    window.addEventListener('keydown', (event) => this.keyDown(event));
    window.addEventListener('keyup', (event) => this.keyUp(event));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.pointerButtons.clear();
      this.setAiming(false);
    });
    this.canvas.addEventListener('pointerdown', (event) => this.pointerDown(event));
    window.addEventListener('pointerup', (event) => this.pointerUp(event));
    this.canvas.addEventListener('pointermove', (event) => this.pointerMove(event));
    this.canvas.addEventListener('wheel', (event) => this.wheel(event), { passive: false });
    this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  deploy() {
    if (this.mode !== 'briefing') return;
    this.mode = 'playing';
    this.introPanel.hidden = true;
    this.manualPanel.hidden = true;
    this.showGameplayHud(true);
    this.canvas.focus({ preventScroll: true });
    this.showToast('OVERLOOK SECURE. TARGET IS LIVE.');
  }

  showGameplayHud(visible) {
    this.missionCard.hidden = !visible;
    this.alertChip.hidden = !visible;
    this.weaponHud.hidden = !visible;
    this.controlsHint.hidden = !visible;
    this.hudFooter.hidden = !visible;
    this.reticle.hidden = !visible;
  }

  keyDown(event) {
    const code = event.code;
    if (MOVEMENT_KEYS.has(code) || ['Space', 'Tab', 'Escape'].includes(code)) event.preventDefault();
    if (event.repeat) {
      if (MOVEMENT_KEYS.has(code)) this.keys.add(code);
      return;
    }
    if (code === 'Escape') {
      if (this.mode === 'playing') this.pause();
      else if (this.mode === 'paused') this.resume();
      else if (this.manualPanel && !this.manualPanel.hidden) this.manualPanel.hidden = true;
      return;
    }
    if (this.mode === 'briefing' && (code === 'Enter' || code === 'Space')) {
      this.deploy();
      return;
    }
    if (this.mode !== 'playing') return;
    this.keys.add(code);
    if (code === 'KeyC') {
      this.crouched = !this.crouched;
      if (this.crouched) this.keys.delete('ShiftLeft'), this.keys.delete('ShiftRight');
      this.showToast(this.crouched ? 'LOW PROFILE' : 'STANDING');
    } else if (code === 'KeyR') {
      this.startReload();
    } else if (code === 'KeyE') {
      this.interact();
    }
  }

  keyUp(event) {
    this.keys.delete(event.code);
  }

  pointerDown(event) {
    if (event.button === 2) {
      event.preventDefault();
      this.pointerButtons.add(2);
      if (this.mode === 'playing') this.setAiming(true);
      this.canvas.setPointerCapture?.(event.pointerId);
      return;
    }
    if (event.button === 1) {
      event.preventDefault();
      this.pointerButtons.add(1);
      this.canvas.setPointerCapture?.(event.pointerId);
      return;
    }
    if (event.button === 0 && this.mode === 'playing') {
      if (this.aiming) this.fire();
      else if (event.pointerType !== 'touch') this.showToast('HOLD RIGHT MOUSE TO AIM');
      else this.touchFire();
    }
  }

  pointerUp(event) {
    if (event.button === 2) {
      this.pointerButtons.delete(2);
      this.setAiming(false);
    }
    if (event.button === 1) this.pointerButtons.delete(1);
  }

  pointerMove(event) {
    if (this.mode !== 'playing') return;
    if (this.pointerButtons.has(2) || this.pointerButtons.has(1)) {
      const dx = event.movementX || 0;
      const dy = event.movementY || 0;
      this.world.orbitCamera(dx, dy);
      if (this.aiming) this.heading = Math.PI - this.world.cameraYaw;
      this.shell.classList.toggle('is-aiming', this.aiming);
    }
  }

  wheel(event) {
    if (!this.world) return;
    event.preventDefault();
    this.world.zoomCamera(event.deltaY);
  }

  setAiming(value) {
    this.aiming = Boolean(value) && this.mode === 'playing';
    this.world?.setAiming(this.aiming);
    this.shell.classList.toggle('is-aiming', this.aiming);
    if (this.aiming) this.heading = Math.PI - this.world.cameraYaw;
  }

  touchFire() {
    this.setAiming(true);
    this.fire();
    setTimeout(() => this.setAiming(false), 180);
  }

  fire() {
    if (this.mode !== 'playing' || this.reloading) return;
    if (performance.now() / 1000 - this.lastShotAt < 0.7) return;
    if (this.ammo <= 0) {
      this.showToast('MAGAZINE EMPTY · PRESS R TO RELOAD');
      return;
    }
    this.lastShotAt = performance.now() / 1000;
    this.ammo -= 1;
    const result = this.world.fire();
    if (result === 'hit') {
      this.targetDown = true;
      this.alerted = true;
      this.showToast('TARGET DOWN · MOVE TO THE SERVICE STAIRS');
      this.updateObjective();
    } else if (result === 'miss') {
      this.misses += 1;
      this.alerted = true;
      this.showToast(this.misses === 1 ? 'SHOT MISSED · SECURITY IS LISTENING' : 'SECURITY IS CLOSING ON THE ROOF');
    }
    this.updateHud();
  }

  startReload() {
    if (this.reloading || this.ammo >= 5 || this.mode !== 'playing') return;
    this.reloading = true;
    this.reloadTime = 1.65;
    this.showToast('RELOADING');
  }

  interact() {
    if (!this.world?.isNearExit()) {
      this.showToast('STAIRWELL IS AT THE BACK OF THE ROOF');
      return;
    }
    if (!this.targetDown) {
      this.showToast('THE PRIMARY TARGET IS STILL ACTIVE');
      return;
    }
    this.completeMission();
  }

  completeMission() {
    this.mode = 'complete';
    this.setAiming(false);
    this.resultPanel.hidden = false;
    document.querySelector('#resultKicker').textContent = 'CONTRACT COMPLETE';
    document.querySelector('#resultTitle').textContent = 'CLEAN EXIT.';
    document.querySelector('#resultCopy').textContent = `The event director is down. You left the roof with ${this.ammo} round${this.ammo === 1 ? '' : 's'} still in the magazine.`;
    this.showGameplayHud(false);
  }

  pause() {
    if (this.mode !== 'playing') return;
    this.mode = 'paused';
    this.setAiming(false);
    this.pausePanel.hidden = false;
    this.keys.clear();
  }

  resume() {
    if (this.mode !== 'paused') return;
    this.mode = 'playing';
    this.pausePanel.hidden = true;
    this.canvas.focus({ preventScroll: true });
  }

  restart() {
    this.pausePanel.hidden = true;
    this.resultPanel.hidden = true;
    this.manualPanel.hidden = true;
    this.introPanel.hidden = true;
    this.showGameplayHud(true);
    this.mode = 'playing';
    this.player = { x: -0.72, y: 10.82, z: 7.35 };
    this.world.cameraYaw = 0.045;
    this.heading = Math.PI - this.world.cameraYaw;
    this.velocityX = 0;
    this.velocityZ = 0;
    this.targetDown = false;
    this.alerted = false;
    this.ammo = 5;
    this.reloading = false;
    this.reloadTime = 0;
    this.misses = 0;
    this.crouched = false;
    this.keys.clear();
    this.world.targetDown = false;
    this.world.targetDownTimer = 0;
    this.world.target?.root.rotation.set(0, 0, 0);
    this.world.targetStartX = 0.15;
    this.world.target?.root.position.set(0.15, 3.43, -29.25);
    this.world.cameraPitch = 0.19;
    this.world.cameraDistance = 4.55;
    this.world.zoomFov = 29;
    this.world.cameraPosition.set(0, 14, 13);
    this.setAiming(false);
    this.updateObjective();
    this.updateHud();
    this.showToast('NEW RUN · OVERLOOK SECURE');
  }

  updateMovement(dt) {
    const horizontal = (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) - (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0);
    const vertical = (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) - (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0);
    const moving = horizontal !== 0 || vertical !== 0;
    this.sprinting = moving && !this.crouched && (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'));
    const yaw = this.world.cameraYaw;
    const forwardX = Math.sin(yaw), forwardZ = -Math.cos(yaw);
    const rightX = Math.cos(yaw), rightZ = Math.sin(yaw);
    let dx = forwardX * vertical + rightX * horizontal;
    let dz = forwardZ * vertical + rightZ * horizontal;
    const magnitude = Math.hypot(dx, dz);
    if (magnitude > 0) { dx /= magnitude; dz /= magnitude; }
    const speed = this.crouched ? 1.45 : this.sprinting ? 4.35 : 2.75;
    const stepX = dx * speed * dt;
    const stepZ = dz * speed * dt;
    let nextX = clamp(this.player.x + stepX, -5.95, 5.95);
    let nextZ = clamp(this.player.z + stepZ, 3.0, 12.75);
    if (this.collides(nextX, this.player.z)) nextX = this.player.x;
    if (this.collides(this.player.x, nextZ)) nextZ = this.player.z;
    this.player.x = nextX;
    this.player.z = nextZ;
    this.velocityX = moving ? dx * speed : 0;
    this.velocityZ = moving ? dz * speed : 0;
    if (this.aiming) {
      this.heading = Math.PI - this.world.cameraYaw;
    } else if (moving) {
      this.heading = Math.atan2(dx, dz);
    }
  }

  collides(x, z) {
    // Roof HVAC and utility crate collision volumes; movement never passes through them.
    const hvac = x > -6.8 && x < -4.05 && z > 10.0 && z < 12.8;
    const utility = x > 4.72 && x < 6.7 && z > 9.75 && z < 11.9;
    const rearPlanters = (Math.hypot(x + 6.2, z - 13.0) < 1.1) || (Math.hypot(x - 6.2, z - 13.0) < 1.1);
    return hvac || utility || rearPlanters;
  }

  updateHud() {
    if (!this.world) return;
    document.querySelector('#ammoValue').textContent = String(this.ammo).padStart(2, '0');
    document.querySelector('#targetDot').classList.toggle('is-complete', this.targetDown);
    this.alertChip.classList.toggle('is-alert', this.alerted);
    document.querySelector('#alertLabel').textContent = this.alerted ? 'SECURITY RESPONSE' : 'VISIBILITY';
    document.querySelector('#alertState').textContent = this.alerted ? 'ON ALERT' : 'UNSEEN';
    document.querySelector('#footerState').textContent = this.targetDown ? 'TARGET DOWN · SERVICE EXIT OPEN' : this.alerted ? 'GUNFIRE REPORTED · MOVE FAST' : 'ROOFTOP ACCESS · CLEAR';
    this.scopeRange.textContent = `RANGE ${String(this.world.targetRange()).padStart(3, '0')} M`;
    this.updateObjective();
  }

  updateObjective() {
    const title = document.querySelector('#objectiveTitle');
    const detail = document.querySelector('#objectiveDetail');
    const kicker = document.querySelector('#objectiveKicker');
    if (!title || !detail || !kicker) return;
    if (this.targetDown) {
      kicker.textContent = 'EXFILTRATION';
      title.textContent = 'REACH THE SERVICE EXIT';
      detail.textContent = 'Use the green stairwell marker at the back of the roof.';
    } else if (this.alerted) {
      kicker.textContent = 'SECURITY RESPONSE';
      title.textContent = 'TAKE THE SHOT';
      detail.textContent = 'The balcony guards heard the report. Keep the optic on Marcus Ward.';
    } else {
      kicker.textContent = 'PRIMARY OBJECTIVE';
      title.textContent = 'CONFIRM THE TARGET';
      detail.textContent = 'Track the event director on the pit-lane balcony.';
    }
    const near = this.world.isNearExit();
    this.interactionPrompt.hidden = !(near && this.mode === 'playing');
    if (near) this.interactionLabel.textContent = this.targetDown ? 'USE SERVICE STAIRWELL' : 'EXIT LOCKED · TARGET ACTIVE';
  }

  showToast(message) {
    this.toastText.textContent = message;
    this.toast.hidden = false;
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => { this.toast.hidden = true; }, 2400);
  }

  showFatalError(error) {
    this.loadingScreen.classList.add('is-hidden');
    this.errorPanel.hidden = false;
    const message = error?.message || 'Unknown rendering error';
    this.errorPanel.textContent = `The operation could not start. ${message}. Try a current browser with WebGL enabled.`;
  }

  frame(now) {
    if (!this.world) return;
    const dt = this.lastFrame ? clamp((now - this.lastFrame) / 1000, 0, 0.05) : 1 / 60;
    this.lastFrame = now;
    if (this.mode === 'playing') {
      this.elapsed += dt;
      this.updateMovement(dt);
      if (this.reloading) {
        this.reloadTime -= dt;
        if (this.reloadTime <= 0) {
          this.reloading = false;
          this.ammo = 5;
          this.showToast('RIFLE READY');
        }
      }
      if (this.world.isNearExit() && this.targetDown && this.interactionPrompt.hidden) {
        this.interactionPrompt.hidden = false;
        this.interactionLabel.textContent = 'USE SERVICE STAIRWELL';
      } else if (!this.world.isNearExit() && !this.interactionPrompt.hidden) {
        this.interactionPrompt.hidden = true;
      }
    }
    const state = {
      player: this.player,
      heading: this.heading,
      velocityX: this.velocityX,
      velocityZ: this.velocityZ,
      sprinting: this.sprinting,
      crouched: this.crouched,
      aiming: this.aiming,
      cameraYaw: this.world.cameraYaw,
      cameraPitch: this.world.cameraPitch
    };
    const simDt = this.mode === 'paused' || this.mode === 'complete' ? 0 : dt;
    this.world.update(state, simDt);
    this.world.render();
    if (this.mode === 'playing' && this.elapsed % 0.18 < dt) this.updateHud();
    requestAnimationFrame(this.boundFrame);
  }
}
