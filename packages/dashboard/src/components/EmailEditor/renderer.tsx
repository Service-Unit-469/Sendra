import type { Config, Data } from "@measured/puck";
import { Render } from "@measured/puck";
import { render } from "@react-email/render";

/**
 * Renders Puck data to HTML email string
 * @param puckData - The data structure from Puck editor
 * @param previewText - Optional preview text for email clients
 * @returns HTML string suitable for email
 */
export const renderEmailHtml = async (puckData: Data, config: Config): Promise<string> => {
  const emailContent = <Render config={config} data={puckData} />;
  return await render(emailContent);
};
