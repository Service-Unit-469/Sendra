import { zodResolver } from "@hookform/resolvers/zod";
import { type UserCredentials, UserSchemas } from "@sendra/shared";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { LoadingButton } from "../../components/Buttons/LoadingButton";
import { PasswordInput } from "../../components/Input/Input/PasswordInput";
import { StyledInput } from "../../components/Input/Input/StyledInput";
import { ErrorMessage } from "../../components/Label/ErrorMessage";
import { StyledLabel } from "../../components/Label/StyledLabel";
import FullscreenLoader from "../../components/Utility/FullscreenLoader/FullscreenLoader";
import Redirect from "../../components/Utility/Redirect/Redirect";
import SendraLogo from "../../icons/SendraLogo";
import { API_URI, TOKEN_KEY } from "../../lib/constants";
import { useFetchUser } from "../../lib/hooks/users";

/**
 *
 */
export default function Index() {
  const navigate = useNavigate();

  const { data: user, error, mutate } = useFetchUser();

  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch,
  } = useForm({
    resolver: zodResolver(UserSchemas.credentials),
  });

  if (user && !error) {
    return <Redirect to="/" />;
  }

  if (!user && !error) {
    return <FullscreenLoader />;
  }

  const login = async (data: UserCredentials) => {
    setSubmitted(true);
    try {
      const response = await fetch(`${API_URI}/auth/login`, {
        method: "POST",
        body: JSON.stringify(data),
        mode: "cors",
        redirect: "manual",
      });

      if (response.status === 403) {
        const body = await response.json();
        if (body.resetUrl) {
          navigate(body.resetUrl);
          return;
        }
        setError("email", { message: body.detail ?? "login failed" });
        setSubmitted(false);
        return;
      }
      if (!response.ok) {
        const body = await response.json();
        setError("email", { message: body.detail ?? "login failed" });
        setSubmitted(false);
        return;
      }
      const body = await response.json();
      localStorage.setItem(TOKEN_KEY, body.token);
      await mutate(body);
      navigate("/");
    } catch {
      setError("email", { message: "login failed" });
      setSubmitted(false);
      return;
    }

    setSubmitted(false);
  };

  return (
    <div className="bg-off-white flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center sm:mx-auto sm:w-full sm:max-w-md">
        <SendraLogo height="90px" width="50%" />
        <h2 className="mt-4 text-center text-3xl font-bold text-neutral-800">Sign in to your account</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-sm border border-neutral-200 bg-white px-4 py-8 sm:px-10">
          <form onSubmit={handleSubmit(login)} className="space-y-6">
            <div>
              <StyledLabel>
                Email
                <div className="mt-1">
                  <StyledInput type="email" autoComplete="email" placeholder="hello@email.com" {...register("email")} />
                </div>
              </StyledLabel>
              <ErrorMessage error={errors.email} />
            </div>

            <div>
              <PasswordInput label="Password" error={errors.password} {...register("password")} />
              <div className={"w-full text-center"}>
                <Link to={`/auth/forgot-password?email=${encodeURIComponent(watch("email") ?? "")}`} className={"text-sm text-neutral-500 underline transition ease-in-out hover:text-neutral-500"}>
                  Forgot your password?
                </Link>
              </div>
            </div>

            <div>
              <LoadingButton label="Login" state={submitted ? "loading" : "idle"} />
              <ErrorMessage error={errors.email} />
            </div>
          </form>
        </div>
        <div className={"w-full text-center"}>
          <Link to="/auth/signup" className={"text-sm text-neutral-500 underline transition ease-in-out hover:text-neutral-500"}>
            Want to create an account instead?
          </Link>
        </div>
      </div>
    </div>
  );
}
