export type QualityPreset = 'low' | 'medium' | 'high';

export interface QualitySettings {
  preset: QualityPreset;
  pixelRatioCap: number;
  shadowMapSize: number;
  bloomStrength: number;
  ssaoEnabled: boolean;
  smaaEnabled: boolean;
  lodBias: number;
}

export function detectQuality(): QualityPreset {
  const q = new URLSearchParams(location.search).get('quality');
  if (q === 'low' || q === 'medium' || q === 'high') return q;
  const cores = navigator.hardwareConcurrency || 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  if (cores <= 4 || mem <= 4) return 'low';
  if (cores >= 8 && mem >= 8) return 'high';
  return 'medium';
}

export function settingsFor(preset: QualityPreset): QualitySettings {
  switch (preset) {
    case 'low':
      return {
        preset,
        pixelRatioCap: 1,
        shadowMapSize: 512,
        bloomStrength: 0.35,
        ssaoEnabled: true,
        smaaEnabled: true,
        lodBias: 1,
      };
    case 'high':
      return {
        preset,
        pixelRatioCap: 2,
        shadowMapSize: 2048,
        bloomStrength: 0.7,
        ssaoEnabled: true,
        smaaEnabled: true,
        lodBias: 0,
      };
    default:
      return {
        preset: 'medium',
        pixelRatioCap: 1.5,
        shadowMapSize: 1536,
        bloomStrength: 0.5,
        ssaoEnabled: true,
        smaaEnabled: true,
        lodBias: 0.5,
      };
  }
}
