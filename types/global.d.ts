export {};

interface IJitsiNodeAPI {
    openExternalLink(url: string): void;
    setupRenderer(api: any, options?: { enableRemoteControl?: boolean; enableAlwaysOnTopWindow?: boolean }): void;
    ipc: {
        on(channel: string, listener: (...args: any[]) => void): void;
        send(channel: string, ...args: any[]): void;
        removeListener(channel: string, listener: (...args: any[]) => void): void;
    };
}

declare global {
    interface Window {
        jitsiNodeAPI: IJitsiNodeAPI;
        jitsiElectronSDK: any;
    }

    namespace NodeJS {
        interface Process {
            mas?: boolean;
        }
    }
}
