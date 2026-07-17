export const tokens = {
  spacing: {
    pad: 24, // maps to --pad clamp
    gutter: 16, // maps to --gutter clamp
  },
  radius: {
    pill: 999,
    card: 24, // 18-36px range average
  },
  shadows: {
    glass: {
      // Box shadow equivalent: 0 30px 60px -30px rgba(11,11,12,.25)
      shadowColor: '#0B0B0C',
      shadowOffset: { width: 0, height: 30 },
      shadowOpacity: 0.25,
      shadowRadius: 60,
      elevation: 10,
    }
  },
  colors: {
    background: '#F6F2EE',
    surface: '#EFE8E1',
    ink: '#0B0B0C',
    inkLight: '#1A1A1D',
    muted: '#6B6660',
    line: 'rgba(11, 11, 12, 0.08)',
    accent: '#8E5D34',
    accentSoft: '#D9B79A',
    accentGlow: 'rgba(176, 122, 74, 0.22)',
    glass: 'rgba(255, 255, 255, 0.42)',
    glass2: 'rgba(255, 255, 255, 0.62)',
    glassEdge: 'rgba(255, 255, 255, 0.70)',
  }
};
