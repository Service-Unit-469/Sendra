import { readFileSync, existsSync } from "fs";
import z from "zod";

export const getConfig = () => {
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