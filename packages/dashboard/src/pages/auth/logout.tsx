import { useAtom } from "jotai";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import FullscreenLoader from "../../components/Utility/FullscreenLoader/FullscreenLoader";
import { atomLoginStatus, atomUser } from "../../lib/atoms/user";
import { TOKEN_KEY } from "../../lib/constants";
import { useFetchUser } from "../../lib/hooks/users";

/**
 * Logs the user out and redirects to the login page.
 */
export default function Logout() {
  const navigate = useNavigate();
  const { mutate } = useFetchUser();
  const [, setLoginStatus] = useAtom(atomLoginStatus);
  const [, setUser] = useAtom(atomUser);

  useEffect(() => {
    localStorage.removeItem(TOKEN_KEY);
    mutate(undefined, { revalidate: false });
    setLoginStatus("logged-out");
    setUser(null);
    void navigate("/auth/login");
  }, [mutate, navigate, setLoginStatus, setUser]);

  return <FullscreenLoader />;
}
