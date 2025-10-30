import "../../styles/index.css";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { Provider as JotaiProvider } from "jotai";
import type { AppProps } from "next/app";
import Head from "next/head";
import Router, { useRouter } from "next/router";
import NProgress from "nprogress";
import { Toaster } from "sonner";
import { SWRConfig } from "swr";
import { apiFetcher } from "../lib/api-client";
import "nprogress/nprogress.css";
import advancedFormat from "dayjs/plugin/advancedFormat";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
import FullscreenLoader from "../components/Utility/FullscreenLoader/FullscreenLoader";
import Redirect from "../components/Utility/Redirect/Redirect";
import { NO_AUTH_ROUTES } from "../lib/constants";
import { useUser } from "../lib/hooks/users";

dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(advancedFormat);
dayjs.extend(duration);

Router.events.on("routeChangeStart", () => NProgress.start());
Router.events.on("routeChangeComplete", () => NProgress.done());
Router.events.on("routeChangeError", () => NProgress.done());

/**
 * Main app component
 * @param props Props
 * @param props.Component App component
 * @param props.pageProps
 */
function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const { data: user, error } = useUser();

  if (error && !NO_AUTH_ROUTES.includes(router.route)) {
    return <Redirect to={"/auth/login"} />;
  }

  if (!user && !NO_AUTH_ROUTES.includes(router.route)) {
    return <FullscreenLoader />;
  }

  return (
    <>
      <Head>
        <title>Sendra Dashboard | The Open-Source Email Platform</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" key={"viewport"} />
      </Head>

      <Toaster position={"bottom-right"} />
      <Component {...pageProps} />
    </>
  );
}

/**
 * Main app root component that houses all components
 * @param props Default nextjs props
 */
export default function WithProviders(props: AppProps) {
  return (
    <SWRConfig
      value={{
        fetcher: apiFetcher,
        revalidateOnFocus: true,
      }}
    >
      <JotaiProvider>
        <App {...props} />
      </JotaiProvider>
    </SWRConfig>
  );
}
