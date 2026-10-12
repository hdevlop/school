import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { DEFAULT_LANDING_CONTENT, LANGUAGE_VALUES, LANDING_NEWS_FALLBACKS, LANDING_NEWS_SLOTS } from '@sms/contracts';
import { landingContentDto } from '../../src/modules/landing/LandingDto';
import { LandingService } from '../../src/modules/landing/LandingService';
import { schoolBrandingSlots } from '../../src/config/themeConfig';
import { LandingValidator } from '../../src/modules/landing/LandingValidator';
import { withEnglishMessages } from '../support/englishMessages';
const text=Object.fromEntries(LANGUAGE_VALUES.map(lang=>[lang,'School']));
describe('school-owned landing content', () => {
  it('defaults to no invented facts or admissions claim', () => {
    expect(landingContentDto.parse(DEFAULT_LANDING_CONTENT)).toEqual(DEFAULT_LANDING_CONTENT);
    expect(DEFAULT_LANDING_CONTENT.stats).toHaveLength(0);expect(DEFAULT_LANDING_CONTENT.testimonials).toHaveLength(0);expect(DEFAULT_LANDING_CONTENT.news).toHaveLength(0);
    expect(DEFAULT_LANDING_CONTENT.admissionsOpen).toBe(false);
  });
  it('rejects unbounded lists, ratings and unsafe social URLs', () => {
    const news={date:'2026-10-11',tag:text,title:text,body:text};
    expect(landingContentDto.safeParse({...DEFAULT_LANDING_CONTENT,news:Array(6).fill(news)}).success).toBe(true);
    const emptyText=Object.fromEntries(LANGUAGE_VALUES.map(lang=>[lang,'']));
    expect(landingContentDto.safeParse({...DEFAULT_LANDING_CONTENT,news:Array(6).fill({date:news.date,tag:emptyText,title:emptyText,body:emptyText})}).success).toBe(true);
    for(const invalid of [{news:Array(7).fill(news)},{news:[{...news,date:'11/10/2026'}]},{news:[{...news,date:'2026-13-45'}]},{news:[{...news,body:{...text,en:'x'.repeat(301)}}]},{stats:Array(5).fill({value:'12',label:text})},{testimonials:[{author:'Salma',quote:text,rating:6}]},
      {socialLinks:{instagram:'http://instagram.com/school'}},{socialLinks:{facebook:'https://facebook.com.evil.test'}},
      {socialLinks:{youtube:'https://attacker@youtube.com/channel'}},{programPhotoSlots:{cycle:'anything'}},{admissionsOpen:'yes'}])
      expect(landingContentDto.safeParse({...DEFAULT_LANDING_CONTENT,...invalid}).success).toBe(false);
  });
  it('preserves explicit cycle assignments, with four programs and shared slots', async () => {
    const input={...DEFAULT_LANDING_CONTENT,programPhotoSlots:{one:'landingProgram1',two:'landingProgram2',three:'landingProgram1',four:'landingProgram3'}} as const;
    let saved:unknown;const repository={cycleIds:async()=>['four','two','one','three'].map(id=>({id})),save:async(data:unknown)=>{saved=data;return data}};
    const service=new LandingService(repository as never,withEnglishMessages(new LandingValidator(repository as never)));
    await service.save(input);expect(saved).toEqual(input);
    const invalid=new LandingService({} as never,withEnglishMessages(new LandingValidator({cycleIds:async()=>[]} as never)));
    await expect(invalid.save(input)).rejects.toThrow('Unknown program.');
  });
  it('retains all standard slots and applies the configured upload ceilings', () => {
    expect(schoolBrandingSlots).toHaveLength(15);
    expect(LANDING_NEWS_SLOTS).toHaveLength(6);
    expect(LANDING_NEWS_FALLBACKS).toHaveLength(6);
    expect(schoolBrandingSlots.find(slot=>slot.key==='landingHero')?.maxBytes).toBe(5_000_000);
    for(const key of ['landingAssistant','landingProgram1','landingProgram2','landingProgram3',...LANDING_NEWS_SLOTS])expect(schoolBrandingSlots.find(slot=>slot.key===key)?.maxBytes).toBe(2_000_000);
  });
});
