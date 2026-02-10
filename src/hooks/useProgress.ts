import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';

interface ProgressPayload {
    progress: number;
    status: string;
}

export function useProgress() {
    const [progress, setProgress] = useState<number>(0);
    const [status, setStatus] = useState<string>('');

    useEffect(() => {
        const unlisten = listen<ProgressPayload>('progress', (event) => {
            setProgress(event.payload.progress);
            setStatus(event.payload.status);
        });

        return () => {
            unlisten.then((f) => f());
        };
    }, []);

    const resetProgress = () => {
        setProgress(0);
        setStatus('');
    };

    return { progress, status, resetProgress };
}
