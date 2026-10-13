import { anshShare, isRevenueUrl } from '../src/domain/revenueFeeding';
test('Ansh calculation follows 1/n and exact four-place rounding', () => {
  expect(anshShare('1.0001', '1/2')).toEqual({ share: '1/2', hissa: '0.5001' });
  expect(anshShare('0.1', '1/3').hissa).toBe('0.0333');
  expect(anshShare('0', '1/1').hissa).toBe('0.0000');
  for (const value of ['1/0', '1/-2', '2/3', 'NaN']) expect(() => anshShare('1', value)).toThrow();
  expect(() => anshShare('-1', '1/2')).toThrow();
});
test('each module accepts only its exact HTTPS government host', () => {
  expect(isRevenueUrl('ansh', 'https://upbhulekh.gov.in/bhulekh/')).toBe(true);
  expect(isRevenueUrl('prapatra5', 'https://svamitva.up.gov.in/public/homePage_login.jsp')).toBe(true);
  for (const url of ['http://upbhulekh.gov.in', 'https://upbhulekh.gov.in.evil.test', 'https://user@upbhulekh.gov.in', 'https://upbhulekh.gov.in:444', 'https://svamitva.up.gov.in']) expect(isRevenueUrl('ansh', url)).toBe(false);
});
