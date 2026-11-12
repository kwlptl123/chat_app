/**
 * ValidatorHelper — schema-driven validation factory on top of express-validator.
 *
 * 1. ONE SCHEMA, MANY USES (DRY)
 *    Describe an entity once as a `Schema`, then derive:
 *      - ValidatorHelper.schema(s)   -> create / save   (required fields enforced)
 *      - ValidatorHelper.partial(s)  -> update          (every field optional, still type-checked)
 *      - nested objects / arrays inside a schema -> bulk & composite payloads
 *
 * 2. UPSERT AWARE
 *    An object spec can declare `upsertKey` (e.g. "invoice_item_id"). If that key is present on the
 *    row it is treated as an UPDATE, so its `required` fields are not enforced; otherwise it is a CREATE.
 *
 * 3. NESTED-SAFE
 *    Child `required` rules only apply when the parent object exists (the parent's own rule decides
 *    whether the parent is mandatory). Error messages use the real path, e.g. "invoiceItems[2].quantity ...".
 *
 * 4. LEGACY HELPERS KEPT
 *    string / int / boolean / ... / idParam keep their old signatures and also accept an options object.
 *
 * 5. FAST, SELF-CONTAINED VALIDATION
 *    Each validator group is ONE middleware. All chains run concurrently (so every error is reported
 *    together), the 400 is sent from the route layer, and express-validator's per-request state is
 *    released before the controller runs. Controllers must NOT call validationResult(req).
 */

import { body, param, query, ValidationChain } from "express-validator";
import type { Meta } from "express-validator";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import commonResponse from "./response.js";
import responseCode from "../constants/code/http.status.code.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Location = "body" | "query" | "params";
type RequiredFn = (req: Request, path: string) => boolean;
type RequiredOpt = boolean | RequiredFn;

interface Base {
    required?: RequiredOpt;                    // true | false | (req, path) => boolean
    message?: string;                          // overrides the "is required" message
    label?: string;                            // friendly name used instead of the path
    custom?: (value: any, meta: Meta) => any;  // extra rule (return falsy / throw to fail)
    customMessage?: string;
}

export type Spec = Base & (
    | { type: "string"; min?: number; max?: number; trim?: boolean; case?: "lower" | "upper"; pattern?: RegExp; patternMessage?: string }
    | { type: "int"; min?: number; max?: number }
    | { type: "decimal"; min?: number; max?: number; scale?: number }
    | { type: "boolean" | "email" | "uuid" | "json" | "phone" | "url" }
    | { type: "date"; after?: string; before?: string; notPast?: boolean }      // after/before = sibling field name
    | { type: "enum"; values: readonly (string | number)[] }
    | { type: "array"; min?: number; max?: number; unique?: boolean | string; of?: Spec } // unique: true (scalars) | "key" (objects)
    | { type: "object"; schema?: Schema; upsertKey?: string }
);
export type Schema = Record<string, Spec>;
type Opts<T extends Spec["type"]> = Omit<Extract<Spec, { type: T }>, "type" | "required">;
type Validator = RequestHandler[];

interface Ctx { location: Location; partial?: boolean; upsertKey?: string }

const SELECTORS = { body, query, params: param } as const;

