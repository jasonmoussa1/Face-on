
export type AspectRatio = "3:4" | "9:16";

export interface FaceImage {
  id: string;
  data: string; // base64
  name?: string;
}

export interface GenerationAsset {
  id: string;
  imageUrl: string;
  videoUrl?: string | null;
  aspectRatio: AspectRatio;
  timestamp: number;
}

export interface GenerationState {
  isGenerating: boolean;
  isAnimating: boolean;
  error: string | null;
  resultUrl: string | null;
  videoUrl: string | null;
}
