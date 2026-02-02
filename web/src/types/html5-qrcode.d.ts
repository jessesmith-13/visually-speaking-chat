declare module "html5-qrcode" {
  export interface Html5QrcodeConfig {
    fps?: number;
    qrbox?: { width: number; height: number } | number;
    aspectRatio?: number;
    disableFlip?: boolean;
  }

  export interface CameraDevice {
    id: string;
    label: string;
  }

  export type QrcodeSuccessCallback = (
    decodedText: string,
    result: unknown,
  ) => void;
  export type QrcodeErrorCallback = (
    errorMessage: string,
    error: unknown,
  ) => void;

  export class Html5Qrcode {
    constructor(elementId: string, verbose?: boolean);

    start(
      cameraIdOrConfig: string | { facingMode: string },
      config: Html5QrcodeConfig,
      qrCodeSuccessCallback: QrcodeSuccessCallback,
      qrCodeErrorCallback?: QrcodeErrorCallback,
    ): Promise<void>;

    stop(): Promise<void>;

    clear(): void;

    isScanning: boolean;

    static getCameras(): Promise<CameraDevice[]>;
  }
}
