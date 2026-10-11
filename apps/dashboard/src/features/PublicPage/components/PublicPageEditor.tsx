'use client';
import { useState } from 'react';
import Link from 'next/link';
import { LandingImage } from '@/features/Landing/components/LandingImage';
import { useQuery, useMutation } from '@tanstack/react-query';
import { NButton, NPageHeader } from 'najm-kit';
import { NThemeSettingsProvider, NThemeBrandingSettings, NThemeSettingsActions } from 'najm-theme/react';
import { useTranslation } from 'najm-i18n/react';
import { useRouter } from 'next/navigation';
import { LANDING_NEWS_FALLBACKS, LANDING_NEWS_SLOTS, LANDING_PROGRAM_SLOTS, LANGUAGE_VALUES, type LandingContent, type LandingNewsItem, type LandingCycle, type LandingText, type Language } from '@sms/contracts';
import { getLandingContentApi, saveLandingContentApi } from '@/services/landingContentApi';
import { getActiveCyclesApi } from '@/services/cycleApi';
import { FEATURE_ICONS } from '@/shared/featureIcons';

const emptyText = (): LandingText => ({ en:'',fr:'',ar:'',es:'' });
const inputClass = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground';
function ContentEditor({ initial, cycles }: { initial: LandingContent; cycles: LandingCycle[] }) {
  const { t, language } = useTranslation();
  const router = useRouter();
  const [content, setContent] = useState(initial);
  const [tab, setTab] = useState('content');
  const [fieldLanguage, setFieldLanguage] = useState<Language>('en');
  const mutation = useMutation({ mutationFn: saveLandingContentApi, onSuccess: () => router.refresh() });
  const set = <K extends keyof LandingContent>(key: K, value: LandingContent[K]) => setContent(previous => ({ ...previous, [key]: value }));
  const setNews = (index: number, patch: Partial<LandingNewsItem>) => set('news', content.news.map((item, i) => i === index ? { ...item, ...patch } : item));
  const textInput = (label: string, value: string, change: (value: string) => void, maxLength = 200) => <label className="flex flex-col gap-2 text-sm">{label}<input className={inputClass} value={value} onChange={event => change(event.target.value)} maxLength={maxLength} dir={fieldLanguage === 'ar' ? 'rtl' : undefined} /></label>;
  return <div className="flex flex-col gap-5"><div role="tablist" aria-label={t('publicPage.title')} className="flex flex-wrap gap-2">{['content','programs','news','photos','publish'].map(key => <NButton key={key} role="tab" aria-selected={tab === key} variant={tab === key ? 'default' : 'outline'} onClick={() => setTab(key)}>{t(`publicPage.${key}`)}</NButton>)}</div>
    {(tab === 'content' || tab === 'programs' || tab === 'news') && <div role="group" aria-label={t('landing.nav.language')} className="flex gap-2">{LANGUAGE_VALUES.map(lang => <NButton key={lang} size="sm" variant={fieldLanguage === lang ? 'default':'outline'} onClick={() => setFieldLanguage(lang)}>{lang.toUpperCase()}</NButton>)}</div>}
    <div role="tabpanel" className="flex flex-col gap-5">
      {tab === 'content' && <>
        <h2 className="text-lg font-semibold">{t('publicPage.stats')}</h2>
        {content.stats.map((stat,index) => <div key={index} className="grid gap-3 rounded-xl border border-border p-4 md:grid-cols-3">
          {textInput(t('publicPage.value'),stat.value,value => set('stats',content.stats.map((item,i)=>i===index?{...item,value}:item)),12)}
          {textInput(t('publicPage.label'),stat.label[fieldLanguage],value => set('stats',content.stats.map((item,i)=>i===index?{...item,label:{...item.label,[fieldLanguage]:value}}:item)),80)}
          <NButton variant="outline" onClick={()=>set('stats',content.stats.filter((_,i)=>i!==index))}>{t('publicPage.remove')}</NButton>
        </div>)}
        <NButton variant="outline" disabled={content.stats.length>=4} onClick={()=>set('stats',[...content.stats,{value:'',label:emptyText()}])}>{t('publicPage.addStat')}</NButton>
        <h2 className="text-lg font-semibold">{t('publicPage.testimonials')}</h2>
        {content.testimonials.map((item,index)=><div key={index} className="grid gap-3 rounded-xl border border-border p-4 md:grid-cols-2">
          {textInput(t('publicPage.author'),item.author,value=>set('testimonials',content.testimonials.map((entry,i)=>i===index?{...entry,author:value}:entry)),100)}
          {textInput(t('publicPage.quote'),item.quote[fieldLanguage],value=>set('testimonials',content.testimonials.map((entry,i)=>i===index?{...entry,quote:{...entry.quote,[fieldLanguage]:value}}:entry)),600)}
          <label>{t('publicPage.rating')}<input className={inputClass} type="number" min={1} max={5} value={item.rating} onChange={event=>set('testimonials',content.testimonials.map((entry,i)=>i===index?{...entry,rating:Number(event.target.value)}:entry))} /></label>
          <NButton variant="outline" onClick={()=>set('testimonials',content.testimonials.filter((_,i)=>i!==index))}>{t('publicPage.remove')}</NButton>
        </div>)}
        <NButton variant="outline" disabled={content.testimonials.length>=3} onClick={()=>set('testimonials',[...content.testimonials,{author:'',quote:emptyText(),rating:5}])}>{t('publicPage.addTestimonial')}</NButton>
        <label className="flex gap-3"><input type="checkbox" checked={content.admissionsOpen} onChange={event=>set('admissionsOpen',event.target.checked)} />{t('publicPage.admissionsOpen')}</label>
        {textInput(t('publicPage.year'),content.admissionsYearLabel || '',value=>set('admissionsYearLabel',value || null),40)}
        <h2 className="text-lg font-semibold">{t('publicPage.socialLinks')}</h2>
        <div className="grid gap-3 md:grid-cols-2">{(['facebook','instagram','youtube','linkedin'] as const).map(key=><div key={key}>{textInput(key,content.socialLinks[key]||'',value=>set('socialLinks',{...content.socialLinks,[key]:value || undefined}),500)}</div>)}</div>
      </>}
      {tab === 'programs' && cycles.map(cycle=><article key={cycle.id} className="grid gap-4 rounded-xl border border-border p-4 md:grid-cols-2"><div className="flex flex-col gap-3"><h2 className="font-semibold">{cycle.labels?.[language]||cycle.name}</h2>
        {textInput(t('publicPage.blurb'),content.programBlurbs[cycle.id]?.[fieldLanguage]||'',value=>set('programBlurbs',{...content.programBlurbs,[cycle.id]:{...(content.programBlurbs[cycle.id]||emptyText()),[fieldLanguage]:value}}))}
        <label className="flex flex-col gap-2 text-sm">{t('publicPage.photo')}<select className={inputClass} value={content.programPhotoSlots[cycle.id]||''} onChange={event=>{const updated={...content.programPhotoSlots};if(event.target.value)updated[cycle.id]=event.target.value as typeof LANDING_PROGRAM_SLOTS[number];else delete updated[cycle.id];set('programPhotoSlots',updated);}}>
          <option value="">{t('publicPage.defaultPhoto')}</option>{LANDING_PROGRAM_SLOTS.map(key=><option key={key} value={key}>{t(`theme.branding.slots.${key}`)}</option>)}</select></label></div>
        <div className="aspect-video overflow-hidden rounded-lg"><LandingImage slot={content.programPhotoSlots[cycle.id]} fallback={content.programPhotoSlots[cycle.id]?`/images/landing/program-${content.programPhotoSlots[cycle.id].slice(-1)}.webp`:'/images/landing/program-default.webp'} width={480} height={270} alt={t('publicPage.photo')} sizes="480px" /></div>
      </article>)}
      {tab === 'news' && <>
        {content.news.map((item,index)=><article key={index} className="grid gap-4 rounded-xl border border-border p-4 md:grid-cols-[1fr_240px]"><div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">{t('publicPage.newsDate')}<input type="date" className={inputClass} value={item.date} onChange={event=>setNews(index,{date:event.target.value})} /></label>
          {textInput(t('publicPage.newsTag'),item.tag[fieldLanguage],value=>setNews(index,{tag:{...item.tag,[fieldLanguage]:value}}),30)}
          <div className="md:col-span-2">{textInput(t('publicPage.newsTitle'),item.title[fieldLanguage],value=>setNews(index,{title:{...item.title,[fieldLanguage]:value}}),120)}</div>
          <label className="flex flex-col gap-2 text-sm md:col-span-2">{t('publicPage.newsBody')}<textarea className={inputClass} rows={3} value={item.body[fieldLanguage]} onChange={event=>setNews(index,{body:{...item.body,[fieldLanguage]:event.target.value}})} maxLength={300} dir={fieldLanguage === 'ar' ? 'rtl' : undefined} /></label>
          <NButton variant="outline" className="md:col-span-2 md:justify-self-start" onClick={()=>set('news',content.news.filter((_,i)=>i!==index))}>{t('publicPage.remove')}</NButton></div>
          <div className="flex flex-col gap-2"><div className="aspect-video overflow-hidden rounded-lg"><LandingImage slot={LANDING_NEWS_SLOTS[index]} fallback={LANDING_NEWS_FALLBACKS[index]} width={480} height={270} alt={item.title[fieldLanguage] || t('publicPage.newsTitle')} sizes="240px" /></div>
            <p className="text-xs text-muted-foreground">{t('publicPage.newsHint',{n:index+1})}</p></div>
        </article>)}
        <NButton variant="outline" disabled={content.news.length>=3} onClick={()=>set('news',[...content.news,{date:new Date().toISOString().slice(0,10),tag:emptyText(),title:emptyText(),body:emptyText()}])}>{t('publicPage.addNews')}</NButton>
      </>}
      {tab === 'photos' && <NThemeSettingsProvider client={{baseUrl:'/api'}} language={language} t={t} onPersisted={()=>router.refresh()}><p className="text-sm text-muted-foreground">{t('publicPage.photoHint')}</p><NThemeBrandingSettings slotKeys={['landingHero','landingAssistant',...LANDING_PROGRAM_SLOTS,...LANDING_NEWS_SLOTS]} /><NThemeSettingsActions resources={['branding']} /></NThemeSettingsProvider>}
      {tab === 'publish' && <><label className="flex gap-3"><input type="checkbox" checked={content.published} onChange={event=>set('published',event.target.checked)} />{t('publicPage.published')}</label><Link href="/welcome" target="_blank" className="text-primary underline">{t('publicPage.view')}</Link></>}
    </div>
    {mutation.isError && <p role="alert" className="text-destructive">{t('publicPage.failed')}</p>}{mutation.isSuccess && <p role="status">{t('publicPage.saved')}</p>}
    {tab!=='photos' && <NButton disabled={mutation.isPending} onClick={()=>mutation.mutate(content)}>{t('publicPage.save')}</NButton>}
  </div>;
}
export function PublicPageEditor() {
  const { t } = useTranslation();
  const query=useQuery({queryKey:['landing-content'],queryFn:getLandingContentApi});
  const cycles=useQuery({queryKey:['cycles-active'],queryFn:getActiveCyclesApi});
  return <div className="h-full overflow-y-auto p-2"><NPageHeader icon={FEATURE_ICONS.publicPage} title={t('publicPage.title')} />
    {query.isLoading||cycles.isLoading?<p>{t('visitRequests.loading')}</p>:query.isError||cycles.isError?<p role="alert">{t('publicPage.loadFailed')}</p>:query.data?<ContentEditor initial={query.data.data} cycles={cycles.data?.data || []} />:null}
  </div>;
}
