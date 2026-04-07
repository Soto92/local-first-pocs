export const TILE_SIZE = 16;
export const SCALE = 3;
export const CHAR_FRAME_W = 16;
export const CHAR_FRAME_H = 32;
export const CHAR_COLS = 7;

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};
