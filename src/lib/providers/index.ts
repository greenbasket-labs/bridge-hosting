import type { HostingProvider } from './types';
import { LocalProvider } from './local';
import { RenderProvider } from './render';
export function getProvider(name=process.env.PROVIDER):HostingProvider { if(name==='render') return new RenderProvider(); return new LocalProvider(); }
