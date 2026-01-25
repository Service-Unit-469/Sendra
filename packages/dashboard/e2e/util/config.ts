import { readFileSync, existsSync } from "fs";
import z from "zod";

export const getConfig = () => {

    if(process.env.APP_URL && process.env.DATA_TABLE_NAME && process.env.RATE_LIMIT_TABLE_NAME) {
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
            cdn: z.object({
                distribution: z.object({
                    domainName: z.string(),
                }),
            }),
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

    return {
        domainName: parsedOutputs.router.cdn.distribution.domainName,
        dataTableName: parsedOutputs.dataTable.table.name,
        rateLimitTableName: parsedOutputs.rateLimitTable.table.name,
    }

};