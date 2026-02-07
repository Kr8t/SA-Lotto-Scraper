
export enum LottoGame {
  DAILY_LOTTO = 'Daily Lotto',
  DAILY_LOTTO_PLUS = 'Daily Lotto Plus',
  LOTTO = 'Lotto',
  LOTTO_PLUS_1 = 'Lotto Plus 1',
  LOTTO_PLUS_2 = 'Lotto Plus 2',
  POWERBALL = 'PowerBall',
  POWERBALL_PLUS = 'PowerBall Plus'
}

export interface DrawResult {
  id: string;
  game: LottoGame;
  date: string;
  numbers: number[];
  bonusBall?: number;
  powerBall?: number;
  jackpotAmount?: number;
}

export interface LotteryDataResponse {
  draws: DrawResult[];
}
