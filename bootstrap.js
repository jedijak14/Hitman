import { createSilentCoast3D } from './game3d.js';

const canvas = document.querySelector('#worldCanvas');
const notice = document.querySelector('#renderNotice');

function showNotice(message) {
  if (!notice) return;
  notice.textContent = message;
  notice.hidden = false;
  notice.classList.add('is-visible');
}

try {
  const world = createSilentCoast3D(canvas);
  window.SilentCoast3D = world;
  world.loadModels().then((result) => {
    if (!result.loaded) showNotice('The CC0 character model could not be loaded. 3D stand-ins are active; serve this folder over HTTP to load all assets.');
  });
} catch (error) {
  console.error('WebGL scene could not start.', error);
  showNotice('WebGL could not start in this browser. Enable hardware acceleration or use a browser with WebGL 2 support to play the 3D build.');
}

await import('./game.js');
