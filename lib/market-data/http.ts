export async function fetchWithTimeout(
    url: string,
    init: RequestInit = {},
    context: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), context.timeoutMs ?? 4000);
    const onAbort = () => controller.abort();
    if (context.signal?.aborted) controller.abort();
    else context.signal?.addEventListener('abort', onAbort, { once: true });

    try {
        return await fetch(url, {
            ...init,
            signal: controller.signal,
            cache: init.cache ?? 'no-store',
        });
    } finally {
        clearTimeout(timeout);
        context.signal?.removeEventListener('abort', onAbort);
    }
}

export async function fetchJson<T>(
    url: string,
    context: { signal?: AbortSignal; timeoutMs?: number } = {},
    init: RequestInit = {},
): Promise<T> {
    const response = await fetchWithTimeout(url, init, context);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} from ${new URL(url).hostname}`);
    }

    const text = (await response.text()).trim();
    if (text.startsWith('{') || text.startsWith('[')) {
        return JSON.parse(text) as T;
    }

    const jsonp = text.match(/^[\w$.]+\((.*)\);?$/s);
    if (jsonp) return JSON.parse(jsonp[1]) as T;
    throw new Error(`Invalid JSON response from ${new URL(url).hostname}`);
}

export async function fetchText(
    url: string,
    encoding = 'utf-8',
    context: { signal?: AbortSignal; timeoutMs?: number } = {},
    init: RequestInit = {},
): Promise<string> {
    const response = await fetchWithTimeout(url, init, context);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} from ${new URL(url).hostname}`);
    }
    const buffer = await response.arrayBuffer();
    return new TextDecoder(encoding).decode(buffer);
}
