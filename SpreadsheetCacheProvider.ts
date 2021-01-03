import { CustomCacheProvider } from "./CustomCacheProvider";

export class SpreadsheetCacheProvider implements CustomCacheProvider {

    public constructor(private readonly _sheet: GoogleAppsScript.Spreadsheet.Sheet) { }

    private _intermediateCache: Record<string, any> = null;
    private _keyToIndexMap: Record<string, number> = {};
    private _keys: string[] = [];
    private _putKeyRequests: string[] = [];

    private getIntermediateCahe(): Record<string, any> {
        if (!this._intermediateCache) {
            this._intermediateCache = {};
            const rows = this._sheet.getDataRange().getValues();
            for (const row of rows) {
                const key = row[0] as string;
                if (!key) {
                    continue;
                }
                let value = '';
                for (let i = 1; i < row.length; i++) {
                    value += row[i] as string;
                }
                this._intermediateCache[key] = value ? JSON.parse(value) : null;
                this._keyToIndexMap[key] = this._keys.push(key) - 1;
            }
        }
        return this._intermediateCache;
    }

    get<T>(key: string): T {
        const cache = this.getIntermediateCahe();
        return (key in cache) ? cache[key] as T : null;
    }

    put<T>(key: string, value: T): void {
        const cache = this.getIntermediateCahe();
        cache[key] = value;
        if (this._putKeyRequests.indexOf(key) === -1) {
            this._putKeyRequests.push(key);
        }
        if (!(key in this._keyToIndexMap)) {
            this._keyToIndexMap[key] = this._keys.push(key) - 1;
        }
    }

    apply(): void {
        if (this._putKeyRequests.length === 0) {
            return;
        }

        // 書き換える行の範囲を決める
        let minIndex = -1;
        let maxIndex = -1;
        this._putKeyRequests.forEach(key => {
            if (!(key in this._keyToIndexMap)) {
                this._keyToIndexMap[key] = this._keys.push(key) - 1;
            }
            const index = this._keyToIndexMap[key];
            if (minIndex === -1 || index < minIndex) {
                minIndex = index;
            }
            if (maxIndex === -1 || index > maxIndex) {
                maxIndex = index;
            }
        });

        // 書き換える範囲のJSON文字列を取得する
        const jsonDatas: { key: string; value: string }[] = [];
        let maxLength = 0;
        for (let i = minIndex; i <= maxIndex; i++) {
            const key = this._keys[i];
            const value = JSON.stringify(this._intermediateCache[key]);
            jsonDatas.push({
                key: key,
                value: value,
            });
            maxLength = Math.max(value.length, maxLength);
        }

        // 最大カラム数を算出する
        const strLength = 49500;
        const columnLength = Math.max(
            Math.ceil(maxLength / strLength) + 1,
            this._sheet.getLastColumn());

        // 書き込む用のデータに変換する
        const values: string[][] = [];
        for (let i = minIndex; i <= maxIndex; i++) {
            const row: string[] = [jsonDatas[i].key];
            let tmpValue = jsonDatas[i].value;
            while (tmpValue.length > 0) {
                row.push(tmpValue.substring(0, strLength));
                tmpValue = tmpValue.slice(strLength);
            }
            while (row.length < columnLength) {
                row.push('');
            }
            values.push(row);
        }

        // 書き込む
        this._sheet.getRange(minIndex + 1, 1, values.length, columnLength).setValues(values);

        this._putKeyRequests.length = 0;
    }
}