// Internal key express-validator uses to keep contexts on the request.
// Re-check after library upgrades.
const CONTEXTS_KEY = "express-validator#contexts";

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------
const isNil = (v: any) => v === undefined || v === null;
const isBlank = (v: any) => isNil(v) || (typeof v === "string" && v.trim() === "");
const defined = (o: Record<string, any>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

const getByPath = (root: any, p: string) =>
    p ? p.split(/[.[\]]+/).filter(Boolean).reduce((o, k) => (isNil(o) ? undefined : o[k]), root) : root;

// "invoiceItems[0].qty" -> "invoiceItems[0]" ; "name" -> ""
const parentOf = (path: string) => {
    const p = path.replace(/(\.[^.[\]]+|\[\d+\])$/, "");
    return p === path ? "" : p;
};
const sibling = (path: string, key: string) => {
    const p = parentOf(path);
    return p ? `${p}.${key}` : key;
};

// Runtime message builder: uses the label, or the real resolved path (e.g. items[3].qty)
const msg = (label: string | undefined, text: string) => (_v: any, { path }: Meta) => `${label ?? path} ${text}`;

const lengthText = (min?: number, max?: number) =>
    min !== undefined && max !== undefined ? `must be between ${min} and ${max} characters.`
        : min !== undefined ? `must be at least ${min} characters.`
        : `cannot exceed ${max} characters.`;

const rangeText = (what: string, min?: number, max?: number) =>
    `must be ${what}${min !== undefined && max !== undefined ? ` between ${min} and ${max}`
        : min !== undefined ? ` greater than or equal to ${min}`
        : max !== undefined ? ` less than or equal to ${max}` : ""}.`;

const countText = (min?: number, max?: number) =>
    min !== undefined && max !== undefined ? ` with ${min} to ${max} items`
        : min !== undefined ? ` with at least ${min} item(s)`
        : max !== undefined ? ` with at most ${max} item(s)` : "";

// ---------------------------------------------------------------------------
// Runner: one middleware per validator group
// ---------------------------------------------------------------------------
const releaseState = (req: Request) => { delete (req as any)[CONTEXTS_KEY]; };

/**
 * Runs every chain concurrently, collects ALL errors, responds 400 itself on failure,
 * and frees express-validator's request state before the controller starts.
 */
const runValidation = (chains: ValidationChain[]): RequestHandler =>
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const results = await Promise.all(chains.map((chain) => chain.run(req)));
            const errors = results.flatMap((r) => r.array());

            releaseState(req);

            if (errors.length) {
                return res.status(responseCode.BAD_REQUEST).send(
                    commonResponse(responseCode.BAD_REQUEST, "Validation failed", errors, true)
                );
            }
            return next();
        } catch (err) {
            releaseState(req);
            return next(err);
        }
    };

const withHandler = (chains: ValidationChain[]): Validator => [runValidation(chains)];

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------
const resolveRequired = (spec: Spec, ctx: Ctx): RequiredFn | false => {
    if (ctx.partial || !spec.required) return false;
    const own: RequiredFn = typeof spec.required === "function" ? spec.required : () => true;

    return (req, path) => {
        const root = (req as any)[ctx.location];
        const parent = parentOf(path);
        if (parent && isNil(getByPath(root, parent))) return false;                                   // parent missing -> parent's rule decides
        if (ctx.upsertKey && !isBlank(getByPath(root, sibling(path, ctx.upsertKey)))) return false;   // row has an id -> it's an update
        return own(req, path);
    };
};

const applyPresence = (rule: ValidationChain, required: RequiredFn | false, spec: Spec): ValidationChain =>
    rule
        // Required fields must not be blank (undefined, null or "")
        .custom((v, { req, path }) => !(required && required(req as Request, path) && isBlank(v)))
        .withMessage(spec.message ?? msg(spec.label, "is required."))
        .bail()
        // Absent optional fields skip the type checks; "" still flows through so the type rule catches it
        .if((v: any) => !isNil(v));

// Numbers: strict JSON number in the body; query/params always arrive as strings, so they are not strict-checked
const strictNumber = (rule: ValidationChain, s: Spec, ctx: Ctx): ValidationChain =>
    ctx.location === "body"
        ? rule.custom((v) => typeof v === "number").withMessage(msg(s.label, "must be a strict number, not a string.")).bail()
        : rule;

