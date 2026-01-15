export const JITSI_CONFIG = {
  domain: 'meet.jit.si',
  options: {
    roomName: '',
    width: '100%',
    height: '100%',
    parentNode: null as HTMLElement | null,
    configOverwrite: {
      prejoinPageEnabled: false,
      disableDeepLinking: true,
      startWithAudioMuted: false,
      startWithVideoMuted: false,
    },
    interfaceConfigOverwrite: {
      SHOW_JITSI_WATERMARK: false,
      SHOW_WATERMARK_FOR_GUESTS: false,
      TOOLBAR_BUTTONS: [
        'microphone',
        'camera',
        'closedcaptions',
        'desktop',
        'fullscreen',
        'fodeviceselection',
        'hangup',
        'chat',
        'recording',
        'etherpad',
        'sharedvideo',
        'settings',
        'raisehand',
        'videoquality',
        'filmstrip',
        'stats',
        'shortcuts',
        'tileview',
        'help',
      ],
    },
  },
};

export function createJitsiConfig(roomName: string, parentNode: HTMLElement) {
  return {
    ...JITSI_CONFIG,
    options: {
      ...JITSI_CONFIG.options,
      roomName,
      parentNode,
    },
  };
}

export type JitsiConfig = typeof JITSI_CONFIG;
