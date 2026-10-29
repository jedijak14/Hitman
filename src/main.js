import { HighlineOperation } from './game.js';

const canvas = document.querySelector('#worldCanvas');
const errorPanel = document.querySelector('#errorPanel');

try {
  if (!canvas || !('WebGL2RenderingContext' in window)) {
    throw new Error('WebGL 2 is not available in this browser');
  }
  const game = new HighlineOperation();
  await game.initialize();
} catch (error) {
  console.error('Highline failed to boot.', error);
  if (errorPanel) {
    errorPanel.hidden = false;
    errorPanel.textContent = `The operation could not start. ${error?.message || 'Unknown rendering error'}. Try a current browser with WebGL enabled.`;
  }
}
