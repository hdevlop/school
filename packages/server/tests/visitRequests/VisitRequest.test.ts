import 'reflect-metadata';
import { describe, expect, it, mock } from 'bun:test';
import { createVisitRequestDto } from '../../src/modules/visitRequests/VisitRequestDto';
import { VisitRequestService } from '../../src/modules/visitRequests/VisitRequestService';
import { VisitRequestValidator } from '../../src/modules/visitRequests/VisitRequestValidator';
import { getEffectiveGuards } from 'najm-guard';
import { VisitRequestController } from '../../src/modules/visitRequests/VisitRequestController';
import { guardConfig } from '../../src/config';
import { withEnglishMessages } from '../support/englishMessages';
const valid = { parentName:'Salma Benali',phone:'+212612345678' };
describe('public visit enquiries', () => {
  it('preserves bounded honeypots, including whitespace, without accepting wrong types', () => {
    for(const website of [undefined,'','robot',' ']) expect(createVisitRequestDto.parse({...valid,website}).website).toBe(website);
    for(const website of [42,{},'a'.repeat(1001)]) expect(createVisitRequestDto.safeParse({...valid,website}).success).toBe(false);
  });
  it('drops filled honeypots before domain checks, persistence and events', async () => {
    const create=mock(async()=>({id:'visit'}));const cycle=mock(async()=>{});const emit=mock(async()=>{});
    const service=new VisitRequestService({create} as never,{ensureActiveCycle:cycle} as never,{} as never,{} as never);
    Object.assign(service,{events:{emit}});
    for(const website of ['robot',' ']) expect(await service.create({...valid,website,cycleId:'invalid'})).toEqual({received:true});
    expect(create).not.toHaveBeenCalled();expect(cycle).not.toHaveBeenCalled();expect(emit).not.toHaveBeenCalled();
  });
  it('persists only the enquiry and resolves the notification through its event', async () => {
    const create=mock(async(input:object)=>({id:'visit',...input}));const emit=mock(async()=>{});
    const notify=mock(async()=>[]);
    const service=new VisitRequestService({create} as never,{ensureActiveCycle:async()=>{}} as never,{createVisitRequestNotification:notify} as never,{getCurrentLanguage:()=> 'fr'} as never);
    Object.assign(service,{events:{emit}});
    expect(await service.create({...valid,website:''})).toEqual({received:true});
    expect(create.mock.calls[0][0]).toEqual({...valid,email:null,language:'fr'});
    expect(emit).toHaveBeenCalledWith('visitRequest.created',{id:'visit',language:'fr'});
    await service.notify({id:'visit',language:'fr'});expect(notify).toHaveBeenCalledTimes(1);
  });
  it('refuses missing or inactive cycle selections', async () => {
    const validator=withEnglishMessages(new VisitRequestValidator({activeCycle:async()=>undefined} as never));
    await expect(validator.ensureActiveCycle('inactive')).rejects.toThrow('Please choose an active program.');
    await validator.ensureActiveCycle();
  });
  it('makes only submission public and requires separate staff permissions', () => {
    const config=guardConfig().config;
    expect(getEffectiveGuards(VisitRequestController,'create',config)).toEqual([]);
    for(const method of ['list','update']) expect(getEffectiveGuards(VisitRequestController,method,config).length).toBeGreaterThan(1);
  });
});
