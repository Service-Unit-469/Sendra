import { readFileSync, existsSync } from "fs";
import z from "zod";

const hasValidAppUrl = (value: string | undefined): value is string => {
    if (!value) {
        return false;
    }

    try {
        const parsed = new URL(value);
        return parsed.hostname !== "null";
    } catch {
        return false;
    }
};

export const getConfig = () => {

    if(hasValidAppUrl(process.env.APP_URL) && process.env.DATA_TABLE_NAME && process.env.RATE_LIMIT_TABLE_NAME) {
        return {
            domainName: process.env.APP_URL,
            dataTableName: process.env.DATA_TABLE_NAME,
            rateLimitTableName: process.env.RATE_LIMIT_TABLE_NAME,
        }
    }

    let outputsPath = ".sst/outputs.json";
    if (!existsSync(outputsPath)) {
        outputsPath = "../../.sst/outputs.json";
    }
    const outputs = JSON.parse(readFileSync(outputsPath, "utf8"));

    const outputSchema = z.object({
        router: z.object({
            distribution: z.object({
                domainName: z.string(),
            }).optional(),
            cdn: z.object({
                distribution: z.object({
                    domainName: z.string(),
                }),
            }).optional(),
        }),
        dataTable: z.object({
            table: z.object({
                name: z.string(),
            }),
        }),
        rateLimitTable: z.object({
            table: z.object({
                name: z.string(),
            }),
        }),
    });
    const parsedOutputs = outputSchema.parse(outputs);
    const domainName = parsedOutputs.router.distribution?.domainName ?? parsedOutputs.router.cdn?.distribution.domainName;
    if (!domainName) {
        throw new Error("Could not resolve router domain name from .sst/outputs.json");
    }

    return {
        domainName,
        dataTableName: parsedOutputs.dataTable.table.name,
        rateLimitTableName: parsedOutputs.rateLimitTable.table.name,
    }
};
