import type { ComponentConfig } from "@measured/puck";
import { Img } from "@react-email/components";
import { type Align, AlignConfig } from "./Align";
import { ImagePickerRender } from "./ImagePicker";
import { PaddingPickerRender, toStyle } from "./PaddingPicker";

export interface ImageProps {
  src: string;
  alt: string;
  width?: string;
  align?: Align;
  href?: string;
  padding?: string;
}

export const Image: ComponentConfig<ImageProps> = {
  fields: {
    src: {
      type: "custom",
      label: "Image URL",
      render: ImagePickerRender,
    },
    alt: {
      type: "text",
      label: "Alt Text",
    },
    width: {
      type: "text",
      label: "Width (px or %)",
    },
    align: AlignConfig,
    href: {
      type: "text",
      label: "Link URL (optional)",
    },
    padding: {
      type: "custom",
      label: "Padding",
      render: PaddingPickerRender,
    },
  },
  defaultProps: {
    src: "https://picsum.photos/600/300",
    alt: "Image",
    width: "600",
    align: "center",
    href: "",
    padding: "16",
  },
  render: ({ src, alt, width, align, href, padding }) => {
    const imageElement = (
      <Img
        src={src}
        alt={alt}
        width={width}
        style={{
          maxWidth: "100%",
          height: "auto",
          display: "block",
          margin: align === "center" ? "0 auto" : "0",
          marginLeft: align === "right" ? "auto" : undefined,
        }}
      />
    );

    if (href) {
      return (
        <div style={{ padding: toStyle(padding) }}>
          <a href={href} style={{ display: "inline-block" }}>
            {imageElement}
          </a>
        </div>
      );
    }

    return <div style={{ padding: toStyle(padding) }}>{imageElement}</div>;
  },
};
