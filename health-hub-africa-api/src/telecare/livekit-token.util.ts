import { ConfigService } from '@nestjs/config';
import { AccessToken } from 'livekit-server-sdk';

export interface LivekitCredentials {
  apiKey: string;
  apiSecret: string;
  serverUrl: string;
}

export function getLivekitCredentials(config: ConfigService): LivekitCredentials {
  const apiKey = config.get<string>('LIVEKIT_API_KEY');
  const apiSecret = config.get<string>('LIVEKIT_API_SECRET');
  const serverUrl = config.get<string>('LIVEKIT_URL');
  if (!apiKey || !apiSecret || !serverUrl) {
    throw new Error('LiveKit credentials are not fully configured on the server');
  }
  return { apiKey, apiSecret, serverUrl };
}

export async function mintLivekitToken(
  creds: LivekitCredentials,
  params: {
    identity: string;
    name: string;
    roomName: string;
    metadata?: string;
    canPublish?: boolean;
    canSubscribe?: boolean;
  },
): Promise<{ token: string; serverUrl: string; roomName: string }> {
  const at = new AccessToken(creds.apiKey, creds.apiSecret, {
    identity: params.identity,
    name: params.name,
    metadata: params.metadata,
  });

  at.addGrant({
    roomJoin: true,
    room: params.roomName,
    canPublish: params.canPublish ?? true,
    canSubscribe: params.canSubscribe ?? true,
  });

  return { token: await at.toJwt(), serverUrl: creds.serverUrl, roomName: params.roomName };
}
