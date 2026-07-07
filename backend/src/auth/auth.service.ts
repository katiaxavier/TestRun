import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { encryptToken, decryptToken } from '../common/token-crypto.util';

const AUTHORIZE_URL = 'https://auth.atlassian.com/authorize';
const TOKEN_URL = 'https://auth.atlassian.com/oauth/token';
const ACCESSIBLE_RESOURCES_URL =
  'https://api.atlassian.com/oauth/token/accessible-resources';
const PROFILE_URL = 'https://api.atlassian.com/me';
const SITE_CACHE_TTL_MS = 10 * 60 * 1000;

interface AtlassianTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface AtlassianProfile {
  account_id: string;
  name: string;
  email: string;
  picture: string;
}

export interface AtlassianSite {
  cloudId: string;
  url: string;
}

@Injectable()
export class AuthService {
  private cachedSite: { site: AtlassianSite; expiresAt: number } | null =
    null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  buildAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      audience: 'api.atlassian.com',
      client_id: process.env.ATLASSIAN_CLIENT_ID ?? '',
      // read:board-scope:jira-software + read:issue-details:jira são escopos granulares
      // (aba "Granular scopes" dentro da própria Jira API no console) — necessários para
      // /rest/agile/1.0/board (quadros), que a Jira Software REST API exige em vez dos
      // escopos clássicos.
      scope: 'read:me read:jira-work read:board-scope:jira-software read:issue-details:jira read:project:jira offline_access',
      redirect_uri: process.env.OAUTH_REDIRECT_URI ?? '',
      state,
      response_type: 'code',
      prompt: 'consent',
    });
    return `${AUTHORIZE_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<AtlassianTokens> {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: process.env.ATLASSIAN_CLIENT_ID,
        client_secret: process.env.ATLASSIAN_CLIENT_SECRET,
        code,
        redirect_uri: process.env.OAUTH_REDIRECT_URI,
      }),
    });
    if (!response.ok) {
      throw new UnauthorizedException(
        'Falha ao trocar o código de autorização com o Atlassian.',
      );
    }
    return response.json();
  }

  private async refreshAccessToken(
    refreshToken: string,
  ): Promise<AtlassianTokens> {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: process.env.ATLASSIAN_CLIENT_ID,
        client_secret: process.env.ATLASSIAN_CLIENT_SECRET,
        refresh_token: refreshToken,
      }),
    });
    if (!response.ok) {
      throw new UnauthorizedException(
        'Falha ao renovar o token do Atlassian. Faça login novamente.',
      );
    }
    return response.json();
  }

  async fetchProfile(accessToken: string): Promise<AtlassianProfile> {
    const response = await fetch(PROFILE_URL, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new UnauthorizedException(
        'Falha ao obter o perfil do usuário no Atlassian.',
      );
    }
    return response.json();
  }

  async resolveSite(accessToken: string): Promise<AtlassianSite> {
    if (this.cachedSite && this.cachedSite.expiresAt > Date.now()) {
      return this.cachedSite.site;
    }

    const response = await fetch(ACCESSIBLE_RESOURCES_URL, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new UnauthorizedException(
        'Falha ao listar sites acessíveis no Atlassian.',
      );
    }
    const resources = (await response.json()) as Array<{
      id: string;
      url: string;
    }>;

    const fixedCloudId = process.env.JIRA_CLOUD_ID;
    const resource = fixedCloudId
      ? resources.find((r) => r.id === fixedCloudId)
      : resources[0];

    if (!resource) {
      throw new UnauthorizedException(
        'Nenhum site do Jira acessível foi encontrado para este usuário.',
      );
    }

    const site: AtlassianSite = { cloudId: resource.id, url: resource.url };
    this.cachedSite = { site, expiresAt: Date.now() + SITE_CACHE_TTL_MS };
    return site;
  }

  async upsertUser(
    profile: AtlassianProfile,
    tokens: AtlassianTokens,
  ): Promise<User> {
    const data = {
      displayName: profile.name,
      email: profile.email,
      avatarUrl: profile.picture,
      accessToken: encryptToken(tokens.access_token),
      refreshToken: encryptToken(tokens.refresh_token),
      accessTokenExpires: new Date(Date.now() + tokens.expires_in * 1000),
    };
    return this.prisma.user.upsert({
      where: { atlassianAccountId: profile.account_id },
      create: { atlassianAccountId: profile.account_id, ...data },
      update: data,
    });
  }

  async getValidAccessToken(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.accessToken || !user.refreshToken || !user.accessTokenExpires) {
      throw new UnauthorizedException(
        'Sessão do Atlassian expirada. Faça login novamente.',
      );
    }

    const isExpired = user.accessTokenExpires.getTime() - 60_000 < Date.now();
    if (!isExpired) {
      return decryptToken(user.accessToken);
    }

    const tokens = await this.refreshAccessToken(decryptToken(user.refreshToken));
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        accessToken: encryptToken(tokens.access_token),
        refreshToken: encryptToken(tokens.refresh_token),
        accessTokenExpires: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });
    return tokens.access_token;
  }

  issueSessionToken(user: User): string {
    return this.jwtService.sign({ sub: user.id });
  }

  verifySessionToken(token: string): { sub: string } {
    return this.jwtService.verify(token);
  }
}
