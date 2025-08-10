export interface ColorScheme {
  light: string;
  dark: string;
  highlight?: {
    selected?: string;
    lastMove?: string;
    check?: string;
    legalMove?: string;
    capture?: string;
  };
}

export const DEFAULT_COLORS: ColorScheme = {
  light: '#f0d9b5',
  dark: '#b58863',
  highlight: {
    selected: 'rgba(255, 255, 0, 0.4)',
    lastMove: 'rgba(255, 255, 0, 0.2)',
    check: 'rgba(255, 0, 0, 0.5)',
    legalMove: 'rgba(130, 151, 105, 0.8)',
    capture: 'rgba(130, 151, 105, 0.8)'
  }
};

export const WOOD_BORDER_COLOR = '#8b4513';
export const BOARD_GRADIENT = 'linear-gradient(135deg, #ddd 0%, #bbb 100%)';
export const COORDINATE_COLOR = '#666';
export const DIALOG_BUTTON_COLOR = '#739552';

export const getHighlightStyle = (type: string, colors: ColorScheme): { backgroundColor?: string; background?: string; innerHTML?: string } => {
  switch (type) {
    case 'selected':
      return { 
        backgroundColor: colors.highlight?.selected || DEFAULT_COLORS.highlight!.selected 
      };
    case 'lastMove':
      return { 
        backgroundColor: colors.highlight?.lastMove || DEFAULT_COLORS.highlight!.lastMove 
      };
    case 'check':
      return { 
        background: `radial-gradient(circle, ${colors.highlight?.check || DEFAULT_COLORS.highlight!.check}, rgba(255, 0, 0, 0.2))` 
      };
    case 'legalMove':
      return { 
        innerHTML: `<div style="width: 30%; height: 30%; background: ${colors.highlight?.legalMove || DEFAULT_COLORS.highlight!.legalMove}; border-radius: 50%; position: absolute; top: 35%; left: 35%;"></div>` 
      };
    case 'capture':
      return { 
        background: `radial-gradient(circle at center, rgba(0,0,0,0) 65%, ${colors.highlight?.capture || DEFAULT_COLORS.highlight!.capture} 65%, ${colors.highlight?.capture || DEFAULT_COLORS.highlight!.capture} 85%, rgba(0,0,0,0) 85%)` 
      };
    default:
      return {};
  }
};