
export class ExperienceService {
  constructor(private readonly progression: {
    addXp(amount: number): { levelsGained: number };
  }) {}

  grantKillXp(amount: number): { levelsGained: number } {
    return this.progression.addXp(amount);
  }
}