const applyType = (rule: ValidationChain, s: Spec, ctx: Ctx): ValidationChain => {
    let r = rule;
    const m = (text: string) => msg(s.label, text);

    switch (s.type) {
        case "string":
            r = r.isString().withMessage(m("must be a valid string.")).bail();
            if (s.trim !== false) r = r.customSanitizer((v: any) => (typeof v === "string" ? v.trim() : v));
            if (s.case) r = r.customSanitizer((v: any) =>
                typeof v === "string" ? (s.case === "lower" ? v.toLowerCase() : v.toUpperCase()) : v);
            if (s.min !== undefined || s.max !== undefined)
                r = r.isLength(defined({ min: s.min, max: s.max })).withMessage(m(lengthText(s.min, s.max)));
            if (s.pattern) r = r.matches(s.pattern).withMessage(m(s.patternMessage ?? "has an invalid format."));
            break;

        case "int":
            r = strictNumber(r, s, ctx)
                .isInt(defined({ min: s.min, max: s.max }))
                .withMessage(m(rangeText("a valid integer", s.min, s.max)));
            break;

        case "decimal":
            r = strictNumber(r, s, ctx)
                .isFloat(defined({ min: s.min, max: s.max }))
                .withMessage(m(rangeText("a valid number", s.min, s.max)))
                .bail();
            if (s.scale !== undefined)
                r = r.isDecimal({ decimal_digits: `0,${s.scale}` })
                     .withMessage(m(`can have at most ${s.scale} decimal places.`));
            break;

        case "boolean": r = r.isBoolean().withMessage(m("must be true or false.")); break;
        case "email":   r = r.isEmail().withMessage(m("must be a valid email format.")); break;
        case "uuid":    r = r.isUUID().withMessage(m("must be a valid UUID.")); break;
        case "json":    r = r.isJSON().withMessage(m("must be a valid JSON string.")); break;
        case "url":     r = r.isURL({ require_protocol: true }).withMessage(m("must be a valid URL (including http/https).")); break;
        case "phone":   r = r.matches(/^\+?[0-9\s\-()]{7,20}$/).withMessage(m("must be a valid phone number.")); break;

        case "date": {
            r = r.isISO8601({ strict: true }).withMessage(m("must be a valid ISO8601 date.")).bail();
            const compare = (key: string, ok: (a: Date, b: Date) => boolean, text: string) => {
                r = r.custom((v, { req, path }) => {
                    const other = getByPath((req as any)[ctx.location], sibling(path, key));
                    return isBlank(other) || ok(new Date(v), new Date(other));
                }).withMessage(m(`${text} ${key}.`));
            };
            if (s.after) compare(s.after, (a, b) => a >= b, "must be on or after");
            if (s.before) compare(s.before, (a, b) => a <= b, "must be on or before");
            if (s.notPast) r = r.custom((v) => new Date(v).getTime() >= new Date().setHours(0, 0, 0, 0)).withMessage(m("cannot be in the past."));
            break;
        }

        case "enum":
            r = r.isIn([...s.values]).withMessage(m(`must be one of the following values: ${s.values.join(", ")}.`));
            break;

        case "array": {
            r = r.isArray(defined({ min: s.min, max: s.max })).withMessage(m(`must be a valid array${countText(s.min, s.max)}.`)).bail();
            const u = s.unique;
            if (u) r = r.custom((arr: any[]) => {
                const keys = arr.map((x) => (u === true ? x : x?.[u])).filter((k) => !isBlank(k));
                return new Set(keys).size === keys.length;
            }).withMessage(m(u === true ? "must not contain duplicate values." : `must not contain duplicate ${u} values.`));
            break;
        }

        case "object":
            r = r.isObject().withMessage(m("must be a valid key-value object."));
            break;
    }

    if (s.custom) r = r.custom(s.custom).withMessage(s.customMessage ?? m("is invalid."));
    return r;
};

const buildField = (path: string, spec: Spec, ctx: Ctx): ValidationChain[] => {
    const rule = applyType(applyPresence(SELECTORS[ctx.location](path), resolveRequired(spec, ctx), spec), spec, ctx);
    const chains: ValidationChain[] = [rule];

    if (spec.type === "object" && spec.schema)
        chains.push(...build(spec.schema, { ...ctx, upsertKey: spec.upsertKey }, path));          // nested object (1-to-1)

    if (spec.type === "array" && spec.of)
        chains.push(...buildField(`${path}.*`, { required: true, ...spec.of } as Spec, ctx));     // every array item (1-to-many)

    return chains;
};

