import { useRouter } from "next/router";
import { useEffect } from "react";
import { FullscreenLoader } from "../../components/";
import { TOKEN_KEY } from "../../lib/constants";
import { useUser } from "../../lib/hooks/users";

/**
 *
 */
export default function Index() {
  const router = useRouter();

  const { error, mutate } = useUser();

  if (error) {
    void router.push("/");
  }

  useEffect(() => {
    localStorage.removeItem(TOKEN_KEY);
    mutate(undefined, { revalidate: false });
    void router.push("/");
  }, [mutate, router.push]);

  return <FullscreenLoader />;
}
