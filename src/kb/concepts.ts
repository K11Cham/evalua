// Canonical subject concepts: the pivot between any international course name and a US district's catalog.
// Areas follow the NCES School Courses for the Exchange of Data (SCED) subject areas.
// Aliases are matched after normalisation (case, diacritics and punctuation are ignored).
import type { Concept } from '../core/types.ts';

const c = (id: string, label: string, area: string, sced: string, aliases: string[]): Concept => ({ id, label, area, sced, aliases });

const ELA = '01 English Language and Literature';
const MATH = '02 Mathematics';
const SCI = '03 Life and Physical Sciences';
const SOC = '04 Social Sciences and History';
const ART = '05 Visual and Performing Arts';
const REL = '07 Religious Education and Theology';
const PE = '08 Physical, Health, and Safety Education';
const IT = '10 Information Technology';
const BUS = '12 Business and Marketing';
const AG = '18 Agriculture, Food, and Natural Resources';
const ENG = '21 Engineering and Technology';
const MISC = '22 Miscellaneous';
const WL = '24 World Languages';

export const SCED_SOURCE = {
  title: 'NCES School Courses for the Exchange of Data (SCED)',
  url: 'https://nces.ed.gov/forum/sced.asp',
};

export const concepts: Concept[] = [
  // ── English ──
  c('ela.english', 'English Language Arts', 'ela', ELA, [
    'english', 'english language', 'english language arts', 'english core', 'english elective', 'use of english', 'oral communication', 'reading and writing',
    'english a', 'english a language and literature', 'english a literature', 'communication skills', 'creative writing', 'composition', 'english composition',
    'english studies', 'functional english', 'general english', 'language arts',
  ]),
  c('ela.literature', 'English Literature', 'ela', ELA, ['literature in english', 'english literature', 'literature', '21st century literature', 'world literature', 'literature english']),
  c('ela.efl', 'English as a Foreign Language', 'elective', ELA, [
    'inglés', 'lengua extranjera inglés', 'anglais', 'lva anglais', 'lv1 anglais', 'langue vivante anglais', 'englisch', 'língua inglesa', 'inglês', 'lingua inglese',
    '英语', '英語', '외국어 영어', '영어', 'tiếng anh', 'अंग्रेजी', 'अंग्रेज़ी', 'اللغة الإنجليزية', 'اللغة الانجليزية', 'الإنجليزية', 'الانجليزية',
    'английский язык', 'иностранный язык английский', 'английский', 'english b', 'english as a foreign language', 'english as a second language', 'esl', 'efl',
    'bahasa inggris', 'ingilizce', 'angielski', 'engels',
  ]),

  // ── World languages ──
  c('wl.native', 'Home Language and Literature', 'world_language', WL, [
    'español', 'lengua española', 'lengua y literatura', 'lengua castellana', 'castellano', 'taller de lectura y redacción', 'literatura', 'français', 'lettres',
    'langue et littérature', 'littérature', 'deutsch', 'literatur', 'língua portuguesa', 'português', 'italiano', 'nederlands', 'język polski',
    '语文', '中文', '国语', '國文', '国語', '日本語', '국어', '문학', '화법과 작문', '독서', 'ngữ văn', 'tiếng việt', 'văn học',
    'हिन्दी', 'हिंदी', 'hindi', 'hindi core', 'hindi elective', 'اللغة العربية', 'العربية', 'русский язык', 'литература', 'родной язык', 'українська мова',
    'filipino', 'komunikasyon at pananaliksik sa wika at kulturang pilipino', 'pagbasa at pagsusuri', 'tagalog',
    'yoruba', 'yoruba language', 'hausa', 'hausa language', 'igbo', 'igbo language', 'efik', 'edo', 'twi', 'asante twi', 'akuapem twi', 'fante', 'ewe', 'dagbani',
    'mandinka', 'wolof', 'pulaar', 'fula', 'krio', 'mende', 'temne', 'swahili', 'kiswahili', 'amharic', 'somali', 'bahasa indonesia', 'bahasa melayu', 'türkçe',
    'فارسی', 'اردو', 'urdu', 'বাংলা', 'bengali', 'नेपाली', 'nepali', 'tamil', 'telugu', 'punjabi', 'marathi', 'gujarati', 'kannada', 'malayalam', 'odia',
    'ghanaian language', 'nigerian language', 'gambian language', 'indigenous language', 'mother tongue', 'home language', 'first language',
  ]),
  c('wl.other', 'World Language', 'world_language', WL, [
    'french', 'spanish', 'german', 'dutch', 'italian', 'portuguese', 'chinese', 'mandarin', 'japanese', 'korean', 'latin', 'greek', 'russian', 'arabic', 'hebrew',
    'sanskrit', 'french b', 'spanish b', 'german b', 'dutch b', 'mandarin b', 'language b', 'ab initio', 'foreign language', 'second foreign language',
    'modern foreign language', 'francés', 'alemán', 'lengua extranjera', 'segunda lengua', 'espagnol', 'lvb espagnol', 'lvb', 'lv2', 'allemand', 'italien',
    'langue vivante', 'französisch', 'spanisch', 'latein', 'fremdsprache', 'francês', 'espanhol', 'língua estrangeira', '日语', '法语', '德语', '外语',
    '일본어', '중국어', '프랑스어', '독일어', '스페인어', '한문', '제2외국어', 'tiếng pháp', 'tiếng trung', 'tiếng nhật', 'ngoại ngữ', 'संस्कृत',
    'الفرنسية', 'اللغة الفرنسية', 'اللغة الأجنبية الثانية', 'немецкий язык', 'французский язык', 'иностранный язык', 'второй иностранный язык',
  ]),

  // ── Mathematics ──
  c('math.general', 'Mathematics', 'math', MATH, [
    'mathematics', 'math', 'maths', 'general mathematics', 'core mathematics', 'business mathematics', 'mathematics applications and interpretation',
    'mathematics analysis and approaches', 'mathematical literacy', 'matemáticas', 'matemática', 'mathématiques', 'maths', 'mathematik', 'matematica',
    '数学', '數學', '수학', 'toán', 'toán học', 'गणित', 'الرياضيات', 'رياضيات', 'математика', 'matematika', 'matematik', 'hisabati',
  ]),
  c('math.algebra1', 'Algebra I', 'math', MATH, ['algebra', 'algebra i', 'algebra 1', 'álgebra', 'algèbre', 'алгебра', '代数', '대수', 'đại số', 'बीजगणित', 'الجبر']),
  c('math.geometry', 'Geometry', 'math', MATH, ['geometry', 'geometría', 'geometria', 'géométrie', 'geometrie', 'геометрия', '几何', '기하', 'hình học', 'ज्यामिति', 'الهندسة', 'geometría y trigonometría']),
  c('math.algebra2', 'Algebra II', 'math', MATH, ['algebra ii', 'algebra 2', 'álgebra ii', 'geometría analítica', 'analytic geometry', 'intermediate algebra', 'college algebra']),
  c('math.precalc', 'Pre-Calculus', 'math', MATH, [
    'pre-calculus', 'precalculus', 'pre calculus', 'precálculo', 'trigonometry', 'trigonometría', 'trigonometria', 'trigonométrie', 'funciones',
    'алгебра и начала математического анализа', 'алгебра и начала анализа', '삼각함수',
  ]),
  c('math.calculus', 'Calculus', 'math', MATH, [
    'calculus', 'basic calculus', 'cálculo', 'cálculo diferencial', 'cálculo integral', 'calcul', 'analysis', '微积分', '미적분', 'giải tích', 'कलन', 'التفاضل والتكامل',
    'математический анализ',
  ]),
  c('math.statistics', 'Statistics', 'math', MATH, [
    'statistics', 'statistics and probability', 'probability and statistics', 'estadística', 'probabilidad y estadística', 'estatística', 'statistiques',
    'statistik', 'stochastik', '统计', '확률과 통계', 'thống kê', 'सांख्यिकी', 'الإحصاء', 'статистика',
  ]),
  c('math.advanced', 'Advanced Mathematics', 'math', MATH, [
    'further mathematics', 'additional mathematics', 'elective mathematics', 'advanced mathematics', 'spécialité mathématiques', 'mathématiques expertes',
    'mathématiques complémentaires', 'mathematics hl', 'applied mathematics', 'pure mathematics', 'discrete mathematics', 'mathematik leistungskurs',
  ]),

  // ── Science ──
  c('sci.biology', 'Biology', 'science', SCI, [
    'biology', 'general biology', 'human biology', 'life science', 'life sciences', 'biología', 'biologia', 'biologie', 'sciences de la vie et de la terre', 'svt',
    'spécialité sciences de la vie et de la terre', '生物', '生物学', '생명과학', '생물', 'sinh học', 'जीव विज्ञान', 'الأحياء', 'علم الأحياء', 'биология',
  ]),
  c('sci.chemistry', 'Chemistry', 'science', SCI, [
    'chemistry', 'general chemistry', 'química', 'chimie', 'chemie', 'chimica', 'temas selectos de química', '化学', '화학', 'hóa học', 'hoá học',
    'रसायन विज्ञान', 'الكيمياء', 'химия', 'kimia',
  ]),
  c('sci.physics', 'Physics', 'science', SCI, [
    'physics', 'general physics', 'física', 'physique', 'physik', 'fisica', '物理', '물리', '물리학', 'vật lí', 'vật lý', 'भौतिक विज्ञान', 'भौतिकी', 'الفيزياء', 'физика', 'fizik',
  ]),
  c('sci.physical', 'Physical Science', 'science', SCI, ['physical science', 'physique-chimie', 'physique chimie', 'spécialité physique-chimie', 'física y química', 'fisica e chimica', 'ciencias físicas']),
  c('sci.earth', 'Earth and Space Science', 'science', SCI, [
    'earth science', 'earth and space science', 'earth and life science', 'geology', 'geología', 'géologie', 'geologie', 'astronomy', '地球科学', '지구과학',
    'الجيولوجيا', 'الجيولوجيا وعلوم البيئة', 'геология', 'астрономия',
  ]),
  c('sci.integrated', 'Integrated Science', 'science', SCI, [
    'science', 'general science', 'integrated science', 'combined science', 'basic science', 'science and technology', 'ciencias naturales', 'ciencias',
    'sciences', 'enseignement scientifique', 'naturwissenschaften', 'ciências', 'ciências da natureza', '科学', '통합과학', '과학탐구실험', '과학',
    'khoa học tự nhiên', 'विज्ञान', 'العلوم', 'естествознание',
  ]),
  c('sci.environmental', 'Environmental Science', 'science', SCI, [
    'environmental science', 'environmental studies', 'environmental management', 'ecology', 'ecología', 'ecologia', 'ecología y medio ambiente', 'écologie',
    'ökologie', '环境科学', '환경', 'экология',
  ]),

  // ── Social sciences ──
  c('ss.history.world', 'World History', 'social', SOC, [
    'history', 'world history', 'historia', 'historia universal', 'historia universal contemporánea', 'histoire', 'histoire-géographie', 'histoire géographie',
    'geschichte', 'história', 'storia', '历史', '歷史', '세계사', '역사', '동아시아사', 'lịch sử', 'इतिहास', 'التاريخ', 'история', 'всеобщая история', 'sejarah', 'tarih',
  ]),
  c('ss.history.national', 'National History (home country)', 'social', SOC, [
    'historia de méxico', 'history of mexico', '한국사', '中国历史', 'history of ghana', 'nigerian history', 'история россии', 'lịch sử việt nam', 'história do brasil',
    'histoire de france', 'philippine history', 'indian history', 'national history',
  ]),
  c('ss.geography', 'Geography', 'social', SOC, [
    'geography', 'world geography', 'human geography', 'geografía', 'geografia', 'géographie', 'erdkunde', 'geographie', '地理', '지리', '세계지리', '한국지리',
    'địa lí', 'địa lý', 'भूगोल', 'الجغرافيا', 'география', 'coğrafya',
  ]),
  c('ss.civics', 'Civics and Government', 'social', SOC, [
    'civics', 'civic education', 'government', 'citizenship', 'citizenship education', 'politics', 'political science', 'global politics', 'educación cívica',
    'formación cívica y ética', 'enseignement moral et civique', 'éducation civique', 'politik', 'politik und wirtschaft', 'sozialkunde', 'gemeinschaftskunde',
    '思想政治', '政治', '道德与法治', '정치와 법', '법과 정치', 'giáo dục công dân', 'giáo dục kinh tế và pháp luật', 'नागरिक शास्त्र', 'राजनीति विज्ञान',
    'التربية الوطنية', 'право', 'law', 'constitution',
  ]),
  c('ss.economics', 'Economics', 'social', SOC, [
    'economics', 'economía', 'economia', 'sciences économiques et sociales', 'économie', 'wirtschaft', 'volkswirtschaftslehre', '经济', '经济学', '경제',
    'kinh tế', 'अर्थशास्त्र', 'الاقتصاد', 'экономика', 'estructura socioeconómica de méxico', 'ekonomi',
  ]),
  c('ss.social', 'Social Studies', 'social', SOC, [
    'social studies', 'social science', 'social sciences', 'social and environmental studies', 'ciencias sociales', 'introducción a las ciencias sociales',
    'estudios sociales', 'sciences sociales', 'gesellschaftslehre', 'estudos sociais', '社会', '통합사회', '사회', '사회문화', '사회·문화', 'khoa học xã hội',
    'सामाजिक विज्ञान', 'सामाजिक अध्ययन', 'الدراسات الاجتماعية', 'обществознание', 'understanding culture society and politics', 'araling panlipunan',
  ]),
  c('ss.philosophy', 'Philosophy and Ethics', 'social', SOC, [
    'philosophy', 'filosofía', 'filosofia', 'philosophie', 'ethics', 'ética', 'ethik', 'éthique', '伦理', '哲学', '윤리', '생활과 윤리', '윤리와 사상', '철학',
    'triết học', 'theory of knowledge', 'الفلسفة', 'الفلسفة والمنطق', 'logic', 'lógica', 'философия',
  ]),
  c('ss.sociology', 'Sociology', 'social', SOC, ['sociology', 'sociología', 'sociologia', 'soziologie', '社会学', '사회학', 'समाजशास्त्र', 'علم الاجتماع']),
  c('ss.psychology', 'Psychology', 'social', SOC, ['psychology', 'psicología', 'psicologia', 'psychologie', '心理学', '심리학', 'मनोविज्ञान', 'علم النفس', 'психология']),
  c('ss.religion', 'Religious Studies', 'elective', REL, [
    'religious studies', 'religious education', 'religion', 'religión', 'religião', 'christian religious studies', 'christian religious knowledge',
    'islamic studies', 'islamic religious studies', 'islamic religious knowledge', 'bible knowledge', 'katholische religion', 'evangelische religion',
    'religionslehre', 'التربية الدينية', 'التربية الإسلامية', 'quran', 'moral and religious education', 'religious and moral education', 'christian living education',
    'values education', 'edukasyon sa pagpapakatao', 'moral education', 'catechism',
  ]),

  // ── Arts ──
  c('arts.visual', 'Visual Arts', 'arts', ART, [
    'art', 'arts', 'visual arts', 'visual art', 'fine art', 'fine arts', 'art and design', 'art and craft', 'arts and crafts', 'creative arts', 'arte', 'artes',
    'artes visuales', 'educación artística', 'arts plastiques', 'kunst', 'bildende kunst', '美术', '美術', '미술', 'mĩ thuật', 'mỹ thuật', 'कला', 'चित्रकला',
    'التربية الفنية', 'изобразительное искусство', 'drawing', 'painting', 'graphic design',
  ]),
  c('arts.music', 'Music', 'arts', ART, ['music', 'música', 'musique', 'musik', 'musica', '音乐', '音樂', '음악', 'âm nhạc', 'संगीत', 'الموسيقى', 'музыка', 'choir', 'band', 'orchestra']),
  c('arts.performing', 'Theatre and Dance', 'arts', ART, ['drama', 'theatre', 'theater', 'dance', 'performing arts', 'teatro', 'danza', 'théâtre', 'darstellendes spiel', '舞蹈', '戏剧', '연극', '무용', 'film']),

  // ── Physical education and health ──
  c('pe', 'Physical Education', 'pe', PE, [
    'physical education', 'pe', 'p e', 'physical and health education', 'physical education and health', 'educación física', 'éducation physique et sportive',
    'eps', 'sport', 'sportunterricht', 'educação física', 'educazione fisica', '体育', '体育与健康', '體育', '체육', '운동과 건강', '스포츠 생활', 'thể dục',
    'giáo dục thể chất', 'शारीरिक शिक्षा', 'التربية الرياضية', 'التربية البدنية', 'физическая культура', 'physical training', 'games',
  ]),
  c('health', 'Health', 'health', PE, [
    'health', 'health education', 'health science', 'salud', 'educación para la salud', 'santé', 'gesundheit', 'saúde', '保健', '보건', 'personal development',
    'основы безопасности жизнедеятельности', 'обж', 'first aid', 'nutrition', 'hygiene', 'life skills', 'life orientation',
  ]),

  // ── Technology and career ──
  c('cs', 'Computer Science', 'cte', IT, [
    'computer science', 'computer studies', 'computing', 'ict', 'information technology', 'information and communication technology', 'informatics',
    'data processing', 'informática', 'computación', 'tecnologías de la información', 'informatique', 'sciences numériques et technologie', 'snt',
    'numérique et sciences informatiques', 'nsi', 'informatik', '信息技术', '信息科技', '정보', '컴퓨터', 'tin học', 'कम्प्यूटर', 'कंप्यूटर विज्ञान',
    'कंप्यूटर', 'الحاسب الآلي', 'تكنولوجيا المعلومات', 'информатика', 'empowerment technologies', 'programming', 'computer programming', 'computer applications',
  ]),
  c('cte.business', 'Business and Accounting', 'cte', BUS, [
    'business studies', 'business', 'business management', 'commerce', 'accounting', 'financial accounting', 'book keeping', 'bookkeeping', 'principles of accounts',
    'entrepreneurship', 'marketing', 'office practice', 'contabilidad', 'administración', 'comptabilité', 'gestion', 'betriebswirtschaftslehre', 'contabilidade',
    '会计', '商业', '회계', 'kế toán', 'वाणिज्य', 'लेखाशास्त्र', 'المحاسبة', 'cost accounting', 'insurance', 'salesmanship', 'store management',
  ]),
  c('cte.agriculture', 'Agricultural Science', 'cte', AG, [
    'agricultural science', 'agriculture', 'agric science', 'animal husbandry', 'fisheries', 'crop husbandry', 'general agriculture', 'agricultura', 'agronomía',
    'landwirtschaft', '农业', '농업', 'nông nghiệp', 'कृषि', 'الزراعة', 'horticulture',
  ]),
  c('cte.technology', 'Technology and Engineering', 'cte', ENG, [
    'technical drawing', 'design and technology', 'technology', 'metal work', 'metalwork', 'wood work', 'woodwork', 'auto mechanics', 'electronics',
    'basic technology', 'basic electronics', 'engineering', 'engineering science', 'technologie', 'tecnología', 'tecnologia', 'technik', '通用技术', '技术',
    '기술', '기술·가정', '기술 가정', 'công nghệ', 'प्रौद्योगिकी', 'технология', 'technology and livelihood education', 'tle', 'building construction',
    'applied electricity', 'electrical installation',
  ]),
  c('cte.home', 'Family and Consumer Sciences', 'cte', MISC, [
    'home economics', 'home science', 'food and nutrition', 'foods and nutrition', 'clothing and textiles', 'home management', 'economía doméstica',
    'hauswirtschaft', '家政', '가정', 'गृह विज्ञान', 'الاقتصاد المنزلي', 'catering', 'catering craft practice', 'garment making',
  ]),
  c('elective.other', 'Elective (unclassified)', 'elective', MISC, [
    'research methodology', 'metodología de la investigación', 'study skills', 'homeroom', 'guidance', 'orientación', 'tutoría', 'extended essay', 'project',
    'projektarbeit', 'seminar', 'giáo dục quốc phòng và an ninh', 'giáo dục quốc phòng', 'military training', '军训', '综合实践活动', '창의적 체험활동',
    'community service', 'creativity activity service', 'cas', 'general paper', 'general studies', 'library', 'research', 'practical research', 'work immersion',
  ]),
];
