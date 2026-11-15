// US course ladders and the topics that define each course. Foreign syllabuses are described in the same
// topic vocabulary (see `sequences` in systems.ts), so evalua can say which US course a year of study covers.
// Topic lists follow the course pathway in Appendix A of the Common Core State Standards for Mathematics,
// which the Kentucky Academic Standards for Mathematics (2019) also organise by course.
import type { SourceInfo, UsCourse } from '../core/types.ts';

const CCSS: SourceInfo = {
  title: 'Common Core State Standards for Mathematics, Appendix A: Designing High School Mathematics Courses, traditional pathway (California Department of Education copy)',
  url: 'https://www.cde.ca.gov/BE/cc/cd/documents/may2012item12catt2.pdf',
};

const t = (id: string, label: string) => ({ id, label });

export const usCourses: UsCourse[] = [
  {
    id: 'us.algebra1', title: 'Algebra I', concept: 'math.algebra1', ladder: 'math', rung: 1, usualLevel: 9, source: CCSS,
    topics: [
      t('lin-eq', 'linear equations and inequalities'),
      t('lin-fn', 'linear functions and their graphs'),
      t('systems', 'systems of linear equations'),
      t('exp-rad', 'exponents and radicals'),
      t('poly-factor', 'polynomial arithmetic and factoring'),
      t('quad-solve', 'solving quadratic equations'),
      t('exp-fn', 'exponential functions'),
      t('stats-1', 'describing data (one and two variables)'),
    ],
  },
  {
    id: 'us.geometry', title: 'Geometry', concept: 'math.geometry', ladder: 'math', rung: 2, usualLevel: 10, source: CCSS,
    topics: [
      t('transform', 'transformations and congruence'),
      t('similarity', 'similarity'),
      t('geo-proof', 'proofs about lines, angles, triangles and polygons'),
      t('right-trig', 'Pythagoras and right-triangle trigonometry'),
      t('circles', 'circle theorems (arcs, chords, angles)'),
      t('coord-geo', 'coordinate geometry of lines'),
      t('area-vol', 'perimeter, area, surface area and volume'),
      t('construct', 'constructions and loci'),
    ],
  },
  {
    id: 'us.algebra2', title: 'Algebra II', concept: 'math.algebra2', ladder: 'math', rung: 3, usualLevel: 11, source: CCSS,
    topics: [
      t('poly-fn', 'polynomial functions'),
      t('rational', 'rational expressions and equations'),
      t('exp-log', 'exponential and logarithmic functions'),
      t('seq-series', 'sequences and series'),
      t('trig-fn', 'trigonometric functions and the unit circle'),
      t('complex', 'complex numbers'),
      t('variation', 'variation and modelling with functions'),
      t('prob-inf', 'probability and statistical inference'),
    ],
  },
  {
    // CCSS defines no Precalculus course; these are its (+) standards, as most precalculus courses use them.
    id: 'us.precalc', title: 'Pre-Calculus', concept: 'math.precalc', ladder: 'math', rung: 4, usualLevel: 12,
    source: { title: 'Common Core State Standards for Mathematics, (+) standards for advanced courses', url: 'https://corestandards.org/wp-content/uploads/2023/09/Math_Standards1.pdf' },
    topics: [
      t('fn-analysis', 'functions, inverses and composition'),
      t('trig-id', 'trigonometric identities and equations'),
      t('vectors', 'vectors'),
      t('matrices', 'matrices'),
      t('conics', 'conic sections'),
      t('binomial', 'permutations, combinations and the binomial theorem'),
      t('polar', 'polar coordinates and parametric equations'),
      t('limits-intro', 'introduction to limits'),
    ],
  },
  {
    id: 'us.calculus', title: 'Calculus', concept: 'math.calculus', ladder: 'math', rung: 5, usualLevel: 12,
    source: { title: 'Kentucky Academic Standards for Mathematics (2019), Calculus (+) clusters', url: 'https://www.education.ky.gov/curriculum/standards/kyacadstand/Documents/Kentucky_Academic_Standards_Mathematics.pdf' },
    topics: [
      t('limits', 'limits and continuity'),
      t('derivative', 'derivatives'),
      t('deriv-app', 'applications of derivatives'),
      t('integral', 'integrals'),
      t('integ-app', 'applications of integration'),
      t('diff-eq', 'differential equations'),
    ],
  },
];

export const LADDER_LABEL: Record<string, string> = { math: 'Mathematics' };

/** Concepts whose courses sit on a ladder, and the rung a course with that concept names directly. */
export const LADDER_OF: Record<string, { ladder: string; course?: string }> = {
  'math.general': { ladder: 'math' },
  'math.advanced': { ladder: 'math' },
  'math.algebra1': { ladder: 'math', course: 'us.algebra1' },
  'math.geometry': { ladder: 'math', course: 'us.geometry' },
  'math.algebra2': { ladder: 'math', course: 'us.algebra2' },
  'math.precalc': { ladder: 'math', course: 'us.precalc' },
  'math.calculus': { ladder: 'math', course: 'us.calculus' },
};

export const topicLabel = (id: string) => usCourses.flatMap((c) => c.topics).find((x) => x.id === id)?.label ?? id;
