import {createClient} from 'npm:@supabase/supabase-js@2.108.1';
import {importPKCS8, SignJWT} from 'npm:jose@6.1.3';
import {grantsAccess, verifiedPurchase} from './purchase.ts';

const packageName = 'com.lekhpal';
const LEASE_MS = 15 * 60 * 1000;
const url = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db = createClient(url, serviceKey, {auth: {persistSession: false, autoRefreshToken: false}});
const headers = {'Content-Type': 'application/json', 'Cache-Control': 'no-store'};
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), {status, headers});
let oauth: {token: string; expires: number} | null = null;

async function accountHash(userId: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${packageName}:${userId}`));
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}
async function accessToken() {
  if (oauth && oauth.expires > Date.now() + 60000) return oauth.token;
  const raw = Deno.env.get('PLAY_SERVICE_ACCOUNT_JSON');
  if (!raw) throw new Error('Play verification is not configured.');
  const credential = JSON.parse(raw);
  const key = await importPKCS8(credential.private_key, 'RS256');
  const assertion = await new SignJWT({scope: 'https://www.googleapis.com/auth/androidpublisher'})
    .setProtectedHeader({alg: 'RS256'}).setIssuer(credential.client_email)
    .setAudience('https://oauth2.googleapis.com/token').setIssuedAt().setExpirationTime('1h').sign(key);
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', signal: AbortSignal.timeout(12000),
    body: new URLSearchParams({grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion}),
  });
  if (!response.ok) throw new Error('Play verification temporarily unavailable.');
  const data = await response.json();
  oauth = {token: data.access_token, expires: Date.now() + data.expires_in * 1000};
  return oauth.token;
}
async function play(path: string, method = 'GET') {
  const response = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/${path}`, {
    method, signal: AbortSignal.timeout(12000),
    headers: {Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json'},
    ...(method === 'POST' ? {body: '{}'} : {}),
  });
  if (!response.ok) throw new Error('Google Play purchase verification failed. Please retry.');
  const body = await response.text();
  return body ? JSON.parse(body) : {};
}
async function configuration() {
  const {data, error} = await db.from('premium_config').select('product_id,enabled').eq('id', true).single();
  if (error || !data) throw new Error('Premium is not configured.');
  return data;
}
async function verify(token: string, userId: string, productId: string) {
  const checkedAt = new Date().toISOString();
  const purchase = verifiedPurchase(
    await play(`purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`), productId, await accountHash(userId));
  // Bind ownership and persist first. Retrying a failed acknowledgement is safe.
  const persist = async () => {
    const {error} = await db.rpc('record_premium_purchase', {
      p_token: token, p_user: userId, p_product: productId, p_plan: purchase.basePlanId,
      p_state: purchase.state, p_expiry: purchase.expiry, p_checked: checkedAt,
      p_ack: purchase.acknowledged, p_linked: purchase.pending ? null : purchase.linked,
    });
    if (error) throw new Error('Could not record purchase ownership.');
  };
  await persist();
  if (purchase.pending) return {purchaseState: 'pending', acknowledged: false};
  if (!purchase.acknowledged && grantsAccess(purchase.state, purchase.expiry, Date.now())) {
    await play(`purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}:acknowledge`, 'POST');
    purchase.acknowledged = true;
    await persist();
  }
  return {purchaseState: purchase.state, acknowledged: purchase.acknowledged};
}
async function entitlement(userId: string) {
  const now = Date.now();
  const {data, error} = await db.from('premium_purchases')
    .select('expires_at,verified_at,state,acknowledged').eq('user_id', userId).eq('superseded', false)
    .order('expires_at', {ascending: false});
  if (error) throw new Error('Could not load premium access.');
  const eligible = (data || []).find(p => p.acknowledged && grantsAccess(p.state, p.expires_at, now) && Date.parse(p.verified_at) + LEASE_MS > now);
  const latest = eligible || data?.[0];
  return {userId, active: Boolean(eligible), expiresAt: latest?.expires_at || null,
    verifiedAt: latest?.verified_at || null, serverTime: new Date(now).toISOString(),
    validUntil: eligible ? new Date(Math.min(Date.parse(eligible.expires_at), Date.parse(eligible.verified_at) + LEASE_MS)).toISOString() : null,
    features: eligible ? ['gps_capture', 'pdf_reports'] : []};
}
async function refreshUser(userId: string, productId: string) {
  const {data, error} = await db.from('premium_purchases').select('purchase_token,verified_at')
    .eq('user_id', userId).eq('superseded', false)
    .or(`expires_at.gt.${new Date().toISOString()},state.eq.SUBSCRIPTION_STATE_PENDING`);
  if (error) throw new Error('Could not check premium access.');
  for (const row of data || []) {
    if (Date.parse(row.verified_at) < Date.now() - 60000) await verify(row.purchase_token, userId, productId);
  }
}
async function reconcile(productId: string) {
  // Bounded batches; oldest-due rows are always handled first, including after
  // expiry so the database records the terminal Play state.
  const {data, error} = await db.from('premium_purchases').select('purchase_token,user_id')
    .eq('superseded', false).lte('next_check_at', new Date().toISOString())
    .or(`expires_at.gt.${new Date(Date.now() - 30 * 86400000).toISOString()},state.eq.SUBSCRIPTION_STATE_PENDING`)
    .order('next_check_at').limit(40);
  if (error) throw new Error('Could not load reconciliation queue.');
  let failed = 0;
  for (let i = 0; i < (data || []).length; i += 5) {
    await Promise.all(data!.slice(i, i + 5).map(async row => {
      try { await verify(row.purchase_token, row.user_id, productId); }
      catch {
        failed++;
        await db.from('premium_purchases').update({next_check_at: new Date(Date.now() + 60000).toISOString()})
          .eq('purchase_token', row.purchase_token);
      }
    }));
  }
  return {checked: data?.length || 0, failed};
}

Deno.serve(async request => {
  if (request.method !== 'POST') return reply({error: 'POST required'}, 405);
  try {
    const body = await request.json();
    const config = await configuration();
    if (body.action === 'catalog') return reply({productId: config.product_id, enabled: config.enabled});
    if (body.action === 'reconcile') {
      const secret = Deno.env.get('PREMIUM_CRON_SECRET');
      if (!secret || request.headers.get('x-premium-cron-secret') !== secret) return reply({error: 'Unauthorized'}, 401);
      return reply(await reconcile(config.product_id));
    }
    const bearer = request.headers.get('Authorization')?.replace(/^Bearer /i, '');
    if (!bearer) return reply({error: 'Sign in required'}, 401);
    const {data: {user}, error} = await db.auth.getUser(bearer);
    if (error || !user) return reply({error: 'Sign in required'}, 401);
    if (body.action === 'verify') {
      const token = body.purchaseToken;
      if (typeof token !== 'string' || token.length < 10 || token.length > 4096) return reply({error: 'Invalid purchase token'}, 400);
      const result = await verify(token, user.id, config.product_id);
      return reply({...result, entitlement: await entitlement(user.id)});
    }
    if (body.action === 'status' || body.action === 'prepare') {
      if (body.action === 'prepare' && !config.enabled) return reply({error: 'Purchases are not available yet'}, 409);
      await refreshUser(user.id, config.product_id);
      return reply({entitlement: await entitlement(user.id),
        ...(body.action === 'prepare' ? {accountId: await accountHash(user.id)} : {})});
    }
    return reply({error: 'Unknown action'}, 400);
  } catch {
    // Never log or return credentials, purchase tokens, or upstream response bodies.
    return reply({error: 'Premium verification is temporarily unavailable. Please retry.'}, 503);
  }
});
