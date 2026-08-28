/**
 * Health Hub Africa - Mobile Clinical-Premium Design Tokens
 * Source: docs/MOBILE-APP-DESIGN-PROMPT.md & docs/MOBILE-APP-IMPLEMENTATION-PLAN.md
 */

export const Colors = {
  light: {
    // Brand Tokens
    primary: '#137333',
    primaryDark: '#0E4A30',
    primaryLight: '#EBF5EC',
    gold: '#B59410',

    // Emergency (Reserved strictly for Emergency & DispatchCare)
    emergency: '#C0392B',
    emergencyLight: '#FDECEA',

    // Neutral Surfaces & Text
    background: '#F4F6F5',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    text: '#1A1A1A',
    textMuted: '#6B6B6B',
    textFaint: '#A0A0A0',
    border: '#EBEFEF',
    muted: '#EBEFEF',

    // Navigation & Tint
    tint: '#137333',
    tabIconDefault: '#8A9A8A',
    tabIconSelected: '#137333',

    // Semantic Status Tokens (Vitals, Pills, Badges)
    status: {
      success: {
        text: '#006022',
        background: '#EAF5E2',
        border: '#6DC43F',
        solid: '#6DC43F',
      },
      warning: {
        text: '#92610A',
        background: '#FFF4E0',
        border: '#E8930A',
        solid: '#E8930A',
      },
      error: {
        text: '#C0392B',
        background: '#FDECEA',
        border: '#C0392B',
        solid: '#C0392B',
      },
      emergency: {
        text: '#C0392B',
        background: '#FDECEA',
        border: '#C0392B',
        solid: '#C0392B',
      },
      info: {
        text: '#1565C0',
        background: '#E3F2FD',
        border: '#64B5F6',
        solid: '#1565C0',
      },
    },
  },
  dark: {
    // Brand Tokens
    primary: '#137333',
    primaryDark: '#0E4A30',
    primaryLight: '#1E3A1E',
    gold: '#B59410',

    // Emergency
    emergency: '#C0392B',
    emergencyLight: '#2A1010',

    // Neutral Surfaces & Text
    background: '#111811',
    surface: '#1A251A',
    card: '#1A251A',
    text: '#D0E8D0',
    textMuted: '#8A9A8A',
    textFaint: '#556655',
    border: '#253525',
    muted: '#253525',

    // Navigation & Tint
    tint: '#8AE659',
    tabIconDefault: '#556655',
    tabIconSelected: '#8AE659',

    // Semantic Status Tokens
    status: {
      success: {
        text: '#8AE659',
        background: '#1E3A1E',
        border: '#6DC43F',
        solid: '#8AE659',
      },
      warning: {
        text: '#F5B041',
        background: '#2A2010',
        border: '#E8930A',
        solid: '#F5B041',
      },
      error: {
        text: '#F5B041',
        background: '#2A1010',
        border: '#C0392B',
        solid: '#C0392B',
      },
      emergency: {
        text: '#FF6B6B',
        background: '#2A1010',
        border: '#C0392B',
        solid: '#C0392B',
      },
      info: {
        text: '#64B5F6',
        background: '#102030',
        border: '#1565C0',
        solid: '#64B5F6',
      },
    },
  },
};

export default Colors;
