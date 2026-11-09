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
  updated_at?: string;
};

export type Matchday = {
  id: string;
  league_id: string;
  titre: string;
  ouverture: string;
  cloture: string;
};

export type QuestionType = "choix" | "nombre";

export type QuestionOptions = {
  choix?: string[];
  tolerance?: number;
  unite?: string;
};

export type Question = {
  id: string;
  matchday_id: string;
  intitule: string;
  type: QuestionType;
  options: QuestionOptions;
  points: number;
  cloture: string | null;
  bonne_reponse: string[] | number | null;
  ordre: number;
};

export type Answer = {
  question_id: string;
  user_id: string;
  reponse: string | number;
  updated_at: string;
};

export type Reaction = {
  id: number;
  league_id: string;
  contexte: string;
  cible_user: string;
  user_id: string;
  emoji: string;
};
