import { CustomCacheProvider } from "./CustomCacheProvider";

export class ScriptCacheProvider implements CustomCacheProvider {
    public expirationInSeconds = 600;

    private _cache: GoogleAppsScript.Cache.Cache = null;
    private getCache(): GoogleAppsScript.Cache.Cache {
        if (!this._cache) {
            this._cache = CacheService.getScriptCache();
        }
        return this._cache;
    }

    private _intermediateCache: Record<string, any> = {};
    private _putKeyRequests: string[] = [];

    public get<T>(key: string): T {
        if (!(key in this._intermediateCache)) {
            const value = this.getCache().get(key);
            this._intermediateCache[key] = value ? JSON.parse(value) : null;
        }
        return this._intermediateCache[key] as T;
    }

    public put<T>(key: string, value: T): void {
        this._intermediateCache[key] = value;
        if (this._putKeyRequests.indexOf(key) === -1) {
            this._putKeyRequests.push(key);
        }
    }

    apply(): void {
        if (this._putKeyRequests.length === 0) {
            return;
        }
        const values: Record<string, string> = {};
        this._putKeyRequests.forEach(key => {
            values[key] = JSON.stringify(this._intermediateCache[key]);
        });
        this.getCache().putAll(values, this.expirationInSeconds);
        this._putKeyRequests.length = 0;
    }
}