export type LessonLanguage = "id" | "en";

const GREETINGS: Record<LessonLanguage, string> = {
  id: "Halo! Ayo belajar mengetik.",
  en: "Hi! Let's learn to type.",
};

export function greeting(language: LessonLanguage): string {
  return GREETINGS[language];
}
