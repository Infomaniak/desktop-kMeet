export {};

interface IJitsiNodeAPI {
    openExternalLink(url: string): void;
    ipc: {
        on(channel: string, listener: (...args: any[]) => void): () => void;
        send(channel: string, ...args: any[]): void;
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
