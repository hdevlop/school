import { describe, expect, it } from 'bun:test';
import {
  createDriverDto,
  createDriversBulkDto,
  updateDriverDto,
  driverIdParam,
  cinParam,
  licenseNumberParam,
  emailParam,
  phoneParam,
  updateDriverStatusDto,
  deleteDriversBulkDto,
} from '@server/modules/transport/drivers/DriverDto';

const validDriver = {
  name: 'Ahmed Benali',
  email: 'ahmed@example.com',
  cin: 'AB123456',
  phone: '+212600000000',
  licenseNumber: 'LIC-12345',
  licenseType: 'B',
  licenseExpiry: '2030-12-31',
  hireDate: '2024-09-01',
};

describe('createDriverDto', () => {
  it('parses a valid minimal driver', () => {
    const result = createDriverDto.safeParse(validDriver);
    expect(result.success).toBe(true);
  });

  it('parses a driver with all optional fields', () => {
    const data = {
      ...validDriver,
      id: 'drv_01',
      userId: 'usr_01',
      password: 'SecurePass123',
      gender: 'M',
      address: '123 Rue Casablanca',
      salary: 8000,
      yearsOfExperience: 5,
      emergencyContact: 'Said Benali',
      emergencyPhone: '+212600000001',
      notes: 'Experienced driver',
      image: '/images/avatar.png',
    };
    const result = createDriverDto.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('defaults status to active when omitted', () => {
    const result = createDriverDto.safeParse(validDriver);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('active');
    }
  });

  it('rejects invalid email', () => {
    const data = { ...validDriver, email: 'bad-email' };
    expect(createDriverDto.safeParse(data).success).toBe(false);
  });

  it('rejects invalid phone', () => {
    const data = { ...validDriver, phone: 'abc' };
    expect(createDriverDto.safeParse(data).success).toBe(false);
  });

  it('rejects name shorter than 2 characters', () => {
    const data = { ...validDriver, name: 'A' };
    expect(createDriverDto.safeParse(data).success).toBe(false);
  });

  it('rejects license number shorter than 5 characters', () => {
    const data = { ...validDriver, licenseNumber: 'AB12' };
    expect(createDriverDto.safeParse(data).success).toBe(false);
  });

  it('rejects license number longer than 20 characters', () => {
    const data = { ...validDriver, licenseNumber: 'A'.repeat(21) };
    expect(createDriverDto.safeParse(data).success).toBe(false);
  });

  it('rejects license type longer than 10 characters', () => {
    const data = { ...validDriver, licenseType: 'A'.repeat(11) };
    expect(createDriverDto.safeParse(data).success).toBe(false);
  });

  it('rejects negative yearsOfExperience', () => {
    const data = { ...validDriver, yearsOfExperience: -1 };
    expect(createDriverDto.safeParse(data).success).toBe(false);
  });

  it('rejects zero salary', () => {
    const data = { ...validDriver, salary: 0 };
    expect(createDriverDto.safeParse(data).success).toBe(false);
  });

  it('accepts positive salary', () => {
    const data = { ...validDriver, salary: 8000 };
    expect(createDriverDto.safeParse(data).success).toBe(true);
  });

  it('rejects notes longer than 1000 characters', () => {
    const data = { ...validDriver, notes: 'A'.repeat(1001) };
    expect(createDriverDto.safeParse(data).success).toBe(false);
  });

  it('accepts null notes', () => {
    const data = { ...validDriver, notes: null };
    expect(createDriverDto.safeParse(data).success).toBe(true);
  });

  it('rejects password shorter than 8 characters', () => {
    const data = { ...validDriver, password: 'short' };
    expect(createDriverDto.safeParse(data).success).toBe(false);
  });

  it('accepts nullish image', () => {
    const data = { ...validDriver, image: null };
    expect(createDriverDto.safeParse(data).success).toBe(true);
  });

  it('rejects missing name', () => {
    const { name, ...data } = validDriver;
    expect(createDriverDto.safeParse(data).success).toBe(false);
  });

  it('rejects missing licenseNumber', () => {
    const { licenseNumber, ...data } = validDriver;
    expect(createDriverDto.safeParse(data).success).toBe(false);
  });

  it('rejects missing licenseExpiry', () => {
    const { licenseExpiry, ...data } = validDriver;
    expect(createDriverDto.safeParse(data).success).toBe(false);
  });

  it('rejects missing hireDate', () => {
    const { hireDate, ...data } = validDriver;
    expect(createDriverDto.safeParse(data).success).toBe(false);
  });
});

describe('updateDriverDto', () => {
  it('parses an empty object', () => {
    expect(updateDriverDto.safeParse({}).success).toBe(true);
  });

  it('parses partial data with only name', () => {
    expect(updateDriverDto.safeParse({ name: 'Updated Name' }).success).toBe(true);
  });

  it('still validates name constraints', () => {
    expect(updateDriverDto.safeParse({ name: 'A' }).success).toBe(false);
  });
});

describe('driverIdParam', () => {
  it('accepts non-empty id', () => {
    expect(driverIdParam.safeParse({ id: 'drv_01' }).success).toBe(true);
  });

  it('rejects empty id', () => {
    expect(driverIdParam.safeParse({ id: '' }).success).toBe(false);
  });
});

describe('cinParam', () => {
  it('accepts non-empty cin', () => {
    expect(cinParam.safeParse({ cin: 'AB123456' }).success).toBe(true);
  });

  it('rejects empty cin', () => {
    expect(cinParam.safeParse({ cin: '' }).success).toBe(false);
  });
});

describe('licenseNumberParam', () => {
  it('accepts non-empty license number', () => {
    expect(licenseNumberParam.safeParse({ licenseNumber: 'LIC-12345' }).success).toBe(true);
  });

  it('rejects empty license number', () => {
    expect(licenseNumberParam.safeParse({ licenseNumber: '' }).success).toBe(false);
  });
});

describe('emailParam', () => {
  it('accepts valid email', () => {
    expect(emailParam.safeParse({ email: 'ahmed@example.com' }).success).toBe(true);
  });

  it('rejects empty email', () => {
    expect(emailParam.safeParse({ email: '' }).success).toBe(false);
  });
});

describe('phoneParam', () => {
  it('accepts non-empty phone', () => {
    expect(phoneParam.safeParse({ phone: '+212600000000' }).success).toBe(true);
  });

  it('rejects empty phone', () => {
    expect(phoneParam.safeParse({ phone: '' }).success).toBe(false);
  });
});

describe('updateDriverStatusDto', () => {
  it('accepts non-empty status', () => {
    expect(updateDriverStatusDto.safeParse({ status: 'active' }).success).toBe(true);
  });

  it('rejects empty status', () => {
    expect(updateDriverStatusDto.safeParse({ status: '' }).success).toBe(false);
  });
});

describe('deleteDriversBulkDto', () => {
  it('accepts array of non-empty strings', () => {
    expect(deleteDriversBulkDto.safeParse(['drv_01', 'drv_02']).success).toBe(true);
  });

  it('rejects array with empty strings', () => {
    expect(deleteDriversBulkDto.safeParse(['drv_01', '']).success).toBe(false);
  });
});

describe('createDriversBulkDto', () => {
  it('accepts array of valid drivers', () => {
    expect(createDriversBulkDto.safeParse([validDriver]).success).toBe(true);
  });

  it('accepts empty array', () => {
    expect(createDriversBulkDto.safeParse([]).success).toBe(true);
  });

  it('rejects array with one invalid driver', () => {
    expect(createDriversBulkDto.safeParse([validDriver, { ...validDriver, email: 'bad' }]).success).toBe(false);
  });
});
