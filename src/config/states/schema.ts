import { z } from 'zod';
import { URL } from 'react-native-url-polyfill';

const label = z
  .object({ en: z.string().trim().min(1), hi: z.string().trim().min(1) })
  .strict();
const identifier = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9-]*$/);
function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}
const officialUrl = z.string().refine(value => {
  const url = parseUrl(value);
  return (
    !!url &&
    url.protocol === 'https:' &&
    !url.username &&
    !url.password &&
    (!url.port || url.port === '443') &&
    (/\.(gov|nic)\.in$/i.test(url.hostname) ||
      // HARSAC and Uttarakhand registration use these official non-gov hosts.
      // Evidence: docs/FASTWORK_STATE_ROLLOUT.md. No wildcard exceptions.
      ['hsac.org.in', 'online.eregistrationukgov.in'].includes(url.hostname))
  );
}, 'Use an HTTPS government website without credentials or a custom port.');

export const stateServiceSchema = z
  .object({
    id: identifier,
    title: label,
    subtitle: label,
    category: z.enum([
      'Land records',
      'Maps & survey',
      'Registration',
      'Revenue services',
      'Relief & disaster',
      'Public land',
      'Certificates',
    ]),
    icon: identifier,
    searchTerms: z.array(z.string().min(1)),
    url: officialUrl,
    browserMode: z.enum(['webview', 'custom-tab']),
    review: z
      .object({
        status: z.enum([
          'pending',
          'source-reviewed',
          'entry-tested',
          'workflow-tested',
        ]),
        sourceUrl: officialUrl,
        checkedOn: z.iso.date().optional(),
        note: z.string().min(1),
      })
      .strict(),
  })
  .strict();

const common = {
  schemaVersion: z.literal(1),
  configVersion: z.string().min(1),
  stateCode: z.string().regex(/^[A-Z]{2}$/),
  name: label,
  languages: z.array(z.enum(['hi', 'en'])).min(1),
  stage: z.enum(['baseline', 'pilot', 'next']),
  dashboardServiceIds: z.array(identifier).min(1),
};

// UP refers to the approved code catalog so its actions and forms stay intact.
// Other states contain plain data; configuration cannot inject executable code.
export const stateConfigSchema = z
  .discriminatedUnion('catalog', [
    z
      .object({
        ...common,
        stateCode: z.literal('UP'),
        stage: z.literal('baseline'),
        catalog: z.literal('up-approved'),
      })
      .strict(),
    z
      .object({
        ...common,
        catalog: z.literal('configured'),
        services: z.array(stateServiceSchema).min(1),
      })
      .strict(),
  ])
  .superRefine((config, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
    if (new Set(config.languages).size !== config.languages.length)
      fail('Duplicate languages.');
    if (
      new Set(config.dashboardServiceIds).size !==
      config.dashboardServiceIds.length
    ) {
      fail('Duplicate dashboard service IDs.');
    }
    if (config.catalog === 'configured') {
      if (config.stateCode === 'UP')
        fail('UP must retain the approved catalog.');
      const ids = new Set(config.services.map(service => service.id));
      if (ids.size !== config.services.length) fail('Duplicate service IDs.');
      if (config.dashboardServiceIds.some(id => !ids.has(id)))
        fail('Unknown dashboard service.');
      for (const service of config.services) {
        if (service.review.status !== 'pending' && !service.review.checkedOn) {
          fail(`Missing review date for ${service.id}.`);
        }
        if (
          /upbhulekh|upbhunaksha|(^|\.)up\.(gov|nic)\.in$/i.test(
            parseUrl(service.url)?.hostname || '',
          )
        ) {
          fail(`Non-UP service ${service.id} must not open a UP portal.`);
        }
      }
    }
  });

export type StateConfig = z.infer<typeof stateConfigSchema>;
export type StateServiceConfig = z.infer<typeof stateServiceSchema>;
