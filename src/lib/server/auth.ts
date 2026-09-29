import bcrypt from 'bcryptjs';

type Env = { ADMIN_USER?: string; ADMIN_PASSWORD_HASH?: string };

export async function checkCredentials(user: string, pass: string, env: Env = process.env): Promise<boolean> {
  if (!env.ADMIN_USER || !env.ADMIN_PASSWORD_HASH) return false;
  const passOk = await bcrypt.compare(pass, env.ADMIN_PASSWORD_HASH);
  return passOk && user === env.ADMIN_USER;
}

const MAX_FALHAS = 5;
const BLOQUEIO_MS = 15 * 60_000;

export class LoginLimiter {
  private falhas = new Map<string, { n: number; ate: number }>();

  isBlocked(ip: string, now: number): boolean {
    const f = this.falhas.get(ip);
    if (!f || f.n < MAX_FALHAS) return false;
    if (now > f.ate) { this.falhas.delete(ip); return false; }
    return true;
  }

  fail(ip: string, now: number): void {
    const f = this.falhas.get(ip) ?? { n: 0, ate: 0 };

    // Se já bloqueado, não estende o bloqueio
    if (f.n >= MAX_FALHAS && now <= f.ate) return;

    // Se bloqueio expirou, reinicia a contagem
    if (now > f.ate) {
      f.n = 0;
    }

    f.n += 1;
    f.ate = now + BLOQUEIO_MS;
    this.falhas.set(ip, f);
  }

  reset(ip: string): void { this.falhas.delete(ip); }
}

export const loginLimiter = new LoginLimiter();

// O Astro usa a 1.ª entrada de X-Forwarded-For, que o cliente controla; o proxy acrescenta o IP real no fim.
export function clientIp(forwardedFor: string | null, socketAddress: string): string {
  const ultimo = forwardedFor?.split(',').pop()?.trim();
  return ultimo || socketAddress;
}
