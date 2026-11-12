export type Profile = {
  id: string;
  pseudo: string;
  equipe: string;
  couleur: string;
  avatar: string | null;
  is_superadmin?: boolean;
};

export type League = {
  id: string;
  nom: string;
  code_invitation: string;
  admin_id: string;
  created_at: string;
};

export type Candidate = {
  id: string;
  nom: string;
  parti: string;
  couleur: string;
  actif: boolean;
  ordre: number;
  photo: string | null;
};

export type Poll = {
  id: number;
  date: string;
  source: string;
  url: string | null;
  valeurs: Record<string, number>;
};

export type FinalPick = {
  user_id: string;
  league_id: string;
  q1: string | null;
  q2: string | null;
  gagnant: string | null;
  score_gagnant: number | null;
  scores: Record<string, number>;
  classement: string[];
  capitaine: string | null;
  surprise: string | null;
  participation: number | null;
  updated_at: string;
};

export type Results = {
  scores: Record<string, number>;
  participation: number | null;
  gagnant: string | null;
  score_gagnant: number | null;
  participation_t2?: number | null;
  updated_at?: string;
};

export type Parrainages = {
  date: string;
  valeurs: Record<string, number>;
};

export type PariReponse = {
  user_id: string;
  pari_id: string;
  reponse: string[];
  updated_at: string;
  /** Heure du cadenas posé par le joueur (null = pas verrouillé, figé à 50 % à la clôture). */
  verrouille_le: string | null;
};

export type Quiz = {
  id: string;
  titre: string;
  ouverture: string;
  cloture: string;
};

export type QuizQuestion = {
  id: string;
  quiz_id: string;
  ordre: number;
  citation: string;
  contexte: string;
  date_citation: string | null;
  choix: string[];
};

export type QuizReponse = {
  question_id: string;
  user_id: string;
  choix: string;
  created_at: string;
};

export type Reaction = {
  id: number;
  league_id: string;
  contexte: string;
  cible_user: string;
  user_id: string;
  emoji: string;
};
