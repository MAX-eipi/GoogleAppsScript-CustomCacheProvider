interface CustomCacheProvider {
    get<T>(key: string): T;
    put<T>(key: string, value: T): void;
    apply(): void;
}
