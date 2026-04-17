'use strict';
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const DATA_DIR = __dirname;

// ── Helpers ───────────────────────────────────────────────────────────────────

function cuid() {
    return 'c' + crypto.randomBytes(14).toString('base64url').toLowerCase().replace(/[^a-z0-9]/g, '0').slice(0, 24);
}

function now() {
    return new Date().toISOString();
}

// ── Table class ───────────────────────────────────────────────────────────────
// Provides a Prisma-compatible async API backed by a .json file on disk.
// Each file stores an array of plain objects. All reads are in-memory after
// first load; every write flushes back to disk immediately.

class Table {
    constructor(filename) {
        this.file    = path.join(DATA_DIR, filename);
        this._cache  = null;
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    _load() {
        if (this._cache !== null) return this._cache;
        try {
            this._cache = JSON.parse(fs.readFileSync(this.file, 'utf8'));
        } catch {
            this._cache = [];
        }
        return this._cache;
    }

    _flush() {
        fs.writeFileSync(this.file, JSON.stringify(this._cache, null, 2));
    }

    // Deep-match a record against a Prisma-style where clause.
    // Handles:
    //   { id: '...' }
    //   { nodeId: '...', sessionId: '...' }
    //   { nodeId_sessionId: { nodeId: '...', sessionId: '...' } }   ← compound unique
    //   { status: 'ACTIVE' }
    //   { sourceUrl: '...' }
    _match(record, where) {
        if (!where) return true;
        return Object.entries(where).every(([key, val]) => {
            // Compound unique shorthand: nodeId_sessionId → { nodeId, sessionId }
            if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
                return Object.entries(val).every(([k, v]) => record[k] === v);
            }
            return record[key] === val;
        });
    }

    _applyOrderBy(records, orderBy) {
        if (!orderBy) return records;
        const clauses = Array.isArray(orderBy) ? orderBy : [orderBy];
        return [...records].sort((a, b) => {
            for (const clause of clauses) {
                const [field, dir] = Object.entries(clause)[0];
                const av = a[field], bv = b[field];
                const cmp = av < bv ? -1 : av > bv ? 1 : 0;
                if (cmp !== 0) return dir === 'desc' ? -cmp : cmp;
            }
            return 0;
        });
    }

    // ── Prisma-compatible API ─────────────────────────────────────────────────

    async create({ data }) {
        const records = this._load();
        const ts = now();
        const record = { id: cuid(), createdAt: ts, updatedAt: ts, ...data };
        records.push(record);
        this._flush();
        return record;
    }

    async createMany({ data, skipDuplicates = false }) {
        const records = this._load();
        let count = 0;
        for (const item of data) {
            if (skipDuplicates && records.some(r => r.id === item.id)) continue;
            const ts = now();
            records.push({ id: cuid(), createdAt: ts, updatedAt: ts, ...item });
            count++;
        }
        this._flush();
        return { count };
    }

    async findMany({ where, orderBy, take, skip } = {}) {
        let results = this._load().filter(r => this._match(r, where));
        results = this._applyOrderBy(results, orderBy);
        if (skip)  results = results.slice(skip);
        if (take)  results = results.slice(0, take);
        return results;
    }

    async findFirst({ where } = {}) {
        return this._load().find(r => this._match(r, where)) ?? null;
    }

    async findUnique({ where }) {
        return this._load().find(r => this._match(r, where)) ?? null;
    }

    async update({ where, data }) {
        const records = this._load();
        const idx = records.findIndex(r => this._match(r, where));
        if (idx === -1) throw Object.assign(new Error('Record not found'), { code: 'P2025' });
        records[idx] = { ...records[idx], ...data, updatedAt: now() };
        this._flush();
        return records[idx];
    }

    async delete({ where }) {
        const records = this._load();
        const idx = records.findIndex(r => this._match(r, where));
        if (idx === -1) throw Object.assign(new Error('Record not found'), { code: 'P2025' });
        const [deleted] = records.splice(idx, 1);
        this._flush();
        return deleted;
    }

    async deleteMany({ where } = {}) {
        const records = this._load();
        const before = records.length;
        this._cache = records.filter(r => !this._match(r, where));
        this._flush();
        return { count: before - this._cache.length };
    }
}

// ── Database instance ─────────────────────────────────────────────────────────

const db = {
    lead:             new Table('leads.json'),
    caseStudy:        new Table('case_studies.json'),
    intelligenceNode: new Table('intelligence_nodes.json'),
    vote:             new Table('votes.json'),
    orthoM8Lead:      new Table('orthom8_leads.json'),

    // Sequential transaction — runs each promise-returning operation in order.
    // Not truly atomic, but sufficient for single-node JSON file storage.
    async $transaction(operations) {
        const results = [];
        for (const op of operations) {
            results.push(await op);
        }
        return results;
    }
};

module.exports = db;
