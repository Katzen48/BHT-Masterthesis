export async function chunk(array: Array<any>, callback: Function, chunkSize: number = 200) {
    let start = 0;
    while (start < array.length) {
        await callback(array.slice(start, start + chunkSize))

        start += chunkSize
    }
}