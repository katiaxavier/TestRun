import { Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { CurrentUser } from './current-user.decorator';
import type { User } from '@prisma/client';

const STATE_COOKIE = 'trs_oauth_state';
const SESSION_COOKIE = 'trs_session';
const isProd = process.env.NODE_ENV === 'production';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('login')
  login(@Res() res: Response) {
    const state = randomBytes(16).toString('hex');
    res.cookie(STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      maxAge: 5 * 60 * 1000,
    });
    res.redirect(this.authService.buildAuthorizationUrl(state));
  }

  @Public()
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    const expectedState = req.cookies?.[STATE_COOKIE];
    res.clearCookie(STATE_COOKIE);

    if (!code || !state || state !== expectedState) {
      return res.redirect(`${frontendUrl}/?error=state_mismatch`);
    }

    try {
      const tokens = await this.authService.exchangeCode(code);
      const profile = await this.authService.fetchProfile(tokens.access_token);
      const user = await this.authService.upsertUser(profile, tokens);
      const sessionToken = this.authService.issueSessionToken(user);

      res.cookie(SESSION_COOKIE, sessionToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProd,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      res.redirect(frontendUrl);
    } catch (error) {
      console.error('OAuth callback failed:', error);
      res.redirect(`${frontendUrl}/?error=oauth_failed`);
    }
  }

  @Get('me')
  me(@CurrentUser() user: User) {
    return {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
    };
  }

  @Post('logout')
  logout(@Res() res: Response) {
    res.clearCookie(SESSION_COOKIE);
    res.json({ success: true });
  }
}
