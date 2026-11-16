import { describe, expect, it } from 'vitest';
import { asciiDigits, displayName, key, parseDate, parseNumber, sameName, similarity } from '../src/core/text.ts';

describe('text', () => {
  it('normalises digits from other scripts', () => {
    expect(asciiDigits('٣١٨٦٤٢')).toBe('318642');
    expect(asciiDigits('१०वीं')).toBe('10वीं');
    expect(asciiDigits('数学Ⅱ ９')).toBe('数学II 9');
  });
  it('builds matching keys that ignore case, accents and punctuation', () => {
    expect(key('Matemáticas  III.')).toBe('matematicas iii');
    expect(key('Địa lí')).toBe('dia li');
    expect(key('الأحياء')).toBe(key('الاحياء'));
    expect(similarity('Quimical', 'Química I')).toBeGreaterThan(0.8);
  });
  it('parses numbers with decimal commas and leading zeros', () => {
    expect(parseNumber('13,5')).toBe(13.5);
    expect(parseNumber('087')).toBe(87);
    expect(parseNumber('B3')).toBeNull();
  });
  it('parses dates in the formats the seeded systems print', () => {
    expect(parseDate('17/08/2007')?.iso).toBe('2007-08-17');
    expect(parseDate('04/26/2008', 'mdy')?.iso).toBe('2008-04-26');
    expect(parseDate('21 de septiembre de 2007')?.iso).toBe('2007-09-21');
    expect(parseDate('3rd February, 2006')?.iso).toBe('2006-02-03');
    expect(parseDate('2007年3月14日')?.iso).toBe('2007-03-14');
    expect(parseDate('2008년 7월 3일')?.iso).toBe('2008-07-03');
    expect(parseDate('11 tháng 01 năm 2008')?.iso).toBe('2008-01-11');
    expect(parseDate('6 июня 2007 года')?.iso).toBe('2007-06-06');
    expect(parseDate('19.10.2007')?.iso).toBe('2007-10-19');
    expect(parseDate('14-Nov-2006')?.iso).toBe('2006-11-14');
    expect(parseDate('٢٠٠٧/٠٤/٢٥')?.iso).toBe('2007-04-25');
    expect(parseDate('2 février 2008')?.iso).toBe('2008-02-02');
  });
  it('flags day/month ambiguity only when it exists', () => {
    expect(parseDate('05/12/2007')?.ambiguous).toBe(true);
    expect(parseDate('25/12/2007')?.ambiguous).toBe(false);
  });
  it('tidies names without changing their order unless there is a comma', () => {
    expect(displayName('JALLOW, Fatoumatta Binta')).toBe('Fatoumatta Binta Jallow');
    expect(displayName('Akosua Serwaa MENSAH')).toBe('Akosua Serwaa Mensah');
    expect(displayName('HERNÁNDEZ ZAVALA DIEGO')).toBe('Hernández Zavala Diego');
    expect(sameName('Hernández Zavala Diego Alejandro', 'Diego Alejandro Hernández Zavala')).toBe(true);
  });
});

describe('words OCR ran together', () => {
  it('splits them for matching, but keeps a case slip inside one word whole', () => {
    expect(key('Brikama Lantern Senior SecondarySchool')).toBe('brikama lantern senior secondary school');
    expect(key('State ofOrigin')).toBe('state of origin');
    expect(key('OChO')).toBe('ocho');
    expect(key('McDonald')).toBe('mcdonald');
  });
});
