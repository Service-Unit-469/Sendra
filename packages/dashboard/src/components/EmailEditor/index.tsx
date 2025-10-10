import GjsEditor from "@grapesjs/react";
import grapesjs, { type Editor } from "grapesjs";
import grapesJSMJML from "grapesjs-mjml";
import "grapesjs/dist/css/grapes.min.css";

export default function DefaultEditor() {
  const onEditor = (editor: Editor) => {
    console.log("Editor loaded", { editor });
    editor.addComponents(`<mjml><mj-body></mj-body></mjml>`);
  };

  return (
    <GjsEditor
      // Pass the core GrapesJS library to the wrapper (required).
      // You can also pass the CDN url (eg. "https://unpkg.com/grapesjs")
      grapesjs={grapesjs}
      // Load the GrapesJS CSS file asynchronously from URL.
      // This is an optional prop, you can always import the CSS directly in your JS if you wish.

      // GrapesJS init options
      options={{
        height: "calc(100vh - 200px)",
        storageManager: false,
        telemetry: false,
        assetManager: {
          upload: false,
        },
        pluginsOpts: {
          grapesJSMJML: {
            overwriteExport: true,
          },
        },
      }}
      plugins={[grapesJSMJML]}
      onEditor={onEditor}
    />
  );
}