const build = (schema: Schema, ctx: Ctx, prefix = ""): ValidationChain[] =>
    Object.entries(schema).flatMap(([key, spec]) => buildField(prefix ? `${prefix}.${key}` : key, spec, ctx));

// Single-chain shortcut for the legacy helpers (they never nest)
const one = (field: string, spec: Spec, location: Location = "body"): ValidationChain =>
    buildField(field, spec, { location })[0];

// (field, required, msgOrOpts?) helpers share one factory -> no repetition
const simple = <T extends Spec["type"]>(type: T) =>
    (field: string, required: RequiredOpt, msgOrOpts: string | Opts<T> | null = null): ValidationChain =>
        one(field, { type, required, ...(typeof msgOrOpts === "string" ? { message: msgOrOpts } : msgOrOpts ?? {}) } as Spec);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
const ValidatorHelper = {
    // ----- schema-driven -----
    /** Create / save: required fields enforced. Sends the 400 response itself on failure. */
    schema: (schema: Schema, location: Location = "body"): Validator =>
        withHandler(build(schema, { location })),

    /** Update: same schema, every field optional but still type/format checked. Sends the 400 itself. */
    partial: (schema: Schema, location: Location = "body"): Validator =>
        withHandler(build(schema, { location, partial: true })),

    /** Wrap any hand-written chains so they also respond automatically. */
    validate: (...chains: ValidationChain[]): Validator => withHandler(chains),

    /**
     * Imperatively validates a raw data object against a Schema.
     * Returns the errors to your code (no Express response).
     */
    validateDataAgainstSchema: async (data: any, schema: Schema, partial: boolean = false) => {
        const mockReq = { body: data } as unknown as Request;
        const results = await Promise.all(build(schema, { location: "body", partial }).map((c) => c.run(mockReq)));
        return results.flatMap((r) => r.array());
    },

    /** Standard list endpoint query params: page, limit, search, sort_by, sort_order. */
    listQuery: (sortable: string[] = []): Validator =>
        withHandler(build({
            page: { type: "int", min: 1 },
            limit: { type: "int", min: 1, max: 100 },
            search: { type: "string", max: 100 },
            ...(sortable.length ? { sort_by: { type: "enum", values: sortable } as Spec } : {}),
            sort_order: { type: "enum", values: ["ASC", "DESC"] },
        }, { location: "query" })),

    // ----- legacy-compatible single-field helpers (bare chains, wrap with validate(...) to auto-respond) -----
    idParam: (key = "id", type: "number" | "string" = "number", max?: number): ValidationChain =>
        one(key, type === "number"
            ? { type: "int", required: true, min: 1, message: `Valid ${key} parameter is required.` }
            : { type: "string", required: true, max, message: `Valid ${key} parameter is required.` }, "params"),

    string: (field: string, required: RequiredOpt, maxOrOpts: number | null | Opts<"string"> = null, message: string | null = null): ValidationChain =>
        one(field, {
            type: "string", required, message: message ?? undefined,
            ...(typeof maxOrOpts === "number" ? { max: maxOrOpts } : maxOrOpts ?? {}),
        } as Spec),

    array: (field: string, required: RequiredOpt, minOrOpts: number | Opts<"array"> = 0, message: string | null = null): ValidationChain =>
        one(field, {
            type: "array", required, message: message ?? undefined,
            ...(typeof minOrOpts === "number" ? { min: minOrOpts || undefined } : minOrOpts),
        } as Spec),

    enum: (field: string, values: readonly (string | number)[], required: RequiredOpt, message: string | null = null): ValidationChain =>
        one(field, { type: "enum", values, required, message: message ?? undefined }),

    int: simple("int"),
    decimal: simple("decimal"),
    boolean: simple("boolean"),
    email: simple("email"),
    date: simple("date"),
    json: simple("json"),
    uuid: simple("uuid"),
    phone: simple("phone"),
    url: simple("url"),
    object: simple("object"),
};

export default ValidatorHelper;