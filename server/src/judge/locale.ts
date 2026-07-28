import type { JudgeInput, Locale } from '@sdq/shared';

export const DEFAULT_JUDGE_LOCALE: Locale = 'pt-BR';

export function resolveJudgeLocale(input: Pick<JudgeInput, 'locale'> | undefined): Locale {
  return input?.locale === 'en' || input?.locale === 'pt-BR' ? input.locale : DEFAULT_JUDGE_LOCALE;
}

export function localeInstruction(locale: Locale): string {
  if (locale === 'en') {
    return 'Write all narrative fields (rationale, strengths, issues, improvements, explanations) in English. Keep component type names in English.';
  }
  return 'Escreva todos os campos narrativos (rationale, strengths, issues, improvements, explanations) em português do Brasil (pt-BR). Mantenha nomes de componentes técnicos em inglês.';
}
