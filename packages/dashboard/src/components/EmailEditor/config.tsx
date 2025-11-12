import type { Config, Fields, WithId, WithPuckProps } from "@measured/puck";
import { Body, Head, Html, Preview } from "@react-email/components";
import { Button, Columns, Container, Divider, Heading, Image, Section, Spacer, Text } from "./Fields";

/**
 * Puck configuration for email editor
 * This defines all available components and their settings
 */
export const emailEditorConfig = (fields: Fields): Config => ({
  components: {
    Section,
    Container,
    Columns,
    Heading,
    Text,
    Button,
    Image,
    Spacer,
    Divider,
  },
  root: {
    fields,
    render: ({
      children,
      style,
      title,
      preview,
      backgroundColor,
    }: WithId<WithPuckProps<{ style?: string; title?: string; preview?: string; backgroundColor?: string; children: React.ReactNode }>>) => (
      <Html lang="en">
        <Head>
          <title>{title}</title>
          <meta name="subject" content={title} />
          <style>{style}</style>
        </Head>
        {preview && <Preview>{preview}</Preview>}
        <Body style={{ backgroundColor: backgroundColor ?? "#fff" }}>{children}</Body>
      </Html>
    ),
  },
});

/**
 * Initial data for a new email template
 */
export const initialEmailData = {
  content: [
    {
      type: "Container",
      props: {
        id: "container-1",
        maxWidth: "600",
        backgroundColor: "#ffffff",
        content: [
          {
            type: "Heading",
            props: {
              id: "heading-1",
              text: "Welcome to Your Email",
              level: "h1",
              align: "center",
              color: "#000000",
              padding: "16 0",
            },
          },
          {
            type: "Text",
            props: {
              id: "text-1",
              text: "Start building your email by adding and customizing components.",
              padding: "16 0",
            },
          },
        ],
      },
    },
  ],
  root: {
    props: {
      title: "My Email",
      backgroundColor: "#fafafa",
      quickEmail: "false",
      style: `
a {
  color: blue;
  text-decoration: underline;
}
ol {
  margin-left: 24px;
  list-style: auto;
}
ul {
  margin-left: 24px;
  list-style: disc;
}
.ql-align-center {
  text-align: center;
}
.ql-align-right {
  text-align: right;
}
.ql-align-justify {
  text-align: justify;
}
body {
  color: black;
  font-family: Verdana, Arial, sans-serif;
}
      `,
    },
  },
  zones: {},
};
