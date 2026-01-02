
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PieceColor = 'w' | 'b';

export interface Piece {
  type: PieceType;
  color: PieceColor;
}

export type Square = string; // e.g., 'a1', 'h8'

export interface Move {
  from: Square;
  to: Square;
  promotion?: PieceType;
  san?: string;
}

export interface GameState {
  fen: string;
  history: string[];
  isGameOver: boolean;
  winner: PieceColor | 'draw' | null;
  turn: PieceColor;
}

export interface AnalysisResponse {
  evaluation: string;
  suggestion: string;
  reasoning: string;
}
