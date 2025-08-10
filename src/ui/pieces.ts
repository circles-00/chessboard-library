import { Piece } from '../core/types';

export const getPieceSVG = (piece: Piece, size: number = 45): string => {
  const color = piece.color === 'white' ? '#f9f9f9' : '#3c3c3c';
  const stroke = piece.color === 'white' ? '#2c2c2c' : '#1a1a1a';
  const strokeWidth = 0.8;
  
  const svgStart = `<svg width="${size}" height="${size}" viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">`;
  const svgEnd = `</svg>`;
  
  switch (piece.type) {
    case 'king':
      return svgStart + `
        <g fill="${color}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22.5,11.63V6M20,8h5M22.5,25s4.5-7.5,3-10.5c0,0-1-2.5-3-2.5s-3,2.5-3,2.5C18,17.5,22.5,25,22.5,25"/>
          <path d="M11.5,37c5.5,3.5,15.5,3.5,21,0v-7s9-4.5,6-10.5c-4-6.5-13.5-3.5-16,4V27c-2.5-6.5-12-10.5-16-4-3,6,5,10.5,5,10.5V37z"/>
          <path d="M20,8h5" stroke-width="1"/>
          <path d="M32,29.5s8.5-4,6.03-9.65C34.15,14,25,18,22.5,24.5l0.01,2.1-0.01-2.1C20,18,9.906,14,6.997,19.85c-2.497,5.65,4.853,9,4.853,9" fill="none" stroke="${stroke}"/>
          <path d="M11.5,30c5.5-3,15.5-3,21,0M11.5,33.5c5.5-3,15.5-3,21,0M11.5,37c5.5-3,15.5-3,21,0" fill="none" stroke="${stroke}"/>
        </g>
      ` + svgEnd;
      
    case 'queen':
      return svgStart + `
        <g fill="${color}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8,12a2,2 0 1,1 -4,0 2,2 0 1,1 4,0zM24.5,7.5a2,2 0 1,1 -4,0 2,2 0 1,1 4,0zM41,12a2,2 0 1,1 -4,0 2,2 0 1,1 4,0zM16,8.5a2,2 0 1,1 -4,0 2,2 0 1,1 4,0zM33,9a2,2 0 1,1 -4,0 2,2 0 1,1 4,0z"/>
          <path d="M9,26c8.5-1.5,21-1.5,27,0l2.5-12.5L31,25l-.3-14.1-5.2,13.6-3-14.5-3,14.5-5.2-13.6L14,25L6.5,13.5L9,26z" stroke-linecap="butt"/>
          <path d="M9,26c0,2,1.5,2,2.5,4,1,1.5,1,1,0.5,3.5-1.5,1-1.5,2.5-1.5,2.5-1.5,1.5,0.5,2.5,0.5,2.5,6.5,1,16.5,1,23,0,0,0,1.5-1,0-2.5,0,0,0.5-1.5-1-2.5-0.5-2.5-0.5-2,0.5-3.5,1-2,2.5-2,2.5-4-8.5-1.5-18.5-1.5-27,0z" stroke-linecap="butt"/>
          <path d="M11,38.5a35,35 1 0,0 23,0" fill="none" stroke="${stroke}" stroke-linecap="butt"/>
          <path d="M11,29a35,35 1 0,1 23,0M12.5,31.5h20M11.5,34.5a35,35 1 0,0 22,0M10.5,37.5a35,35 1 0,0 24,0" fill="none" stroke="${stroke}"/>
        </g>
      ` + svgEnd;
      
    case 'rook':
      return svgStart + `
        <g fill="${color}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9,39h27v-3H9v3zM12.5,32l1.5-2.5h17l1.5,2.5h-20zM12,36v-4h21v4H12z" stroke-linecap="butt"/>
          <path d="M14,29.5v-13h17v13H14z" stroke-linecap="butt" stroke-linejoin="miter"/>
          <path d="M14,16.5L11,14h23l-3,2.5H14zM11,14V9h4v2h5V9h5v2h5V9h4v5H11z" stroke-linecap="butt"/>
          <path d="M12,35.5h21M13,31.5h19M14,29.5h17M14,16.5h17M11,14h23" fill="none" stroke="${stroke}" stroke-width="1" stroke-linejoin="miter"/>
        </g>
      ` + svgEnd;
      
    case 'bishop':
      return svgStart + `
        <g fill="${color}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9,36c3.39,-0.97,10.11,0.43,13.5,-2c3.39,2.43,10.11,1.03,13.5,2c0,0,1.65,0.54,3,2c-0.68,0.97,-1.65,0.99,-3,0.5c-3.39,-0.97,-10.11,0.46,-13.5,-1c-3.39,1.46,-10.11,0.03,-13.5,1c-1.35,0.49,-2.32,0.47,-3,-0.5C7.35,36.54,9,36,9,36z"/>
          <path d="M15,32c2.5,2.5,12.5,2.5,15,0c0.5-1.5,0-2,0-2c0-2.5-2.5-4-2.5-4c5.5-1.5,6-11.5-5-15.5c-11,4-10.5,14-5,15.5c0,0,-2.5,1.5-2.5,4c0,0,-0.5,0.5,0,2z"/>
          <path d="M25,8a2.5,2.5 0 1,1 -5,0 2.5,2.5 0 1,1 5,0z"/>
          <path d="M17.5,26h10M15,30h15m-7.5-14.5v5M20,18h5" fill="none" stroke="${stroke}" stroke-linejoin="miter"/>
        </g>
      ` + svgEnd;
      
    case 'knight':
      return svgStart + `
        <g fill="${color}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22,10c10.5,1,16.5,8,16,29H15c0-9,10-6.5,8-21"/>
          <path d="M24,18c.38,2.91-5.55,7.37-8,9-3,2-2.82,4.34-5,4-1.042,-.94,1.41-3.04,0-3-1,0,0.19,1.23-1,2-1,0-4.003,1-4-4,0-2,6-12,6-12s1.89-1.9,2-3.5c-.73-.994-.5-2-.5-3,1-1,3,2.5,3,2.5h2s.78-1.992,2.5-3c1,0,1,3,1,3"/>
          <path d="M9.5,25.5a0.5,0.5 0 1,1 -1,0 0.5,0.5 0 1,1 1,0z" fill="${stroke}"/>
          <path d="M15,15.5a0.5,1.5 0 1,1 -1,0 0.5,1.5 0 1,1 1,0z" fill="${stroke}" transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)"/>
          <path d="M24.55,10.4l-.45,1.45.5.15c3.15,1,5.65,2.49,7.9,6.75S35.75,29.06,35.25,39l-.05.5h2.25l.05-.5c.5-10.5-.88-16.85-3.25-21.34-2.37-4.49-5.79-6.64-9.19-7.16l-.51-.1z" fill="${stroke}"/>
        </g>
      ` + svgEnd;
      
    case 'pawn':
      return svgStart + `
        <g fill="${color}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22.5,9c-2.21,0-4,1.79-4,4c0,0.89,0.29,1.71,0.78,2.38C17.33,16.5,16,18.59,16,21c0,2.03,0.94,3.84,2.41,5.03-3,1.06-7.41,5.55-7.41,13.47h23c0-7.92-4.41-12.41-7.41-13.47C27.06,24.84,28,23.03,28,21c0-2.41-1.33-4.5-3.28-5.62C25.21,14.71,25.5,13.89,25.5,13C25.5,10.79,24.71,9,22.5,9z"/>
        </g>
      ` + svgEnd;
      
    default:
      return '';
  }
};

export const createPieceElement = (piece: Piece, size: number = 45): HTMLElement => {
  const container = document.createElement('div');
  container.innerHTML = getPieceSVG(piece, size);
  container.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    display: flex;
    align-items: center;
    justify-content: center;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
  `;
  return container;
};