// Common US course titles, shared by the templates and by district profiles that have no catalog of their own.
import type { CatalogCourse } from '../core/types.ts';

const cat = (title: string, requirement: string, concepts: string[], levels?: number[], credits = 1): CatalogCourse => ({ title, requirement, concepts, credits, levels });

/** Common US course titles, used until a district uploads its own catalog. */
export const COMMON_CATALOG: CatalogCourse[] = [
  cat('English 9', 'ela', ['ela.english', 'ela.literature'], [9]),
  cat('English 10', 'ela', ['ela.english', 'ela.literature'], [10]),
  cat('English 11', 'ela', ['ela.english', 'ela.literature'], [11]),
  cat('English 12', 'ela', ['ela.english', 'ela.literature'], [12]),
  cat('English Language Development (elective)', 'elective', ['ela.efl']),
  cat('Algebra I', 'math', ['math.algebra1', 'math.general'], [9]),
  cat('Geometry', 'math', ['math.geometry', 'math.general'], [10]),
  cat('Algebra II', 'math', ['math.algebra2', 'math.general'], [11]),
  cat('Pre-Calculus', 'math', ['math.precalc', 'math.general', 'math.advanced'], [12]),
  cat('Calculus', 'math', ['math.calculus']),
  cat('Statistics', 'math', ['math.statistics']),
  cat('Biology', 'science', ['sci.biology']),
  cat('Chemistry', 'science', ['sci.chemistry']),
  cat('Physics', 'science', ['sci.physics']),
  cat('Physical Science', 'science', ['sci.physical', 'sci.integrated'], [9]),
  cat('Earth and Space Science', 'science', ['sci.earth']),
  cat('Environmental Science', 'science', ['sci.environmental']),
  cat('Integrated Science', 'science', ['sci.integrated']),
  cat('World History', 'social', ['ss.history.world', 'ss.history.national']),
  cat('World Geography', 'social', ['ss.geography']),
  cat('Government / Civics', 'social', ['ss.civics'], undefined, 0.5),
  cat('Economics', 'social', ['ss.economics'], undefined, 0.5),
  cat('Social Studies elective', 'social', ['ss.social', 'ss.philosophy', 'ss.sociology', 'ss.psychology']),
  cat('World Language (home language)', 'world_language', ['wl.native']),
  cat('World Language', 'world_language', ['wl.other']),
  cat('Art', 'arts', ['arts.visual']),
  cat('Music', 'arts', ['arts.music']),
  cat('Theatre / Dance', 'arts', ['arts.performing']),
  cat('Physical Education', 'pe', ['pe']),
  cat('Health', 'health', ['health'], undefined, 0.5),
  cat('Computer Science', 'cte', ['cs']),
  cat('Business / Accounting', 'cte', ['cte.business']),
  cat('Agricultural Science', 'cte', ['cte.agriculture']),
  cat('Technology / Engineering', 'cte', ['cte.technology']),
  cat('Family and Consumer Sciences', 'cte', ['cte.home']),
  cat('General elective', 'elective', ['elective.other', 'ss.religion']),
];
