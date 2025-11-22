import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export interface RedirectProps {
  to: string;
}

/**
 * @param root0
 * @param root0.to
 */
export default function Redirect({ to }: RedirectProps) {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(to, { replace: true });
  }, [to, navigate]);

  return null;
}
