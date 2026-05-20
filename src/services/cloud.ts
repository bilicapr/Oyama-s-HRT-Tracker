export interface CloudSnapshot {
    id: string;
    user_id: string;
    data: string;
    created_at: number;
}

export const cloudService = {
    /** Save (upsert) the user's full app state */
    async save(token: string, data: any): Promise<void> {
        const res = await fetch('/api/content', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ data })
        });
        if (!res.ok) throw new Error('Failed to save');
    },

    /** Load the user's latest snapshot (single row) */
    async load(token: string): Promise<any | null> {
        const res = await fetch('/api/content', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load');
        const row = await res.json() as CloudSnapshot | null;
        if (!row || !row.data) return null;
        return JSON.parse(row.data);
    }
};
